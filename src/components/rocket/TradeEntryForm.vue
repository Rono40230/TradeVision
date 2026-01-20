<template>
  <div class="entry-block">
    <h3>Saisie d'Ordre</h3>
    <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
    
    <!-- Strategy Selector -->
    <div class="strategy-nav">
        <button :class="{ active: modelValue === 'wheel' }" @click="updateStrategy('wheel')">Wheel</button>
        <button :class="{ active: modelValue === 'pcs' }" @click="updateStrategy('pcs')">PCS</button>
        <button :class="{ active: modelValue === 'rockets' }" @click="updateStrategy('rockets')">Rockets</button>
    </div>

    <!-- WHEEL Form -->
    <div v-if="modelValue === 'wheel'" class="form-content">
        <div class="sub-strategy" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <label><input type="radio" v-model="renteSubStrategy" value="put" /> Vente PUT</label>
            <label><input type="radio" v-model="renteSubStrategy" value="put_long" /> Achat PUT</label>

            <label><input type="radio" v-model="renteSubStrategy" value="call" /> Vente CALL</label>
            <label><input type="radio" v-model="renteSubStrategy" value="call_long" /> Achat CALL</label>
        </div>
        
        <div class="sub-strategy" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <label><input type="radio" v-model="renteSubStrategy" value="hedge" /> Hedge Simple</label>
            <label><input type="radio" v-model="renteSubStrategy" value="hedge_spread" /> Hedge Spread</label>
        </div>

        <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="form.symbol" @input="form.symbol = $event.target.value.toUpperCase()" placeholder="ex: SPY" class="input-field" />
        </div>
            <div class="input-group">
            <label>Date Expiration</label>
            <input type="date" v-model="form.expiry" class="input-field" />
        </div>

        <div v-if="['put', 'put_long', 'call', 'call_long'].includes(renteSubStrategy)" class="input-group">
            <label>Taille de position (%)</label>
            <select v-model.number="form.positionSizePct" class="input-field">
                <option :value="5">5 %</option>
                <option :value="10">10 %</option>
                <option :value="15">15 %</option>
            </select>
        </div>

        <div v-if="renteSubStrategy !== 'hedge_spread'" class="input-group">
            <label>Strike</label>
            <input type="number" v-model="form.strike" placeholder="350" class="input-field" />
        </div>

        <div v-if="renteSubStrategy === 'hedge_spread'" class="complex-legs">
             <h4>Hedge (Spread)</h4>
             <div class="input-group">
                <label>Pente Protection (Achat Put)</label>
                <input type="number" v-model="form.strikeLong" class="input-field" />
            </div>
             <div class="input-group">
                <label>Pente Financement (Vente Put)</label>
                <input type="number" v-model="form.strikeShort" class="input-field" />
            </div>
        </div>

        <div class="input-group" v-if="renteSubStrategy !== 'hedge'">
            <label>Rendement Brut (%)</label>
            <input type="number" v-model="form.estimatedYield" placeholder="ex: 12.5" class="input-field" />
        </div>

            <div class="input-group">
            <label>Prime / Prix</label>
            <input type="number" v-model="form.price" placeholder="2.43" class="input-field" />
        </div>
        
        <div class="input-group">
            <label>Quantité (Contrats)</label>
            <input 
                type="number" 
                v-model.number="form.quantity"
                class="input-field" 
            />
        </div>
        
        <button type="button" 
                class="submit-btn" 
                @click="handleSubmit"
        >
            Enregistrer l'Ordre
        </button>
    </div>

        <!-- PCS (Put Credit Spread) Form -->
    <div v-if="modelValue === 'pcs'" class="form-content">
        <div class="sub-strategy">
            <label><input type="radio" v-model="croissanceSubStrategy" value="pcs" /> PCS (Standard)</label>
            <label><input type="radio" v-model="croissanceSubStrategy" value="ic" /> Iron Condor</label>
        </div>

            <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="form.symbol" @input="form.symbol = $event.target.value.toUpperCase()" placeholder="ex: TESLA" class="input-field" />
        </div>
            <div class="input-group">
            <label>Date Expiration</label>
            <input type="date" v-model="form.expiry" class="input-field" />
        </div>
            
            <!-- STANDARD PCS LEGS -->
            <div v-if="croissanceSubStrategy === 'pcs'" class="complex-legs">
            <h4>Jambes (Put Credit Spread)</h4>
            <div class="input-group">
                <label>Strike Short (Vente Put)</label>
                <input type="number" v-model="form.strikeShort" class="input-field" />
            </div>
                <div class="input-group">
                <label>Strike Long (Achat Put)</label>
                <input type="number" v-model="form.strikeLong" class="input-field" />
            </div>
            </div>

            <!-- IRON CONDOR LEGS -->
            <div v-if="croissanceSubStrategy === 'ic'" class="complex-legs">
            <h4>Jambes (Iron Condor)</h4>
            <div class="flex-row">
                <div class="input-group half">
                    <label>Vente limite put</label>
                    <input type="number" v-model="form.strikeShort" class="input-field" />
                </div>
                <div class="input-group half">
                    <label>Achat limite put</label>
                    <input type="number" v-model="form.strikeLong" class="input-field" />
                </div>
            </div>
            <div class="flex-row">
                <div class="input-group half">
                    <label>Vente limite call</label>
                    <input type="number" v-model="form.strikeCallShort" class="input-field" />
                </div>
                <div class="input-group half">
                    <label>Achat limite call</label>
                    <input type="number" v-model="form.strikeCallLong" class="input-field" />
                </div>
            </div>
            </div>

            <div class="input-group">
            <label>Crédit Net H.M. (Négatif)</label>
            <input type="number" v-model="form.price" placeholder="-1.50" class="input-field" step="0.01" />
        </div>

            <div class="input-group">
            <label>Quantité</label>
                <input 
                type="number" 
                v-model.number="form.quantity"
                class="input-field"
            />
        </div>

        <button type="button" class="submit-btn" @click="handleSubmit">Enregistrer l'Ordre</button>
    </div>

    <!-- ROCKETS Form -->
    <div v-if="modelValue === 'rockets'" class="form-content">
        <p>Nouveaux types de stratégies (Rockets) à venir.</p>
        <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="form.symbol" @input="form.symbol = $event.target.value.toUpperCase()" placeholder="ex: TESLA" class="input-field" />
        </div>
            <button type="button" class="submit-btn" @click="handleSubmit">Enregistrer l'Ordre</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import { initDB } from '../../utils/db.js';

const props = defineProps({
    modelValue: { type: String, required: true }, // strategyType
    account: { type: Object, required: true },
    displayedCapital: { type: Number, default: 0 }
});

const emit = defineEmits(['update:modelValue', 'trade-submitted']);

const renteSubStrategy = ref('put');
const croissanceSubStrategy = ref('pcs');
const errorMsg = ref('');

const form = ref({
    symbol: '',
    expiry: '',
    strike: null,
    positionSizePct: 10,
    estimatedYield: null,
    strikeShort: null,
    strikeLong: null,
    strikeCallShort: null,
    strikeCallLong: null,
    price: null,
    quantity: 1
});

// Helper to sync v-model strategyType
function updateStrategy(val) {
    emit('update:modelValue', val);
}

// Logic Computation
const computedQuantity = computed(() => {
    // WHEEL Logic
    if (props.modelValue === 'wheel' && renteSubStrategy.value === 'put') {
       if (props.account.alloc_wheel > 0 && form.value.strike > 0 && form.value.positionSizePct) {
            const totalCap = props.displayedCapital; 
            const budgetForTrade = totalCap * (form.value.positionSizePct / 100);
            return Math.floor(budgetForTrade / (form.value.strike * 100)) || 1;
       }
       return 1;
    }

    // PCS Logic
    if (props.modelValue === 'pcs') {
        const allocGrowth = props.account.alloc_growth || 0;
        if (allocGrowth <= 0) return 1;
        const tradeBudget = allocGrowth * 0.10; // 10%

        if (croissanceSubStrategy.value === 'pcs') {
            if (form.value.strikeShort && form.value.strikeLong) {
                const width = Math.abs(form.value.strikeShort - form.value.strikeLong);
                if (width === 0) return 1;
                const riskPerContract = width * 100;
                return Math.floor(tradeBudget / riskPerContract) || 1;
            }
        } else if (croissanceSubStrategy.value === 'ic') {
             const widthPut = (form.value.strikeShort && form.value.strikeLong) ? Math.abs(form.value.strikeShort - form.value.strikeLong) : 0;
             const widthCall = (form.value.strikeCallShort && form.value.strikeCallLong) ? Math.abs(form.value.strikeCallShort - form.value.strikeCallLong) : 0;
             const maxWidth = Math.max(widthPut, widthCall);
             if (maxWidth > 0) {
                 return Math.floor(tradeBudget / (maxWidth * 100)) || 1;
             }
        }
        return 1;
    }

    // ROCKETS Logic
    if (props.modelValue === 'rockets') {
        const allocGrowth = props.account.alloc_growth || 0;
        if (allocGrowth > 0 && form.value.price > 0) {
            const tradeBudget = allocGrowth * 0.025; // 2.5%
            return Math.floor(tradeBudget / form.value.price) || 1;
        }
    }

    return form.value.quantity;
});

const isQuantityComputed = computed(() => {
    if (props.modelValue === 'wheel') {
         // Only Sell PUT (Short Put) is computed automatically
         return renteSubStrategy.value === 'put';
    }
    // PCS and ROCKETS are computed
    return true; 
});

watchEffect(() => {
   if (isQuantityComputed.value) {
       form.value.quantity = computedQuantity.value;
   } 
});

async function handleSubmit() {
    errorMsg.value = '';
    if (!props.account || !props.account.id) {
         errorMsg.value = "Compte non chargé. Veuillez réessayer.";
         return;
    }
    if (!form.value.symbol) {
        errorMsg.value = "Symbole requis.";
        return;
    }
    if ((props.modelValue === 'wheel' || props.modelValue === 'pcs') && !form.value.expiry) {
        errorMsg.value = "Date d'expiration requise.";
        return;
    }

    // Prepare Payload
    const payload = {
        strategy: props.modelValue,
        subStrategy: (props.modelValue === 'wheel' ? renteSubStrategy.value : croissanceSubStrategy.value),
        form: { ...form.value },
        quantityToInsert: form.value.quantity 
    };

    try {
        const db = await initDB();
        const today = new Date().toISOString().split('T')[0];
        const currentStrategy = payload.strategy;
        const targetYield = payload.form.estimatedYield || 0;
        const posSize = payload.form.positionSizePct || 0;
        const qC = payload.quantityToInsert;
        
        // Trade Header
        const result = await db.execute(
            `INSERT INTO trades (account_id, date, open_date, symbol, strategy, sub_strategy, status, target_yield, position_size_pct, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, datetime('now'))`,
            [props.account.id, today, today, payload.form.symbol.toUpperCase(), currentStrategy, payload.subStrategy, targetYield, posSize]
        );
        const tradeId = result.lastInsertId;
        let cashImpact = 0;

        // --- WHEEL ---
        if (currentStrategy === 'wheel') {
            let type = 'put';
            let side = 'short';
            let impact = 0;

            switch (payload.subStrategy) {
                case 'put': // Vente PUT
                    type = 'put'; side = 'short';
                    impact = (payload.form.strike * 100 * qC);
                    break;
                case 'put_long': // Achat PUT
                    type = 'put'; side = 'long';
                    // Impact = Coût de l'option (Debit)
                    impact = (Math.abs(payload.form.price) * 100 * qC);
                    break;
                case 'call': // Vente CALL
                    type = 'call'; side = 'short';
                    // Covered Call utilise les actions comme collatéral
                    impact = 0;
                    break;
                case 'call_long': // Achat CALL
                    type = 'call'; side = 'long';
                    impact = (Math.abs(payload.form.price) * 100 * qC);
                    break;
                case 'hedge': 
                    type = 'put'; side = 'long';
                    impact = (Math.abs(payload.form.price) * 100 * qC);
                    // Force Status to Open (Standard)
                    break;
                case 'hedge_spread':
                    // HEDGE SPREAD: 2 legs (Long Put + Short Put)
                    // Insert Long Put (We store the full Debit here for P&L tracking)
                    await db.execute(
                        `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                         VALUES (?, 'put', 'long', ?, ?, ?, ?, 'open')`,
                         [tradeId, qC, payload.form.strikeLong, payload.form.expiry, Math.abs(payload.form.price)]
                    );
                    // Insert Short Put
                    await db.execute(
                        `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                         VALUES (?, 'put', 'short', ?, ?, ?, 0, 'open')`,
                         [tradeId, qC, payload.form.strikeShort, payload.form.expiry]
                    );
                    
                    impact = (Math.abs(payload.form.price) * 100 * qC);
                    side = 'spread'; 
                    break;
            }

            // CRITICAL FIX: Ensure 'hedge' subStrategy is saved correctly in the single leg insert
            if (payload.subStrategy !== 'hedge_spread') {
                // If it's a hedge simple, type is put, side is long
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
                    [tradeId, type, side, qC, payload.form.strike, payload.form.expiry, payload.form.price]
                );
            }
            cashImpact = impact;
        } 
        // --- PCS ---
        else if (currentStrategy === 'pcs') {
            if (payload.subStrategy === 'pcs') {
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                     VALUES (?, 'put', 'short', ?, ?, ?, ?, 'open')`,
                    [tradeId, qC, payload.form.strikeShort, payload.form.expiry, payload.form.price]
                );
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                     VALUES (?, 'put', 'long', ?, ?, ?, 0, 'open')`,
                    [tradeId, qC, payload.form.strikeLong, payload.form.expiry]
                );
                cashImpact = Math.abs(payload.form.strikeShort - payload.form.strikeLong) * 100 * qC;
            }
            else if (payload.subStrategy === 'ic') {
                 // Put Side
                 await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                     VALUES (?, 'put', 'short', ?, ?, ?, ?, 'open')`,
                    [tradeId, qC, payload.form.strikeShort, payload.form.expiry, payload.form.price/2] 
                );
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                     VALUES (?, 'put', 'long', ?, ?, ?, 0, 'open')`,
                    [tradeId, qC, payload.form.strikeLong, payload.form.expiry]
                );
                // Call Side
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                     VALUES (?, 'call', 'short', ?, ?, ?, ?, 'open')`,
                    [tradeId, qC, payload.form.strikeCallShort, payload.form.expiry, payload.form.price/2]
                );
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                     VALUES (?, 'call', 'long', ?, ?, ?, 0, 'open')`,
                    [tradeId, qC, payload.form.strikeCallLong, payload.form.expiry]
                );

                const widthPut = Math.abs(payload.form.strikeShort - payload.form.strikeLong);
                const widthCall = Math.abs(payload.form.strikeCallShort - payload.form.strikeCallLong);
                cashImpact = Math.max(widthPut, widthCall) * 100 * qC;
            }
        }
        // --- ROCKETS ---
        else if (currentStrategy === 'rockets') {
             await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, open_price, status) 
                 VALUES (?, 'stock', 'long', ?, ?, 'open')`,
                [tradeId, qC, payload.form.price]
            );
            cashImpact = payload.form.price * qC;
        }

        if (cashImpact > 0) {
            await db.execute(`UPDATE accounts SET cash_used = cash_used + ? WHERE id = ?`, [cashImpact, props.account.id]);
        }

        emit('trade-submitted');
        
        // Reset Logic
        resetForm();

    } catch(e) {
        errorMsg.value = "Erreur lors de l'enregistrement: " + e.message;
    }
}

function resetForm() {
    form.value.symbol = ''; form.value.price = null; form.value.quantity = 1;
    form.value.strike = null; form.value.strikeShort = null; form.value.strikeLong = null;
    form.value.strikeCallShort = null; form.value.strikeCallLong = null;
    form.value.estimatedYield = null;
    errorMsg.value = '';
}
</script>

<style scoped>
.error-msg {
    background: rgba(255, 0, 0, 0.1);
    color: #ff6b6b;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    border: 1px solid rgba(255, 0, 0, 0.2);
}

/* Entry Block */
.entry-block {
    width: 330px;
    box-sizing: border-box;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem 2rem; /* Reduced padding to ensure buttons fit */
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.strategy-nav {
    display: flex;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0; /* Prevent collapsing */
    min-height: 40px; /* Force minimum height */
}

.strategy-nav button {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.8rem;
    cursor: pointer;
    font-weight: 500;
}

.strategy-nav button.active {
    background: var(--accent-color);
    color: white;
}

.sub-strategy {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    background: rgba(255,255,255,0.03);
    padding: 1rem;
    border-radius: 6px;
}

.input-group {
    margin-bottom: 1rem;
}

.input-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-muted);
}

.input-field {
    width: 100%;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 0.8rem;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
}

.input-field:focus {
    border-color: var(--accent-color);
    outline: none;
}

select.input-field {
    /* Enforce dark theme explicitly */
    background-color: #1e1e1e !important;
    color: #e0e0e0 !important;
    border: 1px solid var(--border-color);
    appearance: none; /* Remove OS default styling */
    -webkit-appearance: none;
    -moz-appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23e0e0e0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 0.7rem top 50%;
    background-size: 0.65rem auto;
    padding-right: 2rem; /* Make room for arrow */
}

/* Ensure options are also dark (for some browsers) */
select.input-field option {
    background-color: #1e1e1e;
    color: #e0e0e0;
}

.submit-btn {
    width: 100%;
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
}

.submit-btn:hover {
    background: var(--accent-hover);
}

.read-only {
    background-color: var(--surface-color-dim, #333); 
    cursor: not-allowed;
    color: var(--text-muted);
}
.complex-legs {
    border: 1px dashed var(--border-color);
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
}
.flex-row {
    display: flex;
    gap: 1rem;
}
.input-group.half {
    width: 50%;
}
</style>
