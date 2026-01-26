<template>
    <div v-if="show" class="modal-overlay">
        <div class="modal-content">
            <h3>Configuration Money Management</h3>
            
            <div class="input-group">
                <label>Capital Initial ($)</label>
                <input type="number" :value="mmConfig.capital" class="input-field" readonly style="background: #222; opacity: 0.7;" />
                <span class="note-text" style="display:block; text-align:right;">(Calculé : Wheel + PCS + Rocket)</span>
            </div>

            <div class="flex-row">
                <div class="input-group half">
                    <label>Capital Wheel ($)</label>
                    <input type="number" v-model.number="mmConfig.alloc_wheel" class="input-field" @input="$emit('update-capital')" />
                </div>
                <div class="input-group half">
                    <label>Marge (en %)</label>
                    <div class="pct-wrapper">
                        <input type="number" v-model.number="mmConfig.margin_wheel_pct" class="input-field" />
                        <span class="pct-symbol">%</span>
                    </div>
                </div>
            </div>

            <div class="input-group">
                <label>Capital PCS ($)</label>
                <input type="number" v-model.number="mmConfig.alloc_growth" class="input-field" @input="$emit('update-capital')" />
            </div>

            <div class="input-group">
                <label>Capital Rocket ($)</label>
                <input type="number" v-model.number="mmConfig.alloc_rocket" class="input-field" @input="$emit('update-capital')" />
            </div>

            <div class="modal-actions">
                <button class="cancel-btn" @click="$emit('update:show', false)">Annuler</button>
                <button class="submit-btn" @click="$emit('save')">Sauvegarder</button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    show: Boolean,
    mmConfig: { type: Object, required: true }
});

defineEmits(['update:show', 'save', 'update-capital']);
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--surface-color);
    padding: 2rem;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.modal-content h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
}

.input-group {
    margin-bottom: 1.2rem;
}

.input-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
}

.input-field {
    width: 100%;
    padding: 0.8rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-color);
    font-size: 1rem;
}
.input-field:focus {
    outline: none;
    border-color: var(--accent-color);
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

.cancel-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    cursor: pointer;
}
.cancel-btn:hover {
    background: rgba(255,255,255,0.05);
    color: var(--text-color);
}

.submit-btn {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
}
.submit-btn:hover {
    filter: brightness(1.1);
}

.flex-row {
    display: flex;
    gap: 1rem;
}
.half {
    flex: 1;
}

.pct-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}
.pct-symbol {
    position: absolute;
    right: 15px;
    color: var(--text-muted);
    font-size: 0.9rem;
    pointer-events: none;
}
.note-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0.5rem;
}
</style>
