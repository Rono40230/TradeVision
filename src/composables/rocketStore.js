import { ref, computed } from 'vue';

// SINGLETON STATE
const db = ref(null);
const account = ref({ capital: 0, cash_used: 0, alloc_wheel: 0, margin_wheel_pct: 0, alloc_growth: 0, alloc_rocket: 0 });
const plLatent = ref(0);
const allActiveTrades = ref([]);
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

export const useRocketStore = () => {
    return {
        db,
        account,
        plLatent,
        allActiveTrades,
        strategyType,
        mmConfig,
        
        // Modals
        showSettings,
        showAssignModal,
        tradeToAssign,
        showStatusModal,
        pendingStatusUpdate,
        showDeleteModal,
        tradeToDelete
    };
};
