<template>
    <div class="calendar-section" @scroll="hoveredDay = null">
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
                  @mouseenter="onDayHover($event, day)"
                  @mouseleave="onDayLeave"
             >
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
                <!-- Renamed class to force style update -->
                <div class="cal-day-trades" v-if="getDailyTrades(day.entry) && getDailyTrades(day.entry).length > 0">
                    <table>
                        <tbody>
                            <tr v-for="(t, idx) in getDailyTrades(day.entry)" :key="idx">
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
        </div>

        <!-- HOVER POPUP -->
        <Teleport to="body">
            <div v-if="hoveredDay && hasTrades(hoveredDay)" class="cal-hover-popup" :style="popupStyle">
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
                            <tr v-for="(t, idx) in getDailyTrades(hoveredDay.entry)" :key="idx">
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
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    dailyEntries: { type: Array, default: () => [] },
    pairsConfig: { type: Array, default: () => [] }
});

const emit = defineEmits(['openDayModal']);

const currentMonthDate = ref(new Date());
const hoveredDay = ref(null);
const popupStyle = ref({ display: 'none' });

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

/* --- HOVER LOGIC --- */
function hasTrades(day) {
    if (!day || !day.entry || !day.entry.details) return false;
    if (day.entry.details === '[]') return false;
    return true;
}

function onDayHover(evt, day) {
    if (!hasTrades(day)) return;
    
    hoveredDay.value = day;
    
    // Use currentTarget to ensure we get the .cal-day element
    const rect = evt.currentTarget.getBoundingClientRect();
    const width = 300; // Popup width
    
    // Default: show to the right
    let left = rect.right + 10;
    
    // If not enough space on right, show on left
    if (left + width > window.innerWidth) {
        left = rect.left - width - 10;
    }
    
    // Top alignment
    let top = rect.top;
    
    // Boundary check for bottom
    const estimatedHeight = 250; 
    if (top + estimatedHeight > window.innerHeight) {
        top = window.innerHeight - estimatedHeight - 20;
    }
    
    // Ensure top is not negative
    if (top < 0) top = 10;

    popupStyle.value = {
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`
    };
}

function onDayLeave() {
    hoveredDay.value = null;
}
/* --- END HOVER --- */

function formatDateLong(dateStr) {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatCurrencySimple(val) {
    const v = Number(val);
    if (isNaN(v)) return '0$';
    if (Number.isInteger(v)) return v + '$';
    return v.toFixed(2) + '$'; 
}

const getDailyTrades = (entry) => {
    if (!entry || !entry.details) return null;
    try {
        const trades = JSON.parse(entry.details);
        if (!Array.isArray(trades)) return [];

        return trades.map(t => {
            let riskVal = 0; 
            let riskPctString = '0%';
            
            const config = props.pairsConfig.find(p => p.symbol === t.pair);
            if (config) {
                riskVal = t.lot * config.pip_value * config.sl_pips;
                if (entry.startCapital && entry.startCapital > 0) {
                     const pct = (riskVal / entry.startCapital) * 100;
                     const rounded = Math.round(pct * 2) / 2;
                     riskPctString = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + '%';
                }
            }
            
            return {
                pair: t.pair,
                direction: t.direction || 'Buy',
                lot: t.lot,
                result: t.result,
                riskDisplay: riskPctString 
            };
        });
    } catch (e) { return []; }
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
    height: 120px; 
    overflow: hidden !important; /* Force no scroll */
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    display: flex;
    flex-direction: column;
}
.cal-day:hover { background: #333333; }
.cal-day.empty { background: var(--surface-color); cursor: default; }
.cal-day.today { border: 2px solid var(--accent-color); }

.cal-day.has-profit { background: rgba(76, 175, 80, 0.05); }
.cal-day.has-loss { background: rgba(244, 67, 54, 0.05); }

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

/* RENAMED CLASS: cal-day-trades */
.cal-day-trades {
    flex: 1;
    overflow: hidden !important; /* Force no scroll */
}
.cal-day-trades table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.7rem;
}
.cal-day-trades th, .popup-table th {
    text-align: left;
    color: #666;
    font-weight: normal;
    padding-bottom: 4px;
    border-bottom: 1px solid #333;
}
.cal-day-trades td, .popup-table td {
    padding: 2px 0;
    color: #ccc;
    white-space: nowrap;
}
.c-pair { font-weight: bold; color: #ddd; max-width: 50px; overflow: hidden; text-overflow: ellipsis; }
.c-type.buy { color: #81c784; }
.c-type.sell { color: #e57373; }
.c-risk { font-family: monospace; }
.c-pl { font-weight: bold; text-align: right; }

.text-green, .cal-day-trades td.text-green, .popup-table td.text-green { color: #81c784; }
.text-red, .cal-day-trades td.text-red, .popup-table td.text-red { color: #e57373; }

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
.popup-table td { padding: 4px 0; }
</style>
