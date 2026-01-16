<script setup>
import { ref, onMounted } from "vue";
import { initDB } from "./utils/db.js";
import TradeForm from "./components/TradeForm.vue";
import TradeList from "./components/TradeList.vue";
import PerformanceChart from "./components/PerformanceChart.vue";

const db = ref(null);
const totalTrades = ref(0);
const totalProfit = ref(0);
const winRate = ref(0);

onMounted(async () => {
  db.value = await initDB();
  // Load initial data
  await loadStats();
});

async function loadStats() {
  if (!db.value) return;

  // Get total trades
  const tradesResult = await db.value.select('SELECT COUNT(*) as count FROM trades');
  totalTrades.value = tradesResult[0].count;

  // Get total profit (sum of profit_loss where status = 'closed')
  const profitResult = await db.value.select('SELECT SUM(profit_loss) as profit FROM trades WHERE status = "closed"');
  totalProfit.value = profitResult[0].profit || 0;

  // Calculate win rate
  const winsResult = await db.value.select('SELECT COUNT(*) as wins FROM trades WHERE status = "closed" AND profit_loss > 0');
  const totalClosed = await db.value.select('SELECT COUNT(*) as closed FROM trades WHERE status = "closed"');
  if (totalClosed[0].closed > 0) {
    winRate.value = ((winsResult[0].wins / totalClosed[0].closed) * 100).toFixed(2);
  }
}

function onTradeAdded() {
  loadStats(); // Refresh stats after adding trade
}
</script>

<template>
  <div id="app">
    <header>
      <h1>TradeVision - Journal de Trading</h1>
    </header>
    <main>
      <div class="dashboard">
        <h2>Tableau de Bord</h2>
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
        <TradeList @stats-updated="loadStats" />
        <PerformanceChart />
      </div>
    </main>
  </div>
</template>

<style scoped>
#app {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

header {
  background-color: #333;
  color: white;
  padding: 1rem;
  text-align: center;
}

.dashboard {
  padding: 2rem;
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

.placeholder {
  text-align: center;
  color: #666;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}
button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  a:hover {
    color: #24c8db;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }
  button:active {
    background-color: #0f0f0f69;
  }
}
</style>
