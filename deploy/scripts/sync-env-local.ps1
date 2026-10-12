<#
.SYNOPSIS
  .env.local 의 Supabase 항목 3개를 VPS self-hosted 값으로 교체한다. 키 값은 화면에 출력하지 않는다.
.DESCRIPTION
  - VPS /srv/pizza/supabase/.env 에서 ANON_KEY, SERVICE_ROLE_KEY 를 ssh 로 읽는다
  - .env.local 의 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 를 교체한다 (없으면 추가)
  - 기존 파일은 .env.backup-hosted.local 로 백업한다 (gitignore 의 .env*.local 에 걸리므로 커밋되지 않음)
  전제: PowerShell 의 ssh.exe 로 `ssh deploy@...` 가 비밀번호 없이(키 인증) 붙어야 한다.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File deploy\scripts\sync-env-local.ps1
#>
param(
  [string]$VpsHost = "deploy@76.13.187.38",
  [string]$ApiUrl  = "https://pizza-api.jullyssy.shop",
  [string]$EnvFile = ""
)
$ErrorActionPreference = "Stop"
if (-not $EnvFile) {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
  $EnvFile  = Join-Path $repoRoot ".env.local"
}

$lines = ssh -o BatchMode=yes -o ConnectTimeout=20 $VpsHost "grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=' /srv/pizza/supabase/.env"
if ($LASTEXITCODE -ne 0) { throw "ssh 실패 (exit $LASTEXITCODE)" }
$remote = @{}
foreach ($l in @($lines)) {
  if ($l -match '^([A-Z_]+)=(.*)$') { $remote[$matches[1]] = $matches[2].Trim().Trim('"') }
}
foreach ($k in 'ANON_KEY', 'SERVICE_ROLE_KEY') {
  if (-not $remote[$k]) { throw "VPS .env 에 $k 가 없음" }
}

$map = [ordered]@{
  'NEXT_PUBLIC_SUPABASE_URL'      = $ApiUrl
  'NEXT_PUBLIC_SUPABASE_ANON_KEY' = $remote['ANON_KEY']
  'SUPABASE_SERVICE_ROLE_KEY'     = $remote['SERVICE_ROLE_KEY']
}

$existing = @()
if (Test-Path $EnvFile) {
  $backup = Join-Path (Split-Path $EnvFile -Parent) ".env.backup-hosted.local"
  Copy-Item $EnvFile $backup -Force
  $existing = @(Get-Content $EnvFile -Encoding utf8)
}

$seen = @{}
$out = @()
foreach ($line in $existing) {
  if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=') {
    $k = $matches[1]
    if ($map.Contains($k)) { $seen[$k] = $true; $out += "$k=$($map[$k])"; continue }
  }
  $out += $line
}
foreach ($k in $map.Keys) { if (-not $seen[$k]) { $out += "$k=$($map[$k])" } }

[IO.File]::WriteAllLines($EnvFile, [string[]]$out, (New-Object System.Text.UTF8Encoding $false))
Write-Host "갱신 완료: $EnvFile"
Write-Host "  교체/추가: $($map.Keys -join ', ')"
if ($existing.Count -gt 0) { Write-Host "  이전 파일 백업: .env.backup-hosted.local (호스티드 프로젝트 삭제 후 지울 것)" }
