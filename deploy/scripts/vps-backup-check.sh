#!/usr/bin/env bash
# Pizza of Legend Express - VPS backup check. Runs ON the VPS, never writes to the live "postgres" database.
#
# Usage (from the repo root):
#   PowerShell : Get-Content deploy/scripts/vps-backup-check.sh -Raw | ssh deploy@76.13.187.38 "tr -d '\r' | bash -s"
#   Git Bash   : /c/Windows/System32/OpenSSH/ssh.exe deploy@76.13.187.38 "tr -d '\r' | bash -s" < deploy/scripts/vps-backup-check.sh
#                (the ssh bundled with Git has no access to the key; Claude Code's "!" prompt is Git Bash)
#
# Steps:
#   1. list /srv/pizza-backups; if no pizza-db-*.dump exists yet, run /srv/pizza/backup.sh once
#   2. integrity: pg_restore --list on the latest dump, tar -t on the latest storage tarball
#   3. restore the latest dump into a scratch database (pizza_restore_check), print per-table
#      row counts (public tables + storage.buckets/objects) next to the live database,
#      then drop the scratch database
#
# The body lives in main() so bash parses the whole script before running any of it. With
# `bash -s` the script arrives on stdin, and a child that reads stdin (docker exec -i, sudo)
# would otherwise swallow the rest of the script and the run would stop halfway, silently.
set -u
BK=/srv/pizza-backups
STACK=/srv/pizza/supabase
SCRATCH=pizza_restore_check

readf()  { cat "$1" 2>/dev/null || sudo -n cat "$1"; }
lsdir()  { ls -la "$1" 2>/dev/null || sudo -n ls -la "$1"; }
# $1 is a glob on purpose. The sudo fallback goes through sh so that root expands the glob
# (if we cannot read the directory, our own shell cannot expand it).
# shellcheck disable=SC2086
newest() { { ls -t $1 2>/dev/null || sudo -n sh -c "ls -t $1" 2>/dev/null; } | head -1; }

main() {
  echo "== backup dir ($BK) =="
  lsdir "$BK" || echo "(missing)"

  latest=$(newest "$BK/pizza-db-*.dump")
  if [ -z "${latest:-}" ]; then
    echo "== no dump found, running /srv/pizza/backup.sh once =="
    sudo -n bash /srv/pizza/backup.sh </dev/null 2>&1 || bash /srv/pizza/backup.sh </dev/null 2>&1 || { echo "FAIL: backup.sh"; exit 1; }
    latest=$(newest "$BK/pizza-db-*.dump")
    [ -n "${latest:-}" ] || { echo "FAIL: still no dump after backup.sh"; exit 1; }
  fi
  echo "latest dump: $latest"

  tarball=$(newest "$BK/pizza-storage-*.tar.gz")
  if [ -n "${tarball:-}" ]; then
    echo "latest storage tar: $tarball, entries: $(readf "$tarball" | tar -tz | wc -l)"
  else
    echo "WARN: no storage tarball found"
  fi

  cd "$STACK" || { echo "FAIL: $STACK missing"; exit 1; }
  DB=$(docker ps --format '{{.Names}}' | grep -E 'supabase-db$|(^|[-_])db$' | head -1)
  [ -n "$DB" ] || { echo "FAIL: db container not found. containers:"; docker ps --format '{{.Names}}'; exit 1; }
  PW=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
  # pg: no stdin attached (psql -c). pgi: stdin is the dump piped in (pg_restore reads the archive from stdin).
  pg()  { docker exec    -e PGPASSWORD="$PW" "$DB" "$@" </dev/null; }
  pgi() { docker exec -i -e PGPASSWORD="$PW" "$DB" "$@"; }
  # public tables + storage.buckets/objects (the storage rows are what make the files in the storage tarball servable)
  COUNT_SQL="select format('%-32s %s', n.nspname||'.'||c.relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname='public' or (n.nspname='storage' and c.relname in ('buckets','objects'))) order by 1;"

  echo "== dump integrity (pg_restore --list) =="
  n=$(readf "$latest" | pgi pg_restore --list 2>&1 | grep -c 'TABLE DATA' || true)
  echo "TABLE DATA entries: $n"
  [ "$n" -gt 0 ] || { echo "FAIL: dump has no table data entries"; exit 1; }

  echo "== restore into scratch db: $SCRATCH =="
  pg psql -h 127.0.0.1 -U supabase_admin -d postgres -qc "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE);"
  pg psql -h 127.0.0.1 -U supabase_admin -d postgres -qc "CREATE DATABASE $SCRATCH;" || { echo "FAIL: cannot create scratch db"; exit 1; }
  log=$(mktemp)
  readf "$latest" | pgi pg_restore -h 127.0.0.1 -U supabase_admin -d "$SCRATCH" --no-owner --no-privileges >"$log" 2>&1
  errs=$(grep -c 'pg_restore: error' "$log" || true)
  echo "pg_restore errors: $errs (extension / event-trigger errors are expected in a scratch db; the row counts below are what matter)"
  [ "$errs" -eq 0 ] || { echo "-- first error lines --"; grep 'pg_restore: error' "$log" | head -5; }
  rm -f "$log"

  echo "== row counts: scratch (restored from dump) =="
  scratch_counts=$(pg psql -h 127.0.0.1 -U supabase_admin -d "$SCRATCH" -Atc "$COUNT_SQL")
  echo "$scratch_counts"
  case "$scratch_counts" in
    *storage.objects*) ;;
    *) echo "WARN: dump has no storage.objects - add --schema=storage to the pg_dump in /srv/pizza/backup.sh (see deploy/README.md)" ;;
  esac
  echo "== row counts: live =="
  pg psql -h 127.0.0.1 -U supabase_admin -d postgres -Atc "$COUNT_SQL"

  pg psql -h 127.0.0.1 -U supabase_admin -d postgres -qc "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE);"
  echo "== scratch db dropped. done =="
}
main "$@"; exit $?
