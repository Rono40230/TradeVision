<template>
  <div class="rocket-alerts-card" :class="{ 'has-alerts': alerts.length > 0, 'empty': alerts.length === 0 }">
      <div class="header">
          <h4>🚨 Centre d'Alertes</h4>
      </div>
      
      <div v-if="alerts.length > 0" class="alerts-list">
          <div class="alert-item" v-for="(alert, idx) in alerts" :key="idx" :class="alert.level">
              <span class="icon">{{ getIcon(alert.level) }}</span>
              <div class="content">
                  <span class="msg">{{ alert.message }}</span>
                  <span class="detail" v-if="alert.detail">{{ alert.detail }}</span>
              </div>
          </div>
      </div>
      
      <div v-else class="empty-state">
          <span class="icon">✅</span>
          <span>Aucune alerte critique. Portefeuille sain.</span>
      </div>
  </div>
</template>

<script setup>
defineProps({
    alerts: {
        type: Array,
        default: () => [] // [{ level: 'high'|'medium', message: 'String', detail?: 'String' }]
    }
});

const getIcon = (level) => {
    switch(level) {
        case 'high': return '🛑';
        case 'medium': return '⚠️';
        default: return 'ℹ️';
    }
};
</script>

<style scoped>
.rocket-alerts-card {
    background: rgba(30, 30, 30, 0.5);
    border-radius: 8px;
    margin-bottom: 1rem;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
}

.rocket-alerts-card.has-alerts {
    border-color: #ff9800;
    box-shadow: 0 0 10px rgba(255, 152, 0, 0.1);
}

.header {
    background: rgba(0,0,0,0.2);
    padding: 0.5rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.header h4 { margin: 0; font-size: 0.85rem; color: #aaa; text-transform: uppercase; }

.alerts-list { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }

.alert-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 0.75rem;
    border-radius: 6px;
    background: rgba(255,255,255,0.05);
    font-size: 0.9rem;
}

.alert-item.high { background: rgba(244, 67, 54, 0.15); border-left: 3px solid #F44336; color: #ffcdd2; }
.alert-item.medium { background: rgba(255, 152, 0, 0.15); border-left: 3px solid #FF9800; color: #ffe0b2; }

.content { display: flex; flex-direction: column; }
.msg { font-weight: 500; }
.detail { font-size: 0.8rem; opacity: 0.8; margin-top: 2px; }

.empty-state {
    padding: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #81c784;
    font-weight: 500;
}
</style>
