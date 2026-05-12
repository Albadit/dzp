#requires -Version 5.1
<#
.SYNOPSIS
    Clears and re-seeds Rotterdam wijkcentra data in community chunks.

.EXAMPLE
    .\reseed.ps1

.EXAMPLE
    .\reseed.ps1 -CommunityChunkSize 5 -PostsPerCommunity 20

.EXAMPLE
    .\reseed.ps1 -SkipClear -CommunityChunkSize 1
#>

[CmdletBinding()]
param(
    # [string]$Server   = '127.0.0.1',
    # [string]$Database = 'dzp_dnndev',
    # [string]$User     = 'dnndev',
    # [string]$Password = 'Dnnd3v@123',
    [string]$Server   = 'tcp:bondwesteuserver.database.windows.net,1433',
    [string]$Database = 'db_DZP-V1',
    [string]$User     = 'beheer',
    [string]$Password = '7dWb+]e6HxM9~TVC',

    [int]$UsersPerCommunity     = 100,
    [int]$GroupsPerCommunity    = 4,
    [int]$CompaniesPerCommunity = 10,
    [int]$PostsPerCommunity     = 20,
    [int]$MinCommentsPerPost    = 5,
    [int]$MaxCommentsPerPost    = 15,
    [int]$SingleQuestionsPerSurvey = 4,
    [int]$MultiQuestionsPerSurvey  = 4,
    [int]$OpenQuestionsPerSurvey   = 2,

    [int]$CommunityChunkSize    = 1,

    [switch]$SkipClear
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ([string]::IsNullOrWhiteSpace($Server))   { throw "Missing SQL server. Pass -Server or set DZP_SQL_SERVER." }
if ([string]::IsNullOrWhiteSpace($Database)) { throw "Missing SQL database. Pass -Database or set DZP_SQL_DATABASE." }
if ([string]::IsNullOrWhiteSpace($User))     { throw "Missing SQL user. Pass -User or set DZP_SQL_USER." }
if ([string]::IsNullOrWhiteSpace($Password)) { throw "Missing SQL password. Pass -Password or set DZP_SQL_PASSWORD." }

if ($CommunityChunkSize -lt 1) {
    throw "CommunityChunkSize must be at least 1."
}

if ($UsersPerCommunity -lt 1) {
    throw "UsersPerCommunity must be at least 1."
}

if ($GroupsPerCommunity -lt 0) {
    throw "GroupsPerCommunity cannot be negative."
}

if ($CompaniesPerCommunity -lt 0) {
    throw "CompaniesPerCommunity cannot be negative."
}

if ($PostsPerCommunity -lt 0) {
    throw "PostsPerCommunity cannot be negative."
}

if ($MinCommentsPerPost -lt 0) {
    throw "MinCommentsPerPost cannot be negative."
}

if ($MaxCommentsPerPost -lt $MinCommentsPerPost) {
    throw "MaxCommentsPerPost must be greater than or equal to MinCommentsPerPost."
}

function Invoke-Sqlcmd-File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$File,

        [hashtable]$Vars
    )

    $path = Join-Path $scriptDir $File

    if (-not (Test-Path -LiteralPath $path)) {
        throw "SQL file not found: $path"
    }

    $args = @(
        '-S', $Server,
        '-d', $Database,
        '-U', $User,
        '-P', $Password,
        '-I',
        '-b',
        '-w', '160',
        '-i', $path
    )

    if ($Vars) {
        foreach ($k in $Vars.Keys) {
            $args += '-v'
            $args += "$k=$($Vars[$k])"
        }
    }

    $output = & sqlcmd @args 2>&1
    $exitCode = $LASTEXITCODE

    foreach ($line in $output) {
        Write-Host $line
    }

    if ($exitCode -ne 0) {
        throw "$File failed with exit code $exitCode"
    }
}

$totalSw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host ""
Write-Host "Target: $Server / $Database" -ForegroundColor DarkGray
Write-Host ("Scale: users/community={0}, groups/community={1}, companies/community={2}, posts/community={3}, comments/post={4}-{5}, chunk={6}" `
    -f $UsersPerCommunity, $GroupsPerCommunity, $CompaniesPerCommunity, $PostsPerCommunity, $MinCommentsPerPost, $MaxCommentsPerPost, $CommunityChunkSize) -ForegroundColor DarkGray

if (-not $SkipClear) {
    Write-Host ""
    Write-Host "Clearing previous seed data..." -ForegroundColor Cyan
    Invoke-Sqlcmd-File 'seed-wijkcentra-clear.sql' $null
}

Write-Host ""
Write-Host "Seeding Rotterdam communities..." -ForegroundColor Cyan

$totalCommunities = 50

for ($offset = 0; $offset -lt $totalCommunities; $offset += $CommunityChunkSize) {
    $limit = [Math]::Min($CommunityChunkSize, $totalCommunities - $offset)
    $from = $offset + 1
    $to = $offset + $limit

    Write-Host ""
    Write-Host ("Chunk {0}-{1}/{2}" -f $from, $to, $totalCommunities) -ForegroundColor Yellow

    $chunkSw = [System.Diagnostics.Stopwatch]::StartNew()

    Invoke-Sqlcmd-File 'seed-wijkcentra.sql' @{
        UsersPerCommunity        = $UsersPerCommunity
        GroupsPerCommunity       = $GroupsPerCommunity
        CompaniesPerCommunity    = $CompaniesPerCommunity
        PostsPerCommunity        = $PostsPerCommunity
        MinCommentsPerPost       = $MinCommentsPerPost
        MaxCommentsPerPost       = $MaxCommentsPerPost
        SingleQuestionsPerSurvey = $SingleQuestionsPerSurvey
        MultiQuestionsPerSurvey  = $MultiQuestionsPerSurvey
        OpenQuestionsPerSurvey   = $OpenQuestionsPerSurvey
        CommunityOffset          = $offset
        CommunityLimit           = $limit
    }

    $chunkSw.Stop()
    Write-Host ("Chunk {0}-{1} done in {2:N1}s" -f $from, $to, $chunkSw.Elapsed.TotalSeconds) -ForegroundColor DarkGray
}

$totalSw.Stop()

Write-Host ""
Write-Host ("All done in {0:N1}s." -f $totalSw.Elapsed.TotalSeconds) -ForegroundColor Green