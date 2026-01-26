<template>
    <div class="rocket-section pending">
          <h4 class="section-title">Trades en attente d'exécution</h4>
          <table class="trade-table compact">
              <thead>
                  <tr>
                      <th>Symbole</th>
                      <th>Type</th>
                      <th>Broker</th>
                      <th>Invalidation</th>
                      <th>Trailing Stop (Init)</th>
                      <th>Risque</th>
                      <th>Entrée Stop</th>
                      <th>Nb Actions</th>
                      <th>Date de saisie</th>
                      <th>Montant Position</th>
                      <th>Entrée Limite</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  <tr v-if="!trades || trades.length === 0">
                      <td colspan="12" class="empty-cell">Aucun ordre en attente.</td>
                  </tr>
                  <tr v-for="trade in trades" :key="trade.id">
                      <td class="symbol-col">
                          <span class="symbol-badge">{{ trade.symbol }}</span>
                      </td>
                      <td><span class="type-badge" :class="getAssetClass(trade.asset_type)">{{ trade.asset_type }}</span></td>
                      <td>{{ trade.broker }}</td>
                      <!-- Invalidation -->
                      <td class="negative-text">{{ formatPrice(trade.stop_loss, trade.asset_type) }}</td>
                      <!-- Trailing Stop = Invalidation at opening -->
                      <td>{{ formatPrice(trade.stop_loss, trade.asset_type) }}</td>
                      <!-- Risque Calc -->
                      <td>
                          {{ calculateRiskPercentage(trade) }}%
                      </td>
                      <!-- Entrée Stop -->
                      <td>{{ trade.entry_stop ? formatPrice(trade.entry_stop, trade.asset_type) : '-' }}</td>
                      <!-- Nb Actions (Editable) -->
                      <td>
                          <input 
                              type="number" 
                              :value="trade.quantity" 
                              @change="$emit('update-quantity', trade, $event.target.value)"
                              class="quantity-input-table"
                          />
                      </td>
                      <!-- Date de saisie -->
                      <td>{{ formatDate(trade.date) }}</td>
                      <!-- Montant Position -->
                      <td>{{ formatCurrency((trade.entry_stop || trade.entry_limit) * trade.quantity) }}</td>
                      <!-- Entrée Limite -->
                      <td>{{ trade.entry_limit ? formatPrice(trade.entry_limit, trade.asset_type) : '-' }}</td>

                      <td class="actions-cell">
                          <button class="action-btn success-btn" @click="$emit('activate-rocket', trade)" title="Trade ouvert">Trade ouvert</button>
                          <button class="action-btn delete-btn" @click="$emit('delete', trade)">🗑️</button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>
</template>

<script setup>
import { formatCurrency, formatDate, formatPrice, getAssetClass, calculateRiskPercentage } from '../../../../utils/rocketUtils.js';

defineProps({
    trades: { type: Array, required: true }
});

defineEmits(['update-quantity', 'activate-rocket', 'delete']);
</script>

<style scoped>
/* Scoped Styles Copy */
.rocket-section { background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; }
.rocket-section.pending { border-left: 4px solid #2196F3; }
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
.negative-text { color: #f44336; font-weight: 600; }
.quantity-input-table { background: transparent; border: 1px solid transparent; color: var(--text-color); font-family: inherit; font-size: 0.9rem; padding: 2px; border-radius: 4px; cursor: pointer; width: 70px; }
.quantity-input-table:hover, .quantity-input-table:focus { border: 1px solid var(--border-color); background: var(--bg-secondary); }

.actions-cell { display: flex; flex-direction: row; align-items: center; gap: 5px; white-space: nowrap; }
.action-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.success-btn { background: #4caf50; color: white; }
.success-btn:hover { background: #388e3c; }
.delete-btn { background: transparent; color: #999; border: 1px solid #444; font-size: 1rem; padding: 2px 6px; line-height: 1; }
.delete-btn:hover { background: rgba(255, 0, 0, 0.2); color: #ff6b6b; border-color: #ff6b6b; }
</style>
