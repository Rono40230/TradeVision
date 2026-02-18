<template>
  <div class="synthesis-chart">
    <div class="synthesis-header">
      <span class="synthesis-title">📈 Synthèse des stratégies</span>
      <div class="synthesis-legend">
        <span v-for="s in strategies" :key="s.key" class="legend-item">
          <span class="legend-dot" :style="{ background: s.color }"></span>
          {{ s.label }}
        </span>
      </div>
    </div>
    <div class="chart-canvas-wrapper">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="synthesis-totals" v-if="totals.length">
      <div class="total-item" v-for="s in totals" :key="s.key">
        <span class="total-label" :style="{ color: s.color }">{{ s.label }}</span>
        <span class="total-val" :class="s.pnl >= 0 ? 'pos' : 'neg'">{{ formatCurrency(s.pnl) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import Database from '@tauri-apps/plugin-sql';

const chartCanvas = ref(null);
let chartInstance = null;
const totals = ref([]);

const strategies = [
  { key: 'Wheel',             label: 'Wheel',   color: '#81c784' },
  { key: 'Put Credit Spread', label: 'PCS',     color: '#64b5f6' },
  { key: 'Rockets',           label: 'Rockets', color: '#ba68c8' }
];

const formatCurrency = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(v || 0).replace('US', '');

const loadAndRender = async () => {
  await nextTick();
  if (!chartCanvas.value) return;

  try {
    const db = await Database.load('sqlite:trading.db');

    // Source 1 : imports IBKR
    const ibkrTrades = await db.select(
      `SELECT open_date as date, realized_pnl as pnl, strategy
       FROM rocket_trades_history
       WHERE is_deleted = 0
         AND LOWER(strategy) IN ('wheel', 'put credit spread', 'rockets')
       ORDER BY open_date ASC`
    );

    // Source 2 : saisies manuelles (normaliser la stratégie vers les clés de strategies[])
    const manualRaw = await db.select(
      `SELECT exit_date as date, profit_loss as pnl, strategy
       FROM trades
       WHERE strategy IN ('wheel','pcs','rockets') AND status = 'closed'
         AND (is_deleted = 0 OR is_deleted IS NULL)
       ORDER BY exit_date ASC`
    );
    const manualStratMap = { wheel: 'Wheel', pcs: 'Put Credit Spread', rockets: 'Rockets' };
    const manualTrades = manualRaw.map(t => ({ ...t, strategy: manualStratMap[t.strategy] || t.strategy }));

    // Fusion + tri
    const trades = [...ibkrTrades, ...manualTrades]
      .filter(t => t.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!trades || trades.length === 0) return;

    // Construire un index de dates unique (toutes stratégies confondues)
    const allDates = [...new Set(trades.map(t => t.date?.substring(0, 10)))].sort();

    // Pour chaque stratégie : cumul journalier interpolé
    const datasets = strategies.map(s => {
      const stratLower = s.key.toLowerCase();
      const stratTrades = trades.filter(t => t.strategy?.toLowerCase() === stratLower);

      // Cumul par date pivot
      const cumByDate = {};
      let running = 0;
      stratTrades.forEach(t => {
        const d = t.date?.substring(0, 10);
        running += parseFloat(t.pnl) || 0;
        cumByDate[d] = running;
      });

      // Interpoler sur allDates (porter la dernière valeur connue)
      let last = 0;
      const data = allDates.map(d => {
        if (cumByDate[d] !== undefined) last = cumByDate[d];
        return parseFloat(last.toFixed(2));
      });

      // Totaux pour le footer
      totals.value.push({ key: s.key, label: s.label, color: s.color, pnl: last });

      return {
        label: s.label,
        data,
        borderColor: s.color,
        backgroundColor: s.color + '18',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4
      };
    });

    // Labels : afficher max 8 dates pour lisibilité
    const step = Math.max(1, Math.floor(allDates.length / 8));
    const labels = allDates.map((d, i) =>
      i % step === 0 ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''
    );

    if (chartInstance) chartInstance.destroy();

    const ctx = chartCanvas.value.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            titleColor: '#aaa',
            bodyColor: '#fff',
            callbacks: {
              label: ctx => `${ctx.dataset.label} : ${formatCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            ticks: { color: '#555', maxRotation: 0 }
          },
          y: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#555', callback: v => '$' + v }
          }
        }
      }
    });
  } catch (err) {
    // Silencieux si pas de données
  }
};

onMounted(() => loadAndRender());
onUnmounted(() => { if (chartInstance) chartInstance.destroy(); });
</script>

<style scoped>
.synthesis-chart {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.synthesis-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.synthesis-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.synthesis-legend {
  display: flex;
  gap: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  opacity: 0.8;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-canvas-wrapper {
  height: 120px;
  position: relative;
}

.chart-canvas-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.synthesis-totals {
  display: flex;
  justify-content: space-around;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 0.4rem;
}

.total-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.total-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
}

.total-val {
  font-size: 0.82rem;
  font-family: monospace;
  font-weight: 700;
}

.total-val.pos { color: #4ade80; }
.total-val.neg { color: #f87171; }
</style>
