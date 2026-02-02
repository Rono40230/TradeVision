#!/bin/bash

# TradeVision Tauri Dev Launcher
# Fixes: Wayland DMABUF + Rust stack size issues on Fedora

export WEBKIT_DISABLE_DMABUF_RENDERER=1
export RUST_MIN_STACK=16777216

echo "🚀 Launching TradeVision (Fedora Fixes Applied)..."
echo "   - Wayland DMABUF renderer disabled"
echo "   - Rust stack size: 16MB"
echo ""

cd "$(dirname "$0")" || exit 1
npm run tauri dev
