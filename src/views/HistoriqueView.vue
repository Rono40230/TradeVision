<template>
  <div class="historique-view">
    <div class="analytics-row">
      <FlexQueryAnalytics />
    </div>
    <HistoriqueComplet />
  </div>
</template>

<script setup>
import HistoriqueComplet from '../components/rocket/HistoriqueComplet.vue'
import FlexQueryAnalytics from '../components/FlexQueryAnalytics.vue'
</script>

<style scoped>
.historique-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 20px;
  overflow-y: auto;
}

.analytics-row {
  width: 100%;
}
</style>
