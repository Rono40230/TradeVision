#!/bin/bash
# Plugin Vue.js - Fix
# Tente de corriger le formatage et le linting si package.json existe

if [ -f "package.json" ]; then
    # 1. ESLint Fix (si script dispo)
    if grep -q "lint" package.json; then
        npm run lint -- --fix > /dev/null 2>&1 || true
    fi
    
    # 2. Prettier (si pas géré par lint)
    if grep -q "format" package.json; then
        npm run format > /dev/null 2>&1 || true
    fi
fi
