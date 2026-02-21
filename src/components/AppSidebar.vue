<script setup>
import { ref, onMounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { accountsList } from '../composables/useKasperStore.js';
import { loadAccountsList, init as initKasper } from '../composables/useKasperActions.js';

const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);

// ─── Sous-menus expand/collapse ───────────────────────────────────────────────
const isNewTradeOpen     = ref(false);
const isJournalOpen      = ref(false);
const isRocketsOpen      = ref(false);
const isKasperOpen       = ref(false);

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(view) {
  emit('update:modelValue', view);
}

function isActive(view) {
  return props.modelValue === view;
}

// Ouvre le bon sous-menu si la vue active est dedans
function isInGroup(views) {
  return views.includes(props.modelValue);
}

// ─── Comptes Kasper dynamiques ────────────────────────────────────────────────
// Charge les comptes kasper au démarrage (init() a un guard contre le double-init)
onMounted(async () => {
  await initKasper();
  await loadAccountsList();
});

// ─── Window controls Tauri ────────────────────────────────────────────────────
const appWindow = getCurrentWindow();
const minimize        = () => appWindow.minimize();
const toggleMaximize  = () => appWindow.toggleMaximize();
const close           = () => appWindow.close();
</script>

<template>
  <aside class="sidebar">

    <!-- ── Header : drag region + window controls ── -->
    <div class="sidebar-header" data-tauri-drag-region>
      <span class="app-logo" data-tauri-drag-region>
        <span class="logo-icon">🚀</span>
        <span class="logo-text">TradeVision</span>
      </span>
      <div class="window-controls">
        <button class="wc-btn" @click="minimize" title="Réduire">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,9 L9,9" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <button class="wc-btn" @click="toggleMaximize" title="Agrandir">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 H9 V9 H1 Z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
        </button>
        <button class="wc-btn close-btn" @click="close" title="Fermer">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>

    <!-- ── Navigation ── -->
    <nav class="sidebar-nav">

      <!-- SECTION : PRINCIPAL -->
      <div class="section-label">PRINCIPAL</div>

      <button class="nav-item" :class="{ active: isActive('dashboard') }" @click="navigate('dashboard')">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Dashboard</span>
      </button>

      <!-- ➕ Nouveau Trade -->
      <button class="nav-item has-submenu" :class="{ 'submenu-active': isInGroup(['wheel','pcs','rockets','kasper']) }" @click="isNewTradeOpen = !isNewTradeOpen">
        <span class="nav-icon">➕</span>
        <span class="nav-label">Nouveau Trade</span>
        <span class="chevron" :class="{ open: isNewTradeOpen }">›</span>
      </button>
      <div class="submenu" :class="{ open: isNewTradeOpen }">
        <button class="sub-item" :class="{ active: isActive('wheel') }" @click="navigate('wheel')">Wheel</button>
        <button class="sub-item" :class="{ active: isActive('pcs') }" @click="navigate('pcs')">PCS</button>
        <button class="sub-item" :class="{ active: isActive('rockets') }" @click="navigate('rockets')">Rockets</button>
        <button class="sub-item" :class="{ active: isActive('kasper') }" @click="navigate('kasper')">Forex</button>
      </div>

      <!-- 📓 Historiques -->
      <button class="nav-item has-submenu" :class="{ 'submenu-active': isInGroup(['historique-wheel','historique-pcs','historique-rockets']) || props.modelValue?.startsWith('historique-mt5') }" @click="isJournalOpen = !isJournalOpen">
        <span class="nav-icon">📓</span>
        <span class="nav-label">Historiques</span>
        <span class="chevron" :class="{ open: isJournalOpen }">›</span>
      </button>
      <div class="submenu" :class="{ open: isJournalOpen }">
        <button class="sub-item" :class="{ active: isActive('historique-wheel') }" @click="navigate('historique-wheel')">Historique Wheel</button>
        <button class="sub-item" :class="{ active: isActive('historique-pcs') }" @click="navigate('historique-pcs')">Historique PCS</button>
        <button class="sub-item" :class="{ active: isActive('historique-rockets') }" @click="navigate('historique-rockets')">Historique Rockets</button>
        <!-- Comptes Kasper dynamiques -->
        <button
          v-for="acc in accountsList"
          :key="acc.id"
          class="sub-item"
          :class="{ active: isActive('historique-mt5-' + acc.id) }"
          @click="navigate('historique-mt5-' + acc.id)"
        >
          {{ acc.name }}
        </button>
      </div>

      <!-- 📝 Notes -->
      <button class="nav-item" :class="{ active: isActive('notes') }" @click="navigate('notes')">
        <span class="nav-icon">📝</span>
        <span class="nav-label">Notes</span>
      </button>

      <!-- SECTION : ANALYSES -->
      <div class="section-label">ANALYSES</div>

      <!-- 🚀 Rocket Academy -->
      <button class="nav-item has-submenu" :class="{ 'submenu-active': isInGroup(['statistiques-options','statistiques-rockets','wheel-statistiques','pcs-statistiques','analyse-ia','plans','tags']) }" @click="isRocketsOpen = !isRocketsOpen">
        <span class="nav-icon">🚀</span>
        <span class="nav-label">Rocket Academy</span>
        <span class="chevron" :class="{ open: isRocketsOpen }">›</span>
      </button>
      <div class="submenu" :class="{ open: isRocketsOpen }">
        <button class="sub-item" :class="{ active: isActive('statistiques-options') }" @click="navigate('statistiques-options')">📈 Statistiques Options</button>
        <button class="sub-item sub-item--indent" :class="{ active: isActive('wheel-statistiques') }" @click="navigate('wheel-statistiques')">↳ Wheel</button>
        <button class="sub-item sub-item--indent" :class="{ active: isActive('pcs-statistiques') }" @click="navigate('pcs-statistiques')">↳ PCS</button>
        <button class="sub-item" :class="{ active: isActive('statistiques-rockets') }" @click="navigate('statistiques-rockets')">📈 Statistiques Rockets</button>
        <button class="sub-item" :class="{ active: isActive('analyse-ia') }" @click="navigate('analyse-ia')">🤖 Analyse IA</button>
        <button class="sub-item" :class="{ active: isActive('plans') }" @click="navigate('plans')">📋 Plans</button>
        <button class="sub-item" :class="{ active: isActive('tags') }" @click="navigate('tags')">🏷️ Tags</button>
      </div>

      <!-- 💱 Kasper Academy -->
      <button class="nav-item has-submenu" :class="{ 'submenu-active': isInGroup(['kasper-statistiques','kasper-analyse-ia','kasper-plans','kasper-tags']) }" @click="isKasperOpen = !isKasperOpen">
        <span class="nav-icon">💱</span>
        <span class="nav-label">Kasper Academy</span>
        <span class="chevron" :class="{ open: isKasperOpen }">›</span>
      </button>
      <div class="submenu" :class="{ open: isKasperOpen }">
        <button class="sub-item" :class="{ active: isActive('kasper-statistiques') }" @click="navigate('kasper-statistiques')">📈 Statistiques</button>
        <button class="sub-item" :class="{ active: isActive('kasper-analyse-ia') }" @click="navigate('kasper-analyse-ia')">🤖 Analyse IA</button>
        <button class="sub-item" :class="{ active: isActive('kasper-plans') }" @click="navigate('kasper-plans')">📋 Plans</button>
        <button class="sub-item" :class="{ active: isActive('kasper-tags') }" @click="navigate('kasper-tags')">🏷️ Tags</button>
      </div>

      <!-- SECTION : DONNÉES DE MARCHÉ -->
      <div class="section-label">DONNÉES DE MARCHÉ</div>

      <button class="nav-item" :class="{ active: isActive('calendrier') }" @click="navigate('calendrier')">
        <span class="nav-icon">📅</span>
        <span class="nav-label">Calendrier</span>
      </button>

      <button class="nav-item" :class="{ active: isActive('retails') }" @click="navigate('retails')">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Retails</span>
      </button>

      <button class="nav-item" :class="{ active: isActive('saisonnalite') }" @click="navigate('saisonnalite')">
        <span class="nav-icon">🌊</span>
        <span class="nav-label">Saisonnalité</span>
      </button>

      <!-- SECTION : PARAMÈTRES -->
      <div class="section-label">PARAMÈTRES</div>

      <button class="nav-item" :class="{ active: isActive('comptes') }" @click="navigate('comptes')">
        <span class="nav-icon">💾</span>
        <span class="nav-label">Comptes</span>
      </button>

      <button class="nav-item" :class="{ active: isActive('tuto') }" @click="navigate('tuto')">
        <span class="nav-icon">📖</span>
        <span class="nav-label">Aide</span>
      </button>

    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  flex-shrink: 0;
}

/* ── Header ── */
.sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  cursor: default;
  -webkit-app-region: drag;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: drag;
}

.logo-icon {
  font-size: 1rem;
}

.logo-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: 0.02em;
}

/* Window controls */
.window-controls {
  display: flex;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.wc-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.wc-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
}

.close-btn:hover {
  background: #e81123;
  color: #fff;
}

/* ── Navigation ── */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

/* Section labels */
.section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  padding: 12px 16px 4px;
  opacity: 0.6;
  text-transform: uppercase;
}

/* Nav items */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  border-radius: 0;
  position: relative;
}

.nav-item:hover {
  background: #2a2a2a;
  color: var(--text-color);
}

.nav-item.active {
  color: var(--text-color);
  background: rgba(57, 108, 216, 0.12);
}

.nav-item.active .nav-icon {
  filter: none;
}

.nav-item.submenu-active {
  color: var(--text-color);
}

.nav-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.nav-label {
  flex: 1;
}

/* Chevron */
.chevron {
  font-size: 1.1rem;
  color: var(--text-muted);
  transition: transform 0.2s;
  display: inline-block;
  line-height: 1;
}

.chevron.open {
  transform: rotate(90deg);
}

/* Submenus */
.submenu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.22s ease;
}

.submenu.open {
  max-height: 300px;
}

.sub-item {
  display: block;
  width: 100%;
  padding: 6px 16px 6px 44px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.sub-item:hover {
  background: #2a2a2a;
  color: var(--text-color);
}

.sub-item.active {
  color: var(--accent-color);
  font-weight: 600;
}

.sub-item--indent {
  padding-left: 58px;
  font-size: 0.78rem;
  opacity: 0.85;
}
.sub-item--indent::before {
  content: '';
  display: inline-block;
  width: 1px;
  height: 12px;
  background: var(--border-color);
  margin-right: 6px;
  vertical-align: middle;
}
</style>
