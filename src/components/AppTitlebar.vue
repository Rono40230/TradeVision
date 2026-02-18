<script setup>
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useRocketStore } from '../composables/rocketStore.js';
import { computed } from 'vue';

defineProps(['modelValue']);
defineEmits(['update:modelValue']);

const { lastSyncTime, isSyncing, rocketAlerts } = useRocketStore();

const syncStatusClass = computed(() => {
  if (!lastSyncTime.value) return 'stale';
  const lastSync = new Date(lastSyncTime.value);
  const now = new Date();
  const diffHours = (now - lastSync) / (1000 * 60 * 60);

  if (diffHours < 1) return 'fresh';
  if (diffHours < 6) return 'warning';
  return 'stale';
});

const lastSyncLabel = computed(() => {
  if (isSyncing.value) return 'Sync en cours...';
  if (!lastSyncTime.value) return 'Jamais synchronisé';
  
  const lastSync = new Date(lastSyncTime.value);
  const now = new Date();
  const diffMinutes = Math.floor((now - lastSync) / (1000 * 60));
  
  if (diffMinutes < 1) return 'Sync: à l\'instant';
  if (diffMinutes < 60) return `Sync: il y a ${diffMinutes} min`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Sync: il y a ${diffHours} h`;
  
  return `Sync: ${lastSync.toLocaleDateString()}`;
});

const appWindow = getCurrentWindow();

const minimize = async () => {
  await appWindow.minimize();
};

const toggleMaximize = async () => {
  await appWindow.toggleMaximize();
};

const close = async () => {
    try {
        await appWindow.close();
    } catch (e) {}
};
</script>

<template>
    <div class="titlebar" data-tauri-drag-region>
      <div class="nav-tabs" data-tauri-drag-region>
          <button 
            class="nav-btn dashboard-btn"
            :class="{ active: modelValue === 'dashboard' }" 
            @click="$emit('update:modelValue', 'dashboard')"
          >
            Tableau de bord
          </button>
      </div>

      <button 
        class="nav-btn historique-btn"
        :class="{ active: modelValue === 'historique' }" 
        @click="$emit('update:modelValue', 'historique')"
      >
        📊 HISTORIQUE IB
      </button>

      <div class="sync-info" :class="syncStatusClass">
          <span class="sync-icon" :class="{ rotating: isSyncing }">🔄</span>
          <span class="sync-text">{{ lastSyncLabel }}</span>
      </div>

      <!-- Zone de drag native -->
      <div class="drag-region" data-tauri-drag-region></div>
      <div class="window-controls">
        <button class="control-btn minimize-btn" @click="minimize">
           <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,9 L9,9" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <button class="control-btn maximize-btn" @click="toggleMaximize">
           <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 H9 V9 H1 Z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
        </button>
        <button class="control-btn close-btn" @click="close">
           <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>
</template>

<style scoped>
.titlebar {
  height: 60px;
  background: var(--sidebar-bg);
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center; 
  z-index: 9999;
  border-bottom: 1px solid var(--border-color);
  flex: 0 0 auto;
  padding-left: 10px;
  position: relative;
}

.drag-region {
    flex-grow: 1;
    height: 100%;
}

.historique-btn {
    margin-right: 0.5rem;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
}

.titlebar-alerts {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-right: 0.75rem;
    -webkit-app-region: no-drag;
}

.titlebar-alert {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 12px;
    white-space: nowrap;
    cursor: default;
}

.titlebar-alert.high {
    background: rgba(244, 67, 54, 0.2);
    color: #ff6b6b;
    border: 1px solid rgba(244, 67, 54, 0.4);
}

.titlebar-alert.medium {
    background: rgba(255, 152, 0, 0.2);
    color: #ffb74d;
    border: 1px solid rgba(255, 152, 0, 0.4);
}

.nav-tabs {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 1.5rem;
    height: 100%;
    align-items: center;
    -webkit-app-region: no-drag; 
}

/* Styles des boutons de navigation */
.nav-btn {
    background: transparent;
    border: 2px solid rgba(255,255,255,0.1);
    color: var(--text-muted);
    padding: 8px 24px;   /* Plus larges */
    height: auto; 
    cursor: pointer;
    font-size: 1.1rem;   /* Police plus grande */
    font-weight: 700;
    transition: all 0.3s ease;
    border-radius: 8px;  /* Cadre arrondi */
    opacity: 0.8;
}

.nav-btn:hover {
    transform: translateY(-2px);
    opacity: 1;
}

.sync-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-left: auto;
    margin-right: 20px;
}

.sync-info.fresh {
    background: rgba(39, 174, 96, 0.1);
    color: #2ecc71;
}

.sync-info.warning {
    background: rgba(243, 156, 18, 0.1);
    color: #f39c12;
}

.sync-info.stale {
    background: rgba(231, 76, 60, 0.1);
    color: #e74c3c;
}

.sync-icon.rotating {
    animation: rotate 2s linear infinite;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Dashboard: Violet Pale */
.nav-btn.dashboard-btn {
    border-color: #D8BFD8; 
}
.nav-btn.dashboard-btn.active, .nav-btn.dashboard-btn:hover {
    background-color: #D8BFD8;
    color: #2c2c2c;
    box-shadow: 0 0 15px rgba(216, 191, 216, 0.3);
}

/* Rocket Academy: Vert Pale */
.nav-btn.rocket-btn {
    border-color: #98FB98; 
}
.nav-btn.rocket-btn.active, .nav-btn.rocket-btn:hover {
    background-color: #98FB98;
    color: #1a4d1a;
    box-shadow: 0 0 15px rgba(152, 251, 152, 0.3);
}

/* Kasper Academy: Bleu Pale */
.nav-btn.kasper-btn {
    border-color: #ADD8E6; 
}
.nav-btn.kasper-btn.active, .nav-btn.kasper-btn:hover {
    background-color: #ADD8E6;
    color: #1a3c4d;
    box-shadow: 0 0 15px rgba(173, 216, 230, 0.3);
}

.window-controls {
    display: flex;
    height: 100%;
}
.control-btn {
    width: 45px;
    height: 100%;
    background: transparent;
    border: none;
    color: var(--text-muted);
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    -webkit-app-region: no-drag;
}
.control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-color);
}
.close-btn:hover {
    background: #e81123;
    color: white;
}
</style>
