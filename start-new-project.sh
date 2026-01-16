#!/bin/bash
# start-new-project.sh - Script de démarrage pour créer un nouveau projet avec Vibe-Framework

echo "🚀 Création d'un Nouveau Projet avec Vibe-Framework"
echo "=================================================="

# Demander le nom du projet
read -p "Nom du projet : " PROJECT_NAME
if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Nom requis."
    exit 1
fi

# Définir le répertoire parent (au même niveau que Vibe-Framework)
PARENT_DIR="$(cd .. && pwd)"

# Demander la stack
echo "Choisissez la stack :"
echo "1) Rust + Vue.js (Tauri app)"
echo "2) Python seul"
echo "3) Autre (manuel)"
read -p "Choix (1-3) : " STACK_CHOICE

case $STACK_CHOICE in
    1)
        STACK="rust-vue"
        echo "📦 Création d'une app Tauri (Rust + Vue)..."
        if ! command -v npx >/dev/null 2>&1; then
            echo "❌ npx requis. Installe Node.js."
            exit 1
        fi
        cd "$PARENT_DIR" && npx create-tauri-app "$PROJECT_NAME" --template vue --yes
        ;;
    2)
        STACK="python"
        echo "🐍 Création d'un projet Python..."
        cd "$PARENT_DIR" && mkdir "$PROJECT_NAME"
        cd "$PROJECT_NAME"
        echo "# $PROJECT_NAME" > README.md
        echo "python>=3.8" > requirements.txt
        ;;
    3)
        STACK="manual"
        echo "📁 Création d'un dossier vide..."
        cd "$PARENT_DIR" && mkdir "$PROJECT_NAME"
        cd "$PROJECT_NAME"
        ;;
    *)
        echo "❌ Choix invalide."
        exit 1
        ;;
esac

cd "$PARENT_DIR/$PROJECT_NAME" || exit 1

# Copier Vibe-Framework
VIBE_SOURCE="$(cd .. && pwd)/Vibe-Framework"
echo "🔮 Installation de Vibe-Framework..."
cp -r "$VIBE_SOURCE"/* .
cp -r "$VIBE_SOURCE"/.* . 2>/dev/null || true  # Copier les fichiers cachés comme .vibe
rm -rf screenshots videos  # Nettoyer les médias du template

# Installer Vibe
./install-vibe.sh "$VIBE_SOURCE"

# Vérifier si l'installation a réussi
if [ $? -ne 0 ]; then
    echo "❌ Échec de l'installation Vibe-Framework. Vérifiez les dépendances et relancez."
    exit 1
fi

# Configurer la stack dans config.toml
case $STACK in
    rust-vue)
        sed -i 's/stack = .*/stack = ["rust", "vue"]/' .vibe/config.toml
        ;;
    python)
        sed -i 's/stack = .*/stack = ["python"]/' .vibe/config.toml
        ;;
    manual)
        echo "⚙️ Configurez .vibe/config.toml manuellement."
        ;;
esac

# Installer un hook Git pre-commit pour audits automatiques (si repo Git existe)
if [ -d ".git" ]; then
    mkdir -p .git/hooks
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Exécution de l'audit Vibe avant commit..."
if ./.vibe/bin/audit.sh; then
    echo "✅ Audit passé : commit autorisé."
    exit 0
else
    echo "❌ Audit échoué : corrigez les erreurs avant de committer."
    exit 1
fi
EOF
    chmod +x .git/hooks/pre-commit
    echo "🔒 Hook pre-commit installé : audits automatiques sur chaque commit."
fi

echo "✅ Projet '$PROJECT_NAME' créé avec Vibe-Framework !"
echo ""
echo "📂 Structure :"
ls -la
echo ""
echo "🚀 Démarrage automatique de la surveillance Vibe..."
./vibe &
echo "✅ Surveillance démarrée en arrière-plan."
echo "📖 Consultez README.md pour plus d'infos."