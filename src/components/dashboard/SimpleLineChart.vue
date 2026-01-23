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
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: [{
        label: props.label,
        data: props.data,
        borderColor: props.color,
        backgroundColor: props.fillColor,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0, // No dots for clean look
        pointHoverRadius: 4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
           intersect: false,
           mode: 'index',
        }
      },
      scales: {
        x: { display: false }, // Hide X axis for mini chart
        y: { 
            display: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { 
                color: '#666',
                font: { size: 10 },
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