param([string]$Repo, [string]$Fixture, [string]$Destination, [string]$Mode = 'success', [switch]$Uncaught)
$ErrorActionPreference = 'Stop'
$global:TransferBatches = [Collections.Generic.List[object]]::new()
$global:Released = $false
$global:VerifiedAge = $null
$global:CopyOrder = [Collections.Generic.List[string]]::new()
$global:Notifications = 0
$global:NotificationTargets = [Collections.Generic.List[string]]::new()
function global:msg.exe { $global:Notifications++; $global:NotificationTargets.Add($args[0]); $global:LASTEXITCODE = $(if ($Mode -eq 'notification-failure') { 1 } else { 0 }) }
function global:ssh {
  $global:LASTEXITCODE = 0
  if ($args[-1] -like '* begin') { if ($Mode -eq 'ssh') { $global:LASTEXITCODE = 1; return }; return '{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}' }
  if ($args[-1] -like '* release *') { $global:Released = $true; if ($Mode -eq 'release') { $global:LASTEXITCODE = 1 }; return }
  throw 'Unexpected SSH command in mock'
}
function global:scp { throw 'Per-file SCP is forbidden in this test' }
function global:sftp {
  if ($Mode -eq 'sftp') { $global:LASTEXITCODE = 1; return }
  $index = [Array]::IndexOf($args, '-b')
  if ($index -lt 0) { throw 'Missing SFTP batch file' }
  $lines = @(Get-Content -LiteralPath $args[$index + 1])
  $global:TransferBatches.Add($lines.Count)
  foreach ($line in $lines) {
    if ($line -notmatch '^get "([^"]+)" "([^"]+)"$') { throw 'Unexpected SFTP operation' }
    $remote = $Matches[1]; $local = $Matches[2]
    $name = ($remote -split '/')[-1]
    $global:CopyOrder.Add($name)
    Copy-Item -LiteralPath (Join-Path $Fixture $name) -Destination $local
    if ($Mode -eq 'integrity' -and $name -match '^[a-f0-9]{64}$') { [IO.File]::WriteAllText($local, 'corrupt') }
  }
  $global:LASTEXITCODE = 0
}
function global:node {
  $index = [Array]::IndexOf($args, '--max-age-hours')
  if ($index -lt 0) { throw 'Missing source freshness limit' }
  $global:VerifiedAge = $args[$index + 1]
  if ($Mode -in @('stale','notification-failure')) { $global:LASTEXITCODE = 1; return }
  [IO.File]::WriteAllText((Join-Path $args[2] 'COMPLETE'), '{"sourceCreatedAt":"2026-10-04T00:00:00Z"}')
  $global:LASTEXITCODE = 0
}
$failed = $false
if ($Mode -eq 'setup') { Remove-Item -LiteralPath (Join-Path $Repo 'dist/server/backup-export.mjs') }
if ($Mode -eq 'lock') { [IO.Directory]::CreateDirectory((Join-Path $Destination '.pull-lock')) | Out-Null }
if ($Uncaught) { & (Join-Path $Repo 'scripts/pull-backup.ps1') -SshAlias fixture -RemoteRelease /fixture/release -RemoteData /fixture/data -Destination $Destination -MaxAgeHours 24; return }
$deliveryWarnings = @()
try { & (Join-Path $Repo 'scripts/pull-backup.ps1') -SshAlias fixture -RemoteRelease /fixture/release -RemoteData /fixture/data -Destination $Destination -MaxAgeHours 24 -NotificationUser fixture-operator -WarningAction SilentlyContinue -WarningVariable deliveryWarnings | Out-Null }
catch { $failed = $true }
[ordered]@{ notificationTargets = $global:NotificationTargets.ToArray(); deliveryWarnings = $deliveryWarnings.Count; notifications = $global:Notifications; batches = $global:TransferBatches.ToArray(); released = $global:Released; age = $global:VerifiedAge; failed = $failed; order = $global:CopyOrder.ToArray(); locked = Test-Path (Join-Path $Destination '.pull-lock') } | ConvertTo-Json -Compress
