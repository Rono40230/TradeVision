#!/bin/bash
# plugins/security/audit.sh - Audit de sécurité avancé
# Lance cargo audit et npm audit pour détecter les vulnérabilités

EXIT_CODE=0
echo "🔒 Audit de sécurité avancé VibeOS..."

# 1. Audit Rust avec cargo audit
if command -v cargo >/dev/null 2>&1; then
    TARGET_DIR="."
    if [ -f "src-tauri/Cargo.toml" ]; then TARGET_DIR="src-tauri"; fi
    if [ -f "$TARGET_DIR/Cargo.toml" ]; then
        echo "   🔍 Audit Rust (cargo audit)..."
        if command -v cargo-audit >/dev/null 2>&1; then
            (cd "$TARGET_DIR" && cargo audit --format json | jq -r '.vulnerabilities.found // 0' 2>/dev/null || echo "0") | while read -r count; do
                if [ "$count" -gt 0 ]; then
                    echo "❌ Vulnérabilités Rust détectées : $count"
                    EXIT_CODE=1
                else
                    echo "✅ Audit Rust : OK"
                fi
            done
        else
            echo "⚠️  cargo-audit non installé. Installez avec : cargo install cargo-audit"
        fi
    fi
fi

# 2. Audit Node.js avec npm audit
if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
    echo "   🔍 Audit Node.js (npm audit)..."
    npm audit --audit-level moderate --json | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null | while read -r count; do
        if [ "$count" -gt 0 ]; then
            echo "❌ Vulnérabilités npm détectées : $count"
            EXIT_CODE=1
        else
            echo "✅ Audit npm : OK"
        fi
    done
fi

# 3. Scan des secrets avec gitleaks ou trufflehog
echo "   🔍 Scan des secrets..."
if command -v gitleaks >/dev/null 2>&1; then
    if gitleaks detect --verbose --redact --config .vibe/config.toml 2>/dev/null; then
        echo "✅ Scan secrets (gitleaks) : OK"
    else
        echo "❌ Secrets exposés détectés !"
        EXIT_CODE=1
    fi
elif command -v trufflehog >/dev/null 2>&1; then
    if trufflehog filesystem . --exclude-paths=".git,node_modules,target" --json | jq -r '.SourceMetadata.Data.Secret // empty' | grep -q .; then
        echo "❌ Secrets exposés détectés !"
        EXIT_CODE=1
    else
        echo "✅ Scan secrets (trufflehog) : OK"
    fi
else
    echo "⚠️  Aucun outil de scan secrets installé (gitleaks ou trufflehog recommandé)."
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Audit de sécurité avancé : OK"
    exit 0
else
    echo "🔴 ÉCHEC AUDIT SÉCURITÉ AVANCÉ"
    exit 1
fi