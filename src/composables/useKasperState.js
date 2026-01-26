// src/composables/useKasperState.js
import { 
    db, 
    account, 
    currentAccountId, 
    accountsList, 
    dailyEntries, 
    pairsConfig, 
    currentMonth,
    metrics
} from './useKasperStore.js';

import {
    init,
    loadPairs,
    updatePair,
    addPair,
    deletePair,
    loadAccountsList,
    loadAccount,
    switchAccount,
    addAccount,
    updateCapital,
    loadentries,
    saveDailyEntry,
    deleteAccount
} from './useKasperActions.js';

export function useKasperState() {
    return {
        // State
        db,
        account,
        currentAccountId,
        accountsList,
        dailyEntries,
        pairsConfig,
        currentMonth,
        metrics,

        // Actions
        init,
        loadPairs,
        updatePair,
        addPair,
        deletePair,
        loadAccountsList,
        loadAccount,
        switchAccount,
        addAccount,
        updateCapital,
        loadentries,
        saveDailyEntry,
        deleteAccount
    };
}
