<script setup>
import { ref } from 'vue';
import { useImportLogic } from '../composables/useImportLogic.js';
import ImportResultsTable from '../components/import/ImportResultsTable.vue';
import ImportDeleteModal from '../components/import/ImportDeleteModal.vue';

const emit = defineEmits(['back']);
const fileInput = ref(null);
const deleteTargetId = ref(null);

const {
    isDragging, file, rawContent, parsingStatus, parsedTrades, parsingError,
    sortKey, sortDirection, toggleSort, processFile, analyzeFile, displayedTrades
} = useImportLogic();

const triggerFileInput = () => fileInput.value.click();
const onFileSelect = (e) => e.target.files.length && processFile(e.target.files[0]);
const onDragOver = (e) => { e.preventDefault(); isDragging.value = true; };
const onDragLeave = () => isDragging.value = false;
const onDrop = (e) => {
    e.preventDefault();
    isDragging.value = false;
    e.dataTransfer.files.length && processFile(e.dataTransfer.files[0]);
};

// Logique Modale Suppression (Simple, pas besoin d'extraire)
const openDeleteModal = (id) => deleteTargetId.value = id;
const confirmDelete = () => {
    if (deleteTargetId.value) {
        const idx = parsedTrades.value.findIndex(t => t.id === deleteTargetId.value);
        if (idx !== -1) parsedTrades.value.splice(idx, 1);
        deleteTargetId.value = null;
    }
};
</script>

<template>
    <div class="import-container">
        <div class="import-header">
            <button class="back-btn" @click="emit('back')">← Retour</button>
            <h2>Importer Historique IBKR</h2>
        </div>

        <div class="drop-zone" :class="{ active: isDragging, 'has-file': file }"
            @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop" @click="triggerFileInput">
            <input type="file" ref="fileInput" class="hidden-input" accept=".csv" @change="onFileSelect"/>
            
            <div v-if="!file" class="upload-prompt">
                <span class="icon">📂</span>
                <p>Cliquer ou Glisser un CSV</p>
                <button class="browse-btn" @click.stop="triggerFileInput">Parcourir</button>
            </div>
            <div v-else class="file-info">
                <span class="icon">📄</span>
                <p>{{ file.name }}</p>
                <button class="change-btn" @click.stop="fileInput.click()">Changer</button>
            </div>
        </div>

        <div v-if="parsingStatus === 'success' || parsingError" class="analysis-panel">
            <h3 v-if="parsingStatus === 'success'">Fichier chargé</h3>
            <div v-if="parsingError" class="error-box">⚠️ {{ parsingError }}</div>
            <div class="debug-preview">
                <pre>{{ rawContent.split('\n').slice(0, 5).join('\n') }}</pre>
            </div>
            <button class="action-button-primary" @click="analyzeFile">Analyser</button>
        </div>

        <ImportResultsTable
            v-if="parsingStatus === 'complete'"
            :trades="displayedTrades"
            :sort-key="sortKey"
            :sort-direction="sortDirection"
            @sort="toggleSort"
            @delete="openDeleteModal"
        >
            <template #footer>
                <button class="secondary-btn" @click="parsingStatus = 'idle'; file = null">Reset</button>
                <button class="primary-btn">Valider</button>
            </template>
        </ImportResultsTable>

        <ImportDeleteModal :show="!!deleteTargetId" @cancel="deleteTargetId = null" @confirm="confirmDelete"/>
    </div>
</template>

<style scoped>
.import-container { padding: 2rem; color: var(--text-color); max-width: 1200px; margin: 0 auto; }
.import-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
.back-btn { background: none; border: 1px solid #555; color: #888; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
.back-btn:hover { color: #fff; border-color: #fff; }
.drop-zone { border: 2px dashed #555; border-radius: 12px; padding: 3rem; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255,255,255,0.02); }
.drop-zone:hover, .drop-zone.active { border-color: #646cff; background: rgba(100,108,255,0.05); }
.drop-zone.has-file { border-color: #4CAF50; background: rgba(76,175,80,0.1); }
.browse-btn { margin-top: 1rem; padding: 0.6rem 1.2rem; background: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer; }
.hidden-input { display: none; }
.icon { font-size: 2.5rem; display: block; margin-bottom: 1rem; }
.change-btn { margin-top: 0.5rem; padding: 0.4rem 0.8rem; background: #333; border: none; color: #fff; border-radius: 4px; cursor: pointer; }
.analysis-panel { margin-top: 2rem; padding: 1.5rem; background: #222; border-radius: 8px; border-left: 4px solid #4CAF50; }
.debug-preview { margin: 1rem 0; background: #111; padding: 1rem; border-radius: 4px; overflow-x: auto; max-height: 150px;}
.action-button-primary { background: #4CAF50; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer; }
.secondary-btn { background: transparent; border: 1px solid #555; color: #ccc; padding: 0.8rem 1.5rem; border-radius: 4px; cursor: pointer; margin-right: 1rem; }
.primary-btn { background: var(--accent-color); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 4px; font-weight: bold; }
</style>
