<template>
    <div class="day-summary">
        <div class="summary-card">
            <label>Résultat Net</label>
            <span class="summary-value" :class="pl >= 0 ? 'green' : 'red'">
                {{ pl > 0 ? '+' : '' }}{{ pl }} $
            </span>
        </div>
        <div class="summary-card">
            <label>Risque Utilisé</label>
            <span class="summary-value white">
                {{ riskDisplay }}
            </span>
        </div>
    </div>
</template>

<script setup>
defineProps({
    pl: { type: Number, default: 0 },
    riskDisplay: { type: String, default: '0%' }
});
</script>

<style scoped>
.day-summary {
    background: #18181f; 
    border-top: 1px solid #2a2a35;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: center; 
    gap: 3rem;
}

.summary-card {
    display: flex;
    flex-direction: column;
    align-items: center; 
}
.summary-card label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 0.2rem;
}
.summary-value {
    font-size: 1.3rem;
    font-weight: 600;
}
.summary-value.green { color: #81c784; }
.summary-value.red { color: #e57373; }
.summary-value.white { color: #fff; }
</style>
