<template>
  <table class="trade-table">
    <thead>
        <tr>
            <th>Symbole</th>
            <th>Type</th>

            <!-- MODE JOURNAL -->
            <template v-if="viewMode === 'journal'">
                <th>Statut</th>
                <th>Ouvert le</th>
                <th>Expiration</th>
                <th>Taille pos.</th>
                <th>Strike</th>
                <th>Prime</th>
                <th>Coût contrat</th>
                <th>Qté</th>
                <th>Cash bloqué</th>
                <th>Rendement</th>
                <th>Prime attendue</th>
            </template>

            <!-- MODE PILOTAGE -->
            <template v-if="viewMode === 'pilotage'">
                <th>Expiration</th>
                <th>Strike</th>
                <th>Prix Action</th>
                <th>Dist. Strike</th>
                <th>Prix Option</th>
                <th>% Profit</th>
                <th>P/L Latent</th>
                <th>Qté</th>
                <th>Prime Encaissée</th>
            </template>

            <th>Action</th>
        </tr>
    </thead>
    <tbody>
        <tr v-if="trades.length === 0">
            <td :colspan="viewMode === 'journal' ? 14 : 10" class="empty-cell">Aucun trade d'options en cours.</td>
        </tr>
        <tr v-for="trade in trades" :key="trade.id">
            <td>{{ trade.symbol }}</td>
            <td><span class="type-badge" :class="getTypeClass(trade)">{{ formatType(trade) }}</span></td>
            
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
                        v-if="trade.status === 'open'" 
                        type="date" 
                        :value="trade.open_date || trade.date" 
                        @change="$emit('update-date', trade, $event.target.value)"
                        class="date-input-table"
                    />
                    <span v-else>-</span>
                </td>
                <td>{{ formatDate(trade.expiration) }}</td>
                <td>{{ trade.position_size_pct ? trade.position_size_pct + '%' : '-' }}</td>
                <td>{{ trade.strike }}</td>
                <td>{{ formatCurrency(trade.price) }}</td>
                <td>
                    <span v-if="trade.sub_strategy === 'hedge_spread' || trade.sub_strategy === 'hedge' || trade.type === 'spread' || trade.sub_strategy === 'call' || (trade.type === 'call' && trade.side === 'short')">-</span>
                    <span v-else>{{ formatCurrency(trade.strike * 100) }}</span>
                </td>
                <td>{{ trade.quantity }}</td>
                <td>
                    <span v-if="trade.sub_strategy === 'call' || (trade.type === 'call' && trade.side === 'short')">-</span>
                    <span v-else-if="trade.sub_strategy === 'hedge_spread' || trade.sub_strategy === 'hedge' || trade.type === 'spread'">
                        {{ formatCurrency(trade.entry_price ? (trade.entry_price * 100 * trade.quantity) : (trade.price * 100 * trade.quantity)) }} (Debit)
                    </span>
                    <span v-else>
                        {{ formatCurrency(trade.strike * 100 * trade.quantity) }}
                    </span>
                </td>
                <td>{{ trade.type === 'spread' || trade.sub_strategy === 'hedge' ? '-' : (trade.target_yield ? trade.target_yield + '%' : ((trade.price / trade.strike) * 100).toFixed(2) + '%') }}</td>
                <td>
                    <span v-if="trade.sub_strategy === 'hedge' || trade.sub_strategy === 'hedge_spread'">
                        -
                    </span>
                    <span v-else>
                        {{ formatCurrency(trade.target_yield ? (trade.strike * 100 * trade.quantity * (trade.target_yield / 100)) : (trade.price * 100 * trade.quantity)) }}
                    </span>
                </td>
            </template>

            <!-- PILOTAGE VIEW -->
            <template v-if="viewMode === 'pilotage'">
                <td>{{ formatDate(trade.expiration) }}</td>
                <td>{{ trade.strike }}</td>
                <td :class="priceUtils.getTrendClass(trade.symbol)">
                    {{ priceUtils.getDisplayPrice(trade.symbol) }}
                </td>
                <td :class="priceUtils.getMoneynessClass(trade)" style="font-weight: bold;">
                    {{ priceUtils.getDistanceToStrike(trade) }}
                </td>
                
                <!-- Prix Option (Mark) -->
                <td>
                    {{ priceUtils.getDisplayOptionPrice(trade) }}
                </td>
                
                <!-- % Profit -->
                <td :class="priceUtils.getProfitProgressClass(trade)">
                    {{ priceUtils.getProfitProgress(trade) }}
                </td>

                <!-- P/L Latent -->
                <td :class="priceUtils.getLatentPLClass(trade)">
                    {{ priceUtils.getLatentPL(trade) }}
                </td>

                <td>{{ trade.quantity }}</td>
                <td>
                    {{ formatCurrency(trade.price * 100 * trade.quantity) }}
                </td>
            </template>

            <td class="actions-cell">
                <button v-if="canAssign(trade) && trade.status === 'open'" class="action-btn assign-btn" @click="$emit('assign', trade)">Assign</button>
                <button v-if="trade.status !== 'closed' && trade.status !== 'assigned'" class="action-btn close-btn" @click="$emit('update-status', trade, 'closed')">Fermer</button>
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

defineEmits(['update-status', 'update-date', 'assign', 'delete']);

const priceUtils = useLivePrices();

function getTypeClass(trade) {
    if (!trade) return '';
    if (trade.sub_strategy === 'hedge') return 'hedge';
    if (trade.sub_strategy === 'hedge_spread') return 'hedge_spread';
    if (trade.type === 'spread') return 'hedge_spread';
    if (trade.type === 'put' && trade.side === 'short') return 'put';
    if (trade.type === 'put' && trade.side === 'long') return 'put_long';
    if (trade.type === 'call' && trade.side === 'short') return 'call';
    if (trade.type === 'call' && trade.side === 'long') return 'call_long';
    if (trade.type === 'stock') return 'action';
    return '';
}

function formatType(trade) {
    if (trade.sub_strategy) {
        if (trade.sub_strategy === 'hedge') return 'Hedge (P)';
        if (trade.sub_strategy === 'hedge_spread') return 'Hedge (Spread)';
        if (trade.sub_strategy === 'call') return 'Covered Call';
        if (trade.sub_strategy === 'put') return 'Vente PUT';
    }
    if (trade.type === 'put' && trade.side === 'short') return 'Vente PUT';
    if (trade.type === 'call' && trade.side === 'short') return 'Vente CALL';
    if (trade.type === 'stock') return 'Action';
    if (trade.type === 'spread') return 'Debit Spread';
    return trade.type;
}

function canAssign(trade) {
    return (trade.type === 'put' && trade.side === 'short');
}
</script>

<style scoped>
/* Copied basics from ActiveTradesList */
.trade-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.trade-table th, .trade-table td { padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.trade-table th { color: var(--text-muted); font-weight: 500; }
.empty-cell { text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic; background: rgba(255, 255, 255, 0.02); }

.type-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: #444; color: #eee; }
.type-badge.put { background: #e91e63; color: white; }
.type-badge.put_long { background: #9c27b0; color: white; }
.type-badge.call { background: #3f51b5; color: white; }
.type-badge.call_long { background: #2196f3; color: white; }
.type-badge.hedge { background: #009688; color: white; }
.type-badge.hedge_spread { background: #004d40; color: white; }
.type-badge.action { background: #607d8b; color: white; }

.status-select { padding: 4px 8px; border-radius: 4px; border: none; font-weight: 600; cursor: pointer; color: black; }
.status-select.status-pending { background-color: #2196F3; color: white; }
.status-select.status-open { background-color: #4caf50; color: black; }

.date-input-table { background: transparent; border: 1px solid transparent; color: var(--text-color); font-family: inherit; font-size: 0.9rem; padding: 2px; border-radius: 4px; cursor: pointer; }
.date-input-table:hover, .date-input-table:focus { border: 1px solid var(--border-color); background: var(--bg-secondary); }

.actions-cell { display: flex; flex-direction: row; align-items: center; gap: 5px; white-space: nowrap; }
.action-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.assign-btn { background: #ff9800; color: #000; }
.assign-btn:hover { background: #e68900; }
.close-btn { background: #f44336; color: white; }
.close-btn:hover { background: #d32f2f; }
.delete-btn { background: transparent; color: #999; border: 1px solid #444; font-size: 1rem; padding: 2px 6px; line-height: 1; }
.delete-btn:hover { background: rgba(255, 0, 0, 0.2); color: #ff6b6b; border-color: #ff6b6b; }

.positive-text { color: #4caf50; font-weight: 600; }
.negative-text { color: #f44336; font-weight: 600; }
</style>
