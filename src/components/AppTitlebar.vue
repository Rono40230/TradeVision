<script setup>
import { getCurrentWindow } from '@tauri-apps/api/window';

defineProps(['modelValue']);
defineEmits(['update:modelValue']);

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
            :class="{ active: modelValue === 'dashboard' }" 
            @click="$emit('update:modelValue', 'dashboard')"
          >
            Dashboard
          </button>
          <button 
            :class="{ active: modelValue === 'rocket-academy' }" 
            @click="$emit('update:modelValue', 'rocket-academy')"
          >
            Rocket Academy
          </button>
          <button 
            :class="{ active: modelValue === 'kasper-academy' }" 
            @click="$emit('update:modelValue', 'kasper-academy')"
          >
            Kasper Academy
          </button>
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
  height: 38px;
  background: var(--sidebar-bg);
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center; /* Center Vertically */
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

.nav-tabs {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    height: 100%;
    align-items: center;
    -webkit-app-region: no-drag; /* Important to click buttons */
}

.nav-tabs button {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0 12px;
    height: 100%; /* Full height for ease of click */
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
    opacity: 0.7;
}

.nav-tabs button:hover {
    color: var(--text-color);
    opacity: 1;
    background: rgba(255,255,255,0.05);
}

.nav-tabs button.active {
    color: var(--accent-color);
    border-bottom: 2px solid var(--accent-color);
    opacity: 1;
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
