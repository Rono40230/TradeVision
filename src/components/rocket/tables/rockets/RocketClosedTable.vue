<template>
      <div class="rocket-section closed">
          <h4 class="section-title">Trades clôturés</h4>
          <table class="trade-table compact">
              <thead>
                  <tr>
                      <th>Symbole</th>
                      <th>Type</th>
                      <th>Broker</th>
                      <th>Ouverture</th>
                      <th>Clôture</th>
                      <th>PV/MV</th>
                      <th>RR</th>
                      <th>Perf. Cumulée</th>
                      <th>% Perf</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                   <tr v-if="closedTradesWithStats.length === 0">
                      <td colspan="10" class="empty-cell">Aucun trade clôturé récemment.</td>
                  </tr>
                  <tr v-for="trade in closedTradesWithStats" :key="trade.id">
                      <td class="symbol-col">
                          <span class="symbol-badge">{{ trade.symbol }}</span>
                      </td>
                      <td><span class="type-badge" :class="getAssetClass(trade.asset_type)">{{ trade.asset_type }}</span></td>
                      <td>{{ trade.broker }}</td>
                      <td>{{ formatDate(trade.open_date) }}</td>
                      <td>{{ formatDate(trade.exit_date) }}</td>
                      
                      <!-- PV/MV -->
                      <td :class="trade.profit_loss >= 0 ? 'positive-text' : 'negative-text'">
                          {{ formatCurrency(trade.profit_loss) }}
                      </td>

                      <!-- RR -->
                      <td :class="(parseFloat(trade.rr) >= 0) ? 'positive-text' : 'negative-text'">
                           {{ trade.rr === '-' ? '-' : trade.rr + ' R' }}
                      </td>

                       <!-- Cumulative -->
                       <td :class="trade.cumulative >= 0 ? 'positive-text' : 'negative-text'">
                          {{ formatCurrency(trade.cumulative) }}
                      </td>

                      <!-- % Perf -->
                      <td :class="parseFloat(trade.perf_pct) >= 0 ? 'positive-text' : 'negative-text'">
                           {{ trade.perf_pct }}%
                      </td>

                      <td class="actions-cell">
                          <button class="action-btn delete-btn" @click="$emit('delete', trade)">🗑️</button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatCurrency, formatDate, getAssetClass } from '../../../../utils/rocketUtils.js';

const props = defineProps({
    trades: { type: Array, required: true }
});

defineEmits(['delete']);

const closedTradesWithStats = computed(() => {
    if (!props.trades) return [];
    
    // Sort by exit date ASC to calculate running total properly
    const closed = [...props.trades].sort((a, b) => {
        const dateA = new Date(a.exit_date || a.date).getTime();
        const dateB = new Date(b.exit_date || b.date).getTime();
        return dateA - dateB;
    });

    let runningTotal = 0;
    const enriched = closed.map(t => {
        const pl = t.profit_loss || 0;
        runningTotal += pl;

        const entry = t.entry_executed || t.price || 0;
        const stop = t.stop_loss || 0;
        const qty = t.quantity || 0;
        
        let rr = '-';
        if (entry > 0 && stop > 0 && qty > 0) {
            const riskPerShare = Math.abs(entry - stop);
            const totalRisk = riskPerShare * qty;
            if (totalRisk > 0.01) { 
                rr = (pl / totalRisk).toFixed(2);
            }
        }

        let perfPct = '0.00';
        if (entry > 0 && qty > 0) {
            const invested = entry * qty;
            perfPct = ((pl / invested) * 100).toFixed(2);
        }

        return {
            ...t,
            cumulative: runningTotal,
            rr: rr,
            perf_pct: perfPct
        };
    });

    return enriched.reverse();
});
</script>

<style scoped>
.rocket-section { background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; }
.rocket-section.closed { border-left: 4px solid #9e9e9e; opacity: 0.8; }
.section-title { margin: 0 0 1rem 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
.trade-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.trade-table.compact th, .trade-table.compact td { padding: 4px 8px; font-size: 0.85rem; }
.trade-table th, .trade-table td { padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.trade-table th { color: var(--text-muted); font-weight: 500; }
.empty-cell { text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic; background: rgba(255, 255, 255, 0.02); }

.symbol-col { display: flex; flex-direction: column; gap: 2px; }
.symbol-badge { font-weight: 700; font-size: 0.95rem; color: var(--text-color); }
.type-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; background: #444; color: #eee; }
.type-badge.action { background: #607d8b; color: white; }
.type-badge.etf { background: #9c27b0; color: white; }
.type-badge.crypto { background: #f57c00; color: white; }

.positive-text { color: #4caf50; font-weight: 600; }
.negative-text { color: #f44336; font-weight: 600; }

.actions-cell { display: flex; flex-direction: row; align-items: center; gap: 5px; white-space: nowrap; }
.action-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.delete-btn { background: transparent; color: #999; border: 1px solid #444; font-size: 1rem; padding: 2px 6px; line-height: 1; }
.delete-btn:hover { background: rgba(255, 0, 0, 0.2); color: #ff6b6b; border-color: #ff6b6b; }
</style>
