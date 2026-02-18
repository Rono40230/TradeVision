<template>
  <div class="assignments-log">
    <div class="header">
      <h3>Assignations & Exercices (IBKR)</h3>
      <div class="info-badge">Phase 4.1 Sync</div>
    </div>

    <div class="table-container">
      <table class="log-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Cible</th>
            <th>Qté</th>
            <th>Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="assignments.length === 0">
            <td colspan="5" class="empty">Aucune assignation détectée via IBKR.</td>
          </tr>
          <tr v-for="assig in assignments" :key="assig.id">
            <td>{{ assig.assignment_date }}</td>
            <td>
              <span class="type-badge" :class="assig.type.toLowerCase()">
                {{ formatType(assig.type) }}
              </span>
            </td>
            <td class="symbol">{{ assig.symbol }}</td>
            <td>{{ assig.quantity }}</td>
            <td class="price">{{ formatCurrency(assig.price) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Database from '@tauri-apps/plugin-sql';
import { formatCurrency } from '../../utils/rocketUtils.js';

const assignments = ref([]);

async function fetchAssignments() {
  try {
    const db = await Database.load('sqlite:trading.db');
    assignments.value = await db.select('SELECT * FROM assignments ORDER BY assignment_date DESC LIMIT 50');
  } catch (e) {
    console.error('Failed to fetch assignments:', e);
  }
}

function formatType(type) {
  if (type === 'PUT_ASSIGNMENT') return 'Vente PUT Assignée';
  if (type === 'CALL_ASSIGNMENT') return 'CALL Exercé (Assigné)';
  if (type === 'EXERCISE') return 'Exercice Manuel';
  return type;
}

onMounted(fetchAssignments);
</script>

<style scoped>
.assignments-log {
  background: #fdfdfd;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #edf2f7;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header h3 { margin: 0; font-size: 1.1rem; color: #2d3748; }

.info-badge {
  background: #ebf8ff;
  color: #3182ce;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.table-container {
  overflow-x: auto;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.log-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid #edf2f7;
  color: #718096;
  font-weight: 600;
}

.log-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #edf2f7;
}

.symbol { font-weight: bold; color: #2d3748; }
.price { font-family: monospace; }

.type-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.put_assignment { background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; }
.call_assignment { background: #f0fff4; color: #2f855a; border: 1px solid #9ae6b4; }
.exercise { background: #ebf8ff; color: #2b6cb0; border: 1px solid #90cdf4; }

.empty { text-align: center; color: #a0aec0; padding: 2rem; font-style: italic; }
</style>
