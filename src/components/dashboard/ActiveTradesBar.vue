<script setup>
defineProps({
  openTradesCount: {
    type: Number,
    required: true
  },
  breakdown: {
    type: Object,
    required: true,
    default: () => ({
        wheel_put: 0,
        wheel_cc: 0,
        wheel_hedge: 0,
        wheel_assigned: 0,
        pcs: 0,
        iron_condor: 0,
        rockets_stock: 0,
        rockets_crypto: 0
    })
  }
})
</script>

<template>
    <div class="active-trades-bar">
        <div class="active-trades-title-group">
            <h3>Trades en cours</h3>
            <span class="active-count">{{ openTradesCount }}</span>
        </div>
        <div class="active-breakdown-row">
            <div class="breakdown-pill"><span>Wheel - Vente Put</span><strong>{{ breakdown.wheel_put }}</strong></div>
            <div class="breakdown-pill"><span>Wheel - Covered Call</span><strong>{{ breakdown.wheel_cc }}</strong></div>
            <div class="breakdown-pill"><span>Wheel - Hedge</span><strong>{{ breakdown.wheel_hedge }}</strong></div>
            <div class="breakdown-pill"><span>Wheel - Assigné</span><strong>{{ breakdown.wheel_assigned }}</strong></div>
            <div class="breakdown-pill"><span>PCS Standard</span><strong>{{ breakdown.pcs }}</strong></div>
            <div class="breakdown-pill"><span>PCS Iron Condor</span><strong>{{ breakdown.iron_condor }}</strong></div>
            <div class="breakdown-pill"><span>Rockets Action</span><strong>{{ breakdown.rockets_stock }}</strong></div>
            <div class="breakdown-pill"><span>Rockets Crypto</span><strong>{{ breakdown.rockets_crypto }}</strong></div>
        </div>
        
        <div style="flex: 1;"></div>
        
        <button class="settings-btn" @click="$emit('open-settings')">⚙️ Paramétrer le MM</button>
    </div>
</template>

<style scoped>
/* Active Trades Bar (Full Width) */
.active-trades-bar {
    background: var(--surface-color);
    padding: 1rem 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 2rem;
    overflow-x: auto;
}

.active-trades-title-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-right: 1.5rem;
    border-right: 1px solid var(--border-color);
    flex-shrink: 0;
}

.active-trades-title-group h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-color);
    white-space: nowrap;
}

.active-count {
    background: var(--accent-color);
    color: white;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 700;
}

.active-breakdown-row {
    display: flex;
    gap: 1rem;
    flex-wrap: nowrap;
    align-items: center;
}

.breakdown-pill {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.85rem;
    border: 1px solid transparent;
    transition: all 0.2s;
}
.breakdown-pill:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--border-color);
}

.breakdown-pill span {
    color: var(--text-muted);
}
.breakdown-pill strong {
    color: var(--text-color);
    font-weight: 600;
}

.settings-btn {
    background: var(--accent-color);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: background 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    white-space: nowrap;
}
.settings-btn:hover {
    background: var(--accent-hover);
}
</style>
