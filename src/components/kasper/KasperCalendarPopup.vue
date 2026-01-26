<template>
    <Teleport to="body">
        <div v-if="hoveredDay" class="cal-hover-popup" :style="popupStyle">
            <div class="popup-header">
                <span class="d-date">{{ formatDateLong(hoveredDay.dateStr) }}</span>
                <span class="d-total" :class="hoveredDay.entry.profit_loss >= 0 ? 'text-green' : 'text-red'">
                    {{ hoveredDay.entry.profit_loss > 0 ? '+' : '' }}{{ formatCurrencySimple(hoveredDay.entry.profit_loss) }}
                </span>
            </div>
            <!-- FULL TABLE IN POPUP -->
            <div class="popup-table">
                <table>
                    <thead>
                       <tr>
                           <th>Paire</th><th>Type</th><th>Risque</th><th>P/L</th>
                       </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(t, idx) in formattedTrades" :key="idx">
                            <td class="c-pair">{{ t.pair }}</td>
                            <td class="c-type" :class="t.direction.toLowerCase()">{{ t.direction.toUpperCase() }}</td>
                            <td class="c-risk">{{ t.riskDisplay }}</td>
                            <td class="c-pl" :class="t.result >= 0 ? 'text-green' : 'text-red'">
                                {{ t.result > 0 ? '+' : ''}}{{ t.result }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { formatCurrencySimple, getDailyTrades } from '../../utils/kasperUI.js';

const props = defineProps({
    hoveredDay: Object,
    popupStyle: Object,
    pairsConfig: Array
});

const formattedTrades = computed(() => {
    if (!props.hoveredDay || !props.hoveredDay.entry) return [];
    return getDailyTrades(props.hoveredDay.entry, props.pairsConfig);
});

function formatDateLong(dateStr) {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
</script>

<style scoped>
/* --- POPUP CSS --- */
.cal-hover-popup {
    position: fixed;
    background: #1e1e24; /* Dark bg */
    border: 1px solid #555;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    border-radius: 8px;
    z-index: 10000; /* Super high z-index */
    padding: 1rem;
    pointer-events: none; 
    display: flex;
    flex-direction: column;
    min-width: 280px;
}
.popup-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.8rem;
    border-bottom: 1px solid #333;
    padding-bottom: 0.5rem;
}
.d-date { font-weight: bold; color: #fff; text-transform: capitalize; }
.d-total { font-weight: bold; font-size: 1.1rem; }

.popup-table table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem; 
}
.popup-table th {
    text-align: left;
    color: #666;
    font-weight: normal;
    padding-bottom: 4px;
    border-bottom: 1px solid #333;
}
.popup-table td { padding: 4px 0; color: #ccc; white-space: nowrap; }
.c-pair { font-weight: bold; color: #ddd; max-width: 50px; overflow: hidden; text-overflow: ellipsis; }
.c-type.buy { color: #81c784; }
.c-type.sell { color: #e57373; }
.c-risk { font-family: monospace; }
.c-pl { font-weight: bold; text-align: right; }

.text-green { color: #81c784; }
.text-red { color: #e57373; }
</style>
