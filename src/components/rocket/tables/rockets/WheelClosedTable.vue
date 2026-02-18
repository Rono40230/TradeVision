<template>
  <div class="rocket-section closed">
      <table class="trade-table compact">
          <thead>
              <tr>
                  <th>Symbole</th>
                  <th>Type</th>
                  <th>Ouvert le</th>
                  <th>Fermé le</th>
                  <th>Terme</th>
                  <th>Strike</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>P/L Réalisé</th>
                  <th>% Profit</th>
                  <th>Nb</th>
                  <th>Action</th>
              </tr>
          </thead>
          <tbody>
               <tr v-if="closedTradesWithStats.length === 0">
                  <td colspan="12" class="empty-cell">Aucun trade Wheel clôturé récemment.</td>
              </tr>
              <tr v-for="trade in closedTradesWithStats" :key="trade.id">
                  <!-- Symbole -->
                  <td class="symbol-col">
                      <span class="symbol-badge">{{ trade.symbol }}</span>
                  </td>

                  <!-- Type (CSP, CC, Stock) -->
                  <td>
                      <span class="type-badge" :class="getBadgeClass(trade)">
                          {{ getBadgeLabel(trade) }}
                      </span>
                  </td>

                  <!-- Dates -->
                  <td>{{ formatDate(trade.open_date || trade.date) }}</td>
                  <td>{{ formatDate(trade.exit_date) }}</td>
                  
                  <!-- Terme (Expiration) - Empty for Stocks -->
                  <td>
                      <span v-if="!isStock(trade)">{{ formatDate(trade.expiration) }}</span>
                      <span v-else class="text-muted">-</span>
                  </td>
                  
                  <!-- Strike - Empty for Stocks -->
                  <td>
                      <span v-if="!isStock(trade)">{{ trade.strike_short || trade.strike || '-' }}</span>
                      <span v-else class="text-muted">-</span>
                  </td>

                  <!-- Entrée (Crédit ou Debit/Basis) -->
                  <td :class="isStock(trade) ? 'base-text' : 'positive-text'">
                      {{ formatPrice(trade, 'entry') }}
                  </td>

                  <!-- Sortie (Debit/Rachat ou Crédit/Vente) -->
                  <td :class="isStock(trade) ? 'positive-text' : 'base-text'">
                       {{ formatPrice(trade, 'exit') }}
                  </td>

                  <!-- P/L Réalisé -->
                  <td :class="trade.profit_loss >= 0 ? 'positive-text' : 'negative-text'" style="font-weight: bold;">
                      {{ formatCurrency(trade.profit_loss) }}
                  </td>

                  <!-- % Profit -->
                  <td :class="getProfitPctColor(trade.profit_pct)">
                       {{ trade.profit_pct }}%
                  </td>

                  <!-- Nb (Contrats ou Actions) -->
                  <td>{{ trade.quantity }}</td>

                  <!-- Actions -->
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
import { formatCurrency, formatDate } from '../../../../utils/rocketUtils.js';

const props = defineProps({
    trades: { type: Array, required: true }
});

defineEmits(['delete']);

const closedTradesWithStats = computed(() => {
    if (!props.trades) return [];
    
    // Sort by exit date DESC
    const closed = [...props.trades].sort((a, b) => {
        const dateA = new Date(a.exit_date || a.date).getTime();
        const dateB = new Date(b.exit_date || b.date).getTime();
        return dateB - dateA;
    });

    return closed.map(t => {
        const pl = parseFloat(t.profit_loss || 0);
        const entryPrice = parseFloat(t.entry_executed || t.price || 0); 
        const exitPrice = parseFloat(t.exit_price || 0);
        const qty = parseFloat(t.quantity || 0);
        
        // Calcul % Profit (sans quantité)
        let profitPct = 0;

        if (isStock(t)) {
            // STOCK: variation % entrée → sortie
            if (entryPrice > 0 && exitPrice > 0) {
                profitPct = (((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2);
            }
        } else {
            // OPTION Wheel (short): % du crédit capturé = (entrée - sortie) / entrée * 100
            if (entryPrice > 0 && exitPrice >= 0) {
                profitPct = (((entryPrice - exitPrice) / entryPrice) * 100).toFixed(0);
            }
        }

        return {
            ...t,
            profit_pct: profitPct
        };
    });
});

function isStock(trade) {
    return trade.asset_type === 'stock' || trade.type === 'stock';
}

function getBadgeLabel(trade) {
    if (isStock(trade)) return 'ACTION'; // STOCK -> ACTION (Francisé)
    
    // Logique exacte reprise de WheelTradesTable.vue (active trades)
    if (trade.sub_strategy) {
        if (trade.sub_strategy === 'hedge') return 'HEDGE (P)';
        if (trade.sub_strategy === 'hedge_spread') return 'HEDGE (S)';
        if (trade.sub_strategy === 'call') return 'COV. CALL';
        if (trade.sub_strategy === 'put') return 'VENTE PUT';
    }
    if (trade.type === 'put' && trade.side === 'short') return 'VENTE PUT';
    if (trade.type === 'call' && trade.side === 'short') return 'VENTE CALL';
    if (trade.type === 'spread') return 'DEBIT SPREAD';

    return trade.type ? trade.type.toUpperCase() : 'AUTRE';
}

function getBadgeClass(trade) {
    if (isStock(trade)) return 'action';
    
    // Logic aligned with WheelTradesTable.vue
    if (trade.sub_strategy === 'hedge') return 'hedge';
    if (trade.sub_strategy === 'hedge_spread') return 'hedge_spread';
    if (trade.type === 'spread') return 'hedge_spread';
    
    if ((trade.type === 'put' && trade.side === 'short') || trade.sub_strategy === 'put') return 'put';
    if (trade.type === 'put' && trade.side === 'long') return 'put_long';
    
    if ((trade.type === 'call' && trade.side === 'short') || trade.sub_strategy === 'call' || trade.sub_strategy === 'cc') return 'call';
    if (trade.type === 'call' && trade.side === 'long') return 'call_long';

    return 'option-badge';
}

function formatPrice(trade, type) {
    const val = type === 'entry' ? (trade.entry_executed || trade.price) : trade.exit_price;
    if (!val) return '-';
    
    if (isStock(trade)) {
        // Stock price display standard
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    } else {
        // Option premium display (Unit Price)
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    }
}

function getProfitPctColor(pct) {
    const val = parseFloat(pct);
    if (val >= 50) return 'positive-text'; 
    if (val > 0) return 'base-text'; 
    return 'negative-text';
}
</script>

<style scoped>
.rocket-section { 
background: transparent; 
border-radius: 8px; 
padding: 0; 
display: flex; 
flex-direction: column; 
}

.trade-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.trade-table.compact th, .trade-table.compact td { padding: 4px 8px; font-size: 0.85rem; }
.trade-table th, .trade-table td { padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.trade-table th { color: var(--text-muted); font-weight: 500; font-size: 0.8rem; text-transform: uppercase; }
.empty-cell { text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic; background: rgba(255, 255, 255, 0.02); }

.symbol-col { display: flex; flex-direction: column; gap: 2px; }
.symbol-badge { font-weight: 700; font-size: 0.95rem; color: var(--text-color); }

.type-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: #444; color: #eee; }
.type-badge.put { background: #e91e63; color: white; }
.type-badge.put_long { background: #9c27b0; color: white; }
.type-badge.call { background: #3f51b5; color: white; }
.type-badge.call_long { background: #2196f3; color: white; }
.type-badge.hedge { background: #009688; color: white; }
.type-badge.hedge_spread { background: #004d40; color: white; }
.type-badge.action { background: #607d8b; color: white; }
.type-badge.option-badge { background: #607D8B; }

.positive-text { color: #4caf50; }
.negative-text { color: #f44336; }
.base-text { color: #ccc; }
.text-muted { color: #666; }

.actions-cell { text-align: right; }
.delete-btn { background: transparent; border: none; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
.delete-btn:hover { opacity: 1; }

</style>
