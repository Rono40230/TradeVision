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

<script>
import { onMounted, ref } from 'vue';
import Database from '@tauri-apps/plugin-sql';
import Chart from 'chart.js/auto';

export default {
  name: 'PerformanceChart',
  setup() {
    const pnlChart = ref(null);
    const monthlyChart = ref(null);
    const maxDrawdown = ref(0);
    const sharpeRatio = ref(0);
    const winRate = ref(0);

    const fetchTrades = async () => {
      try {
        const db = await Database.load('sqlite:trading.db');
        const result = await db.select('SELECT * FROM trades ORDER BY date ASC');
        return result;
      } catch (error) {
        console.error('Erreur lors de la récupération des trades:', error);
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
      new Chart(pnlChart.value, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: 'P&L Cumulé',
            data: pnlData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
          }
        }
      });

      const months = Object.keys(monthlyReturns);
      const monthlyData = Object.values(monthlyReturns);
      new Chart(monthlyChart.value, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{
            label: 'Rendement Mensuel',
            data: monthlyData,
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
          }
        }
      });
    };

    onMounted(async () => {
      const trades = await fetchTrades();
      calculateMetrics(trades);
    });

    return {
      pnlChart,
      monthlyChart,
      maxDrawdown,
      sharpeRatio,
      winRate
    };
  }
};
</script>

<style scoped>
.performance-chart {
  margin: 20px;
}
.chart-container {
  margin-bottom: 20px;
  height: 300px;
}
.metrics {
  margin-top: 20px;
}
</style>