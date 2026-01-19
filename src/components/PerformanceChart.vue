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
      <p>Drawdown Max: {{ maxDrawdown.toFixed(2) }}%</p>
      <p>Sharpe Ratio: {{ sharpeRatio.toFixed(2) }}</p>
      <p>Win Rate: {{ winRate.toFixed(2) }}%</p>
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
    let result;
    if (props.filter && props.filter !== 'all') {
      result = await db.select('SELECT * FROM trades WHERE asset_type = ? ORDER BY date ASC', [props.filter]);
    } else {
      result = await db.select('SELECT * FROM trades ORDER BY date ASC');
    }
    return result;
  } catch (error) {
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
    const pnl = trade.profit_loss || 0;
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
  height: 300px;
  width: 100%;
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