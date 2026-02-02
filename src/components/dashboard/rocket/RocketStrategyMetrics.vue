<template>
    <div class="metrics-row">
        <!-- Trades Actifs -->
        <div class="metric-item item-active">
            <span class="lbl">Trades Actifs</span>
            <span class="val">{{ activeCount }}</span>
        </div>

        <!-- P/L In-Card (Rockets & PCS) -->
        <div class="metric-item item-pl" v-if="strategy === 'rockets' || strategy === 'pcs'">
             <span class="lbl">P/L Latent</span>
             <span class="val" :class="plLatent >= 0 ? 'good-text' : 'warn-text'">{{ format(plLatent) }}</span>
        </div>

        <!-- Prime Attendue (Wheel Only) -->
        <div class="metric-item item-premium" v-if="strategy === 'wheel'">
            <span class="lbl">Prime Attendue</span>
            <span class="val premium-badge">{{ format(expectedPremium) }}</span>
        </div>
        
        <!-- Total des assignations (Wheel Only) -->
        <div class="metric-item item-assigned" v-if="strategy === 'wheel'">
             <span class="lbl">Total des assignations</span>
             <span class="val">{{ format(totalAssigned) }}</span>
        </div>

        <!-- P/L Total (Wheel & PCS) -->
        <div class="metric-item item-pl-total" v-if="strategy === 'wheel' || strategy === 'pcs'">
            <span class="lbl">P/L Total</span>
            <span class="val" :class="plTotal >= 0 ? 'good-text' : 'warn-text'">{{ format(plTotal) }}</span>
        </div>

        <!-- P/L Mensuel (Wheel & PCS) -->
        <div class="metric-item item-pl-monthly" v-if="strategy === 'wheel' || strategy === 'pcs'">
            <span class="lbl">P/L Mensuel</span>
            <span class="val" :class="plMensuel >= 0 ? 'good-text' : 'warn-text'">{{ format(plMensuel) }}</span>
        </div>

        <!-- Cash Dispo -->
        <div class="metric-item item-avail">
            <span class="lbl">Cash Dispo</span>
            <span class="val" :class="capitalAvailable >= 0 ? 'good-text' : 'warn-text'">{{ format(capitalAvailable) }}</span>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    strategy: String,
    activeCount: Number,
    plLatent: Number,
    expectedPremium: Number,
    totalAssigned: Number,
    capitalAvailable: Number,
    plTotal: Number,
    plMensuel: Number,
    history: Array
});

const format = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
</script>

<style scoped>
.metrics-row {
    flex: 2;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: rgba(0,0,0,0.2);
    padding: 0.75rem;
    border-radius: 6px;
}

.metric-item {
    display: flex;
    flex-direction: column;
}

.metric-item .lbl {
    font-size: 0.65rem;
    opacity: 0.6;
    text-transform: uppercase;
    margin-bottom: 2px;
}

.metric-item .val {
    font-size: 0.95rem;
    font-weight: 700;
    font-family: monospace;
    color: #fff;
}

.metric-item .val.good-text { color: #4ade80; }
.metric-item .val.warn-text { color: #f87171; }

.premium-badge {
    color: #0ea5e9; 
}
</style>
