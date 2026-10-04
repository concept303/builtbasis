[CmdletBinding()]
param(
  [string]$SshAlias,
  [string]$RemoteRelease,
  [string]$RemoteData,
  [string]$Destination,
  $MaxAgeHours = 36,
  [string]$NotificationUser = $env:USERNAME
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$lockCreated = $false
$exportId = $null
try {
if ($NotificationUser -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') { throw 'Invalid local notification user' }
Get-Command msg.exe -ErrorAction Stop | Out-Null
$MaxAgeHours = [double]::Parse([string]$MaxAgeHours, [Globalization.CultureInfo]::InvariantCulture)
if ($SshAlias -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]*$' -or [string]::IsNullOrWhiteSpace($Destination) -or $MaxAgeHours -le 0 -or [double]::IsInfinity($MaxAgeHours) -or [double]::IsNaN($MaxAgeHours)) { throw 'Invalid pull configuration' }
foreach ($path in @($RemoteRelease,$RemoteData)) {
  if ($path -notmatch '^/[A-Za-z0-9_/-]+$' -or $path.Contains('/../') -or $path.EndsWith('/..') -or $path -eq '/') { throw 'Unsafe remote path' }
}
$repo = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path -LiteralPath (Join-Path $repo 'dist/server/backup-export.mjs'))) { throw 'Build the matching server tools first' }
$root = [IO.Path]::GetFullPath($Destination)
[IO.Directory]::CreateDirectory($root) | Out-Null
$lock = Join-Path $root '.pull-lock'
New-Item -ItemType Directory -Path $lock -ErrorAction Stop | Out-Null
$lockCreated = $true
$remoteCommand = "cd '$RemoteRelease' && BUILTBASIS_DATA_DIR='$RemoteData' /usr/local/nodejs/24/bin/node dist/server/backup-export.mjs"
# One SFTP process handles a batch; never open one SSH connection per blob.
function Invoke-BatchTransfer([string[]]$Lines) {
  $batch = Join-Path ([IO.Path]::GetTempPath()) ('builtbasis-sftp-' + [guid]::NewGuid().ToString('N') + '.txt')
  try {
    [IO.File]::WriteAllLines($batch, $Lines, [Text.UTF8Encoding]::new($false))
    & sftp -q -o BatchMode=yes -b $batch -- $SshAlias
    if ($LASTEXITCODE -ne 0) { throw 'SFTP transfer failed; copy is incomplete' }
  } finally { if (Test-Path -LiteralPath $batch) { Remove-Item -LiteralPath $batch -Force } }
}
function Sftp-Quote([string]$Path) {
  if ($Path.IndexOfAny([char[]]"`r`n`"``") -ge 0) { throw 'Unsupported transfer path' }
  return '"' + $Path.Replace('\','/') + '"'
}
try {
  $response = & ssh -o BatchMode=yes -- $SshAlias "$remoteCommand begin"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot pin a completed server backup' }
  $export = ($response -join "`n") | ConvertFrom-Json
  if ($export.id -notmatch '^[a-f0-9]{32}$') { throw 'Invalid export identifier' }
  $exportId = $export.id
  $bundle = Join-Path $root "snapshots/$exportId"
  [IO.Directory]::CreateDirectory($bundle) | Out-Null
  $remoteBundle = "$RemoteData/backups/.exports/$exportId"
  $metadataBatch = foreach ($name in @('builtbasis.db','manifest.json')) {
    'get ' + (Sftp-Quote "$remoteBundle/$name") + ' ' + (Sftp-Quote (Join-Path $bundle $name))
  }
  Invoke-BatchTransfer $metadataBatch
  $manifest = Get-Content -LiteralPath (Join-Path $bundle 'manifest.json') -Raw | ConvertFrom-Json
  $pool = Join-Path $root 'files'
  $fileBatch = [Collections.Generic.List[string]]::new()
  $downloads = [Collections.Generic.List[object]]::new()
  foreach ($blob in $manifest.blobs) {
    if ($blob.hash -notmatch '^[a-f0-9]{64}$' -or $blob.size -lt 0) { throw 'Invalid blob manifest' }
    $prefix = $blob.hash.Substring(0,2)
    $folder = Join-Path $pool $prefix
    [IO.Directory]::CreateDirectory($folder) | Out-Null
    $target = Join-Path $folder $blob.hash
    if (-not (Test-Path -LiteralPath $target)) {
      $partial = "$target.part"
      $fileBatch.Add('get ' + (Sftp-Quote "$RemoteData/files/$prefix/$($blob.hash)") + ' ' + (Sftp-Quote $partial))
      $downloads.Add(@{ Partial = $partial; Target = $target; Hash = $blob.hash; Size = $blob.size })
    }
  }
  if ($fileBatch.Count) { Invoke-BatchTransfer $fileBatch.ToArray() }
  foreach ($download in $downloads) {
    if ((Get-Item -LiteralPath $download.Partial).Length -ne $download.Size -or (Get-FileHash -LiteralPath $download.Partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $download.Hash) { throw 'Blob integrity failed' }
    Move-Item -LiteralPath $download.Partial -Destination $download.Target
  }
  & node (Join-Path $repo 'dist/server/backup-export.mjs') verify $bundle --files-dir $pool --max-age-hours $MaxAgeHours.ToString([Globalization.CultureInfo]::InvariantCulture)
  if ($LASTEXITCODE -ne 0) { throw 'Off-site verification failed; copy is incomplete' }
} finally {
  try {
    if ($exportId) {
      & ssh -o BatchMode=yes -- $SshAlias "$remoteCommand release $exportId"
      if ($LASTEXITCODE -ne 0) { throw "Export pin release failed: $exportId. Inspect active jobs and release it manually." }
    }
  } finally { if ($lockCreated) { Remove-Item -LiteralPath $lock; $lockCreated = $false } }
}
Write-Output "Verified off-site backup: $bundle"
} catch {
  $pullFailure = $_
  try {
    if ($NotificationUser -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') { throw 'Invalid notification target' }
    Get-Command msg.exe -ErrorAction Stop | Out-Null
    # Local operator only. No remote server argument, wildcard or messages containing private paths.
    & msg.exe $NotificationUser /time:300 'BuiltBasis off-site backup failed. Check the scheduled task and its private log. The latest recovery point may be overdue.'
    if ($LASTEXITCODE -ne 0) { throw 'Desktop notification delivery failed' }
  } catch { Write-Warning 'BuiltBasis backup failed and the local desktop notification could not be delivered. Check task history and the private log.' }
  throw $pullFailure
}
