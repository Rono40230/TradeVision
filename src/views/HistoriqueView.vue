<template>
  <div class="historique-view">
    
    <div class="analytics-row">
      <FlexQueryAnalytics />
    </div>

    <HistoriqueComplet />

    <div class="bottom-tools-row">
      <div class="log-section">
        <AuditTrail />
      </div>
      <div class="assignment-section">
        <AssignmentsLog />
      </div>
    </div>
  </div>
</template>

<script setup>
import HistoriqueComplet from '../components/rocket/HistoriqueComplet.vue'
import FlexQueryAnalytics from '../components/FlexQueryAnalytics.vue'
import AuditTrail from '../components/common/AuditTrail.vue'
import AssignmentsLog from '../components/rocket/AssignmentsLog.vue'
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

.bottom-tools-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 10px;
}

.chart-section {
  border-radius: 8px;
  overflow: hidden;
}
</style>
