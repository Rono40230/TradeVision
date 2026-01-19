#!/bin/bash
# audit.sh - Validation Phase 2 (Le Grand Jury)

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "⚖️  AUDIT VIBE - Démarrage..."

ERRORS=0

# 1. Vérification config
if [ ! -f ".vibe/config.toml" ]; then
    echo "❌ Config manquante !"
    exit 1
fi

# 2. Exécution des tests profonds (via plugins)
echo "🧪 Exécution des tests Vue..."
if ! ./.vibe/plugins/vue/test.sh; then
    echo "❌ Tests Vue échoués"
    ERRORS=$((ERRORS + 1))
fi

echo "🦀 Exécution des tests Rust..."
if ! ./.vibe/plugins/rust/test.sh; then
    echo "❌ Tests Rust échoués"
    ERRORS=$((ERRORS + 1))
fi

echo "🔒 Audit sécurité..."
if ! ./.vibe/plugins/security/audit.sh; then
    echo "❌ Audit sécurité échoué"
    ERRORS=$((ERRORS + 1))
fi

# 3. Vérifications statiques (Taille, Todo...)
echo "📏 Vérification taille fichiers (règle 16)..."
# Ajuster selon règle 16: <250 Vue, <300 Rust, <120 main.rs
for file in src/**/*.vue src/*.vue; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        if [ "$lines" -gt 250 ]; then
            echo "❌ $file : $lines lignes (>250)"
            ERRORS=$((ERRORS + 1))
        else
            echo "✅ $file : $lines lignes"
        fi
    fi
done
for file in src-tauri/src/*.rs; do
    if [ -f "$file" ] && [[ "$file" != *"main.rs" ]]; then
        lines=$(wc -l < "$file")
        if [ "$lines" -gt 300 ]; then
            echo "❌ $file : $lines lignes (>300)"
            ERRORS=$((ERRORS + 1))
        else
            echo "✅ $file : $lines lignes"
        fi
    fi
done
# Main.rs
if [ -f "src-tauri/src/main.rs" ]; then
    lines=$(wc -l < "src-tauri/src/main.rs")
    if [ "$lines" -gt 120 ]; then
        echo "❌ src-tauri/src/main.rs : $lines lignes (>120)"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ src-tauri/src/main.rs : $lines lignes"
    fi
fi

echo "🔍 Vérifications règles .clinerules..."
# Règle 2 : Nommage en Français (simple check : pas de mots anglais courants)
if grep -r -i "\bfunction\b\|\bvariable\b\|\bconst\b\|\blet\b\|\bif\b\|\bfor\b\|\breturn\b" src/ src-tauri/src/ --include="*.js" --include="*.vue" --include="*.rs" > /dev/null 2>&1; then
    echo "⚠️ Règle 2 : Mots anglais détectés (vérifiez nommage français)"
else
    echo "✅ Règle 2 : Nommage semble français"
fi

# Règle 10 : Pas de console.log, debugger, alert
if grep -r "console\.log\|console\.error\|console\.warn\|console\.debug\|debugger\|alert" src/ --include="*.js" --include="*.vue" > /dev/null 2>&1; then
    echo "❌ Règle 10 : console/debugger/alert trouvé"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Règle 10 : Pas de console/debugger/alert"
fi

# Règle 11 : Script setup obligatoire
if find src/ -name "*.vue" -exec grep -L "<script setup" {} \; | grep -q .; then
    echo "❌ Règle 11 : Fichier Vue sans <script setup"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Règle 11 : Tous les Vue utilisent <script setup"
fi

# Règle 12 : Sécurité Frontend
if grep -r "v-html\|innerHTML" src/ --include="*.vue" > /dev/null 2>&1; then
    echo "❌ Règle 12 : v-html ou innerHTML trouvé (risque XSS)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Règle 12 : Pas de v-html/innerHTML"
fi

# Règle 13 : Auto-vérification Rust
echo "🦀 Vérification compilation Rust..."
if (cd src-tauri && cargo check --quiet); then
    echo "✅ Règle 13 : Cargo check réussi"
else
    echo "❌ Règle 13 : Erreur de compilation Rust"
    ERRORS=$((ERRORS + 1))
fi

# Règle 17 : Pas d'unwrap/unsafe
if grep -r "unwrap\|\.unwrap\|unsafe" src-tauri/src/ --include="*.rs" > /dev/null 2>&1; then
    echo "❌ Règle 17 : unwrap() ou unsafe trouvé"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Règle 17 : Pas d'unwrap/unsafe"
fi

# Règle 18 : Documentation (simplifié)
# Vérifie les commentaires /// au-dessus des fonctions publiques
MISSING_DOCS=$(grep -r "^pub fn" src-tauri/src/ --include="*.rs" | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    # Échapper les caractères spéciaux pour grep -F si nécessaire, ou utiliser cut simplement
    signature=$(echo "$line" | cut -d: -f3-)
    
    # Chercher la signature dans le fichier avec 5 lignes de contexte avant
    # Vérifier si l'une de ces lignes contient ///
    if ! grep -B5 -F "$signature" "$file" | grep -q "///"; then
        echo "$signature ($file)"
    fi
done)

if [ -n "$MISSING_DOCS" ]; then
    echo "❌ Règle 18 : Fonctions publiques sans documentation :"
    echo "$MISSING_DOCS"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Règle 18 : Fonctions publiques documentées"
fi

# Règle 4 : TODO avec nom
if grep -r "TODO[^:]*:" src/ src-tauri/src/ --include="*.js" --include="*.vue" --include="*.rs" | grep -v "TODO([a-zA-Z_][a-zA-Z0-9_]*):" > /dev/null 2>&1; then
    echo "❌ Règle 4 : TODO sans nom trouvé"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Règle 4 : TODO avec nom"
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ AUDIT SUCCÈS - PRÊT POUR COMMIT${NC}"
    exit 0
else
    echo -e "${RED}❌ AUDIT ÉCHOUÉ - CORRIGEZ LES ERREURS${NC}"
    exit 1
fi
