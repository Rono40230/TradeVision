<template>
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
                          <button class="action-btn edit-btn" @click="startEdit(trade)" title="Modifier">✏️</button>
                          <button class="action-btn delete-btn" @click="$emit('delete', trade)">🗑️</button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>

      <!-- OVERLAY EDITION -->
      <div v-if="editingTrade" class="edit-overlay" @click.self="cancelEdit">
          <div class="edit-modal">
              <h4>Modifier le trade — {{ editingTrade.symbol }}</h4>
              <div class="edit-fields">
                  <label>
                      Date de clôture
                      <input type="date" v-model="editForm.exit_date" />
                  </label>
                  <label>
                      Prix de clôture
                      <input type="number" step="any" v-model="editForm.exit_price" placeholder="0.00" />
                  </label>
              </div>
              <div class="edit-actions">
                  <button class="btn-cancel" @click="cancelEdit">Annuler</button>
                  <button class="btn-save" @click="saveEdit">Enregistrer</button>
              </div>
          </div>
      </div>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue';
import { formatCurrency, formatDate, getAssetClass } from '../../../../utils/rocketUtils.js';

const props = defineProps({
    trades: { type: Array, required: true }
});

const emit = defineEmits(['delete', 'update-trade']);

const editingTrade = ref(null);
const editForm = reactive({ exit_date: '', exit_price: '', profit_loss: '' });

// Quantité déduite depuis les données existantes : qty = PL / (exit - entry)
const derivedQty = ref(0);
const derivedEntry = ref(0);

// Recalcul automatique du P/L quand exit_price change
watch(() => editForm.exit_price, (newPrice) => {
    const exit = parseFloat(newPrice);
    if (!isNaN(exit) && derivedEntry.value && derivedQty.value) {
        editForm.profit_loss = ((exit - derivedEntry.value) * derivedQty.value).toFixed(2);
    }
});

function startEdit(trade) {
    editingTrade.value = trade;
    editForm.exit_date = trade.exit_date ? trade.exit_date.substring(0, 10) : '';
    editForm.exit_price = trade.exit_price ?? '';

    const entry = parseFloat(trade.entry_executed || trade.price) || 0;
    const exit  = parseFloat(trade.exit_price) || 0;
    const pl    = parseFloat(trade.profit_loss) || 0;
    derivedEntry.value = entry;
    // Déduire la quantité depuis les données existantes
    derivedQty.value = (entry > 0 && exit !== entry && pl !== 0)
        ? pl / (exit - entry)
        : 0;

    editForm.profit_loss = pl.toFixed(2);
}

function cancelEdit() {
    editingTrade.value = null;
}

function saveEdit() {
    emit('update-trade', {
        id: editingTrade.value.id,
        exit_date: editForm.exit_date,
        exit_price: parseFloat(editForm.exit_price),
        profit_loss: parseFloat(editForm.profit_loss)
    });
    editingTrade.value = null;
}

const closedTradesWithStats = computed(() => {
    if (!props.trades) return [];
    
    // Sort by exit date ASC to calculate running total properly
    const closed = [...props.trades].sort((a, b) => {
        const dateA = new Date(a.exit_date || a.date).getTime();
        const dateB = new Date(b.exit_date || b.date).getTime();
        return dateA - dateB;
    });

    let runningTotal = 0;
    const enriched = closed.map(t => {
        const pl = t.profit_loss || 0;
        runningTotal += pl;

        const entry = parseFloat(t.entry_executed || t.price) || 0;
        const stop  = parseFloat(t.stop_loss || t.trailing_stop) || 0;
        const exit  = parseFloat(t.exit_price) || 0;

        // RR calculé par unité (ne nécessite pas la quantité)
        let rr = '-';
        if (entry > 0 && stop > 0 && exit > 0) {
            const riskPerUnit   = Math.abs(entry - stop);
            const rewardPerUnit = exit - entry;
            if (riskPerUnit > 0.0001) {
                rr = (rewardPerUnit / riskPerUnit).toFixed(2);
            }
        }

        // % Perf = variation entre entrée et sortie
        let perfPct = '0.00';
        if (entry > 0 && exit > 0) {
            perfPct = (((exit - entry) / entry) * 100).toFixed(2);
        }

        return {
            ...t,
            cumulative: runningTotal,
            rr: rr,
            perf_pct: perfPct
        };
    });

    return enriched.reverse();
});
</script>

<style scoped>
.rocket-section { background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; }
.rocket-section.closed { border-left: 4px solid #9e9e9e; opacity: 0.8; }
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

.positive-text { color: #4caf50; font-weight: 600; }
.negative-text { color: #f44336; font-weight: 600; }

.actions-cell { display: flex; flex-direction: row; align-items: center; gap: 5px; white-space: nowrap; }
.action-btn { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.edit-btn { background: transparent; color: #7aa2f7; border: 1px solid #3d5a9a; font-size: 0.95rem; padding: 2px 7px; line-height: 1; }
.edit-btn:hover { background: rgba(122, 162, 247, 0.15); }
.delete-btn { background: transparent; color: #999; border: 1px solid #444; font-size: 1rem; padding: 2px 6px; line-height: 1; }
.delete-btn:hover { background: rgba(255, 0, 0, 0.2); color: #ff6b6b; border-color: #ff6b6b; }

/* EDIT OVERLAY */
.edit-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
}
.edit-modal {
    background: #1e2030;
    border: 1px solid #414868;
    border-radius: 10px;
    padding: 1.5rem;
    width: 360px;
    display: flex; flex-direction: column; gap: 1.2rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
}
.edit-modal h4 { margin: 0; font-size: 1rem; color: #c0caf5; }
.edit-fields { display: flex; flex-direction: column; gap: 0.8rem; }
.edit-fields label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: #9aa5ce; }
.edit-fields input {
    background: #1a1b26; border: 1px solid #414868; border-radius: 6px;
    color: #c0caf5; padding: 0.5rem 0.7rem; font-size: 0.9rem;
    outline: none;
}
.edit-fields input:focus { border-color: #7aa2f7; }
.edit-fields input.readonly-field {
    background: #13141f; color: #6b7280; cursor: not-allowed;
    border-color: #2a2d3e; opacity: 0.8;
}
.edit-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }
.btn-cancel { background: transparent; border: 1px solid #414868; color: #9aa5ce; padding: 0.45rem 1rem; border-radius: 6px; cursor: pointer; }
.btn-cancel:hover { border-color: #9aa5ce; color: #c0caf5; }
.btn-save { background: #3d59a1; border: none; color: #fff; padding: 0.45rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-save:hover { background: #4f6abf; }
</style>
