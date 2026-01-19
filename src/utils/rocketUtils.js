export function formatCurrency(value) {
    if (value === undefined || value === null) return '0.00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR').format(date);
}

export function getDteClass(dte) {
    if (dte <= 7) return 'dte-critical';
    if (dte <= 21) return 'dte-warning';
    return 'dte-safe';
}
