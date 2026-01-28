import { MONTHS_MAP } from './constants.js';

export function normalizeDate(rawDate, description) {
    let dateStr = rawDate;

    // 1. Si la date brute est vide ou invalide, on cherche dans la description
    if (!dateStr || dateStr === 'N/A' || dateStr.trim() === '') {
        if (description) {
            // Regex pour 19JUL24 ou 19JUL2024
            const match = description.match(/\b(\d{1,2})([A-Z]{3})(\d{2,4})\b/);
            if (match) {
                const day = match[1].padStart(2, '0');
                const month = MONTHS_MAP[match[2]];
                const year = match[3].length === 2 ? '20' + match[3] : match[3];
                if (month) return `${day}/${month}/${year}`;
            }
        }
        return 'N/A';
    }

    // Gestion du format DateTime IBKR avec heure (ex: 20240719;153000)
    if (dateStr.includes(';')) {
        dateStr = dateStr.split(';')[0];
    }
    
    // NOUVEAU FORMAT : 2024-06-20 095124 (YYYY-MM-DD HHMMSS)
    // On veut juste la date au format DD/MM/YYYY
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}\s\d{6}$/)) {
        const datePart = dateStr.split(' ')[0]; // 2024-06-20
        const [y, m, d] = datePart.split('-');
        return `${d}/${m}/${y}`;
    }

    // 2. Si on a une date brute, on essaie de la formater joli (YYYYMMDD -> DD/MM/YYYY)
    // Format IBKR Flex Query standard : 20240719 ou 2024-07-19
    if (dateStr.match(/^\d{8}$/)) {
        // YYYYMMDD
        const y = dateStr.substr(0, 4);
        const m = dateStr.substr(4, 2);
        const d = dateStr.substr(6, 2);
        return `${d}/${m}/${y}`;
    }
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return dateStr;
}

export const parseFrDate = (d) => {
    if (!d || d === 'N/A') return 0;
    // Support hybride Date
    if (d.includes('-')) return new Date(d).getTime();
    if (d.includes('/')) {
        const [day, month, year] = d.split('/').map(Number);
        return new Date(year, month - 1, day).getTime();
    }
    return 0;
};
