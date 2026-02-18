import { ref, computed } from 'vue';

// SINGLETON STATE
const db = ref(null);
const account = ref({ capital: 0, cash_used: 0, alloc_wheel: 0, margin_wheel_pct: 0, alloc_growth: 0, alloc_rocket: 0 });
const plLatent = ref(0);
const allActiveTrades = ref([]);
const livePositions = ref([]);
const lastPositionUpdate = ref(null);
const lastSyncTime = ref(null);
const isSyncing = ref(false);
const strategyType = ref('wheel');
const mmConfig = ref({ capital: 0, alloc_wheel: 0, margin_wheel_pct: 0, alloc_growth: 0, alloc_rocket: 0 });

// MODALS STATE
const showSettings = ref(false);
const showAssignModal = ref(false);
const tradeToAssign = ref(null);
const showStatusModal = ref(false);
const pendingStatusUpdate = ref(null);
const showDeleteModal = ref(false);
const tradeToDelete = ref(null);
const showCcsModal = ref(false);
const tradeToRoll = ref(null);
const rocketAlerts = ref([]);

export const useRocketStore = () => {
    return {
        db,
        account,
        plLatent,
        allActiveTrades,
        livePositions,
        lastPositionUpdate,
        lastSyncTime,
        isSyncing,
        strategyType,
        mmConfig,
        
        // Modals
        showSettings,
        showAssignModal,
        tradeToAssign,
        showStatusModal,
        pendingStatusUpdate,
        showDeleteModal,
        tradeToDelete,
        showCcsModal,
        tradeToRoll,
        rocketAlerts
    };
};
