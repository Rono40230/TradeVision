<script setup>
defineProps({
  totalProfit: {
    type: Number,
    required: true
  },
  winRate: {
    type: [Number, String],
    required: true
  }
})
</script>

<template>
  <div class="header-stats">
    <div class="mini-stat">
      <h3>Profit Total</h3>
      <p>{{ totalProfit.toFixed(2) }} $</p>
    </div>
    <div class="mini-stat">
      <h3>Taux de Réussite</h3>
      <p>{{ winRate }}%</p>
    </div>
  </div>
</template>

<style scoped>
.header-stats {
    display: flex;
    gap: 3rem;
    justify-content: center;
    flex: 1;
}

.mini-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.mini-stat h3 {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.mini-stat p {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--accent-color);
}
</style>
