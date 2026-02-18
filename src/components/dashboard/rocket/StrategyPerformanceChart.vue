<template>
  <div class="strategy-perf-chart">
    <div class="charts-row">
      <div class="chart-block">
        <div class="chart-label">P&L Cumulé</div>
        <div class="chart-canvas-wrapper">
          <canvas ref="pnlCanvas"></canvas>
        </div>
      </div>
      <div class="chart-block">
        <div class="chart-label">Mensuel</div>
        <div class="chart-canvas-wrapper">
          <canvas ref="monthlyCanvas"></canvas>
        </div>
      </div>
    </div>
    <div class="chart-metrics" v-if="hasData">
      <span>Drawdown Max : <strong>{{ maxDrawdown.toFixed(1) }}%</strong></span>
      <span>Taux réussite : <strong>{{ winRate.toFixed(0) }}%</strong></span>
      <span>Meilleur mois : <strong :class="bestMonth >= 0 ? 'pos' : 'neg'">{{ formatCurrency(bestMonth) }}</strong></span>
    </div>
    <div class="chart-empty" v-else>
      Aucune donnée historique
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import Database from '@tauri-apps/plugin-sql';

const props = defineProps({
  strategy: { type: String, required: true }, // 'wheel' | 'pcs' | 'rockets'
  themeColor: { type: String, default: '#7aa2f7' }
});

const pnlCanvas = ref(null);
const monthlyCanvas = ref(null);
let pnlChartInstance = null;
let monthlyChartInstance = null;

const maxDrawdown = ref(0);
const winRate = ref(0);
const bestMonth = ref(0);
const hasData = ref(false);

// Mapping strategy → valeur en base
const strategyMap = {
  wheel: 'Wheel',
  pcs: 'Put Credit Spread',
  rockets: 'Rockets'
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(v || 0).replace('US', '');

const loadAndRender = async () => {
  await nextTick();
  if (!pnlCanvas.value || !monthlyCanvas.value) return;

  try {
    const db = await Database.load('sqlite:trading.db');
    const stratValue = strategyMap[props.strategy] || props.strategy;
    // Clé dans la table `trades` (minuscules)
    const stratKey = props.strategy; // 'wheel' | 'pcs' | 'rockets'

    // Source 1 : imports IBKR
    const ibkrTrades = await db.select(
      `SELECT open_date as date, realized_pnl as pnl
       FROM rocket_trades_history
       WHERE LOWER(strategy) = LOWER(?) AND is_deleted = 0
       ORDER BY open_date ASC`,
      [stratValue]
    );

    // Source 2 : saisies manuelles
    const manualTrades = await db.select(
      `SELECT exit_date as date, profit_loss as pnl
       FROM trades
       WHERE strategy = ? AND status = 'closed' AND (is_deleted = 0 OR is_deleted IS NULL)
       ORDER BY exit_date ASC`,
      [stratKey]
    );

    // Fusion + tri par date (filtre les entrées sans date)
    const trades = [...ibkrTrades, ...manualTrades]
      .filter(t => t.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!trades || trades.length === 0) {
      hasData.value = false;
      renderEmpty();
      return;
    }

    hasData.value = true;

    // --- Calcul cumulatif ---
    let cumul = 0;
    let peak = 0;
    let maxDD = 0;
    let wins = 0;
    const pnlData = [];
    const pnlLabels = [];
    const monthlyMap = {};

    trades.forEach(t => {
      const pnl = parseFloat(t.pnl) || 0;
      cumul += pnl;
      if (pnl > 0) wins++;

      if (cumul > peak) peak = cumul;
      const dd = peak > 0 ? ((peak - cumul) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;

      pnlData.push(parseFloat(cumul.toFixed(2)));
      pnlLabels.push(new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));

      // Mensuel
      const monthKey = t.date ? t.date.substring(0, 7) : '?';
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + pnl;
    });

    maxDrawdown.value = maxDD;
    winRate.value = (wins / trades.length) * 100;

    const monthlyLabels = Object.keys(monthlyMap).sort();
    const monthlyValues = monthlyLabels.map(k => parseFloat(monthlyMap[k].toFixed(2)));
    bestMonth.value = Math.max(...monthlyValues);

    // --- Graphique P&L Cumulé ---
    destroyCharts();

    const pnlCtx = pnlCanvas.value.getContext('2d');
    pnlChartInstance = new Chart(pnlCtx, {
      type: 'line',
      data: {
        labels: pnlLabels,
        datasets: [{
          label: 'P&L Cumulé',
          data: pnlData,
          borderColor: props.themeColor,
          backgroundColor: props.themeColor + '22',
          borderWidth: 1.5,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            bodyColor: '#fff',
            callbacks: {
              label: ctx => formatCurrency(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#888', maxTicksLimit: 4, callback: v => '$' + v }
          }
        }
      }
    });

    // --- Graphique Mensuel ---
    const barColors = monthlyValues.map(v => v >= 0 ? 'rgba(74, 222, 128, 0.7)' : 'rgba(248, 113, 113, 0.7)');
    const monthlyCtx = monthlyCanvas.value.getContext('2d');
    monthlyChartInstance = new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: monthlyLabels,
        datasets: [{
          label: 'Mensuel',
          data: monthlyValues,
          backgroundColor: barColors,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            bodyColor: '#fff',
            callbacks: {
              label: ctx => formatCurrency(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#888', maxTicksLimit: 4, callback: v => '$' + v }
          }
        }
      }
    });

  } catch (err) {
    hasData.value = false;
    renderEmpty();
  }
};

const renderEmpty = () => {
  destroyCharts();
};

const destroyCharts = () => {
  if (pnlChartInstance) { pnlChartInstance.destroy(); pnlChartInstance = null; }
  if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }
};

onMounted(() => {
  loadAndRender();
});

onUnmounted(() => {
  destroyCharts();
});

watch(() => props.strategy, () => {
  loadAndRender();
});
</script>

<style scoped>
.strategy-perf-chart {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.07);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.charts-row {
  display: flex;
  gap: 0.75rem;
}

.chart-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.chart-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.5;
}

.chart-canvas-wrapper {
  height: 80px;
  position: relative;
}

.chart-canvas-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-metrics {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  opacity: 0.75;
  padding: 0.2rem 0;
}

.chart-metrics strong {
  font-family: monospace;
  opacity: 1;
}

.chart-metrics strong.pos { color: #4ade80; }
.chart-metrics strong.neg { color: #f87171; }

.chart-empty {
  font-size: 0.75rem;
  opacity: 0.4;
  text-align: center;
  padding: 0.5rem 0;
  font-style: italic;
}
</style>
