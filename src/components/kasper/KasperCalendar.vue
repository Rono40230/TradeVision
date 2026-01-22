<template>
    <div class="calendar-section">
        <div class="calendar-header">
            <button @click="changeMonth(-1)">&lt;</button>
            <h2>{{ currentMonthLabel }}</h2>
            <button @click="changeMonth(1)">&gt;</button>
        </div>
        <div class="calendar-grid">
            <div class="cal-day-name" v-for="day in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="day">{{ day }}</div>
            
            <div v-for="n in startOffset" :key="'empty-'+n" class="cal-day empty"></div>

             <div v-for="day in daysInMonth" :key="day.dateStr" 
                  class="cal-day" 
                  :class="{ 
                      'has-profit': day.entry && day.entry.profit_loss > 0, 
                      'has-loss': day.entry && day.entry.profit_loss < 0,
                      'today': day.isToday
                  }"
                  @click="onDayClick(day)"
             >
                <div class="day-header">
                    <span class="day-number">{{ day.number }}</span>
                    <span class="day-total" v-if="day.entry">
                        {{ formatCurrencySimple(day.entry.profit_loss) }}
                    </span>
                </div>
                
                <div class="day-details" v-if="cellDetails(day.entry)">
                    <div v-for="(d, idx) in cellDetails(day.entry)" :key="idx" class="detail-row">
                        <span class="d-pair">{{ d.pair }}</span>
                        <span class="d-count">({{ d.count }})</span>
                        <span class="d-res">
                            <span v-for="(res, rIdx) in d.raw_results" :key="rIdx">
                                <span :class="{'text-green': res > 0, 'text-red': res < 0}">
                                    {{ res > 0 ? '+' : '' }}{{ res }}$
                                </span><span v-if="rIdx < d.raw_results.length - 1">, </span>
                            </span>
                        </span>
                    </div>
                </div>
             </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    dailyEntries: { type: Array, default: () => [] }
});

const emit = defineEmits(['openDayModal']);

const currentMonthDate = ref(new Date());

const currentMonthLabel = computed(() => {
    return currentMonthDate.value.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
});

const startOffset = computed(() => {
    const d = new Date(currentMonthDate.value.getFullYear(), currentMonthDate.value.getMonth(), 1);
    let day = d.getDay(); 
    return day === 0 ? 6 : day - 1;
});

const daysInMonth = computed(() => {
    const d = new Date(currentMonthDate.value.getFullYear(), currentMonthDate.value.getMonth() + 1, 0);
    const totalDays = d.getDate();
    const days = [];
    const year = currentMonthDate.value.getFullYear();
    const month = String(currentMonthDate.value.getMonth() + 1).padStart(2, '0');

    for (let i = 1; i <= totalDays; i++) {
        const dayStr = String(i).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;
        const entry = props.dailyEntries.find(e => e.date === dateStr);
        const todayStr = new Date().toISOString().split('T')[0];
        
        days.push({
            number: i,
            dateStr: dateStr,
            entry: entry,
            isToday: dateStr === todayStr
        });
    }
    return days;
});

function changeMonth(delta) {
    const newDate = new Date(currentMonthDate.value);
    newDate.setMonth(newDate.getMonth() + delta);
    currentMonthDate.value = newDate;
}

function onDayClick(day) {
    emit('openDayModal', { date: day.dateStr, entry: day.entry });
}

function formatCurrencySimple(val) {
    const v = Number(val);
    if (isNaN(v)) return '0 $';
    return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' $';
}

const cellDetails = (entry) => {
    if (!entry || !entry.details) return null;
    try {
        const trades = JSON.parse(entry.details);
        if (!Array.isArray(trades) || trades.length === 0) return null;

        const groups = {};
        trades.forEach(t => {
            if (!groups[t.pair]) groups[t.pair] = { count: 0, results: [] };
            groups[t.pair].count++;
            groups[t.pair].results.push(t.result);
        });

        return Object.keys(groups).map(pair => {
            const g = groups[pair];
            return {
                pair: pair,
                count: g.count,
                raw_results: g.results
            };
        });
    } catch (e) { return null; }
};
</script>

<style scoped>
.calendar-section {
    flex: 2;
    display: flex;
    flex-direction: column;
    background: var(--surface-color);
    border-radius: 8px;
    padding: 1rem;
    overflow-y: auto;
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.calendar-header h2 { margin: 0; text-transform: capitalize; }
.calendar-header button {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}
.calendar-header button:hover { background: var(--hover-color); }

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--border-color);
    border: 1px solid var(--border-color);
    flex: 1;
    min-height: 400px;
}

.cal-day-name {
    background: var(--surface-color);
    text-align: center;
    padding: 0.5rem;
    font-weight: bold;
    color: var(--text-muted);
}

.cal-day {
    background: var(--bg-color);
    padding: 0.5rem;
    min-height: 80px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    display: flex;
    flex-direction: column;
}
.cal-day:hover { background: #333333; }
.cal-day.empty { background: var(--surface-color); cursor: default; }
.cal-day.today { border: 2px solid var(--accent-color); }

.cal-day.has-profit { background: rgba(76, 175, 80, 0.1); }
.cal-day.has-loss { background: rgba(244, 67, 54, 0.1); }

.day-number { font-size: 0.9rem; color: var(--text-muted); font-weight: bold; }

.day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid transparent;
    padding-bottom: 2px;
    margin-bottom: 2px;
}
.has-profit .day-header, .has-loss .day-header {
    border-color: rgba(255,255,255,0.1);
}

.day-total {
    font-weight: bold;
    font-size: 0.9rem;
}
.has-profit .day-total { color: #4caf50; }
.has-loss .day-total { color: #f44336; }

.day-details {
    font-size: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 1px;
}
.detail-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    line-height: 1.1;
}
.d-pair { font-weight: bold; color: var(--text-muted); margin-right: 2px; }
.d-count { color: var(--text-muted); margin-right: 4px; font-size: 0.7rem; }
.d-res { color: var(--text-color); }

.text-green { color: #4caf50; }
.text-red { color: #f44336; }
</style>
