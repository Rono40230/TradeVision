<template>
  <div class="right-column-lists">
      <!-- Active Trades Block -->
      <div class="active-trades-block">
        <h3 v-if="strategyType !== 'rockets'">Trades en Cours</h3>
        <div class="table-container">
            
                <!-- WHEEL/OPTIONS TABLE -->
            <table v-if="strategyType === 'wheel'" class="trade-table">
                <thead>
                    <tr>
                        <th>Symbole</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th>Ouvert le</th>
                        <th>Expiration</th>
                        <th>Taille pos.</th>
                        <th>Strike</th>
                        <th>Prime</th> <!-- Unit Price -->
                        <th>Coût contrat</th> <!-- Strike x 100 -->
                        <th>Qté</th>
                        <th>Cash bloqué</th>
                        <th>Rendement</th>
                        <th>Prime attendue</th> <!-- Total Premium -->
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="wheelOptions.length === 0">
                        <td colspan="14" class="empty-cell">Aucun trade d'options en cours.</td>
                    </tr>
                    <tr v-for="trade in wheelOptions" :key="trade.id">
                        <td>{{ trade.symbol }}</td>
                        <td><span class="type-badge" :class="getTypeClass(trade)">{{ formatType(trade) }}</span></td>
                        <td>
                            <!-- Status Dropdown -->
                            <select 
                                :value="trade.status" 
                                @change="onUpdateStatus(trade, $event.target.value)"
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
                        <td class="actions-cell">
                            <button v-if="canAssign(trade) && trade.status === 'open'" class="action-btn assign-btn" @click="$emit('assign', trade)">Assign</button>
                            <button v-if="trade.status !== 'closed' && trade.status !== 'assigned'" class="action-btn close-btn" @click="onUpdateStatus(trade, 'closed')">Fermer</button>
                            <button class="action-btn delete-btn" @click="$emit('delete', trade)" title="Supprimer">🗑️</button>
                        </td>
                    </tr>
                </tbody>
            </table>

                <!-- PCS TABLE -->
            <table v-if="strategyType === 'pcs'" class="trade-table">
                <thead>
                    <tr>
                        <th>Symbole</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th>Ouvert le</th>
                        <th>Terme</th>
                        <th>Vente Put</th>
                        <th>Achat Put</th>
                        <th>Vente Call</th>
                        <th>Achat Call</th>
                        <th>Strike</th> <!-- Width -->
                        <th>Cash Bloqué</th>
                        <th>Nb Contrats</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                        <tr v-if="pcsTrades.length === 0">
                        <td colspan="13" class="empty-cell">Aucun PCS en cours.</td>
                    </tr>
                    <tr v-for="trade in pcsTrades" :key="trade.id">
                        <td>{{ trade.symbol }}</td>
                        <td><span class="type-badge" :class="trade.sub_strategy === 'ic' ? 'ic' : 'pcs'">{{ trade.sub_strategy === 'ic' ? 'Iron Condor' : 'Standard' }}</span></td>
                        <td>
                             <select 
                                :value="trade.status" 
                                @change="onUpdateStatus(trade, $event.target.value)"
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
                        <td>{{ trade.strike_call_short || '-' }}</td>
                        <td>{{ trade.strike_call_long || '-' }}</td>

                        <!-- Strike / Width -->
                        <td>{{ Math.abs(trade.strike_short - trade.strike_long).toFixed(2) }}</td>
                        
                         <!-- Cash Bloqué -->
                        <td>{{ formatCurrency(Math.abs(trade.strike_short - trade.strike_long) * 100 * trade.quantity) }}</td>

                        <td>{{ trade.quantity }}</td>

                        <td class="actions-cell">
                            <button v-if="trade.status !== 'closed'" class="action-btn close-btn" @click="onUpdateStatus(trade, 'closed')">Fermer</button>
                            <button class="action-btn delete-btn" @click="$emit('delete', trade)" title="Supprimer">🗑️</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- ROCKETS TABLES -->
            <div v-if="strategyType === 'rockets'" class="rockets-container">
                
                <!-- 1. PENDING (SAISIE) -->
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
                            <tr v-if="!rocketsTrades.pending || rocketsTrades.pending.length === 0">
                                <td colspan="12" class="empty-cell">Aucun ordre en attente.</td>
                            </tr>
                            <tr v-for="trade in rocketsTrades.pending" :key="trade.id">
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

                <!-- 2. RISK (OUVERT) -->
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
                            <tr v-if="!rocketsTrades.risk || rocketsTrades.risk.length === 0">
                                <td colspan="14" class="empty-cell">Aucune position en risque.</td>
                            </tr>
                            <tr v-for="trade in rocketsTrades.risk" :key="trade.id">
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
                                <td :class="getTrendClass(trade.symbol)">
                                     {{ getDisplayPrice(trade.symbol) }}
                                </td>

                                <!-- Tendance -->
                                <td :class="getTrendClass(trade.symbol)">
                                     {{ getDisplayTrend(trade.symbol) }}
                                </td>

                                <!-- Nb Actions -->
                                <td>{{ trade.quantity }}</td>

                                <!-- Montant Position -->
                                <td>{{ formatCurrency((trade.entry_executed || trade.price || 0) * trade.quantity) }}</td>
                                
                                <!-- P/L -->
                                <td :class="((livePrices[trade.symbol]?.price || 0) - (trade.entry_executed || trade.price || 0)) * trade.quantity >= 0 ? 'positive-text' : 'negative-text'">
                                    {{ livePrices[trade.symbol]?.price ? formatCurrency(((livePrices[trade.symbol]?.price) - (trade.entry_executed || trade.price || 0)) * trade.quantity) : '-' }}
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
                                    <button class="action-btn  neutral-btn" @click="$emit('neutralize-rocket', trade)" title="Vendre 50% et Sécuriser">Trade neutralisé</button>
                                    <button class="action-btn close-btn" @click="$emit('close-rocket', trade)" title="Clôturer la position">Clôturer</button>
                                    <button class="action-btn delete-btn" @click="$emit('delete', trade)" title="Supprimer">🗑️</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 3. NEUTRALIZED (FREE RIDE) -->
                
                    <div class="rocket-section neutralized">
                    <h4 class="section-title">Trades ouverts neutralisés</h4>
                    <table class="trade-table compact">
                        <thead>
                            <tr>
                                <th>Symbole</th>
                                <th>Type</th>
                                <th>Broker</th>
                                <th>Trailing Stop</th>
                                <th>Cours actuel</th>
                                <th>Tendance</th>
                                <th>Nb Actions restante</th>
                                <th>Montant restant</th>
                                <th>P/L</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="!rocketsTrades.neutralized || rocketsTrades.neutralized.length === 0">
                                <td colspan="10" class="empty-cell">Aucune position neutralisée.</td>
                            </tr>
                            <tr v-for="trade in rocketsTrades.neutralized" :key="trade.id">
                                <td class="symbol-col">
                                    <span class="symbol-badge">{{ trade.symbol }}</span>
                                </td>
                                <td><span class="type-badge" :class="getAssetClass(trade.asset_type)">{{ trade.asset_type }}</span></td>
                                <td>{{ trade.broker }}</td>
                                
                                <!-- Trailing Stop (Editable) -->
                                <td>
                                    <input 
                                        type="number" 
                                        step="any"
                                        :value="trade.trailing_stop || trade.stop_loss" 
                                        @change="$emit('update-trailing-stop', trade, $event.target.value)"
                                        class="quantity-input-table"
                                        style="width: 90px;"
                                    />
                                </td>

                                <!-- Cours actuel -->
                                <td :class="getTrendClass(trade.symbol)">
                                     {{ getDisplayPrice(trade.symbol) }}
                                </td>

                                <!-- Tendance -->
                                <td :class="getTrendClass(trade.symbol)">
                                     {{ getDisplayTrend(trade.symbol) }}
                                </td>

                                <!-- Reste -->
                                <td>{{ trade.quantity - (trade.exit_partial_quantity || 0) }}</td>

                                <!-- Montant Restant -->
                                <td>{{ formatCurrency((trade.entry_executed || trade.price || 0) * (trade.quantity - (trade.exit_partial_quantity || 0))) }}</td>
                                
                                <!-- P/L -->
                                <td :class="((livePrices[trade.symbol]?.price || 0) - (trade.entry_executed || trade.price || 0)) * (trade.quantity - (trade.exit_partial_quantity || 0)) >= 0 ? 'positive-text' : 'negative-text'">
                                    {{ livePrices[trade.symbol]?.price ? formatCurrency(((livePrices[trade.symbol]?.price) - (trade.entry_executed || trade.price || 0)) * (trade.quantity - (trade.exit_partial_quantity || 0))) : '-' }}
                                </td>

                                <td class="actions-cell">
                                    <button class="action-btn close-btn" @click="$emit('close-rocket', trade)">Trade clôturé</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                 <!-- 4. RECENTLY CLOSED -->
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

            </div>

        </div>
    </div>

    <!-- 5. Assignations Block (Wheel Only mainly) -->
    <div class="assignations-block" v-if="strategyType === 'wheel'">
        <h3>Assignations</h3>
        <div class="table-container">
            <table class="trade-table">
                <thead>
                    <tr>
                        <th>Symbole</th>
                        <th>Date Assig.</th>
                        <th>Strike</th>
                        <th>Nb Actions</th>
                        <th>Coût Total</th> 
                        <th>Prix Actuel</th>
                        <th>Tendance</th>
                        <th>P&L</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="assignedTrades.length === 0">
                        <td colspan="9" class="empty-cell">Aucune assignation en cours.</td>
                    </tr>
                    <tr v-for="trade in assignedTrades" :key="trade.id">
                        <td>{{ trade.symbol }}</td>
                        <td>
                            <input 
                                type="date" 
                                :value="trade.open_date || trade.date" 
                                @change="$emit('update-date', trade, $event.target.value)"
                                class="date-input-table"
                            />
                        </td>
                        <td>{{ formatCurrency(trade.entry_price || trade.strike) }}</td>
                        <td>{{ trade.quantity * 100 }}</td>
                        <td>{{ formatCurrency((trade.entry_price || trade.strike) * trade.quantity * 100) }}</td>
                        
                        <!-- Prix Actuel (uses livePrices[sym].price or trade.current_price) -->
                        <td :class="getTrendClass(trade.symbol)">
                             {{ getDisplayPrice(trade.symbol, trade.current_price) }}
                        </td>

                        <!-- Tendance -->
                        <td :class="getTrendClass(trade.symbol)">
                            {{ getDisplayTrend(trade.symbol) }}
                        </td>

                        <td :class="{ 'positive': (livePrices[trade.symbol]?.price || trade.current_price) && ((livePrices[trade.symbol]?.price || trade.current_price) - (trade.entry_price || trade.strike)) >= 0, 'negative': (livePrices[trade.symbol]?.price || trade.current_price) && ((livePrices[trade.symbol]?.price || trade.current_price) - (trade.entry_price || trade.strike)) < 0 }">
                            {{ (livePrices[trade.symbol]?.price || trade.current_price) ? formatCurrency(((livePrices[trade.symbol]?.price || trade.current_price) * trade.quantity * 100) - ((trade.entry_price || trade.strike) * trade.quantity * 100)) : '--' }}
                        </td>
                        <td class="actions-cell">
                            <button class="action-btn roll-btn" @click="openRollModal(trade)">Rouler</button>
                            <button class="action-btn close-btn" @click="onUpdateStatus(trade, 'closed')">Fermer</button>
                            <button class="action-btn delete-btn" @click="$emit('delete', trade)" title="Supprimer">🗑️</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <CoveredCallModal
        :visible="showRollModal"
        :trade="selectedRollTrade"
        :account="account"
        @close="showRollModal = false"
        @refresh="$emit('refresh-data')" 
    />
  </div>
</template>

<style scoped>
.date-input-table {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-color);
    font-family: inherit;
    font-size: 0.9rem;
    padding: 2px;
    border-radius: 4px;
    cursor: pointer;
    width: 105px;
}

.date-input-table:hover, .date-input-table:focus {
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
}
</style>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import { fetchPrices } from '../../composables/useMarketData.js';
import { formatCurrency, formatDate } from '../../utils/rocketUtils.js';
import CoveredCallModal from './CoveredCallModal.vue';

const props = defineProps({
    strategyType: { type: String, required: true },
    wheelOptions: { type: Array, default: () => [] },
    pcsTrades: { type: Array, default: () => [] },
    rocketsTrades: { type: [Array, Object], default: () => ({ pending: [], risk: [], neutralized: [], closed: [] }) },
    assignedTrades: { type: Array, default: () => [] },
    account: { type: Object, default: () => ({ id: null }) }
});

const livePrices = reactive({});
const isUpdating = ref(false);
let refreshInterval = null;

onMounted(() => {
    refreshPrices();
    // Refresh every 15 seconds
    refreshInterval = setInterval(refreshPrices, 15000);
});

onUnmounted(() => {
    if (refreshInterval) clearInterval(refreshInterval);
});

function getDisplayPrice(symbol, backupPrice) {
    const p = livePrices[symbol]?.price || backupPrice;
    return p ? formatCurrency(p) : '--';
}

function getDisplayTrend(symbol) {
    const chg = livePrices[symbol]?.change_percent;
    if (chg === undefined || chg === null) return '--';
    return (chg > 0 ? '+' : '') + chg.toFixed(2) + '%';
}

function getTrendClass(symbol) {
    const chg = livePrices[symbol]?.change_percent;
    if (chg === undefined || chg === null) return '';
    if (chg > 0) return 'positive';
    if (chg < 0) return 'negative';
    return '';
}

async function refreshPrices() {
    if(isUpdating.value) return;
    isUpdating.value = true;
    try {
        const symbols = new Set();
        // Rockets
        if (props.rocketsTrades.risk) props.rocketsTrades.risk.forEach(t => symbols.add(t.symbol));
        if (props.rocketsTrades.neutralized) props.rocketsTrades.neutralized.forEach(t => symbols.add(t.symbol));
        // Assigned
        if (props.assignedTrades) props.assignedTrades.forEach(t => symbols.add(t.symbol));
        
        const prices = await fetchPrices(Array.from(symbols));
        Object.assign(livePrices, prices);
    } catch(e) { 
        // Silent error
    } finally {
        isUpdating.value = false;
    }
}

const closedTradesWithStats = computed(() => {
    if (!props.rocketsTrades || !props.rocketsTrades.closed) return [];
    
    // Sort by exit date ASC to calculate running total properly
    const closed = [...props.rocketsTrades.closed].sort((a, b) => {
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
        // Caution: t.quantity might be current quantity. If it was partial exited, we ideally need original.
        // Assuming t.quantity is leg quantity which is initial.
        const qty = t.quantity || 0;
        
        // RR Calculation
        let rr = '-';
        if (entry > 0 && stop > 0 && qty > 0) {
            const riskPerShare = Math.abs(entry - stop);
            const totalRisk = riskPerShare * qty;
            if (totalRisk > 0.01) { // Avoid div by zero
                rr = (pl / totalRisk).toFixed(2);
            }
        }

        // Perf % (ROI)
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

    // Return Reversed (Most recent first)
    return enriched.reverse();
});

const emit = defineEmits(['update-status', 'assign', 'delete', 'update-date', 'update-quantity', 'update-trailing-stop', 'refresh-data', 'activate-rocket', 'neutralize-rocket', 'close-rocket']);

const showRollModal = ref(false);
const selectedRollTrade = ref(null);

function getAssetClass(assetType) {
    if (!assetType) return '';
    return assetType.toLowerCase();
}

function formatDecimal(val, decimals = 2) {
    if (val === null || val === undefined) return '-';
    return Number(val).toFixed(decimals);
}

function formatPrice(val, assetType = 'Action') {
    if (val === null || val === undefined) return '-';
    // If Crypto, use 8 decimals, else 2
    const decimals = (assetType === 'Crypto') ? 8 : 2;
    // Use Intl NumberFormat for currency but override fraction digits
    return new Intl.NumberFormat('fr-FR', { 
        style: 'decimal', 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals 
    }).format(val) + (assetType === 'Crypto' ? '' : ' $');
}

function openRollModal(trade) {
    selectedRollTrade.value = trade;
    showRollModal.value = true;
}

function onUpdateStatus(trade, newStatus) {
    emit('update-status', { trade, newStatus });
}

function formatStatus(status, strategy) {
    if (strategy === 'wheel') {
        const map = { 'pending': 'En attente', 'open': 'Ouvert', 'assigned': 'Assigné', 'closed': 'Clôturé' };
        return map[status] || status;
    }
    if (strategy === 'pcs') {
        const map = { 'pending': 'En attente', 'open': 'Ouvert', 'closed': 'Clôturé' };
        return map[status] || status;
    }
    if (strategy === 'rockets') {
        const map = { 'open': 'Ouvert à risque', 'neutralized': 'Neutralisé', 'closed': 'Clôturé' };
        return map[status] || status;
    }
    return status;
}

function canAssign(trade) {
    return trade.side === 'short' && (trade.type === 'put' || trade.type === 'call');
}

function formatType(trade) {
    // Priority to stored sub_strategy if available
    if (trade.sub_strategy) {
        switch(trade.sub_strategy) {
            case 'put': return 'Vente Put';
            case 'put_long': return 'Achat Put';
            case 'call': return 'Covered Call'; // Or Covered Call depending on context
            case 'call_long': return 'Achat Call';
            case 'hedge': return 'Hedge';
            case 'hedge_spread': return 'Hedge Spread';
        }
    }

    // Fallback if no sub_strategy stored
    if (trade.type === 'put') {
        return trade.side === 'short' ? 'Vente Put' : 'Achat Put';
    }
    if (trade.type === 'call') {
        return trade.side === 'short' ? 'Covered Call' : 'Achat Call';
    }
    return trade.type;
}

function getTypeClass(trade) {
    if (trade.sub_strategy) {
        return trade.sub_strategy; // 'put', 'put_long', 'call', 'call_long', 'hedge'
    }
    if (trade.type === 'put') return trade.side === 'short' ? 'put' : 'put_long';
    if (trade.type === 'call') return trade.side === 'short' ? 'call' : 'call_long';
    return '';
}

function calculateRiskPercentage(trade) {
     // Formula: ((E - SL) / E) * (PositionAmount / RocketCapital) * 100
     const entry = trade.entry_stop || trade.entry_limit || 0;
     const stop = trade.stop_loss || 0;
     const qty = trade.quantity || 0;
     const capital = props.account.alloc_rocket || 1; // Avoid div by zero

     if (entry === 0 || qty === 0) return 0;
     
     const positionAmount = entry * qty;
     const riskPerSharePct = Math.abs(entry - stop) / entry;
     const allocationPct = positionAmount / capital;
     
     const totalRiskPct = riskPerSharePct * allocationPct * 100;
     return totalRiskPct.toFixed(2);
}
</script>

<style scoped>
.type-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    background: #444;
    color: #eee;
}
.type-badge.put { background: #e91e63; color: white; } /* Vente Put - Pink/Red */
.type-badge.put_long { background: #9c27b0; color: white; } /* Achat Put - Purple */
.type-badge.call { background: #3f51b5; color: white; } /* Vente Call - Indigo */
.type-badge.call_long { background: #2196f3; color: white; } /* Achat Call - Blue */
.type-badge.hedge { background: #009688; color: white; } /* Hedge - Teal */
.type-badge.hedge_spread { background: #004d40; color: white; } /* Hedge Spread - Dark Teal */
.type-badge.ic { background: #ff9800; color: black; } /* Iron Condor - Orange */
.type-badge.pcs { background: #81d4fa; color: black; } /* Standard PCS - Pastel Blue */
.type-badge.action { background: #607d8b; color: white; } /* Action - Blue Grey */
.type-badge.etf { background: #9c27b0; color: white; } /* ETF - Purple */
.type-badge.crypto { background: #f57c00; color: white; } /* Crypto - Orange */

.quantity-input-table {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-color);
    font-family: inherit;
    font-size: 0.9rem;
    padding: 2px;
    border-radius: 4px;
    cursor: pointer;
    width: 70px;
}
.quantity-input-table:hover, .quantity-input-table:focus {
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.right-column-lists {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
}

.active-trades-block, .assignations-block {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    min-height: 0;      /* Required for flex scrolling */
    overflow-y: auto;   /* Scroll internal content */
    display: flex;
    flex-direction: column;
}

.active-trades-block {
    flex: 2; /* 66% height */
}

.assignations-block {
    flex: 1; /* 33% height */
}

h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.table-container {
    overflow-x: auto;
}

.empty-cell {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
    font-style: italic;
    background: rgba(255, 255, 255, 0.02);
}

.trade-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.trade-table th, .trade-table td {
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.trade-table th {
    color: var(--text-muted);
    font-weight: 500;
}

.badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-right: 0.5rem;
}
.badge.long { background: rgba(76, 175, 80, 0.2); color: #4caf50; }
.badge.short { background: rgba(244, 67, 54, 0.2); color: #f44336; }

.action-btn {
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.2s;
}

.assign-btn {
    background: #ff9800; /* Orange for warning/action */
    color: #000;
}
.assign-btn:hover { background: #e68900; }

.close-btn {
    background: #f44336;
    color: white;
    margin-left: 5px;
}
.close-btn:hover { background: #d32f2f; }

.neutral-btn {
    background: #2196F3;
    color: white;
    margin-left: 5px;
}
.neutral-btn:hover { background: #1976D2; }

.delete-btn {
    background: transparent;
    color: #999;
    border: 1px solid #444;
    margin-left: 5px;
    font-size: 1rem;
    padding: 2px 6px;
    line-height: 1;
}
.delete-btn:hover {
    background: rgba(255, 0, 0, 0.2);
    color: #ff6b6b;
    border-color: #ff6b6b;
}

/* Status Select Styles */
.status-select {
    padding: 4px 8px;
    border-radius: 4px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    color: black; 
}
.status-select.status-pending {
    background-color: #2196F3; 
    color: white; 
}
.status-select.status-open {
    background-color: #4caf50; 
    color: black; 
}

/* ROCKETS SPECIFIC STYLES */
.rockets-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-bottom: 2rem; /* Add some space at bottom for scrolling */
}

.rocket-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
}

.rocket-section.pending { border-left: 4px solid #2196F3; }
.rocket-section.risk { border-left: 4px solid #e91e63; } /* Pink/Red Risk */
.rocket-section.neutralized { border-left: 4px solid #4caf50; }
.rocket-section.closed { border-left: 4px solid #9e9e9e; opacity: 0.8; }

.section-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.9;
}

.section-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.9;
}

.symbol-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.symbol-badge {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text-color);
}
.asset-badge {
    font-size: 0.7rem;
    color: var(--text-muted);
    background: rgba(255,255,255,0.1);
    padding: 1px 4px;
    border-radius: 3px;
    width: fit-content;
}

.negative-text { color: #fe4d4d; }
.positive-text { color: #4caf50; }

.success-btn {
    background: #4caf50;
    color: white;
}
.success-btn:hover { background: #388e3c; }

.warning-btn {
    background: #ff9800;
    color: black;
}
.warning-btn:hover { background: #f57c00; }

.refresh-mini {
    background: none;
    border: none;
    color: var(--accent-color);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0 4px;
    margin-left: 4px;
}
.refresh-mini:hover { color: var(--text-color); }
.refresh-mini:disabled { opacity: 0.5; cursor: default; }

.positive {
    color: #4caf50;
    font-weight: 600;
}
.negative {
    color: #f44336;
    font-weight: 600;
}
</style>

