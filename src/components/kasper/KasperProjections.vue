<template>
    <div class="projections-wrapper">
             <div class="projection-block gain">
                 <h4>Simulation des gains</h4>
                 <div class="proj-grid">
                     <div class="proj-item">
                         <span class="proj-label">1 position</span>
                         <span class="proj-value">{{ formatCurrencySimple(baseRiskAmount) }}</span>
                     </div>
                     <div class="proj-item">
                         <span class="proj-label">2 positions</span>
                         <span class="proj-value">{{ formatCurrencySimple(baseRiskAmount * 2.85) }}</span>
                     </div>
                     <div class="proj-item">
                         <span class="proj-label">3 positions</span>
                         <span class="proj-value">{{ formatCurrencySimple(baseRiskAmount * 6.7) }}</span>
                     </div>
                 </div>
             </div>
             <div class="projection-block loss">
                 <h4>Simulation des pertes</h4>
                 <div class="proj-grid">
                     <div class="proj-item">
                         <span class="proj-label">1 position</span>
                         <span class="proj-value">-{{ formatCurrencySimple(baseRiskAmount) }}</span>
                     </div>
                     <div class="proj-item">
                         <span class="proj-label">2 positions</span>
                         <span class="proj-value">-{{ formatCurrencySimple(baseRiskAmount * 2) }}</span>
                     </div>
                     <div class="proj-item">
                         <span class="proj-label">3 positions</span>
                         <span class="proj-value">-{{ formatCurrencySimple(baseRiskAmount * 2.85) }}</span>
                     </div>
                 </div>
             </div>
        </div>
</template>

<script setup>
defineProps({
    baseRiskAmount: Number
});

function formatCurrencySimple(val) {
    const v = Number(val);
    if (isNaN(v)) return '0 $';
    const rounded = Math.round(v * 2) / 2;
    return rounded.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' $';
}
</script>

<style scoped>
.projections-wrapper {
    display: flex;
    gap: 2rem;
    justify-content: center;
}

.projection-block {
    flex: 1;
    max-width: 400px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
}

.projection-block h4 {
    margin: 0;
    padding: 0.5rem;
    text-align: center;
    color: white;
}
.projection-block.gain h4 { background: #004dcf; }
.projection-block.loss h4 { background: #004dcf; }

.proj-grid {
    display: flex;
    flex-direction: column;
}

.proj-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0.75rem;
    border-bottom: 1px solid var(--border-color);
}
.proj-item:last-child { border-bottom: none; }

.proj-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem; }
.proj-value { font-weight: bold; font-size: 1.1rem; }

.projection-block.gain .proj-value { color: #4caf50; }
.projection-block.loss .proj-value { color: #f44336; }
</style>
