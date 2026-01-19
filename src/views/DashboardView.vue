<script setup>
import { ref, watch, onMounted } from 'vue';
import StatCards from "../components/dashboard/StatCards.vue";
import ActiveTradesBar from "../components/dashboard/ActiveTradesBar.vue";
import TradeList from "../components/TradeList.vue";
import PerformanceChart from "../components/PerformanceChart.vue";

const props = defineProps({
  db: {
    type: Object,
    default: null
  }
});

const closedTradesCount = ref(0);
const openTradesCount = ref(0);
const totalProfit = ref(0);
const winRate = ref(0);
const selectedAsset = ref('all');
const breakdown = ref({
  wheel_put: 0,
  wheel_cc: 0,
  wheel_hedge: 0,
  wheel_assigned: 0,
  pcs: 0,
  iron_condor: 0,
  rockets_stock: 0,
  rockets_crypto: 0
});

// Watch for DB readiness and reload stats
watch(() => props.db, (newVal) => {
    if (newVal) {
        loadStats();
    }
}, { immediate: true });

watch(selectedAsset, loadStats);

async function loadStats() {
  if (!props.db) return;

  const params = selectedAsset.value !== 'all' ? [selectedAsset.value] : [];
  
  // 1. Closed Trades (Trades cloturés)
  let closedQuery = "SELECT COUNT(*) as count FROM trades WHERE status = 'closed'";
  if (selectedAsset.value !== 'all') closedQuery += " AND asset_type = ?";
  const closedResult = await props.db.select(closedQuery, params);
  closedTradesCount.value = closedResult[0].count;

  // 2. Open Trades Breakdown
  let openQuery = `
    SELECT t.id, t.strategy, t.asset_type, l.type, l.side, l.status as leg_status
    FROM trades t 
    JOIN legs l ON t.id = l.trade_id 
    WHERE t.status != 'closed' AND l.status != 'closed'
  `;
  
  if (selectedAsset.value !== 'all') openQuery += " AND t.asset_type = ?";
  
  const openResult = await props.db.select(openQuery, params);
  
  // Group by Trade ID
  const tradesMap = new Map();
  openResult.forEach(row => {
      if (!tradesMap.has(row.id)) {
          tradesMap.set(row.id, {
              strategy: row.strategy,
              asset_type: row.asset_type,
              legs: []
          });
      }
      tradesMap.get(row.id).legs.push(row);
  });
  
  openTradesCount.value = tradesMap.size;

  // Reset breakdown
  breakdown.value = {
      wheel_put: 0, wheel_cc: 0, wheel_hedge: 0, wheel_assigned: 0,
      pcs: 0, iron_condor: 0, rockets_stock: 0, rockets_crypto: 0
  };

  for (const trade of tradesMap.values()) {
      if (trade.strategy === 'wheel') {
          const hasShortCall = trade.legs.some(l => l.type === 'call' && l.side === 'short');
          const hasStock = trade.legs.some(l => l.type === 'stock');
          const hasShortPut = trade.legs.some(l => l.type === 'put' && l.side === 'short');
          const hasLongPut = trade.legs.some(l => l.type === 'put' && l.side === 'long');

          if (hasShortCall) breakdown.value.wheel_cc++;
          else if (hasStock) breakdown.value.wheel_assigned++;
          else if (hasShortPut) breakdown.value.wheel_put++;
          else if (hasLongPut) breakdown.value.wheel_hedge++;
      }
      else if (trade.strategy === 'pcs') {
          const hasCalls = trade.legs.some(l => l.type === 'call');
          const hasPuts = trade.legs.some(l => l.type === 'put');
          
          if (hasCalls && hasPuts) breakdown.value.iron_condor++;
          else breakdown.value.pcs++;
      }
      else if (trade.strategy === 'iron_condor') {
          breakdown.value.iron_condor++;
      }
      else if (trade.strategy === 'rockets') {
          if (trade.asset_type === 'crypto') breakdown.value.rockets_crypto++;
          else breakdown.value.rockets_stock++;
      }
  }

  // 3. Profit (closed)
  let profitQuery = "SELECT SUM(profit_loss) as profit FROM trades WHERE status = 'closed'";
  if (selectedAsset.value !== 'all') profitQuery += " AND asset_type = ?";
  const profitResult = await props.db.select(profitQuery, params);
  totalProfit.value = profitResult[0].profit || 0;

  // 4. Win Rate
  let winsQuery = "SELECT COUNT(*) as wins FROM trades WHERE status = 'closed' AND profit_loss > 0";
  if (selectedAsset.value !== 'all') {
    winsQuery += " AND asset_type = ?";
  }
  const winsResult = await props.db.select(winsQuery, params);
  
  if (closedTradesCount.value > 0) {
    winRate.value = ((winsResult[0].wins / closedTradesCount.value) * 100).toFixed(2);
  } else {
    winRate.value = 0;
  }
}
</script>

<template>
  <div class="dashboard-view">
    <header>
      <h1>TradeVision Dashboard</h1>
      <StatCards
        :closed-trades-count="closedTradesCount"
        :total-profit="totalProfit"
        :win-rate="winRate"
      />
      <div id="header-actions"></div>
    </header>

    <div class="dashboard-wrapper">
      <div class="dashboard">
        <ActiveTradesBar
          :open-trades-count="openTradesCount"
          :breakdown="breakdown"
        />
        
        <TradeList :filter="selectedAsset" @stats-updated="loadStats" />
        <PerformanceChart :filter="selectedAsset" />
      </div>
    </div>
  </div>
</template>

<style scoped>
header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#header-actions {
    display: flex;
    gap: 1rem;
}

h1 {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
  text-align: left;
}

.dashboard-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 80px); /* Adjust based on header height approximation if needed, or flex handles it */
}
/* Re-applying flex logic to parent container instead of calc might be better */
.dashboard-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.dashboard {
  padding: 2rem;
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-color);
}
</style>
