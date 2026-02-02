/**
 * Réconciliation trades IB Gateway
 * - Dédupliquage
 * - Détection stratégies automatique
 */

/**
 * Réconcilie et prépare les trades pour stockage
 * @param {Array} trades - Trades bruts d'IB (depuis Rust parser)
 * @param {Object} db - Instance Database (pour vérifier doublons)
 * @returns {Array} Trades prêts à être sauvegardés
 */
export function reconcileTrades(trades, db) {
  if (!trades || !Array.isArray(trades)) {
    return [];
  }

  // 1. Déduplique par trade_id (clé unique IB)
  const seen = new Set();
  const deduped = trades.filter(trade => {
    if (!trade.trade_id) return false;
    if (seen.has(trade.trade_id)) return false;
    seen.add(trade.trade_id);
    return true;
  });

  // 2. Détecte stratégies automatiquement
  const reconciled = deduped.map(trade => ({
    ...trade,
    strategy: detectStrategy(trade)
  }));

  return reconciled;
}

/**
 * Détecte la stratégie basée sur le symbole et l'asset class
 * Logique :
 * - ROCKET: Stock BUY ou Option BUY
 * - WHEEL: Put SELL (covered call equivalent) ou Call SELL
 * - PCS: Put spread (long put + short put)
 */
export function detectStrategy(trade) {
  if (!trade || !trade.symbol) {
    return 'UNKNOWN';
  }

  const symbol = trade.symbol.toUpperCase();
  const assetClass = (trade.asset_class || '').toUpperCase();
  const side = (trade.side || '').toUpperCase();

  // Stock trades = Rockets
  if (assetClass === 'STOCK') {
    return 'ROCKETS';
  }

  // Option logic
  if (assetClass === 'OPTION') {
    const isCall = symbol.includes('C') && hasValidStrike(symbol);
    const isPut = symbol.includes('P') && hasValidStrike(symbol);

    // SELL Call = part of Wheel
    if (isCall && side === 'SELL') {
      return 'WHEEL';
    }

    // BUY Call = Rocket  
    if (isCall && side === 'BUY') {
      return 'ROCKETS';
    }

    // SELL Put = Wheel (Put Credit Spread)
    if (isPut && side === 'SELL') {
      return 'WHEEL';
    }

    // BUY Put = PCS or protective (assume PCS)
    if (isPut && side === 'BUY') {
      return 'PCS';
    }
  }

  // Fallback
  return 'UNKNOWN';
}

/**
 * Vérifie si le symbole contient un strike valide
 * Format IB : AAPL 250221C150 ou similaire
 */
function hasValidStrike(symbol) {
  // Recherche pattern: 6 chiffres (date) + C/P + prix
  const strikePattern = /\d{6}[CP]\d+/;
  return strikePattern.test(symbol);
}

/**
 * Enrichit un trade avec métadonnées calculées
 * (appelé optionnellement avant save)
 */
export function enrichTrade(trade) {
  return {
    ...trade,
    // Ajouter des champs calculés si besoin
    // ex: daysHeld, annualizedReturn, etc
  };
}

/**
 * Valide intégrité d'un trade avant insert
 */
export function validateTrade(trade) {
  const errors = [];

  if (!trade.trade_id) errors.push('Missing trade_id');
  if (!trade.symbol) errors.push('Missing symbol');
  if (trade.quantity === undefined || trade.quantity === null) errors.push('Missing quantity');
  if (trade.price === undefined || trade.price === null) errors.push('Missing price');
  if (!trade.open_date) errors.push('Missing open_date');
  if (!['BUY', 'SELL'].includes((trade.side || '').toUpperCase())) errors.push('Invalid side');

  return {
    isValid: errors.length === 0,
    errors
  };
}
