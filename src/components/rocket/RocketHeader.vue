<template>
  <div class="mm-block">
    <div class="mm-left">
      <div class="mm-item">
        <span class="label">Capital ({{ strategyLabel }})</span>
        <span class="value">{{ formatCurrency(displayedCapital) }}</span>
      </div>
      <div class="mm-item">
        <span class="label">Cash Utilisé</span>
        <span class="value">{{ formatCurrency(account.cash_used) }}</span>
      </div>
      <div class="mm-item">
        <span class="label">Cash Dispo</span>
        <span class="value">{{ formatCurrency(displayedCapital - account.cash_used) }}</span>
      </div>
      <div class="mm-item" v-if="strategyLabel === 'Wheel'">
        <span class="label">Prime Attendue</span>
        <span class="value">{{ formatCurrency(totalExpectedPremium) }}</span>
      </div>
    </div>
    
    <!-- Calendar Events inline (Horizontal) -->
    <div class="mm-calendar-horizontal">
      <span v-if="calendarEvents.length === 0" class="no-events">Aucune échéance</span>
      <div v-for="(event, index) in calendarEvents" :key="index" class="mini-event-item" :class="{ 'urgent': event.dte <= 3 }">
        <span class="mini-date">{{ event.day }} {{ event.month }}</span>
        <span class="mini-symbol">{{ event.symbol }}</span>
        <span class="dte-badge-mini" :class="getDteClass(event.dte)">J-{{ event.dte }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatCurrency, getDteClass } from '../../utils/rocketUtils.js';

const props = defineProps({
  account: { type: Object, required: true },
  plLatent: { type: Number, default: 0 },
  displayedCapital: { type: Number, default: 0 },
  strategyLabel: { type: String, default: '' },
  mmStatusText: { type: String, default: '' },
  mmStatusColor: { type: String, default: '' },
  calendarEvents: { type: Array, default: () => [] },
  totalExpectedPremium: { type: Number, default: 0 }
});

defineEmits(['open-settings']);
</script>

<style scoped>
.mm-block {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin: 1rem;
    gap: 1rem;
}

.mm-left {
    display: flex;
    gap: 2rem;
    flex-shrink: 0;
}

.mm-item {
    display: flex;
    flex-direction: column;
}

.mm-item .label {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 0.2rem;
}

.mm-item .value {
    font-size: 1.2rem;
    font-weight: 600;
}

.value.positive { color: #4caf50; }
.value.negative { color: #f44336; }

.mm-calendar-horizontal {
    display: flex;
    gap: 0.8rem;
    overflow-x: auto;
    flex: 1; /* Take available width */
    align-items: center;
    justify-content: flex-end; /* Align items to the right */
    border-left: 1px solid var(--border-color);
    padding-left: 1rem;
    padding-right: 1rem;
    height: 100%;
}
.no-events {
    font-size: 0.9rem;
    color: var(--text-muted);
    font-style: italic;
}
.mini-event-item {
    display: flex;
    align-items: center;
    background: #2a2a2a;
    padding: 6px 10px;
    border-radius: 4px;
    gap: 8px;
    font-size: 0.8rem;
    white-space: nowrap;
    border: 1px solid transparent;
}
.mini-event-item.urgent {
    border-color: #f44336;
    background: rgba(244, 67, 54, 0.15);
}
.mini-date {
    color: var(--text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
}
.mini-symbol {
    font-weight: 700;
    color: var(--text-color);
}
.dte-badge-mini {
    font-size: 0.7rem;
    padding: 1px 4px;
    border-radius: 3px;
    background: #444;
}
.dte-badge-mini.critical { background: #f44336; color: white; }
.dte-badge-mini.warning { background: #ff9800; color: black; }
.dte-badge-mini.expired { background: #000; color: #f44336; border: 1px solid #f44336; }
</style>
