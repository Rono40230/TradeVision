<template>
  <div class="right-column-lists">
      <!-- Active Trades Block -->
      <div class="active-trades-block">
        <h3>Trades en Cours</h3>
        <div class="table-container">
            
                <!-- WHEEL/OPTIONS TABLE -->
            <table v-if="strategyType === 'wheel'" class="trade-table">
                <thead>
                    <tr>
                        <th>Symbole</th>
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
                        <td colspan="13" class="empty-cell">Aucun trade d'options en cours.</td>
                    </tr>
                    <tr v-for="trade in wheelOptions" :key="trade.id">
                        <td>{{ trade.symbol }}</td>
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
                        <td>{{ trade.status === 'open' ? formatDate(trade.open_date || trade.date) : '-' }}</td>
                        <td>{{ formatDate(trade.expiration) }}</td>
                        <td>{{ trade.position_size_pct ? trade.position_size_pct + '%' : '-' }}</td>
                        <td>{{ trade.strike }}</td>
                        <td>{{ formatCurrency(trade.price) }}</td>
                        <td>{{ formatCurrency(trade.strike * 100) }}</td>
                        <td>{{ trade.quantity }}</td>
                        <td>{{ formatCurrency(trade.strike * 100 * trade.quantity) }}</td>
                        <td>{{ ((trade.price / trade.strike) * 100).toFixed(2) }}%</td>
                        <td>{{ formatCurrency(trade.price * 100 * trade.quantity) }}</td>
                        <td class="actions-cell">
                            <button v-if="canAssign(trade) && trade.status === 'open'" class="action-btn assign-btn" @click="$emit('assign', trade)">Assign</button>
                            <button v-if="trade.status !== 'closed' && trade.status !== 'assigned'" class="action-btn close-btn" @click="onUpdateStatus(trade, 'closed')">Fermer</button>
                        </td>
                    </tr>
                </tbody>
            </table>

                <!-- PCS TABLE -->
            <table v-if="strategyType === 'pcs'" class="trade-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Symbole</th>
                        <th>Statut</th>
                        <th>Exp.</th>
                        <th>Short</th>
                        <th>Long</th>
                        <th>Prime</th>
                        <th>Risque Max</th>
                        <th>Rdt/Risque (%)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                        <tr v-if="pcsTrades.length === 0">
                        <td colspan="10" class="empty-cell">Aucun PCS en cours.</td>
                    </tr>
                    <tr v-for="trade in pcsTrades" :key="trade.id">
                        <td>{{ formatDate(trade.date) }}</td>
                        <td>{{ trade.symbol }}</td>
                        <td>{{ formatStatus(trade.status, 'pcs') }}</td>
                        <td>{{ formatDate(trade.expiration) }}</td>
                        <td>{{ trade.strike_short }}</td>
                        <td>{{ trade.strike_long }}</td>
                        <td>{{ formatCurrency(trade.price * 100 * trade.quantity) }}</td>
                        <td>{{ formatCurrency( (Math.abs(trade.strike_short - trade.strike_long) * 100 * trade.quantity) - (trade.price * 100 * trade.quantity) ) }}</td>
                        <td>{{ ( (trade.price * 100) / ( (Math.abs(trade.strike_short - trade.strike_long) * 100) - (trade.price * 100) ) * 100 ).toFixed(2) }}%</td>
                        <td class="actions-cell">
                            <button v-if="trade.status !== 'closed'" class="action-btn close-btn" @click="onUpdateStatus(trade, 'closed')">Fermer</button>
                        </td>
                    </tr>
                </tbody>
            </table>

                <!-- ROCKETS TABLE -->
            <table v-if="strategyType === 'rockets'" class="trade-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Symbole</th>
                        <th>Statut</th>
                        <th>Sens</th>
                        <th>Prix Entrée</th>
                        <th>Qté</th>
                        <th>Prix Actuel</th>
                        <th>P&L Latent</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                        <tr v-if="rocketsTrades.length === 0">
                        <td colspan="9" class="empty-cell">Aucun trade Rocket en cours.</td>
                    </tr>
                    <tr v-for="trade in rocketsTrades" :key="trade.id">
                        <td>{{ formatDate(trade.date) }}</td>
                        <td>{{ trade.symbol }}</td>
                        <td>{{ formatStatus(trade.status, 'rockets') }}</td>
                        <td><span class="badge" :class="trade.side">{{ trade.side }}</span></td>
                        <td>{{ formatCurrency(trade.entry_price) }}</td>
                        <td>{{ trade.quantity }}</td>
                        <td>--</td>
                        <td>--</td>
                        <td class="actions-cell">
                            <button v-if="trade.status === 'open'" class="action-btn neutral-btn" @click="onUpdateStatus(trade, 'neutralized')">Neutraliser</button>
                            <button v-if="trade.status !== 'closed'" class="action-btn close-btn" @click="onUpdateStatus(trade, 'closed')">Fermer</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- 5. Assignations Block (Wheel Only mainly) -->
        <div class="assignations-block" v-if="strategyType === 'wheel'">
        <h3>Assignations</h3>
            <div class="table-container">
            <table class="trade-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Symbole</th>
                        <th>Type</th>
                        <th>Prix Revient</th>
                        <th>Qté</th>
                        <th>Valeur Actuelle</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                        <tr v-if="assignedTrades.length === 0">
                        <td colspan="7" class="empty-cell">Aucune assignation en cours.</td>
                    </tr>
                        <tr v-for="trade in assignedTrades" :key="trade.id">
                        <td>{{ formatDate(trade.date) }}</td>
                        <td>{{ trade.symbol }}</td>
                        <td><span class="badge" :class="trade.side">Action</span></td>
                        <td>{{ formatCurrency(trade.entry_price) }}</td>
                        <td>{{ trade.quantity }}</td>
                        <td>{{ formatCurrency(trade.entry_price * trade.quantity) }}</td> <!-- Placeholder for Current Val -->
                            <td class="actions-cell">
                            <button v-if="trade.status !== 'closed'" class="action-btn close-btn" @click="onUpdateStatus(trade, 'closed')">Fermer</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            </div>
        </div>
  </div>
</template>

<script setup>
import { formatCurrency, formatDate } from '../../utils/rocketUtils.js';

const props = defineProps({
    strategyType: { type: String, required: true },
    wheelOptions: { type: Array, default: () => [] },
    pcsTrades: { type: Array, default: () => [] },
    rocketsTrades: { type: Array, default: () => [] },
    assignedTrades: { type: Array, default: () => [] }
});

const emit = defineEmits(['update-status', 'assign']);

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
</script>

<style scoped>
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
</style>
