<template>
  <div class="trade-list">
    <h3>Liste des Trades</h3>
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
import { ref, onMounted, defineEmits } from 'vue';
import Database from '@tauri-apps/plugin-sql';

const emit = defineEmits(['statsUpdated']);

const trades = ref([]);

onMounted(async () => {
  await loadTrades();
});

async function loadTrades() {
  const db = await Database.load('sqlite:trading.db');
  const result = await db.select('SELECT * FROM trades ORDER BY date DESC');
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
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}

th {
  background: #f4f4f4;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}
</style>