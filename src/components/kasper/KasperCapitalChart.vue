<template>
    <div class="kasper-chart-container">
        <h3>Évolution du Capital</h3>
        <div class="canvas-wrapper">
             <canvas ref="chartCanvas"></canvas>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
    account: Object,
    dailyEntries: { type: Array, default: () => [] }
});

const chartCanvas = ref(null);
let chartInstance = null;

const chartData = computed(() => {
    // 1. Sort entries by date
    const sortedEntries = [...props.dailyEntries].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 2. Build cumulative capital
    const baseCapital = props.account ? props.account.capital : 0;
    
    // If no entries, just show base capital today? Or empty?
    if (sortedEntries.length === 0) {
        return {
            labels: ['Départ'],
            data: [baseCapital]
        };
    }

    const labels = [];
    const data = [];
    
    // Start point
    // We could add a "Start" point before the first trade if we want
    // labels.push('Départ');
    // data.push(baseCapital);

    let currentCapital = baseCapital;

    // We might want to re-calculate currentCapital based on the *current* capital state passed in props?
    // Actually, usually 'account.capital' is the *current* capital in some systems, or *starting* in others.
    // In KasperAcademy context (from what I saw in code), 'account.capital' seems to be the "Capital de Départ" (metrics says "Capital Investi").
    // And "Résultat Net" is added to it.
    
    // So if account.capital is STARTING capital:
    
    let cumulativePL = 0;

    sortedEntries.forEach(entry => {
        labels.push(new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
        cumulativePL += entry.profit_loss;
        data.push(baseCapital + cumulativePL);
    });

    return { labels, data };
});

function initChart() {
    if (!chartCanvas.value) return;

    const ctx = chartCanvas.value.getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.value.labels,
            datasets: [{
                label: 'Capital ($)',
                data: chartData.value.data,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3, 
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, color: '#444' },
                    ticks: { color: '#aaa', maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: '#333' },
                    ticks: { color: '#aaa' }
                }
            }
        }
    });
}

onMounted(() => {
    initChart();
});

watch([() => props.dailyEntries, () => props.account], () => {
    initChart();
}, { deep: true });

</script>

<style scoped>
.kasper-chart-container {
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    height: 100%; /* Fill parent */
    min-height: 150px;
}

h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--text-muted);
    text-transform: uppercase;
    font-weight: normal;
    text-align: center;
}

.canvas-wrapper {
    flex: 1;
    position: relative;
    min-height: 0;
}
</style>
