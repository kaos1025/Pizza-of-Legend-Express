#!/usr/bin/env bash
# Pizza of Legend Express - VPS backup check. Runs ON the VPS, never writes to the live "postgres" database.
#
# Usage (from the repo root, PowerShell):
#   Get-Content deploy/scripts/vps-backup-check.sh -Raw | ssh deploy@76.13.187.38 "tr -d '\r' | bash -s"
#
# Steps:
#   1. list /srv/pizza-backups; if no pizza-db-*.dump exists yet, run /srv/pizza/backup.sh once
#   2. integrity: pg_restore --list on the latest dump, tar -t on the latest storage tarball
#   3. restore the latest dump into a scratch database (pizza_restore_check), print per-table
#      row counts next to the live database, then drop the scratch database
set -u
BK=/srv/pizza-backups
STACK=/srv/pizza/supabase
SCRATCH=pizza_restore_check

readf()  { cat "$1" 2>/dev/null || sudo -n cat "$1"; }
lsdir()  { ls -la "$1" 2>/dev/null || sudo -n ls -la "$1"; }
# shellcheck disable=SC2086  # $1 is a glob on purpose
newest() { { ls -t $1 2>/dev/null || sudo -n ls -t $1 2>/dev/null; } | head -1; }

echo "== backup dir ($BK) =="
lsdir "$BK" || echo "(missing)"

latest=$(newest "$BK/pizza-db-*.dump")
if [ -z "${latest:-}" ]; then
  echo "== no dump found, running /srv/pizza/backup.sh once =="
  sudo -n bash /srv/pizza/backup.sh 2>&1 || bash /srv/pizza/backup.sh 2>&1 || { echo "FAIL: backup.sh"; exit 1; }
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
pg() { docker exec -i -e PGPASSWORD="$PW" "$DB" "$@"; }
COUNT_SQL="select format('%-28s %s', relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', relname), false, true, '')))[1]::text) from pg_class where relkind='r' and relnamespace='public'::regnamespace order by relname;"

echo "== dump integrity (pg_restore --list) =="
n=$(readf "$latest" | pg pg_restore --list 2>&1 | grep -c 'TABLE DATA' || true)
echo "TABLE DATA entries: $n"
[ "$n" -gt 0 ] || { echo "FAIL: dump has no table data entries"; exit 1; }

echo "== restore into scratch db: $SCRATCH =="
pg psql -h 127.0.0.1 -U supabase_admin -d postgres -qc "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE);"
pg psql -h 127.0.0.1 -U supabase_admin -d postgres -qc "CREATE DATABASE $SCRATCH;"
errs=$(readf "$latest" | pg pg_restore -h 127.0.0.1 -U supabase_admin -d "$SCRATCH" --no-owner --no-privileges 2>&1 | grep -c 'pg_restore: error' || true)
echo "pg_restore errors: $errs (extension / event-trigger errors are expected in a scratch db; the row counts below are what matter)"

echo "== row counts: scratch (restored from dump) =="
pg psql -h 127.0.0.1 -U supabase_admin -d "$SCRATCH" -Atc "$COUNT_SQL"
echo "== row counts: live =="
pg psql -h 127.0.0.1 -U supabase_admin -d postgres -Atc "$COUNT_SQL"

pg psql -h 127.0.0.1 -U supabase_admin -d postgres -qc "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE);"
echo "== scratch db dropped. done =="
