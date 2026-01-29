<script setup>
import { ref, onMounted, computed } from "vue";
import { initDB } from "./utils/db.js";
import DashboardCockpit from "./views/DashboardCockpit.vue";
import ImportView from "./views/ImportView.vue";
import RocketAcademy from "./components/RocketAcademy.vue";
import KasperAcademy from "./components/KasperAcademy.vue";
import AppTitlebar from "./components/AppTitlebar.vue";

const db = ref(null);
const currentView = ref('dashboard');

// Window controls moved to AppTitlebar.vue

onMounted(async () => {
  db.value = await initDB();
});
</script>

<template>
  <div id="app">
    <AppTitlebar v-model="currentView" />
    
    <div class="app-container">
      <main class="main-content">
        <DashboardCockpit 
            v-if="currentView === 'dashboard'" 
            @navigate="(view) => currentView = view"
        />

        <ImportView
            v-else-if="currentView === 'import'"
            @back="currentView = 'dashboard'"
        />

        <RocketAcademy v-else-if="currentView === 'rocket-academy'" />

        <KasperAcademy v-else-if="currentView === 'kasper-academy'" />

        <div v-else class="page-placeholder">
            <h2>Page Introuvable</h2>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
/* Modern Dark Theme */
:root {
  --bg-color: #1a1a1a;
  --sidebar-bg: #212121;
  --surface-color: #2c2c2c;
  --text-color: #e0e0e0;
  --text-muted: #a0a0a0;
  --accent-color: #396cd8;
  --accent-hover: #4a7ce8;
  --border-color: #333333;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-color);
  overflow: hidden; /* Prevent body scroll, handle in #app */
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  color: var(--text-color);
}

/* Layout Container */
.app-container {
  display: flex;
  flex-direction: row;
  flex: 1;          /* Take all remaining space */
  overflow: hidden; /* Prevent global scroll */
}

/* Main Content Area */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  overflow: hidden; 
}


.page-placeholder {
    padding: 3rem;
    color: var(--text-muted);
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
}
</style>
