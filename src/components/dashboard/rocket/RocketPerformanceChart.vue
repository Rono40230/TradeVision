<template>
    <div class="chart-container">
        <canvas ref="chartCanvas"></canvas>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
    entries: { type: Array, default: () => [] },
    investedCapital: { type: Number, default: 0 },
    accountCreatedDate: { type: String, default: null }
});

const chartCanvas = ref(null);
let chartInstance = null;

function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0).replace('US', '');
}

const renderChart = async () => {
    await nextTick();
    if (!chartCanvas.value) return;
    if (chartInstance) chartInstance.destroy();

    const invested = props.investedCapital;
    let accumulated = invested;
    
    // Sort
    const sorted = [...(props.entries || [])].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const labels = sorted.map(e => {
        const d = new Date(e.date);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    });
    
    const dataPoints = sorted.map(e => {
        accumulated += (parseFloat(e.profit_loss) || 0);
        return accumulated;
    });

    if (dataPoints.length === 0) {
       // Just empty or 0 line
        labels.push('');
        dataPoints.push(invested);
    }

    const initCapLine = new Array(labels.length).fill(invested);

    const ctx = chartCanvas.value.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
            {
                label: 'Solde',
                data: dataPoints,
                borderColor: '#7aa2f7',
                backgroundColor: 'rgba(122, 162, 247, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5
            },
            {
                label: 'Initial',
                data: initCapLine,
                borderColor: '#9ece6a', // Pastel Green
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (c) => formatCurrency(c.raw),
                        title: (c) => {
                           if (!sorted[c[0].dataIndex]) return '';
                           return new Date(sorted[c[0].dataIndex].date).toLocaleDateString('fr-FR', { dateStyle: 'full' });
                        }
                    },
                    backgroundColor: '#1a1b26',
                    borderColor: '#7aa2f7',
                    borderWidth: 1
                }
            },
            scales: {
                x: { display: true, grid: { display: false }, ticks: { color: '#565f89', maxTicksLimit: 6 } },
                y: { display: true, grid: { color: '#333' }, ticks: { color: '#565f89', callback: (v) => '$' + v } }
            }
        }
    });
};

onMounted(() => {
    renderChart();
    // Safety refresh
    setTimeout(renderChart, 500);
});

watch(() => [props.entries, props.investedCapital], renderChart, { deep: true });

onUnmounted(() => { 
    if(chartInstance) chartInstance.destroy(); 
});
</script>

<style scoped>
.chart-container {
    flex: 1;
    min-height: 120px;
    width: 100%;
    margin-bottom: 1rem;
    position: relative;
}
</style>
