<template>
    <div class="rocket-section risk">
          <h4 class="section-title">Trades ouverts à risque</h4>
          <table class="trade-table compact">
              <thead>
                  <tr>
                      <th>Symbole</th>
                      <th>Type</th>
                      <th>Broker</th>
                      <th>Entrée</th>
                      <th>Ouverture</th>
                      <th>Trailing Stop</th>
                      <th>Cours actuel</th>
                      <th>Tendance</th>
                      <th>Nb Actions</th>
                      <th>Montant Position</th>
                      <th>P/L</th>
                      <th>R1</th>
                      <th>Vente R1</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  <tr v-if="!trades || trades.length === 0">
                      <td colspan="14" class="empty-cell">Aucune position en risque.</td>
                  </tr>
                  <tr v-for="trade in trades" :key="trade.id">
                      <td class="symbol-col">
                          <span class="symbol-badge">{{ trade.symbol }}</span>
                      </td>
                      <td><span class="type-badge" :class="getAssetClass(trade.asset_type)">{{ trade.asset_type }}</span></td>
                      <td>{{ trade.broker }}</td>
                      
                      <!-- Entrée Execution -->
                      <td>{{ formatPrice(trade.entry_executed || trade.price, trade.asset_type) }}</td>
                      
                      <!-- Date Ouverture -->
                      <td>
                          <input type="date" :value="trade.open_date" @change="$emit('update-date', trade, $event.target.value)" class="date-input-table" />
                      </td>
                      
                      <!-- Trailing Stop -->
                      <td>
                          <input 
                              type="number" 
                              step="any"
                              :value="trade.trailing_stop || trade.stop_loss" 
                              @change="$emit('update-trailing-stop', trade, $event.target.value)"
                              class="quantity-input-table"
                              style="width: 80px;"
                          />
                      </td>

                      <!-- Cours actuel -->
                      <td :class="priceUtils.getTrendClass(trade.symbol)">
                           {{ priceUtils.getDisplayPrice(trade.symbol) }}
                      </td>

                      <!-- Tendance -->
                      <td :class="priceUtils.getTrendClass(trade.symbol)">
                           {{ priceUtils.getDisplayTrend(trade.symbol) }}
                      </td>

                      <!-- Nb Actions -->
                      <td>{{ trade.quantity }}</td>

                      <!-- Montant Position -->
                      <td>{{ formatCurrency((trade.entry_executed || trade.price || 0) * trade.quantity) }}</td>
                      
                      <!-- P/L -->
                      <td :class="getPLColor(trade, trade.quantity)">
                          {{ formatPL(trade, trade.quantity) }}
                      </td>

                      <!-- R1 = Entry + (Entry - Stop) -->
                      <td>
                          {{ formatPrice(
                              (trade.entry_executed || trade.price || 0) + 
                              Math.abs((trade.entry_executed || trade.price || 0) - (trade.stop_loss || 0)), 
                              trade.asset_type
                          ) }}
                      </td>
                      
                      <!-- Vente R1 (Quantity / 2) -->
                      <td>{{ parseFloat((trade.quantity / 2).toFixed(2)) }}</td>

                      <td class="actions-cell">
                          <button class="action-btn  neutral-btn" @click="$emit('neutralize-rocket', trade)" title="Vendre 50% et Sécuriser">Neutraliser</button>
                          <button class="action-btn close-btn" @click="$emit('close-rocket', trade)" title="Clôturer la position">Clôturer</button>
                          <button class="action-btn delete-btn" @click="$emit('delete', trade)" title="Supprimer">🗑️</button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>
</template>

<script setup>
import { formatCurrency, formatPrice, getAssetClass } from '../../../../utils/rocketUtils.js';
import { useLivePrices } from '../../../../composables/useLivePrices.js';

defineProps({
    trades: { type: Array, required: true }
});

defineEmits(['update-date', 'update-trailing-stop', 'neutralize-rocket', 'close-rocket', 'delete']);

const priceUtils = useLivePrices();

function getPLColor(trade, qty) {
    const currentPrice = priceUtils.livePrices[trade.symbol]?.price;
    if(!currentPrice) return '';
    const entry = trade.entry_executed || trade.price || 0;
    const pl = (currentPrice - entry) * qty;
    return pl >= 0 ? 'positive-text' : 'negative-text';
}

function formatPL(trade, qty) {
     const currentPrice = priceUtils.livePrices[trade.symbol]?.price;
    if(!currentPrice) return '-';
    const entry = trade.entry_executed || trade.price || 0;
    const pl = (currentPrice - entry) * qty;
    return formatCurrency(pl);
}
</script>

<style scoped>
.rocket-section { background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; }
.rocket-section.risk { border-left: 4px solid #e91e63; }
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

.positive-text, .positive { color: #4caf50; font-weight: 600; }
.negative-text, .negative { color: #f44336; font-weight: 600; }

.quantity-input-table { background: transparent; border: 1px solid transparent; color: var(--text-color); font-family: inherit; font-size: 0.9rem; padding: 2px; border-radius: 4px; cursor: pointer; width: 70px; }
.quantity-input-table:hover, .quantity-input-table:focus { border: 1px solid var(--border-color); background: var(--bg-secondary); }
.date-input-table { background: transparent; border: 1px solid transparent; color: var(--text-color); font-family: inherit; font-size: 0.9rem; padding: 2px; border-radius: 4px; cursor: pointer; width: 120px; }

.actions-cell { display: flex; flex-direction: row; align-items: center; gap: 5px; white-space: nowrap; }
.action-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.neutral-btn { background: #2196F3; color: white; }
.neutral-btn:hover { background: #1976D2; }
.close-btn { background: #f44336; color: white; }
.close-btn:hover { background: #d32f2f; }
.delete-btn { background: transparent; color: #999; border: 1px solid #444; font-size: 1rem; padding: 2px 6px; line-height: 1; }
.delete-btn:hover { background: rgba(255, 0, 0, 0.2); color: #ff6b6b; border-color: #ff6b6b; }
</style>
