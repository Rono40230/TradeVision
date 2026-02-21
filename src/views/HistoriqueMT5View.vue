<script setup>
defineProps({ accountId: String });
</script>

<template>
  <div class="placeholder-view">
    <h1>Historique MT5</h1>
    <p class="account">{{ accountId ? `Compte : ${accountId}` : '' }}</p>
    <p class="soon">Journal des trades MT5 — à implémenter (PHASE 7)</p>
  </div>
</template>

<style scoped>
.placeholder-view {
  padding: 3rem;
  color: var(--text-muted);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}
h1 { color: var(--text-color); margin-bottom: 0.5rem; }
.account { font-size: 0.85rem; color: var(--accent-color); margin-bottom: 0.25rem; }
.soon { font-size: 0.9rem; opacity: 0.6; }
</style>
