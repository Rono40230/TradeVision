<script setup lang="ts">
const props = defineProps<{
    trades: any[],
    sortKey: string,
    sortDirection: string
}>();

const emit = defineEmits(['sort', 'delete', 'updateStrategy']);

/**
 * Détermine quelle valeur afficher pour le P/L selon la stratégie
 */
const formatPnl = (trade: any) => {
    // 1. Pour les Actions (Rockets), on veut le P/L Réalisé
    if (trade.detectedStrategy === 'Rockets') {
        if (trade.realizedPnl && trade.realizedPnl !== 0) {
            return `${Number(trade.realizedPnl).toFixed(2)} $`;
        }
        return '—';
    }
    
    // 2. Pour les Options (Wheel, PCS), on veut le Cash Flow (Proceeds)
    return `${Number(trade.proceeds || 0).toFixed(2)} $`;
};

/**
 * Classe CSS pour colorer le P/L
 */
const getPnlClass = (trade: any) => {
    let value = 0;
    
    if (trade.detectedStrategy === 'Rockets') {
        if (!trade.realizedPnl || trade.realizedPnl === 0) return ''; // Neutre
        value = trade.realizedPnl;
    } else {
        value = trade.proceeds || 0;
    }
    
    return value >= 0 ? 'text-green' : 'text-red';
};

const handleSort = (key: string) => {
    emit('sort', key);
};
</script>

<template>
    <div class="results-section">
        <div class="results-header">
            <h3>Analyse Terminée</h3>
            <span class="badge">{{ trades.length }} Transactions détectées</span>
        </div>

        <div class="table-wrapper">
            <table class="preview-table">
                <thead>
                    <tr>
                        <th @click="handleSort('date')" class="sortable-header">
                            Date 
                            <span v-if="sortKey === 'date'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                        </th>
                        <th>Action</th>
                        <th @click="handleSort('symbol')" class="sortable-header">
                            Symbole
                            <span v-if="sortKey === 'symbol'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                        </th>
                        <th>Terme</th>
                        <th>Strike</th>
                        <th>Description</th>
                        <th>Qté</th>
                        <th>Prix</th>
                        <th>P/L</th>
                        <th @click="handleSort('detectedStrategy')" class="sortable-header">
                            Stratégie (Est.)
                            <span v-if="sortKey === 'detectedStrategy'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                        </th>
                        <th><!-- Delete Action --></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(trade, idx) in trades" :key="trade.id || idx">
                        <td>{{ trade.date }}</td>
                        <td :class="trade.side === 'BUY' ? 'text-green' : 'text-red'">{{ trade.side }}</td>
                        <td>{{ trade.symbol }}</td>
                        <td>{{ trade.expiry }}</td>
                        <td>{{ trade.strike }}</td>
                        <td class="desc-cell">{{ trade.description }}</td>
                        <td>{{ trade.quantity }}</td>
                        <td>{{ trade.price }} $</td>
                        
                        <td :class="getPnlClass(trade)">
                            {{ formatPnl(trade) }}
                        </td>
                        
                        <td>
                            <select 
                                v-model="trade.detectedStrategy" 
                                class="strat-select" 
                                @click.stop
                                @change="$emit('updateStrategy', trade)"
                            >
                                <option value="Wheel">Wheel</option>
                                <option value="pcs standard">PCS</option>
                                <option value="Rockets">Rockets</option>
                                
                                <option 
                                    v-if="!['Wheel', 'pcs standard', 'Rockets'].includes(trade.detectedStrategy)" 
                                    :value="trade.detectedStrategy"
                                >
                                    {{ trade.detectedStrategy }}
                                </option>
                            </select>
                        </td>
                        <td>
                            <button 
                                class="delete-btn" 
                                @click="$emit('delete', trade.id)"
                            >
                                ×
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
            
        <div class="actions-footer">
            <slot name="footer"></slot>
        </div>
    </div>
</template>

<style scoped>
.results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.table-wrapper {
    max-height: 600px;
    overflow: auto;
    background: #222;
    border-radius: 8px;
    border: 1px solid #333;
}

.preview-table {
    width: 100%;
    min-width: 1200px;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.preview-table th, .preview-table td {
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid #333;
}

.preview-table th {
    background: #333;
    position: sticky;
    top: 0;
}

.sortable-header {
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
}
.sortable-header:hover {
    background: #444;
}
.sort-icon {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: #888;
}

.text-green { color: #4caf50; }
.text-red { color: #f44336; }
.desc-cell { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #aaa; }

.strat-select {
    background: #fff;
    color: #000;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 0.9rem;
    cursor: pointer;
    width: 100%;
    min-width: 100px;
    transition: all 0.2s;
}

.strat-select:hover {
    border-color: #999;
    background: #f5f5f5;
}

.strat-select:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
}

.actions-footer {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
}

.delete-btn {
    background: transparent;
    border: none;
    color: #666;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0.5rem;
    transition: all 0.2s;
    font-weight: bold;
}

.delete-btn:hover {
    color: #f44336;
}

.badge {
    background: #444;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
}
</style>
