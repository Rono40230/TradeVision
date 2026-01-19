<script setup>
import { getCurrentWindow } from '@tauri-apps/api/window';

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
  height: 32px;
  background: var(--sidebar-bg);
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  z-index: 9999;
  border-bottom: 1px solid var(--border-color);
  flex: 0 0 auto;
}

.drag-region {
  flex-grow: 1;
  width: 100%;
  height: 100%;
  cursor: default;
}

.window-controls {
    display: flex;
    align-items: center;
    background: transparent;
    z-index: 10000;
    -webkit-app-region: no-drag;
}

.control-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    width: 46px;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}

.control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-color);
}

.close-btn:hover {
    background: #c42b1c;
    color: white;
}
</style>
