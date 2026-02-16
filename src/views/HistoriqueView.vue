<template>
  <div class="historique-view">
    <AppTitlebar title="Trade History (IB Gateway)" />
    <FlexQueryAnalytics />
    <HistoriqueComplet />
  </div>
</template>

<script setup>
import AppTitlebar from '../components/AppTitlebar.vue'
import HistoriqueComplet from '../components/rocket/HistoriqueComplet.vue'
import FlexQueryAnalytics from '../components/FlexQueryAnalytics.vue'
</script>

<style scoped>
.historique-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
