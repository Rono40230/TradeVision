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
                      <th>Vente Put</th>
                      <th>Achat Put</th>
                      <th>Vente Call</th>
                      <th>Achat Call</th>
                      <th>Crédit Net</th>
                      <th>Débit Sortie</th>
                      <th>P/L Réalisé</th>
                      <th>% Profit</th>
                      <th>Nb Contrats</th>
                      <th>Action</th>
                  </tr>
              </thead>
              <tbody>
                   <tr v-if="closedTradesWithStats.length === 0">
                      <td colspan="15" class="empty-cell">Aucun PCS clôturé récemment.</td>
                  </tr>
                  <tr v-for="trade in closedTradesWithStats" :key="trade.id">
                      <!-- Symbole -->
                      <td class="symbol-col">
                          <span class="symbol-badge">{{ trade.symbol }}</span>
                      </td>

                      <!-- Type -->
                      <td>
                          <span class="type-badge" :class="trade.sub_strategy === 'ic' ? 'ic' : 'pcs'">
                              {{ trade.sub_strategy === 'ic' ? 'Iron Condor' : 'Standard' }}
                          </span>
                      </td>

                      <!-- Dates -->
                      <td>{{ formatDate(trade.open_date || trade.date) }}</td>
                      <td>{{ formatDate(trade.exit_date) }}</td>
                      <td>{{ formatDate(trade.expiration) }}</td>
                      
                      <!-- Strikes Put -->
                      <td>{{ trade.strike_short || '-' }}</td>
                      <td>{{ trade.strike_long || '-' }}</td>

                      <!-- Strikes Call -->
                      <td>{{ trade.item_call_short || '-' }}</td>
                      <td>{{ trade.item_call_long || '-' }}</td>

                      <!-- Crédit Initial -->
                      <td class="positive-text">
                          {{ formatCurrency(totalCredit(trade)) }}
                      </td>

                      <!-- Débit Sortie (Prix de rachat) -->
                         <!-- 
                            Le "Débit Sortie" n'est pas toujours stocké explicitement en base comme un champ unique,
                            mais on peut le déduire : P/L = Crédit - Débit.
                            Donc Débit = Crédit - P/L.
                         -->
                      <td class="base-text">
                           {{ formatCurrency(calcDebit(trade)) }}
                      </td>

                      <!-- P/L Réalisé -->
                      <td :class="trade.profit_loss >= 0 ? 'positive-text' : 'negative-text'" style="font-weight: bold;">
                          {{ formatCurrency(trade.profit_loss) }}
                      </td>

                      <!-- % Profit (Prime capturée) -->
                      <td :class="getProfitPctColor(trade.profit_pct)">
                           {{ trade.profit_pct }}%
                      </td>

                      <!-- Nb Contrats -->
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
    
    // Sort by exit date DESC (Recent first)
    const closed = [...props.trades].sort((a, b) => {
        const dateA = new Date(a.exit_date || a.date).getTime();
        const dateB = new Date(b.exit_date || b.date).getTime();
        return dateB - dateA;
    });

    return closed.map(t => {
        const entry = parseFloat(t.entry_executed || t.price || 0);
        const exit  = parseFloat(t.exit_price || 0);
        const pl    = parseFloat(t.profit_loss || 0);

        // % Profit PCS (short put spread) : % du crédit capturé = (entrée - sortie) / entrée * 100
        // Exemple : vendu à 1.00$, racheté à 0.20$ → 80% du crédit capturé
        let profitPct = 0;
        if (entry > 0 && exit >= 0) {
            profitPct = (((entry - exit) / entry) * 100).toFixed(0);
        }

        return {
            ...t,
            profit_pct: profitPct
        };
    });
});

function totalCredit(trade) {
    // trade.entry_executed is unit price. 
    return (parseFloat(trade.entry_executed || trade.price) || 0) * 100 * (trade.quantity || 0);
}

function calcDebit(trade) {
    const credit = totalCredit(trade);
    const pl = parseFloat(trade.profit_loss || 0);
    // PL = Credit - Debit  =>  Debit = Credit - PL
    return credit - pl;
}

function getProfitPctColor(pct) {
    const val = parseFloat(pct);
    if (val >= 50) return 'positive-text'; // Target reached
    if (val > 0) return 'base-text'; // Positive but low
    return 'negative-text'; // Loss
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

.type-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; background: #444; color: #eee; }
.type-badge.ic { background: #9c27b0; color: white; }
.type-badge.pcs { background: #2196F3; color: white; }

.positive-text { color: #4caf50; }
.negative-text { color: #f44336; }
.base-text { color: #ccc; }

.actions-cell { text-align: right; }
.delete-btn { background: transparent; border: none; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
.delete-btn:hover { opacity: 1; }

</style>
