<template>
    <div class="day-cell-content">
        <div class="day-header">
            <span class="day-number">{{ day.number }}</span>
            <!-- CAPITAL PROGRESSION LINE -->
                <span class="capital-progress" v-if="day.entry">
                <span :class="day.entry.profit_loss >= 0 ? 'text-green' : 'text-red'">
                    {{ day.entry.profit_loss > 0 ? '+' : '' }}{{ formatCurrencySimple(day.entry.profit_loss) }}
                </span>
                <span class="arrow">→</span>
                {{ formatCurrencySimple(day.entry.endCapital) }}
                </span>
        </div>
        
        <!-- TRADES TABLE (TRUNCATED IN GRID) -->
        <div class="cal-day-trades" v-if="trades && trades.length > 0">
            <table>
                <tbody>
                    <tr v-for="(t, idx) in trades" :key="idx">
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
</template>

<script setup>
import { computed } from 'vue';
import { formatCurrencySimple, getDailyTrades } from '../../utils/kasperUI.js';

const props = defineProps({
    day: { type: Object, required: true },
    pairsConfig: { type: Array, required: true }
});

const trades = computed(() => getDailyTrades(props.day.entry, props.pairsConfig));
</script>

<style scoped>
.day-cell-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.day-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.day-number { font-size: 0.9rem; color: var(--text-muted); font-weight: bold; }

.capital-progress {
    font-size: 0.75rem;
    color: #aaa;
    font-family: monospace;
    background: rgba(0,0,0,0.3);
    padding: 2px 6px;
    border-radius: 4px;
}
.arrow { color: #555; margin: 0 4px; }

.cal-day-trades {
    flex: 1;
    overflow: hidden !important;
}
.cal-day-trades table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.7rem;
}
.cal-day-trades tr {
    /* Optimisation pour les petits écrans dans les cases */
}
.cal-day-trades td {
    padding: 2px 0;
    color: #ccc;
    white-space: nowrap;
}
.c-pair { font-weight: bold; color: #ddd; max-width: 50px; overflow: hidden; text-overflow: ellipsis; }
.c-type.buy { color: #81c784; }
.c-type.sell { color: #e57373; }
.c-risk { font-family: monospace; }
.c-pl { font-weight: bold; text-align: right; }

.text-green { color: #81c784; }
.text-red { color: #e57373; }
</style>
