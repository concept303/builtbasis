param(
  [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9.-]*$')][string]$SshAlias,
  [Parameter(Mandatory)][ValidatePattern('^/[A-Za-z0-9_/-]+$')][string]$RemoteRoot,
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{7,40}$')][string]$ReleaseId
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($RemoteRoot.Contains('/../') -or $RemoteRoot.EndsWith('/..') -or $RemoteRoot -eq '/') { throw 'Unsafe remote root' }
$repo = Split-Path $PSScriptRoot -Parent
Push-Location $repo
$archive = Join-Path ([IO.Path]::GetTempPath()) ('builtbasis-release-' + [guid]::NewGuid().ToString('N') + '.tar.gz')
try {
  foreach ($required in @('dist/server/main.mjs','dist/web/index.html','package-lock.json')) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing build: $required" }
  }
  # Explicit allowlist. No source data, environment files, keys or node_modules.
  & tar -czf $archive dist/server dist/web package.json package-lock.json
  if ($LASTEXITCODE -ne 0) { throw 'Archive failed' }
  $release = "$RemoteRoot/releases/$ReleaseId"
  & ssh -o BatchMode=yes -- $SshAlias "umask 077; mkdir -p '$RemoteRoot/releases' && mkdir '$release'"
  if ($LASTEXITCODE -ne 0) { throw 'Release directory exists or cannot be created' }
  & scp -o BatchMode=yes -- $archive "${SshAlias}:$release/release.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw 'Upload failed; existing release is unchanged' }
  & ssh -o BatchMode=yes -- $SshAlias "set -e; export PATH=/usr/local/nodejs/24/bin:`$PATH; cd '$release'; tar -xzf release.tar.gz; npm ci --omit=dev; /usr/local/nodejs/24/bin/node --check dist/server/main.mjs; /usr/local/nodejs/24/bin/node dist/server/runtime-check.mjs; rm release.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw 'Staging verification failed; do not activate this release' }
  Write-Output "Staged $release. Follow the deployment guide to activate and verify. The running app was not changed."
} finally {
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
  Pop-Location
}
