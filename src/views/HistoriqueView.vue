<template>
  <div class="historique-view">
    <AppTitlebar title="Trade History (IB Gateway)" />
    <HistoriqueComplet />
  </div>
</template>

<script setup>
import AppTitlebar from '../components/AppTitlebar.vue'
import HistoriqueComplet from '../components/rocket/HistoriqueComplet.vue'
</script>

<style scoped>
.historique-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
