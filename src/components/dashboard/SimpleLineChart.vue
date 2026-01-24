<template>
  <div class="chart-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
  labels: { type: Array, required: true },
  data: { type: Array, required: true },
  baseline: { type: Number, default: null },
  color: { type: String, default: '#4caf50' },
  fillColor: { type: String, default: 'rgba(76, 175, 80, 0.1)' },
  label: { type: String, default: 'Valeur' }
});

const canvas = ref(null);
let chartInstance = null;

function renderChart() {
  if (!canvas.value) return;
  if (chartInstance) chartInstance.destroy();

  const ctx = canvas.value.getContext('2d');
  
  // Create modern gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.value.height || 300);
  gradient.addColorStop(0, 'rgba(156, 39, 176, 0.4)'); // Purple top opacity
  gradient.addColorStop(1, 'rgba(156, 39, 176, 0.0)'); // Bottom transparent

  const datasets = [{
    label: props.label,
    data: props.data,
    borderColor: props.color,
    backgroundColor: gradient,
    borderWidth: 2,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 6,
    pointHoverBackgroundColor: props.color,
    pointHoverBorderColor: '#ffffff',
    pointHoverBorderWidth: 2,
    fill: true
  }];

  if (props.baseline !== null) {
    datasets.push({
      label: 'Capital Départ',
      data: new Array(props.labels.length).fill(props.baseline),
      borderColor: 'rgba(255, 255, 255, 0.4)',
      borderWidth: 1,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0
    });
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
           intersect: false,
           mode: 'index',
           backgroundColor: 'rgba(30, 30, 30, 0.9)',
           titleColor: '#fff',
           bodyColor: '#ccc',
           borderColor: 'rgba(255, 255, 255, 0.1)',
           borderWidth: 1,
           padding: 10,
           displayColors: false
        }
      },
      scales: {
        x: { 
            display: true,
            grid: { display: false, drawBorder: false },
            ticks: {
                color: '#cccccc', /* Lighter for better visibility */
                font: { size: 10 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 6, /* Limit number of dates to keep it clean */
                padding: 10
            }
        },
        y: { 
            display: true,
            border: { display: false },
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { 
                color: '#808080',
                font: { size: 10 },
                padding: 8,
                callback: function(value) {
                    return value >= 1000 ? (value/1000).toFixed(1) + 'k' : value;
                }
            } 
        } 
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

onMounted(() => {
  renderChart();
});

watch(() => [props.data, props.labels], () => {
  renderChart();
}, { deep: true });

onUnmounted(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 120px;
  position: relative;
}
</style>