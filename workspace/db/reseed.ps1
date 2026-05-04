#requires -Version 5.1
<#
.SYNOPSIS
    Resets and re-seeds the Rotterdam shopping-area data in dzp_dnndev.

.DESCRIPTION
    1. Runs seed-wijkcentra-clear.sql once (unless -SkipClear).
    2. Runs seed-wijkcentra.sql once. The 50 Rotterdam locations are
       hard-coded in @Cities; no community chunking is needed.

.EXAMPLE
    .\.reseed.ps1

.EXAMPLE
    .\reseed.ps1 -SkipClear -TotalUsers 200
#>

[CmdletBinding()]
param(
    # [string]$Server                = '127.0.0.1',
    # [string]$Database              = 'dzp_dnndev',
    # [string]$User                  = 'dnndev',
    # [string]$Password              = 'Dnnd3v@123',
    [string]$Server                = 'tcp:bondwesteuserver.database.windows.net,1433',
    [string]$Database              = 'db_DZP-V1',
    [string]$User                  = 'beheer',
    [string]$Password              = '7dWb+]e6HxM9~TVC',

    [int]$TotalUsers               = 500,
    [int]$GroupsPerCommunity       = 20,
    [int]$CompaniesPerCommunity    = 50,
    [int]$PostsPerCommunity        = 1000,
    [int]$MinCommentsPerPost       = 5,
    [int]$MaxCommentsPerPost       = 15,

    [switch]$SkipClear
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-Sqlcmd-File {
    param([string]$File, [hashtable]$Vars)
    $path = Join-Path $scriptDir $File
    if (-not (Test-Path -LiteralPath $path)) {
        throw "SQL file not found: $path"
    }

    $args = @('-S', $Server, '-d', $Database, '-U', $User, '-P', $Password,
              '-I', '-b', '-i', $path)
    if ($Vars) {
        foreach ($k in $Vars.Keys) {
            $args += '-v'
            $args += "$k=$($Vars[$k])"
        }
    }
    & sqlcmd @args 2>&1 | ForEach-Object {
        Write-Host $_
    }
    if ($LASTEXITCODE -ne 0) {
        throw "$File failed with exit code $LASTEXITCODE"
    }
}

$totalSw = [System.Diagnostics.Stopwatch]::StartNew()

if (-not $SkipClear) {
    Write-Host ""
    Write-Host "====== Clearing previous wijkcentra data ======" -ForegroundColor Cyan
    Invoke-Sqlcmd-File 'seed-wijkcentra-clear.sql' $null
}

Write-Host ""
Write-Host "====== Seeding 50 fixed Rotterdam locations ======" -ForegroundColor Cyan
Write-Host ("   {0} users, {1} groups/comm, {2} companies/comm, {3} posts/comm" `
            -f $TotalUsers, $GroupsPerCommunity, $CompaniesPerCommunity, $PostsPerCommunity)

$seedSw = [System.Diagnostics.Stopwatch]::StartNew()
Invoke-Sqlcmd-File 'seed-wijkcentra.sql' @{
    NumUsers              = $TotalUsers
    GroupsPerCommunity    = $GroupsPerCommunity
    CompaniesPerCommunity = $CompaniesPerCommunity
    PostsPerCommunity     = $PostsPerCommunity
    MinCommentsPerPost    = $MinCommentsPerPost
    MaxCommentsPerPost    = $MaxCommentsPerPost
}
$seedSw.Stop()
Write-Host ("   done in {0:N1}s" -f $seedSw.Elapsed.TotalSeconds) -ForegroundColor DarkGray

$totalSw.Stop()
Write-Host ""
Write-Host ("All done in {0:N1}s." -f $totalSw.Elapsed.TotalSeconds) -ForegroundColor Green
