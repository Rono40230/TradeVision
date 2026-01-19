<template>
  <div class="trade-list">
    <h3>Historique des trades</h3>
    <table v-if="trades.length > 0">
      <thead>
        <tr>
          <th>Date</th>
          <th>Symbole</th>
          <th>Type</th>
          <th>Prix</th>
          <th>Quantité</th>
          <th>Stratégie</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in trades" :key="trade.id">
          <td>{{ trade.date }}</td>
          <td>{{ trade.symbol }}</td>
          <td>{{ trade.type }}</td>
          <td>{{ trade.price }}</td>
          <td>{{ trade.quantity }}</td>
          <td>{{ trade.strategy }}</td>
          <td>{{ trade.status }}</td>
          <td>
            <button v-if="trade.status === 'open'" @click="closeTrade(trade)">Fermer</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Aucun trade enregistré.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits, defineProps, watch } from 'vue';
import Database from '@tauri-apps/plugin-sql';

const emit = defineEmits(['statsUpdated']);
const props = defineProps(['filter']);

const trades = ref([]);

onMounted(async () => {
  await loadTrades();
});

watch(() => props.filter, loadTrades);

async function loadTrades() {
  const db = await Database.load('sqlite:trading.db');
  let result;
  if (props.filter && props.filter !== 'all') {
      result = await db.select('SELECT * FROM trades WHERE asset_type = ? AND status = "closed" ORDER BY date DESC', [props.filter]);
  } else {
      result = await db.select('SELECT * FROM trades WHERE status = "closed" ORDER BY date DESC');
  }
  trades.value = result;
}

async function closeTrade(trade) {
  // Simple close: assume current price is entered
  const closePrice = prompt('Prix de clôture:');
  if (closePrice) {
    const db = await Database.load('sqlite:trading.db');
    const profitLoss = (trade.type === 'buy') ? (parseFloat(closePrice) - trade.price) * trade.quantity : (trade.price - parseFloat(closePrice)) * trade.quantity;
    await db.execute('UPDATE trades SET status = "closed", close_price = ?, profit_loss = ? WHERE id = ?', [parseFloat(closePrice), profitLoss, trade.id]);
    await loadTrades();
    emit('statsUpdated');
  }
}
</script>

<style scoped>
.trade-list {
  margin-top: 2rem;
  background: var(--bg-color, #1a1a1a);
  border-radius: 8px;
}

h3 {
  color: var(--text-color, #e0e0e0);
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th, td {
  border-bottom: 1px solid var(--border-color, #333);
  padding: 1rem;
  text-align: left;
  color: var(--text-color, #e0e0e0);
}

th {
  background: var(--surface-color, #2c2c2c);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
  color: var(--text-muted, #a0a0a0);
}

tr:hover {
  background-color: rgba(255, 255, 255, 0.02);
}

p {
  color: var(--text-muted, #777);
  font-style: italic;
}

button {
  background: transparent;
  color: var(--accent-color, #396cd8);
  border: 1px solid var(--accent-color, #396cd8);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

button:hover {
  background: var(--accent-color, #396cd8);
  color: white;
}
</style>