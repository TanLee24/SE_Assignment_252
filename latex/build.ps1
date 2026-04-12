#!/usr/bin/env powershell
# Build script for LaTeX project with TOC generation
# Usage: .\build.ps1

param(
    [switch]$Clean = $false
)

$ErrorActionPreference = "Continue"

if ($Clean) {
    Write-Host "Cleaning build files..." -ForegroundColor Yellow
    latexmk -C
}

Write-Host "`n=== LaTeX Build with TOC Generation ===" -ForegroundColor Green

# Run 3 passes to ensure TOC is generated and included
for ($i = 1; $i -le 3; $i++) {
    Write-Host "`nPass $i`: " -NoNewline -ForegroundColor Cyan
    
    if ($i -eq 1) { Write-Host "Initial compilation..." }
    elseif ($i -eq 2) { Write-Host "Generate table of contents..." }
    else { Write-Host "Include TOC in PDF..." }
    
    $output = pdflatex -interaction=nonstopmode -file-line-error -shell-escape -recorder main.tex 2>&1
    
    # Check if successful
    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
        Write-Host "[OK] Pass $i complete" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Pass $i failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== Build Completed ===" -ForegroundColor Green

# Verify outputs
if (Test-Path "main.pdf") {
    $size = (Get-Item main.pdf).Length / 1MB
    $log_content = Get-Content main.log -Encoding UTF8
    $page_match = $log_content | Select-String "Output written on"
    Write-Host "[OK] main.pdf created (${size:F2} MB)" -ForegroundColor Green
    Write-Host "    $page_match" -ForegroundColor Cyan
} else {
    Write-Host "[FAIL] main.pdf not found!" -ForegroundColor Red
}

if (Test-Path "main.toc") {
    $lines = (Get-Content main.toc | Measure-Object -Line).Lines
    Write-Host "[OK] Table of contents generated ($lines lines)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] main.toc not found!" -ForegroundColor Red
}
