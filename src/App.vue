<script setup>
import { ref, onMounted, watch } from "vue";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { initDB } from "./utils/db.js";
import TradeForm from "./components/TradeForm.vue";
import TradeList from "./components/TradeList.vue";
import PerformanceChart from "./components/PerformanceChart.vue";

const db = ref(null);
const totalTrades = ref(0);
const totalProfit = ref(0);
const winRate = ref(0);
const selectedAsset = ref('all');

// Window controls
const appWindow = getCurrentWindow();

// Manual Drag
const startDrag = async () => {
  await appWindow.startDragging();
};

const close = async () => {
    try {
        await appWindow.close();
    } catch (e) {
    }
};

onMounted(async () => {
  db.value = await initDB();
  await loadStats();
});

watch(selectedAsset, loadStats);

async function loadStats() {
  if (!db.value) return;

  const params = selectedAsset.value !== 'all' ? [selectedAsset.value] : [];
  
  // Total Trades
  let tradesQuery = 'SELECT COUNT(*) as count FROM trades';
  if (selectedAsset.value !== 'all') tradesQuery += ' WHERE asset_type = ?';
  const tradesResult = await db.value.select(tradesQuery, params);
  totalTrades.value = tradesResult[0].count;

  // Profit (closed)
  let profitQuery = 'SELECT SUM(profit_loss) as profit FROM trades WHERE status = "closed"';
  if (selectedAsset.value !== 'all') profitQuery += ' AND asset_type = ?';
  const profitResult = await db.value.select(profitQuery, params);
  totalProfit.value = profitResult[0].profit || 0;

  // Win Rate
  let winsQuery = 'SELECT COUNT(*) as wins FROM trades WHERE status = "closed" AND profit_loss > 0';
  let closedQuery = 'SELECT COUNT(*) as closed FROM trades WHERE status = "closed"';
  if (selectedAsset.value !== 'all') {
    winsQuery += ' AND asset_type = ?';
    closedQuery += ' AND asset_type = ?';
  }
  const winsResult = await db.value.select(winsQuery, params);
  const totalClosed = await db.value.select(closedQuery, params);
  
  if (totalClosed[0].closed > 0) {
    winRate.value = ((winsResult[0].wins / totalClosed[0].closed) * 100).toFixed(2);
  } else {
    winRate.value = 0;
  }
}

function onTradeAdded() {
  loadStats();
}
</script>

<template>
  <div id="app">
    <div class="titlebar">
      <!-- Zone de drag manuelle -->
      <div class="drag-region" @mousedown="startDrag"></div>
      <div class="window-controls">
        <button class="control-btn close-btn" @click="close">
           <!-- SVG Close -->
           <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>
    
    <header>
      <h1>TradeVision - Journal de Trading</h1>
    </header>
    <main>
      <div class="tabs">
        <button :class="{ active: selectedAsset === 'all' }" @click="selectedAsset = 'all'">Vue Générale</button>
        <button :class="{ active: selectedAsset === 'stocks' }" @click="selectedAsset = 'stocks'">Actions</button>
        <button :class="{ active: selectedAsset === 'crypto' }" @click="selectedAsset = 'crypto'">Crypto</button>
        <button :class="{ active: selectedAsset === 'forex' }" @click="selectedAsset = 'forex'">Forex</button>
        <button :class="{ active: selectedAsset === 'options' }" @click="selectedAsset = 'options'">Options</button>
      </div>

      <div class="dashboard">
        <h2>Tableau de Bord - {{ selectedAsset === 'all' ? 'Global' : selectedAsset.toUpperCase() }}</h2>
        <div class="stats">
          <div class="stat-card">
            <h3>Total Trades</h3>
            <p>{{ totalTrades }}</p>
          </div>
          <div class="stat-card">
            <h3>Profit Total</h3>
            <p>{{ totalProfit.toFixed(2) }} €</p>
          </div>
          <div class="stat-card">
            <h3>Taux de Réussite</h3>
            <p>{{ winRate }}%</p>
          </div>
        </div>
        <TradeForm @trade-added="onTradeAdded" />
        <TradeList :filter="selectedAsset" @stats-updated="loadStats" />
        <PerformanceChart :filter="selectedAsset" />
      </div>
    </main>
  </div>
</template>

<style scoped>
#app {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Custom Titlebar */
.titlebar {
  height: 30px;
  background: #333;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: stretch; /* Stretch children to fill height */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999; /* Max z-index */
}

.drag-region {
  flex-grow: 1; /* Prend tout l'espace disponible à gauche */
  width: 100%; /* Assurance */
  height: 100%;
  cursor: default;
}

.window-controls {
    display: flex;
    align-items: center;
    background: #333; /* Cover anything behind */
    z-index: 10000; /* Above drag region */
    -webkit-app-region: no-drag; /* Explicitly non-draggable for Electron-like behavior if supported, though Tauri relies on data attr */
}

.control-btn {
    background: transparent;
    border: none;
    color: #ccc;
    width: 45px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: none;
}

.control-btn:hover {
    background: #444;
}

.close-btn:hover {
    background: #e81123;
    color: white;
}

/* Push content down */
header {
  margin-top: 30px; 
  background-color: #333;
  color: white;
  padding: 1rem;
  text-align: center;
}

.dashboard {
  padding: 2rem;
  flex: 1;
  overflow-y: auto;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  background-color: #444;
  padding: 10px;
}

.tabs button {
  padding: 10px 20px;
  background: #555;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.tabs button.active {
  background: #396cd8;
}

.stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #f4f4f4;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  flex: 1;
}

.stat-card h3 {
  margin: 0 0 0.5rem 0;
}

.stat-card p {
  font-size: 1.5rem;
  margin: 0;
}

h1 {
  text-align: center;
  margin: 0;
}
</style>
