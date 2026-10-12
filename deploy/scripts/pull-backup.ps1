<#
.SYNOPSIS
  VPS 의 최신 Pizza 백업(DB dump + storage tar)을 로컬 PC 로 가져온다 (오프사이트 사본).
.DESCRIPTION
  - 원격 /srv/pizza-backups 의 pizza-db-*.dump, pizza-storage-*.tar.gz 중 최신 1개씩을 scp 로 받는다
  - 로컬 -Dest (기본 F:\juji\pizza-backups). 같은 이름이 이미 있으면 건너뛴다
  - -KeepDays (기본 30) 보다 오래된 로컬 사본은 삭제한다
  - 로그: <Dest>\pull-backup.log
  - -Register : 작업 스케줄러에 매일 09:00 실행 작업(PizzaBackupPull)을 등록한다.
                PC 가 꺼져 있어 놓친 실행은 다음 기회에 바로 실행된다 (StartWhenAvailable).
  전제: PowerShell 의 ssh.exe 로 `ssh deploy@...` 가 비밀번호 없이(키 인증) 붙어야 한다.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File deploy\scripts\pull-backup.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File deploy\scripts\pull-backup.ps1 -Register
#>
param(
  [string]$VpsHost = "deploy@76.13.187.38",
  [string]$RemoteDir = "/srv/pizza-backups",
  [string]$Dest = "F:\juji\pizza-backups",
  [int]$KeepDays = 30,
  [switch]$Register
)
$ErrorActionPreference = "Stop"

if ($Register) {
  $scriptPath = $MyInvocation.MyCommand.Path
  $action   = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -Dest `"$Dest`""
  $trigger  = New-ScheduledTaskTrigger -Daily -At 09:00
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable
  Register-ScheduledTask -TaskName "PizzaBackupPull" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Write-Host "등록 완료: 작업 스케줄러 'PizzaBackupPull' (매일 09:00, 놓치면 다음 기회에 실행). 해제: Unregister-ScheduledTask PizzaBackupPull"
  return
}

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$log = Join-Path $Dest "pull-backup.log"
function Log($msg) {
  $line = "{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $msg
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Host $line
}

try {
  $latest = ssh -o BatchMode=yes -o ConnectTimeout=20 $VpsHost "ls -t $RemoteDir/pizza-db-*.dump 2>/dev/null | head -1; ls -t $RemoteDir/pizza-storage-*.tar.gz 2>/dev/null | head -1"
  if ($LASTEXITCODE -ne 0) { throw "ssh 실패 (exit $LASTEXITCODE)" }
  $files = @($latest | Where-Object { $_ -and $_.Trim() })
  if ($files.Count -eq 0) { throw "원격에 백업 파일이 없음 ($RemoteDir). 먼저 deploy/scripts/vps-backup-check.sh 로 백업을 만들 것" }

  foreach ($remote in $files) {
    $name  = Split-Path $remote -Leaf
    $local = Join-Path $Dest $name
    if (Test-Path $local) { Log "skip (이미 있음): $name"; continue }
    scp -o BatchMode=yes -q "${VpsHost}:$remote" $local
    if ($LASTEXITCODE -ne 0) { throw "scp 실패: $name" }
    $size = (Get-Item $local).Length
    if ($size -lt 1024) { Remove-Item $local; throw "받은 파일이 비정상적으로 작음: $name ($size bytes)" }
    Log ("ok: {0} ({1:N1} MB)" -f $name, ($size / 1MB))
  }

  Get-ChildItem $Dest -File |
    Where-Object { $_.Name -like "pizza-*" -and $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    ForEach-Object { Remove-Item $_.FullName; Log "pruned: $($_.Name)" }
}
catch {
  Log "ERROR: $($_.Exception.Message)"
  exit 1
}
