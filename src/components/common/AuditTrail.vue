<template>
  <div class="audit-trail">
    <div class="audit-header">
      <h3>Journal d'Audit & Changements</h3>
      <button class="refresh-btn" @click="fetchLogs">🔄 Actualiser</button>
    </div>

    <div class="table-container">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Table</th>
            <th>Action</th>
            <th>Détails</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="logs.length === 0">
            <td colspan="4" class="empty">Aucun journal trouvé.</td>
          </tr>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ formatTimestamp(log.timestamp) }}</td>
            <td><code>{{ log.table_name }}</code></td>
            <td>
              <span class="action-badge" :class="log.action.toLowerCase()">
                {{ log.action }}
              </span>
            </td>
            <td>
              <div v-if="log.old_value || log.new_value" class="diff-view">
                <span class="old-val">{{ log.old_value || 'N/A' }}</span>
                <span class="arrow">→</span>
                <span class="new-val">{{ log.new_value }}</span>
              </div>
              <div v-else>ID: {{ log.record_id }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Database from '@tauri-apps/plugin-sql';

const logs = ref([]);

async function fetchLogs() {
  try {
    const db = await Database.load('sqlite:trading.db');
    logs.value = await db.select('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50');
  } catch (e) {
    console.error('Failed to fetch audit logs:', e);
  }
}

function formatTimestamp(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('fr-FR');
}

onMounted(fetchLogs);
</script>

<style scoped>
.audit-trail {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.audit-header h3 { margin: 0; color: #333; }

.table-container {
  max-height: 400px;
  overflow-y: auto;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.audit-table th, .audit-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.audit-table th {
  background: #f8f9fa;
  color: #666;
  position: sticky;
  top: 0;
}

.action-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
}

.deletion, .deleted { background: #fee2e2; color: #dc2626; }
.creation, .inserted { background: #dcfce7; color: #16a34a; }
.update { background: #fef9c3; color: #a16207; }

.diff-view {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
}

.old-val { color: #999; text-decoration: line-through; }
.new-val { color: #333; font-weight: bold; }
.arrow { color: #666; }

.refresh-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}
.refresh-btn:hover { background: #f0f0f0; }

.empty { text-align: center; color: #999; padding: 2rem; }
</style>
