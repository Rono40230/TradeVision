<template>
    <header class="dashboard-header">
      <div class="header-left">
        <h1>Cockpit Global</h1>
        <span class="subtitle">{{ currentDate }}</span>
      </div>
      
      <div class="kpi-group">
        
        <!-- MM Settings Button -->
        <div class="kpi-card mm-btn" @click="$emit('openMmSettings')">
           <span class="label">Configuration</span>
           <span class="value mm-text">Money Mgt</span>
        </div>

        <div class="kpi-card main-kpi">
           <span class="label">Capital Total</span>
           <span class="value">{{ formatCurrency(totalNetWorth) }}</span>
        </div>
        <div class="kpi-card">
           <span class="label">Capital Kasper</span>
           <span class="value kasper-color">{{ formatCurrency(kasperCapital) }}</span>
        </div>
        
        <!-- Strategy Breakdown KPIs -->
        <div class="kpi-card">
           <span class="label">Capital Wheel</span>
           <span class="value blue-color">{{ formatCurrency(rocketBalanceWheel) }}</span>
        </div>
        <div class="kpi-card">
           <span class="label">Capital PCS</span>
           <span class="value blue-color">{{ formatCurrency(rocketBalancePcs) }}</span>
        </div>
        <div class="kpi-card">
           <span class="label">Capital Rocket</span>
           <span class="value blue-color">{{ formatCurrency(rocketBalanceGrowth) }}</span>
        </div>
      </div>
    </header>
</template>

<script setup>
defineProps({
    currentDate: String,
    totalNetWorth: Number,
    kasperCapital: Number,
    rocketBalanceWheel: Number,
    rocketBalancePcs: Number,
    rocketBalanceGrowth: Number
});

defineEmits(['openMmSettings']);

function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0) + ' $';
}
</script>

<style scoped>
/* HEADER STYLE */
.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-left h1 {
    font-size: 1.8rem;
    margin: 0;
    font-weight: 800;
    letter-spacing: -0.5px;
}
.subtitle {
    color: var(--text-muted);
    font-size: 0.9rem;
    text-transform: capitalize;
}

.kpi-group {
    display: flex;
    gap: 1.5rem;
}

.kpi-card {
    background: var(--surface-color);
    padding: 0.8rem 1.2rem;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    min-width: 140px;
    border: 1px solid var(--border-color);
}

.kpi-card.main-kpi {
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.2);
}

.kpi-card .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 0.2rem;
}

.kpi-card .value {
    font-size: 1.4rem;
    font-weight: bold;
}
.rocket-color { color: #f44336; }
.blue-color { color: #2196f3; }
.kasper-color { color: #9c27b0; }

.mm-btn {
    background-color: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.3);
    cursor: pointer;
    transition: transform 0.1s, background-color 0.2s;
    justify-content: center;
}
.mm-btn:hover {
    background-color: rgba(76, 175, 80, 0.3);
    transform: translateY(-2px);
}
.mm-text {
    font-size: 1.1rem !important;
    white-space: nowrap;
    color: #81c784;
}
</style>
