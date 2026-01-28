<template>
  <table class="trade-table">
    <thead>
        <tr>
            <th>Symbole</th>
            <th>Type</th>

            <!-- JOURNAL MODE -->
            <template v-if="viewMode === 'journal'">
                <th>Statut</th>
                <th>Ouvert le</th>
                <th>Terme</th>
                <th>Vente Put</th>
                <th>Achat Put</th>
                
                <th>Vente Call</th>
                <th>Achat Call</th>
                <th>Largeur</th>
                <th>Crédit Net</th>
                <th>Risque Max</th>
                <th>Rdt / Risque</th>
                <th>Cash Bloqué</th>
                <th>Nb Contrats</th>
            </template>

            <!-- PILOTAGE MODE -->
            <template v-if="viewMode === 'pilotage'">
                 <th>Terme</th>
                 <th>Prix Action</th>
                 <th>Dist. Short</th>
                 <th>Prob. ITM</th>
                 <th>Prix Spread</th>
                 <th>P/L Latent</th>
                 <th>% Profit</th>
            </template>

            <th>Action</th>
        </tr>
    </thead>
    <tbody>
            <tr v-if="trades.length === 0">
            <td :colspan="viewMode === 'journal' ? 14 : 10" class="empty-cell">Aucun PCS en cours.</td>
        </tr>
        <tr v-for="trade in trades" :key="trade.id">
            <td>{{ trade.symbol }}</td>
            <td><span class="type-badge" :class="trade.sub_strategy === 'ic' ? 'ic' : 'pcs'">{{ trade.sub_strategy === 'ic' ? 'Iron Condor' : 'Standard' }}</span></td>
            
            <!-- JOURNAL VIEW -->
            <template v-if="viewMode === 'journal'">
                <td>
                    <select 
                        :value="trade.status" 
                        @change="$emit('update-status', trade, $event.target.value)"
                        class="status-select"
                        :class="{'status-pending': trade.status === 'pending', 'status-open': trade.status === 'open'}"
                    >
                        <option value="pending">En attente</option>
                        <option value="open">Ouvert</option>
                    </select>
                </td>
                <td>
                    <input 
                        type="date" 
                        :value="trade.open_date || trade.date" 
                        @change="$emit('update-date', trade, $event.target.value)"
                        class="date-input-table"
                    />
                </td>
                <td>{{ formatDate(trade.expiration) }}</td>
                
                <!-- Puts -->
                <td>{{ trade.strike_short || '-' }}</td>
                <td>{{ trade.strike_long || '-' }}</td>
                
                <!-- Calls -->
                <td>{{ trade.item_call_short || '-' }}</td>
                <td>{{ trade.item_call_long || '-' }}</td>

                <!-- Metrics -->
                <td>{{ formatCurrency(Math.abs((trade.strike_short || 0) - (trade.strike_long || 0))) }}</td>
                <td>{{ formatCurrency(trade.price) }}</td>
                
                <!-- Max Risk: (Width - Credit) * 100 * Qty -->
                <td>{{ formatCurrency((Math.abs((trade.strike_short || 0) - (trade.strike_long || 0)) - trade.price) * 100 * trade.quantity) }}</td>
                
                <!-- Yield/Risk: Credit / Max Risk -->
                <td>{{ trade.price && (Math.abs((trade.strike_short || 0) - (trade.strike_long || 0)) - trade.price) > 0 ? ((trade.price / (Math.abs((trade.strike_short || 0) - (trade.strike_long || 0)) - trade.price)) * 100).toFixed(2) + '%' : '-' }}</td>

                <!-- Cash Bloqué (Risk Max * Qty) -->
                <td>{{ formatCurrency((Math.abs((trade.strike_short || 0) - (trade.strike_long || 0)) - trade.price) * 100 * trade.quantity) }}</td>
                
                <td>{{ trade.quantity }}</td>
            </template>

             <!-- PILOTAGE VIEW -->
            <template v-if="viewMode === 'pilotage'">
                 <td>{{ formatDate(trade.expiration) }}</td>
                 
                 <td :class="priceUtils.getTrendClass(trade.symbol)">
                    {{ priceUtils.getDisplayPrice(trade.symbol) }}
                </td>
                
                <!-- Distance Short -->
                <td :class="priceUtils.getDistanceShortClass(trade)" style="font-weight: bold;">
                    {{ priceUtils.getDistanceShort(trade) }}
                </td>

                <!-- Prob ITM -->
                <td>{{ priceUtils.getProbITM(trade) }}</td>

                <!-- Spread Price (Estimated) -->
                <td>{{ priceUtils.getSpreadPrice(trade) }}</td>

                <!-- P/L Latent -->
                <td :class="priceUtils.getSpreadPLClass(trade)">
                    {{ priceUtils.getSpreadPL(trade) }}
                </td>

                <!-- % Profit -->
                <td :class="priceUtils.getSpreadProfitClass(trade)">
                    {{ priceUtils.getSpreadProfit(trade) }}
                </td>
            </template>

            <td class="actions-cell">
                <button class="action-btn roll-btn" @click="$emit('roll-pcs', trade)" title="Rouler en CCS">Rouler</button>
                <button class="action-btn close-btn" @click="$emit('update-status', trade, 'closed')">Fermer</button>
                <button class="action-btn delete-btn" @click="$emit('delete', trade)" title="Supprimer">🗑️</button>
            </td>
        </tr>
    </tbody>
  </table>
</template>

<script setup>
import { formatCurrency, formatDate } from '../../../utils/rocketUtils.js';
import { useLivePrices } from '../../../composables/useLivePrices.js';

const props = defineProps({
    trades: { type: Array, required: true },
    viewMode: { type: String, default: 'journal' }
});

defineEmits(['update-status', 'update-date', 'delete', 'roll-pcs']);

const priceUtils = useLivePrices();
</script>

<style scoped>
/* Copied basics from ActiveTradesList */
.trade-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.trade-table th, .trade-table td { padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.trade-table th { color: var(--text-muted); font-weight: 500; }
.empty-cell { text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic; background: rgba(255, 255, 255, 0.02); }

.type-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: #444; color: #eee; }
.type-badge.ic { background: #ff9800; color: black; }
.type-badge.pcs { background: #81d4fa; color: black; }

.status-select { padding: 4px 8px; border-radius: 4px; border: none; font-weight: 600; cursor: pointer; color: black; }
.status-select.status-pending { background-color: #2196F3; color: white; }
.status-select.status-open { background-color: #4caf50; color: black; }

.date-input-table { background: transparent; border: 1px solid transparent; color: var(--text-color); font-family: inherit; font-size: 0.9rem; padding: 2px; border-radius: 4px; cursor: pointer; }
.date-input-table:hover, .date-input-table:focus { border: 1px solid var(--border-color); background: var(--bg-secondary); }

.actions-cell { display: flex; flex-direction: row; align-items: center; gap: 5px; white-space: nowrap; }
.action-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.roll-btn { background: #ff9800; color: black; }
.roll-btn:hover { background: #f57c00; }
.close-btn { background: #f44336; color: white; }
.close-btn:hover { background: #d32f2f; }
.delete-btn { background: transparent; color: #999; border: 1px solid #444; font-size: 1rem; padding: 2px 6px; line-height: 1; }
.delete-btn:hover { background: rgba(255, 0, 0, 0.2); color: #ff6b6b; border-color: #ff6b6b; }

.positive-text { color: #4caf50; font-weight: 600; }
.negative-text { color: #f44336; font-weight: 600; }
</style>
