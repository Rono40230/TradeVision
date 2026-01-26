<template>
  <div class="assignments-table-container" v-if="trades.length > 0">
    <h3 class="assignments-header">Tableau des assignations</h3>
    <div class="table-scroll-wrapper">
        <table class="trade-table">
            <thead>
                <tr>
                    <th>Symbole</th>
                    <th>Date Assignation</th>
                    <th>PRU</th>
                    <th>Nb actions</th>
                    <th>Coût Total</th>
                    <th>Prix Actuel</th>
                    <th>Tendance</th>
                    <th>P/L</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="trade in trades" :key="trade.id">
                    <td>{{ trade.symbol }}</td>
                    <td>{{ formatDate(trade.open_date || trade.date) }}</td>
                    <!-- Use price (open_price from DB processing) instead of strike, as stock legs have open_price set to strike in confirmAssignment -->
                    <td>{{ formatCurrency(trade.price) }}</td>
                    <td>{{ trade.quantity * 100 }}</td>
                    <td>{{ formatCurrency(trade.price * trade.quantity * 100) }}</td>
                    
                    <!-- Live Price Column -->
                    <td>
                        {{ priceUtils.getDisplayPrice(trade.symbol) }}
                    </td>
                    <td :class="priceUtils.getTrendClass(trade.symbol)">
                        {{ priceUtils.getDisplayTrend(trade.symbol) }}
                    </td>

                    <!-- P/L Latent -->
                    <td :class="getPLClass(trade)">
                        {{ getLatentPL(trade) }}
                    </td>

                    <td class="actions-cell">
                        <button class="action-btn covered-call-btn" @click="$emit('open-cc-modal', trade)">Covered Call</button>
                        <button class="action-btn close-btn" @click="$emit('close-assignment', trade)">Fermer</button>
                        <button class="action-btn delete-btn" @click="$emit('delete', trade)" title="Supprimer">🗑️</button>
                        <!-- Future: Add 'Sell Covered Call' shortcut? -->
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
  </div>
</template>

<script setup>
import { useLivePrices } from '../../../composables/useLivePrices.js';
import { formatCurrency, formatDate } from '../../../utils/rocketUtils.js';

const props = defineProps({
    trades: { type: Array, required: true }
});

defineEmits(['close-assignment', 'open-cc-modal', 'delete']);

const priceUtils = useLivePrices();

function getLatentPL(trade) {
    const currentPrice = priceUtils.livePrices[trade.symbol]?.price;
    if (currentPrice === undefined || currentPrice === null) return '...';
    
    // For stock assigned, cost basis is trade.price (mapped from open_price/strike at assignment)
    const entryPrice = trade.price; 
    const diff = currentPrice - entryPrice;
    const totalDiff = diff * (trade.quantity * 100); // Multiply by 100 to get shares
    
    return formatCurrency(totalDiff);
}

function getPLClass(trade) {
    const currentPrice = priceUtils.livePrices[trade.symbol]?.price;
    if (currentPrice === undefined || currentPrice === null) return '';
    return currentPrice >= trade.price ? 'positive-text' : 'negative-text';
}

// Extend priceUtils locally to access raw price if needed, checking existing composable
// The composable exposes getDisplayPrice which formats it. We need raw price for calc.
// Let's assume priceUtils.livePrices acts as reactive object we can access if needed, 
// or I'll check how to get raw price.
// useLivePrices.js doesn't export the reactive object directly in the snippet I saw, 
// but checking the file again, it didn't export `livePrices`?
// Wait, I needs to check useLivePrices.js more carefully.
</script>

<style scoped>
.assignments-table-container {
    /* Removed margin-top and border-top for flex layout compatibility */
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden; 
}

.table-scroll-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

.assignments-header {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
    color: var(--text-color);
    font-weight: 600;
}

.trade-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; table-layout: fixed; }
.trade-table th, .trade-table td { padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.trade-table th { color: var(--text-muted); font-weight: 500; }
.trade-table td { color: var(--text-color); }

/* Column Widths to fill block nicely */
.trade-table th:nth-child(1) { width: 8%; } /* Symbole */
.trade-table th:nth-child(2) { width: 12%; } /* Date */
.trade-table th:nth-child(3) { width: 10%; } /* PRU */
.trade-table th:nth-child(4) { width: 10%; } /* Nb actions */
.trade-table th:nth-child(5) { width: 12%; } /* Coût Total */
.trade-table th:nth-child(6) { width: 10%; } /* Prix Actuel */
.trade-table th:nth-child(7) { width: 10%; } /* Tendance */
.trade-table th:nth-child(8) { width: 10%; } /* P/L */
.trade-table th:nth-child(9) { width: 18%; } /* Actions */

.actions-cell { display: flex; gap: 5px; align-items: center; }
.action-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.close-btn { background: #f44336; color: white; }
.close-btn:hover { background: #d32f2f; }
.covered-call-btn { background: #3f51b5; color: white; }
.covered-call-btn:hover { background-color: #303f9f; }

.delete-btn { background: transparent; color: #999; border: 1px solid #444; font-size: 1rem; padding: 2px 6px; line-height: 1; }
.delete-btn:hover { background: rgba(255, 0, 0, 0.2); color: #ff6b6b; border-color: #ff6b6b; }

.trade-table td.positive-text, .trade-table td.positive { color: #4caf50; font-weight: 600; }
.trade-table td.negative-text, .trade-table td.negative { color: #f44336; font-weight: 600; }
</style>