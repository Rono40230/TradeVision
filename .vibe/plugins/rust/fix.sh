#!/bin/bash
# Plugin Rust - Fix
if [ -f "Cargo.toml" ] || [ -f "src-tauri/Cargo.toml" ]; then
    # Détecter où est le Cargo.toml (racine ou src-tauri)
    TARGET_DIR="."
    if [ -f "src-tauri/Cargo.toml" ]; then TARGET_DIR="src-tauri"; fi
    
    (cd "$TARGET_DIR" && cargo fmt --quiet && cargo clippy --fix --allow-dirty --allow-staged --quiet -- -D warnings 2>/dev/null)
fi

# 3. Vérifications .clinerules (règles surveillées par Sentinel)
echo "🔍 Surveillance .clinerules pour Rust..."

# Règle 17 : Supprimer unwrap et unsafe (risqué, signaler seulement)
if grep -r "unwrap\|\.unwrap\|unsafe" src-tauri/src/ --include="*.rs" > /dev/null 2>&1; then
    echo "⚠️ .clinerules Règle 17 : unwrap() ou unsafe détecté - corrigez manuellement"
fi

# Règle 18 : Signaler fonctions publiques sans doc
if grep -r "^pub fn" src-tauri/src/ --include="*.rs" | xargs -I {} sh -c 'if ! grep -A5 "{}" src-tauri/src/*.rs | grep -q "///"; then echo "⚠️ .clinerules Règle 18 : Fonction publique sans doc : {}"; fi' 2>/dev/null; then
    true
fi

echo "✅ Corrections .clinerules appliquées pour Rust"
