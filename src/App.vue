<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { initDB } from "./utils/db.js";
import { initIBSyncScheduler, stopIBSyncScheduler } from "./utils/ibSyncSchedulerSetup.js";
// ─── Composants de layout ────────────────────────────────────────────────
import AppSidebar from "./components/AppSidebar.vue";
// import AppTitlebar from "./components/AppTitlebar.vue"; // conservé en garde-fou

// ─── Vues existantes ─────────────────────────────────────────────────────
import DashboardCockpit from "./views/DashboardCockpit.vue";
import ImportView from "./views/ImportView.vue";
import HistoriqueView from "./views/HistoriqueView.vue";
import RocketAcademy from "./components/RocketAcademy.vue";
import KasperAcademy from "./components/KasperAcademy.vue";

// ─── Nouvelles vues (PHASE 4) ─────────────────────────────────────────────
import HistoriqueWheelView from "./views/HistoriqueWheelView.vue";
import HistoriquePCSView from "./views/HistoriquePCSView.vue";
import HistoriqueRocketsView from "./views/HistoriqueRocketsView.vue";
import HistoriqueMT5View from "./views/HistoriqueMT5View.vue";
import NotesView from "./views/NotesView.vue";
import StatistiquesOptionsView from "./views/StatistiquesOptionsView.vue";
import StatistiquesView from "./views/StatistiquesView.vue";
import AnalyseIAView from "./views/AnalyseIAView.vue";
import PlansView from "./views/PlansView.vue";
import TagsView from "./views/TagsView.vue";
import KasperStatistiquesView from "./views/KasperStatistiquesView.vue";
import KasperAnalyseIAView from "./views/KasperAnalyseIAView.vue";
import KasperPlansView from "./views/KasperPlansView.vue";
import KasperTagsView from "./views/KasperTagsView.vue";
import WheelStatistiquesView from "./views/WheelStatistiquesView.vue";
import PCSStatistiquesView from "./views/PCSStatistiquesView.vue";
import CalendrierView from "./views/CalendrierView.vue";
import RetailsView from "./views/RetailsView.vue";
import SaisonnaliteView from "./views/SaisonnaliteView.vue";
import ComptesView from "./views/ComptesView.vue";
import TutoView from "./views/TutoView.vue";

const db = ref(null);
const currentView = ref('dashboard');

// Window controls moved to AppTitlebar.vue

onMounted(async () => {
  db.value = await initDB();
  // Start background IB sync scheduler
  await initIBSyncScheduler();
});

onBeforeUnmount(() => {
  // Clean up scheduler on app close
  stopIBSyncScheduler();
});
</script>

<template>
  <div id="app">
    <AppSidebar v-model="currentView" />

    <main class="main-content">
      <!-- ── Dashboard ─────────────────────────────────────────────── -->
      <DashboardCockpit
          v-if="currentView === 'dashboard'"
          @navigate="(view) => currentView = view"
      />

      <!-- ── Import (legacy) ──────────────────────────────────────── -->
      <ImportView
          v-else-if="currentView === 'import'"
          @back="currentView = 'dashboard'"
      />

      <!-- ── Journal global (legacy) ──────────────────────────────── -->
      <HistoriqueView
          v-else-if="currentView === 'historique'"
          @back="currentView = 'dashboard'"
      />

      <!-- ── Nouveau Trade ─────────────────────────────────────────── -->
      <RocketAcademy v-else-if="currentView === 'wheel'"   strategy="wheel" />
      <RocketAcademy v-else-if="currentView === 'pcs'"     strategy="pcs" />
      <RocketAcademy v-else-if="currentView === 'rockets'" strategy="rockets" />
      <KasperAcademy v-else-if="currentView === 'kasper'" />

      <!-- ── Journal par stratégie ─────────────────────────────────── -->
      <HistoriqueWheelView   v-else-if="currentView === 'historique-wheel'" />
      <HistoriquePCSView     v-else-if="currentView === 'historique-pcs'" />
      <HistoriqueRocketsView v-else-if="currentView === 'historique-rockets'" />
      <HistoriqueMT5View
          v-else-if="currentView.startsWith('historique-mt5-')"
          :accountId="currentView.replace('historique-mt5-', '')"
      />

      <!-- ── Notes ─────────────────────────────────────────────────── -->
      <NotesView v-else-if="currentView === 'notes'" />

      <!-- ── Rockets : stats / IA / plans / tags ───────────────────── -->
      <StatistiquesOptionsView v-else-if="currentView === 'statistiques-options'" />
      <StatistiquesView         v-else-if="currentView === 'statistiques-rockets'" />
      <AnalyseIAView    v-else-if="currentView === 'analyse-ia'" />
      <PlansView        v-else-if="currentView === 'plans'" />
      <TagsView         v-else-if="currentView === 'tags'" />

      <!-- ── Kasper : stats / IA / plans / tags ────────────────────── -->
      <KasperStatistiquesView v-else-if="currentView === 'kasper-statistiques'" />
      <KasperAnalyseIAView    v-else-if="currentView === 'kasper-analyse-ia'" />
      <KasperPlansView        v-else-if="currentView === 'kasper-plans'" />
      <KasperTagsView         v-else-if="currentView === 'kasper-tags'" />

      <!-- ── Wheel / PCS : stats ───────────────────────────────────── -->
      <WheelStatistiquesView v-else-if="currentView === 'wheel-statistiques'" />
      <PCSStatistiquesView   v-else-if="currentView === 'pcs-statistiques'" />

      <!-- ── Données de marché ─────────────────────────────────────── -->
      <CalendrierView    v-else-if="currentView === 'calendrier'" />
      <RetailsView       v-else-if="currentView === 'retails'" />
      <SaisonnaliteView  v-else-if="currentView === 'saisonnalite'" />

      <!-- ── Paramètres ────────────────────────────────────────────── -->
      <ComptesView v-else-if="currentView === 'comptes'" />
      <TutoView    v-else-if="currentView === 'tuto'" />

      <!-- ── Fallback ──────────────────────────────────────────────── -->
      <div v-else class="page-placeholder">
        <h2>Page Introuvable</h2>
        <p>Route inconnue : {{ currentView }}</p>
      </div>
    </main>
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

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background-color: var(--bg-color);
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: row; /* Sidebar à gauche + main-content à droite */
  background-color: var(--bg-color);
  color: var(--text-color);
  overflow: hidden;
}

/* Main Content Area */
.main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  overflow: hidden;
}

.main-content > * {
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex-shrink: 1;
  flex-grow: 1;
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
