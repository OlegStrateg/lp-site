# Syncs project sources (NOT build output, NOT dependencies) to the shared G: drive
# for versioning/backup. npm itself must keep running from C:\Users\User\claude-work\layerporter
# (npm on G: is known to fail in this environment — see task brief).
#
# Usage:  powershell -File scripts\sync-to-g.ps1
# Safe to re-run; robocopy only copies changed files (/MIR mirrors deletions too).

$ErrorActionPreference = "Stop"

$src = "C:\Users\User\claude-work\layerporter"
$dst = "G:\Общие диски\Проекты\Линейка-Конвертеры\сайт-layerporter"

if (-not (Test-Path -LiteralPath $dst)) {
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
}

$excludeDirs = @("node_modules", "dist", ".astro")
$excludeFiles = @("*.log")

robocopy $src $dst /MIR `
    /XD $excludeDirs `
    /XF $excludeFiles `
    /NFL /NDL /NP /R:2 /W:2

$code = $LASTEXITCODE
# robocopy exit codes 0-7 are success variants; 8+ indicate real failures.
if ($code -ge 8) {
    Write-Error "robocopy failed with exit code $code"
    exit $code
}

Write-Host "Sync OK (robocopy exit code $code): $src -> $dst"
exit 0
