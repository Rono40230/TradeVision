<template>
  <div class="trade-form">
    <h3>Ajouter un Trade</h3>
    <form @submit.prevent="submitTrade">
      <div class="form-group">
        <label for="date">Date :</label>
        <input type="date" id="date" v-model="trade.date" required />
      </div>
      <div class="form-group">
        <label for="asset_type">Actif / Portefeuille :</label>
        <select id="asset_type" v-model="trade.asset_type" required>
          <option value="stocks">Actions</option>
          <option value="crypto">Cryptos</option>
          <option value="forex">Forex</option>
          <option value="options">Options</option>
        </select>
      </div>
      <div class="form-group">
        <label for="symbol">Symbole :</label>
        <input type="text" id="symbol" v-model="trade.symbol" placeholder="ex: EURUSD" required />
      </div>
      <div class="form-group">
        <label for="type">Type :</label>
        <select id="type" v-model="trade.type" required>
          <option value="buy">Achat</option>
          <option value="sell">Vente</option>
        </select>
      </div>
      <div class="form-group">
        <label for="price">Prix :</label>
        <input type="number" id="price" v-model.number="trade.price" step="0.01" required />
      </div>
      <div class="form-group">
        <label for="quantity">Quantité :</label>
        <input type="number" id="quantity" v-model.number="trade.quantity" step="0.01" required />
      </div>
      <div class="form-group">
        <label for="strategy">Stratégie :</label>
        <input type="text" id="strategy" v-model="trade.strategy" placeholder="ex: Scalping" />
      </div>
      <div class="form-group">
        <label for="notes">Notes :</label>
        <textarea id="notes" v-model="trade.notes" placeholder="Observations..."></textarea>
      </div>
      <div class="form-group">
        <label for="tags">Tags :</label>
        <input type="text" id="tags" v-model="trade.tags" placeholder="ex: forex, momentum" />
      </div>
      <button type="submit">Ajouter Trade</button>
    </form>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue';
import Database from '@tauri-apps/plugin-sql';

const emit = defineEmits(['tradeAdded']);

const trade = ref({
  date: new Date().toISOString().split('T')[0],
  asset_type: 'stocks',
  symbol: '',
  type: 'buy',
  price: 0,
  quantity: 0,
  strategy: '',
  notes: '',
  tags: ''
});

async function submitTrade() {
  const db = await Database.load('sqlite:trading.db');
  await db.execute(
    'INSERT INTO trades (date, asset_type, symbol, type, price, quantity, strategy, notes, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [trade.value.date, trade.value.asset_type, trade.value.symbol, trade.value.type, trade.value.price, trade.value.quantity, trade.value.strategy, trade.value.notes, trade.value.tags]
  );
  // Reset form
  trade.value = {
    date: new Date().toISOString().split('T')[0],
    asset_type: 'stocks',
    symbol: '',
    type: 'buy',
    price: 0,
    quantity: 0,
    strategy: '',
    notes: '',
    tags: ''
  };
  emit('tradeAdded');
}
</script>

<style scoped>
.trade-form {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  background: #333;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #555;
}
</style>