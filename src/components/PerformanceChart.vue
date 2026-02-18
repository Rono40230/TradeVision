<template>
  <div class="performance-chart">
    <h3>Graphiques de Performance</h3>
    <div class="chart-container">
      <canvas ref="pnlChart"></canvas>
    </div>
    <div class="chart-container">
      <canvas ref="monthlyChart"></canvas>
    </div>
    <div class="metrics">
      <p>Drawdown Max : {{ maxDrawdown.toFixed(2) }}%</p>
      <p>Ratio de Sharpe : {{ sharpeRatio.toFixed(2) }}</p>
      <p>Taux de réussite : {{ winRate.toFixed(2) }}%</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, defineProps, watch } from 'vue';
import Database from '@tauri-apps/plugin-sql';
import Chart from 'chart.js/auto';

const props = defineProps(['filter']);
const pnlChart = ref(null);
const monthlyChart = ref(null);
const maxDrawdown = ref(0);
const sharpeRatio = ref(0);
const winRate = ref(0);
let pnlChartInstance = null;
let monthlyChartInstance = null;

const fetchTrades = async () => {
  try {
    const db = await Database.load('sqlite:trading.db');
    let manualTrades;
    let syncedTrades;

    if (props.filter && props.filter !== 'all') {
      manualTrades = await db.select('SELECT date, profit_loss as pnl FROM trades WHERE asset_type = ? AND is_deleted = 0 ORDER BY date ASC', [props.filter]);
      // Synced trades strategy filter (mapped to filter if possible)
      syncedTrades = await db.select('SELECT open_date as date, realized_pnl as pnl FROM rocket_trades_history WHERE strategy = ? AND is_deleted = 0 ORDER BY open_date ASC', [props.filter]);
    } else {
      manualTrades = await db.select('SELECT date, profit_loss as pnl FROM trades WHERE is_deleted = 0 ORDER BY date ASC');
      syncedTrades = await db.select('SELECT open_date as date, realized_pnl as pnl FROM rocket_trades_history WHERE is_deleted = 0 ORDER BY open_date ASC');
    }

    // Combine and sort
    const allTrades = [...manualTrades, ...syncedTrades];
    allTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return allTrades;
  } catch (error) {
    console.error('Error fetching trades for chart:', error);
    return [];
  }
};


const calculateMetrics = (trades) => {
  if (!trades.length) return;

  // Trier par date
  trades.sort((a, b) => new Date(a.date) - new Date(b.date));

  let cumulativePnl = 0;
  let peak = 0;
  let drawdown = 0;
  const pnlData = [];
  const dates = [];
  const monthlyReturns = {};
  let winningTrades = 0;

  trades.forEach(trade => {
    const pnl = trade.pnl || 0;
    cumulativePnl += pnl;
    pnlData.push(cumulativePnl);
    dates.push(new Date(trade.date).toLocaleDateString());

    // Drawdown
    if (cumulativePnl > peak) peak = cumulativePnl;
    const currentDrawdown = (peak - cumulativePnl) / peak * 100;
    if (currentDrawdown > drawdown) drawdown = currentDrawdown;

    // Monthly returns
    const month = new Date(trade.date).toISOString().slice(0, 7);
    if (!monthlyReturns[month]) monthlyReturns[month] = 0;
    monthlyReturns[month] += pnl;

    // Win rate
    if (pnl > 0) winningTrades++;
  });

  maxDrawdown.value = drawdown;
  winRate.value = (winningTrades / trades.length) * 100;

  // Sharpe Ratio (simplifié, sans taux sans risque)
  const returns = pnlData.map((pnl, i) => i > 0 ? pnl - pnlData[i-1] : 0).filter(r => r !== 0);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  sharpeRatio.value = stdDev ? avgReturn / stdDev : 0;

  // Graphiques
  if (pnlChartInstance) pnlChartInstance.destroy();
  pnlChartInstance = new Chart(pnlChart.value, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'P&L Cumulé',
        data: pnlData,
        borderColor: '#396cd8',
        backgroundColor: 'rgba(57, 108, 216, 0.2)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e0e0e0' } },
      },
      scales: {
        x: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } },
        y: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } }
      }
    }
  });

  const months = Object.keys(monthlyReturns);
  const monthlyData = Object.values(monthlyReturns);
  if (monthlyChartInstance) monthlyChartInstance.destroy();
  monthlyChartInstance = new Chart(monthlyChart.value, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Rendement Mensuel',
        data: monthlyData,
        backgroundColor: '#396cd8',
        borderColor: '#396cd8',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e0e0e0' } },
      },
      scales: {
        x: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } },
        y: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } }
      }
    }
  });
};

watch(() => props.filter, async () => {
  const trades = await fetchTrades();
  calculateMetrics(trades);
});

onMounted(async () => {
  const trades = await fetchTrades();
  calculateMetrics(trades);
});
</script>

<style scoped>
.performance-chart {
  margin: 20px 0;
}
.chart-container {
  margin-bottom: 20px;
  position: relative;
  height: 280px;
  max-height: 280px;
  width: 100%;
  overflow: hidden;
  background: var(--surface-color, #2c2c2c);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #333);
}

h3 {
  color: var(--text-color, #e0e0e0);
  margin-bottom: 1rem;
}

.metrics {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding: 20px;
  background-color: var(--surface-color, #2c2c2c);
  border-radius: 12px;
  border: 1px solid var(--border-color, #333);
}

.metrics p {
  color: var(--text-color, #e0e0e0);
  font-weight: 500;
  margin: 0;
}
</style>