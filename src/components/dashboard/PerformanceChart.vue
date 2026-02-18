<template>
  <div class="performance-chart-wrapper">
    <div v-if="!data || data.length === 0" class="empty-state">
      <p>Aucune donnée de performance disponible</p>
    </div>
    <div v-else class="chart-container" :style="{ height: height + 'px' }">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend
);

const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => []
  },
  height: {
    type: Number,
    default: 300
  }
});

const chartCanvas = ref(null);
let chartInstance = null;

// Process data for the Equity Curve
const processedData = computed(() => {
  if (!props.data || props.data.length === 0) return { labels: [], datasets: [] };

  let labels = [];
  let points = [];
  let currentCumulative = 0;

  // Determine if we have monthly pnl or cumulative pnl
  const isCumulative = props.data[0].cumulativePnl !== undefined;

  props.data.forEach((item) => {
    labels.push(item.month || item.date || '');
    
    if (isCumulative) {
      points.push(item.cumulativePnl);
    } else {
      currentCumulative += (item.pnl || 0);
      points.push(currentCumulative);
    }
  });

  const finalPnl = points[points.length - 1];
  const color = finalPnl >= 0 ? '#4ade80' : '#f87171'; // Green for gain, Red for loss
  const gradientColor = finalPnl >= 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)';

  return {
    labels,
    datasets: [{
      label: 'Performance Cumulative',
      data: points,
      borderColor: color,
      backgroundColor: gradientColor,
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 2
    }]
  };
});

const initChart = () => {
  if (!chartCanvas.value) return;

  const ctx = chartCanvas.value.getContext('2d');
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1e293b',
        titleColor: '#94a3b8',
        bodyColor: '#f8fafc',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          callback: (value) => {
            return new Intl.NumberFormat('fr-FR', { 
              notation: 'compact',
              style: 'currency', 
              currency: 'USD' 
            }).format(value);
          }
        }
      }
    }
  };

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: processedData.value,
    options
  });
};

const updateChart = () => {
  if (chartInstance) {
    chartInstance.data = processedData.value;
    chartInstance.update();
  } else {
    initChart();
  }
};

watch(() => props.data, () => {
  updateChart();
}, { deep: true });

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>

<style scoped>
.performance-chart-wrapper {
  width: 100%;
  background: transparent;
}

.chart-container {
  width: 100%;
  position: relative;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #64748b;
  font-style: italic;
  border: 1px dashed #334155;
  border-radius: 8px;
}
</style>
