<#
.SYNOPSIS
  一键启动开发环境：后端 (tsx watch :8762) + 前端 (vite :8763)
.DESCRIPTION
  与 scripts/dev.sh 行为对等：检查依赖与端口，后台启动后端，
  待健康检查通过后前台启动前端；Ctrl+C 退出时后端进程树一并停止。
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
.EXAMPLE
  .\scripts\dev.ps1 -Force
#>
[CmdletBinding()]
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$BackendPort = 8762
if ($env:PORT -match '^\d+$') { $BackendPort = [int]$env:PORT }
$FrontendPort = 8763
$TempDir = if ($env:TEMP) { $env:TEMP } else { [IO.Path]::GetTempPath() }
$BackendLog = Join-Path $TempDir 'ai-hot-news-backend.log'
$BackendErrLog = "$BackendLog.err"
$HealthUrl = "http://127.0.0.1:$BackendPort/api/health"

function Write-Info {
  param([string]$Message)
  Write-Host "[dev] $Message" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[dev] $Message" -ForegroundColor Yellow
}

function Invoke-Fail {
  param([string]$Message)
  [Console]::Error.WriteLine("[dev] $Message")
  exit 1
}

function Get-PortPids {
  param([int]$Port)
  $found = @()
  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) { $found += $c.OwningProcess }
  } else {
    foreach ($line in (netstat -ano)) {
      if ($line -notmatch 'LISTENING') { continue }
      $parts = $line.Trim() -split '\s+'
      if ($parts.Count -ge 2 -and $parts[1] -match "[:\]]$Port$") {
        $found += [int]$parts[$parts.Count - 1]
      }
    }
  }
  return @($found | Sort-Object -Unique)
}

function Assert-PortFree {
  param([int]$Port)
  $pids = Get-PortPids -Port $Port
  if ($pids.Count -gt 0) {
    $list = $pids -join ', '
    if ($Force) {
      Write-Warn "端口 $Port 被占用（PID: $list），-Force 已开启，正在终止..."
      foreach ($id in $pids) {
        try { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } catch { }
      }
      Start-Sleep -Seconds 1
    } else {
      Invoke-Fail "端口 $Port 已被占用（PID: $list）。先处理：Stop-Process -Id $list  或使用 .\scripts\dev.ps1 -Force"
    }
  }
}

function Stop-ProcessTree {
  param([int]$Id)
  try {
    $children = Get-CimInstance -ClassName Win32_Process -Filter "ParentProcessId=$Id" -ErrorAction SilentlyContinue
    foreach ($child in $children) { Stop-ProcessTree -Id $child.ProcessId }
  } catch { }
  try { Stop-Process -Id $Id -Force -ErrorAction SilentlyContinue } catch { }
}

function Show-BackendLogTail {
  foreach ($file in @($BackendErrLog, $BackendLog)) {
    if (Test-Path -LiteralPath $file) {
      Write-Host "----- $file（最后 20 行）-----"
      Get-Content -LiteralPath $file -Tail 20
    }
  }
}

function Show-BackendFailure {
  param([string]$Message)
  Show-BackendLogTail
  $logText = @($BackendErrLog, $BackendLog) |
    Where-Object { Test-Path -LiteralPath $_ } |
    ForEach-Object { Get-Content -LiteralPath $_ -Tail 30 -ErrorAction SilentlyContinue } |
    Out-String
  if ($logText -match 'ERR_MODULE_NOT_FOUND|Cannot find (package|module)') {
    Write-Warn '检测到缺失的依赖，可尝试：cd backend; Remove-Item -Recurse -Force node_modules; npm install'
  }
  Invoke-Fail $Message
}

foreach ($cmd in @('node', 'npm')) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Invoke-Fail "未找到 $cmd，请先安装 Node.js (>= 18) 并确保其在 PATH 中"
  }
}

function Assert-Dependencies {
  param([string]$Name, [string]$Dir)
  $needInstall = $false
  if (-not (Test-Path (Join-Path $Dir 'node_modules'))) {
    $needInstall = $true
  } else {
    # 目录存在不代表安装完整（如中断过），用 npm ls 校验直接依赖是否齐备
    Push-Location $Dir
    try {
      & npm ls --depth=0 > $null 2>&1
      if ($LASTEXITCODE -ne 0) { $needInstall = $true }
    } finally { Pop-Location }
  }
  if ($needInstall) {
    Write-Info "安装${Name}依赖..."
    Push-Location $Dir
    try { & npm install } finally { Pop-Location }
  }
}

Set-Location -LiteralPath $Root

# 依赖检查
Assert-Dependencies -Name '前端' -Dir $Root
Assert-Dependencies -Name '后端' -Dir (Join-Path $Root 'backend')

# 端口检查
Assert-PortFree -Port $BackendPort
Assert-PortFree -Port $FrontendPort

if (Test-Path -LiteralPath $BackendLog) { Remove-Item $BackendLog -Force }
if (Test-Path -LiteralPath $BackendErrLog) { Remove-Item $BackendErrLog -Force }

# 启动后端（后台）
Write-Info "启动后端 (tsx watch, :$BackendPort)..."
$backendProc = Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/d', '/c', 'npm run dev' `
  -WorkingDirectory (Join-Path $Root 'backend') `
  -RedirectStandardOutput $BackendLog `
  -RedirectStandardError $BackendErrLog `
  -WindowStyle Hidden -PassThru

try {
  # 等待后端健康检查
  Write-Info '等待后端就绪...'
  $ready = $false
  for ($i = 1; $i -le 30; $i++) {
    try {
      Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
      break
    } catch { }
    Start-Sleep -Milliseconds 500
    if (-not (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) {
      Show-BackendFailure '后端启动失败，见上方日志'
    }
  }
  if (-not $ready) {
    try { Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 2 | Out-Null }
    catch { Show-BackendFailure '后端健康检查超时' }
  }
  Write-Info "后端已就绪 ✓  (日志: $BackendLog)"

  # 启动前端（前台）
  Write-Info "启动前端 (vite, :$FrontendPort)..."
  Write-Host "[dev] 访问 http://localhost:$FrontendPort  (Ctrl+C 退出，前后端一并停止)" -ForegroundColor Green
  & npm run dev
} finally {
  if ($backendProc -and (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) {
    Write-Info "停止后端 (PID $($backendProc.Id))..."
    Stop-ProcessTree -Id $backendProc.Id
  }
}
