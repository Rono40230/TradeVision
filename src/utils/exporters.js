/**
 * Utility to export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - Map of keys to display names
 * @param {String} filename - Name of the file
 */
export function exportToCSV(data, headers, filename = 'export.csv') {
    if (!data || !data.length) return;

    const columnKeys = Object.keys(headers);
    const headerRow = columnKeys.map(key => `"${headers[key]}"`).join(',');
    
    const dataRows = data.map(item => {
        return columnKeys.map(key => {
            let val = item[key];
            if (val === null || val === undefined) val = '';
            // Escape double quotes
            val = val.toString().replace(/"/g, '""');
            return `"${val}"`;
        }).join(',');
    });

    const csvContent = [
        `# Export Date: ${new Date().toLocaleString()}`,
        `# Total Records: ${data.length}`,
        headerRow,
        ...dataRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
