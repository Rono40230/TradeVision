#!/bin/bash
# check-quality.sh - Vérificateur de qualité de code VibeOS
# Vérifie la taille des fichiers et autres métriques de qualité

EXIT_CODE=0
VIBE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONFIG_FILE="$VIBE_ROOT/.vibe/config.toml"

# Fonction pour lire config
get_config() {
    local key=$1
    grep "^$key =" "$CONFIG_FILE" | cut -d'=' -f2 | tr -d ' "[]'
}

MAX_LINES=$(get_config "max_file_lines" || echo 150)

echo "📏 Vérification de la qualité du code (Atomic Design Rule 16)..."

# Seuils spécifiques (Rule 16)
LIMIT_RUST=300
LIMIT_VUE=250
LIMIT_MAIN=120
LIMIT_JS=300

# 1. Vérification Main.rs (120 lignes)
find src-tauri/src -name "main.rs" -exec wc -l {} + | awk -v max=$LIMIT_MAIN '$1 > max {print $2 " (" $1 " lignes) [Max " max "]"}' >> /tmp/oversized_files.txt

# 2. Vérification Services Rust (300 lignes) - exclusion de main.rs
find src-tauri/src -name "*.rs" -not -name "main.rs" -exec wc -l {} + | awk -v max=$LIMIT_RUST '$1 > max {print $2 " (" $1 " lignes) [Max " max "]"}' >> /tmp/oversized_files.txt

# 3. Vérification Composants Vue (250 lignes)
find src -type f -name "*.vue" -not -path "*/node_modules/*" -exec wc -l {} + | awk -v max=$LIMIT_VUE '$1 > max {print $2 " (" $1 " lignes) [Max " max "]"}' >> /tmp/oversized_files.txt

# 4. Vérification JS/TS (aligné sur Rust/Standard - 300 lignes)
find src -type f \( -name "*.js" -o -name "*.ts" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -exec wc -l {} + | awk -v max=$LIMIT_JS '$1 > max {print $2 " (" $1 " lignes) [Max " max "]"}' >> /tmp/oversized_files.txt

if [ -s /tmp/oversized_files.txt ]; then
    echo "⚠️  FICHIERS HORS NORMES (Atomic Design) :"
    cat /tmp/oversized_files.txt | sed 's/^/   - /'
    rm /tmp/oversized_files.txt
else
    echo "✅ Taille des fichiers : OK"
    rm -f /tmp/oversized_files.txt
fi

exit $EXIT_CODE
