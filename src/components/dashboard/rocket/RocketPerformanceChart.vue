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
    const sorted = [...(props.entries || [])].sort((a,b) => new Date(a.date || a.exit_date) - new Date(b.date || b.exit_date));
    
    const labels = sorted.map(e => {
        const d = new Date(e.date || e.exit_date);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    });
    
    const dataPoints = sorted.map(e => {
        // Rocket Strategy Trades can have 'pl_realized' or 'profit_loss'
        const pl = parseFloat(e.pl_realized ?? e.profit_loss) || 0;
        accumulated += pl;
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
                borderColor: '#bb9af7', // Purple/Violet for Rockets
                backgroundColor: 'rgba(187, 154, 247, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5
            },
            {
                label: 'Initial',
                data: initCapLine,
                borderColor: '#565f89', // Muted Blue/Grey
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                borderDash: [5, 5]
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
