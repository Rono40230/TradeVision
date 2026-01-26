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
                <CalendarDayCell :day="day" :pairsConfig="pairsConfig" />
             </div>
        </div>

        <KasperCalendarPopup 
            v-if="hoveredDay && hasTrades(hoveredDay)"
            :hoveredDay="hoveredDay"
            :popupStyle="popupStyle"
            :pairsConfig="pairsConfig"
        />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import CalendarDayCell from './CalendarDayCell.vue';
import KasperCalendarPopup from './KasperCalendarPopup.vue';

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
</style>
