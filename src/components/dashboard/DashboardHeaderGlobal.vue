<template>
  <header class="dashboard-header-global">
    <div class="header-left">
      <!-- Title removed as requested -->
    </div>

    <div class="header-metrics">
      <div class="metric-group global-capital">
        <span class="label">Net Liq. GLOBAL</span>
        <span class="value">{{ formatCurrency(totalNetLiq) }}</span>
      </div>

      <div class="metric-group global-pl" :class="getPlColor(totalDailyPl)">
        <span class="label">P/L Jour GLOBAL</span>
        <span class="value">{{ formatCurrency(totalDailyPl) }} <span class="percent" v-if="totalNetLiq > 0">({{ formatPercent(totalDailyPl / totalNetLiq * 100) }})</span></span>
      </div>
    </div>

    <div class="header-right">
      <!-- Placeholder for global settings or refresh -->
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRocketState } from '../../composables/useRocketState.js';
import { useKasperState } from '../../composables/useKasperState.js';

// Access stores
const { account: rocketAccount } = useRocketState();
const { accountsList: kasperAccounts, account: currentKasperAccount } = useKasperState();

// Helpers
const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
const formatPercent = (val) => (val || 0).toFixed(2) + '%';
const getPlColor = (val) => !val ? '' : (val > 0 ? 'text-green' : 'text-red');

// Computeds
const totalNetLiq = computed(() => {
    // Rocket Capital
    const rocketCap = rocketAccount.value.net_liq || rocketAccount.value.capital || 0;
    
    // Kasper Capital (Sum of all accounts capitals)
    // Note: accountsList might not be loaded if we didn't init Kasper.
    // We might need to ensure initialization in parent DashboardCockpit.
    const kasperCap = kasperAccounts.value.reduce((sum, acc) => sum + (acc.capital || 0), 0) || (currentKasperAccount.value.capital || 0);

    return rocketCap + kasperCap;
});

const totalDailyPl = computed(() => {
    // Rocket Day PL
    const rocketPl = rocketAccount.value.day_pl || 0;
    
    // Kasper Day PL
    // Assuming kasperAccounts doesn't hold daily PL directly yet (depending on implementation).
    // If not available, we assume 0 for now. 
    // Usually Kasper tracks daily entries. We might need logic here later.
    const kasperPl = 0; 

    return rocketPl + kasperPl;
});

</script>

<style scoped>
.dashboard-header-global {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background-color: var(--surface-color, #1e1e1e);
  border-bottom: 1px solid var(--border-color, #333);
  color: var(--text-color, #eee);
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--primary-color, #4CAF50);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-metrics {
  display: flex;
  gap: 2rem;
}

.metric-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.metric-group .label {
  font-size: 0.75rem;
  color: var(--text-muted, #888);
  text-transform: uppercase;
}

.metric-group .value {
  font-size: 1.1rem;
  font-weight: 600;
  font-family: 'Roboto Mono', monospace;
}

.metric-group.global-capital .value {
    color: var(--text-color, #fff);
}

.text-green .value { color: #4CAF50; }
.text-red .value { color: #F44336; }
.percent { font-size: 0.8em; opacity: 0.8; }
</style>
