<template>
  <div class="kasper-academy">
    <!-- 1. Metrics Bar -->
    <div class="kasper-metrics">
        <div class="metric-group">
            <span class="label">Capital Investi</span>
            <span class="value action-value" @click="openCapitalModal">{{ formatCurrency(account.capital) }}</span>
             <button class="icon-btn edit-cap-btn" @click="openCapitalModal" title="Saisir capital de départ">✎</button>
        </div>
        <div class="metric-group positive">
            <span class="label">Plus-Values</span>
            <span class="value">+{{ formatCurrency(metrics.totalPlus) }}</span>
        </div>
        <div class="metric-group negative">
            <span class="label">Moins-Values</span>
            <span class="value">{{ formatCurrency(metrics.totalMinus) }}</span>
        </div>
        <div class="metric-group" :class="metrics.result >= 0 ? 'positive' : 'negative'">
            <span class="label">Résultat Net</span>
            <span class="value">{{ formatCurrency(metrics.result) }}</span>
        </div>
        <div class="metric-group">
            <span class="label">Risque Moyen</span>
            <span class="value">{{ formatCurrency(metrics.averageRisk) }}</span>
        </div>
    </div>

    <!-- 2. MM Table Placeholder -->
    <div class="mm-table-section">
        <div class="placeholder-box">
            <h3>Tableau de Money Management</h3>
            <p>(En attente des spécifications)</p>
        </div>
    </div>

    <!-- 3. Calendar -->
    <div class="calendar-section">
        <div class="calendar-header">
            <button @click="changeMonth(-1)">&lt;</button>
            <h2>{{ currentMonthLabel }}</h2>
            <button @click="changeMonth(1)">&gt;</button>
        </div>
        <div class="calendar-grid">
            <div class="cal-day-name" v-for="day in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="day">{{ day }}</div>
            
            <!-- Empty cells for offset -->
            <div v-for="n in startOffset" :key="'empty-'+n" class="cal-day empty"></div>

            <!-- Days -->
             <div v-for="day in daysInMonth" :key="day.dateStr" 
                  class="cal-day" 
                  :class="{ 
                      'has-profit': day.entry && day.entry.profit_loss > 0, 
                      'has-loss': day.entry && day.entry.profit_loss < 0,
                      'today': day.isToday
                  }"
                  @click="openDayModal(day.dateStr, day.entry)"
             >
                <span class="day-number">{{ day.number }}</span>
                <div class="day-content" v-if="day.entry">
                    <span class="pl-value">{{ formatCurrency(day.entry.profit_loss) }}</span>
                </div>
             </div>
        </div>
    </div>

    <!-- Modals -->
    <!-- Day Entry Modal -->
    <div v-if="showDayModal" class="modal-overlay">
        <div class="modal-content">
            <h3>Saisie du {{ formatDate(selectedDate) }}</h3>
            <div class="form-group">
                <label>Résultat du jour (€)</label>
                <input type="number" step="0.01" v-model.number="dayForm.pl" ref="focusInput" @keyup.enter="saveDay">
            </div>
            <div class="form-group">
                <label>Risque pris (€)</label>
                <input type="number" step="0.01" v-model.number="dayForm.risk">
            </div>
            <div class="modal-actions">
                <button @click="showDayModal = false">Annuler</button>
                <button class="primary" @click="saveDay">Enregistrer</button>
            </div>
        </div>
    </div>

    <!-- Capital Modal -->
    <div v-if="showCapModal" class="modal-overlay">
        <div class="modal-content">
            <h3>Définir le Capital de Départ</h3>
            <p class="warning-text">Attention : Ceci écrasera le capital actuel.</p>
            <div class="form-group">
                <label>Montant (€)</label>
                <input type="number" step="100" v-model.number="tempCapital">
            </div>
            <div class="modal-actions">
                <button @click="showCapModal = false">Annuler</button>
                <button class="primary" @click="saveCapital">Valider</button>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useKasperState } from '../composables/useKasperState.js';

const { account, metrics, dailyEntries, init, saveDailyEntry, updateCapital } = useKasperState();

const currentMonthDate = ref(new Date());
const showDayModal = ref(false);
const showCapModal = ref(false);
const selectedDate = ref('');
const dayForm = ref({ pl: 0, risk: 0 });
const tempCapital = ref(0);
const focusInput = ref(null);

onMounted(() => {
    init();
});

// -- Calendar Logic --
const currentMonthLabel = computed(() => {
    return currentMonthDate.value.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
});

const startOffset = computed(() => {
    const d = new Date(currentMonthDate.value.getFullYear(), currentMonthDate.value.getMonth(), 1);
    let day = d.getDay(); 
    // JS: 0=Sun, 1=Mon... We want Mon=0, Sun=6
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
        const entry = dailyEntries.value.find(e => e.date === dateStr);
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

// -- Actions --

function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
}

function formatDate(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
}

// Day Entry
function openDayModal(date, entry) {
    selectedDate.value = date;
    dayForm.value = {
        pl: entry ? entry.profit_loss : 0,
        risk: entry ? entry.risk_used : 0
    };
    showDayModal.value = true;
    nextTick(() => focusInput.value?.focus());
}

async function saveDay() {
    await saveDailyEntry(selectedDate.value, dayForm.value.pl, dayForm.value.risk);
    showDayModal.value = false;
}

// Capital Entry
function openCapitalModal() {
    tempCapital.value = account.value ? account.value.capital : 5000;
    showCapModal.value = true;
}

async function saveCapital() {
    await updateCapital(tempCapital.value);
    showCapModal.value = false;
}
</script>

<style scoped>
.kasper-academy {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding: 1rem;
    gap: 1.5rem;
    background-color: var(--bg-color);
}

/* Metrics */
.kasper-metrics {
    display: flex;
    justify-content: space-around;
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}

.metric-group {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.metric-group .label {
    font-size: 0.85rem;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 0.25rem;
}

.metric-group .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-color);
}

.action-value {
    cursor: pointer;
    border-bottom: 1px dashed var(--text-muted);
}
.action-value:hover { color: var(--accent-color); }

.metric-group.positive .value { color: #4caf50; }
.metric-group.negative .value { color: #f44336; }

.edit-cap-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    margin-left: 0.5rem;
    font-size: 1rem;
}
.edit-cap-btn:hover { color: var(--accent-color); }


/* Placeholder MM Table */
.mm-table-section {
    background: var(--surface-color);
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    border: 2px dashed var(--border-color);
}
.placeholder-box { color: var(--text-muted); }

/* Calendar */
.calendar-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--surface-color);
    border-radius: 8px;
    padding: 1rem;
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
    background: var(--border-color); /* Grid lines */
    border: 1px solid var(--border-color);
    flex: 1; /* Fill remaining height */
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
    background: var(--bg-color); /* Cell background */
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

.day-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pl-value {
    font-size: 1.1rem;
    font-weight: bold;
}
.has-profit .pl-value { color: #4caf50; }
.has-loss .pl-value { color: #f44336; }


/* Modal */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-content {
    background: var(--surface-color);
    padding: 2rem;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); }
.form-group input { 
    width: 100%; 
    padding: 0.5rem; 
    background: var(--bg-color); 
    border: 1px solid var(--border-color); /* Fixed border */
    color: var(--text-color);
    border-radius: 4px;
    font-size: 1.1rem;
}
.form-group input:focus { outline: 2px solid var(--accent-color); border-color: transparent; }

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
}
.modal-actions button {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}
.modal-actions button.primary {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
}
.warning-text { color: #ff9800; font-size: 0.9rem; margin-bottom: 1rem; }
</style>
