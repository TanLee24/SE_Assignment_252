#!/bin/bash
# Build script to properly generate PDF with TOC
# Usage: ./build.sh

cd "$(dirname "$0")" || exit 1

echo "=== LaTeX Build with TOC Generation ==="
echo "Pass 1: Initial compilation..."
pdflatex -interaction=nonstopmode -file-line-error -shell-escape main.tex > /dev/null

echo "Pass 2: Generate Table of Contents..."
pdflatex -interaction=nonstopmode -file-line-error -shell-escape main.tex > /dev/null

echo "Pass 3: Include TOC in PDF..."
pdflatex -interaction=nonstopmode -file-line-error -shell-escape main.tex > /dev/null

echo "=== Build Completed ===" 
echo "Output: main.pdf"
ls -lh main.pdf
