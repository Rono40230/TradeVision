export const STRATEGIES = {
    UNKNOWN: 'Inconnu',
    STOCK: 'Rockets',
    LONG_CALL: 'Long Call',
    LONG_PUT: 'Long Put',
    SHORT_CALL: 'Naked Call',
    SHORT_PUT: 'Naked Put',
    COVERED_CALL: 'Covered Call',
    VERTICAL_SPREAD: 'Vertical Spread',
    IRON_CONDOR: 'Iron Condor',
    STRANGLE: 'Strangle',
    STRADDLE: 'Straddle',
    WHEEL: 'The Wheel'
};

export const MONTHS_MAP = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
};

export const CSV_MEADERS_MAP = {
    symbol: ['Symbol', 'LocalSymbol', 'Symbole', 'Financial Instrument'],
    underlying: ['UnderlyingSymbol', 'Underlying', 'Sous-jacent'],
    assetClass: ['AssetClass', 'Asset Class', 'Type', 'Classe'],
    description: ['Description', 'Desc', 'Description du titre'],
    dateTime: ['Date/Time', 'Date', 'TradeDate', 'Trade Date', 'Time', 'Day', 'Date/Heure', 'Date des échanges', 'Heure', 'DateTime'],
    side: ['Buy/Sell', 'Side', 'Action', 'B/S', 'Achat/Vente'],
    quantity: ['Quantity', 'Qty', 'Quantité', 'Qté'],
    price: ['TradePrice', 'Price', 'Prix', 'T. Price', 'Cours', 'Unit Price'],
    strike: ['Strike', 'Strk', 'Prix d\'exercice'],
    expiry: ['Expiry', 'Exp', 'Expiration', 'Date d\'expiration'],
    putCall: ['Put/Call', 'P/C', 'Type', 'Droit'],
    tradeId: ['TradeID', 'IBExecutionID', 'ID', 'Réf. Exécution'],
    commission: ['IBCommission', 'Commission', 'Comm', 'Commissions'],
    multiplier: ['Multiplier', 'Mult', 'Multiplicateur'],
    proceeds: ['Proceeds', 'NetCash', 'Montant'],
    realizedPnl: ['FifoPnlRealized', 'RealizedP/L', 'Realized P/L', 'P/L Réalisé'],
    costBasis: ['CostBasis', 'Cost Basis', 'Prix de Revient'],
    openClose: ['Open/CloseIndicator', 'Open/Close', 'O/C'],
    notes: ['Notes/Codes', 'Notes', 'Code']
};
