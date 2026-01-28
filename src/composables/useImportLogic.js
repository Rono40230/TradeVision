import { ref, computed } from 'vue';
import { parseIbkrCsv, detectStrategies } from '../utils/ibkrParser.js';

export function useImportLogic() {
    const isDragging = ref(false);
    const file = ref(null);
    const rawContent = ref('');
    const parsingStatus = ref('idle');
    const parsedTrades = ref([]);
    const parsingError = ref(null);
    const sortDirection = ref('desc');
    const sortKey = ref('date');

    const toggleSort = (key) => {
        if (sortKey.value === key) {
            sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey.value = key;
            sortDirection.value = 'asc';
        }
    };

    const processFile = (fileObj) => {
        if (fileObj.type !== 'text/csv' && !fileObj.name.endsWith('.csv')) {
            return;
        }
        file.value = fileObj;
        parsingStatus.value = 'parsing';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            rawContent.value = e.target.result;
            setTimeout(() => {
                parsingStatus.value = 'success';
            }, 500);
        };
        reader.readAsText(fileObj);
    };

    const analyzeFile = () => {
        if (!rawContent.value) return;
        parsingError.value = null;
        try {
            const rawTrades = parseIbkrCsv(rawContent.value);
            parsedTrades.value = detectStrategies(rawTrades);
            parsingStatus.value = 'complete';
        } catch (e) {
            parsingError.value = "Erreur critique: " + e.message;
        }
    };

    const displayedTrades = computed(() => {
        const trades = [...parsedTrades.value];
        const parseDate = (d) => {
            if (!d || d === 'N/A') return 0;
            if (d.includes('/')) {
                const [day, month, year] = d.split('/').map(Number);
                return new Date(year, month - 1, day).getTime();
            }
            return isNaN(new Date(d).getTime()) ? 0 : new Date(d).getTime();
        };

        return trades.sort((a, b) => {
            let valA, valB;
            if (sortKey.value === 'date') {
                valA = parseDate(a.date);
                valB = parseDate(b.date);
            } else if (sortKey.value === 'symbol') {
                valA = (a.symbol || '').toLowerCase();
                valB = (b.symbol || '').toLowerCase();
            } else {
                valA = (a[sortKey.value] || '').toString().toLowerCase();
                valB = (b[sortKey.value] || '').toString().toLowerCase();
            }
            
            if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1;
            return 0;
        });
    });

    return {
        isDragging,
        file,
        rawContent,
        parsingStatus,
        parsedTrades,
        parsingError,
        sortKey,
        sortDirection,
        toggleSort,
        processFile,
        analyzeFile,
        displayedTrades
    };
}
