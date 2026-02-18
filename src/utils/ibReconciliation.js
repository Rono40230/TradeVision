import { detectStrategies } from './ibkr/strategyDetector.js';

/**
 * Réconciliation trades IB Gateway
 * - Détection stratégies automatique via le moteur unifié
 */

/**
 * Réconcilie et prépare les trades pour stockage
 * @param {Array} trades - Trades bruts d'IB
 * @returns {Array} Trades prêts à être sauvegardés
 */
export function reconcileTrades(trades) {
  if (!trades || !Array.isArray(trades)) {
    return [];
  }

  // 1. Déduplique par trade_id
  const seen = new Set();
  const deduped = trades.filter(trade => {
    if (!trade) return false;
    const id = trade.trade_id || trade.id;
    if (!id) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // 2. Mapper au format attendu par le détecteur si nécessaire
  const mapped = deduped.map(t => ({
    id: t.trade_id || t.id,
    date: t.open_date || t.date,
    symbol: t.symbol,
    assetType: t.asset_class === 'STOCK' || t.assetType === 'STK' ? 'STK' : 'OPT',
    side: t.side,
    quantity: t.quantity,
    price: t.price || t.price_avg,
    commission: t.commission || 0,
    realizedPnl: t.realized_pnl || t.realizedPnl || 0,
    strike: t.strike,
    expiry: t.expiry
  }));

  // 3. Détecte stratégies via le moteur complexe
  const strategies = detectStrategies(mapped);

  // 4. Assurer compatibilité avec anciens composants (renommer id -> trade_id et detectedStrategy -> strategy)
  return strategies.map(s => ({
    ...s,
    trade_id: s.id,
    strategy: s.detectedStrategy
  }));
}

/**
 * Détecte la stratégie pour un trade unique
 */
export function detectStrategy(trade) {
  if (!trade) return 'UNKNOWN';

  // Préparation d'une transaction unique pour le moteur de détection
  const mapped = {
    id: trade.trade_id || trade.id,
    date: trade.open_date || trade.date || new Date().toISOString(),
    symbol: trade.symbol,
    assetType: trade.asset_class === 'STOCK' || trade.assetType === 'STK' ? 'STK' : 'OPT',
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price || trade.price_avg,
    type: trade.type || (trade.symbol && trade.symbol.includes('P') ? 'P' : 'C'), // Détection type si option
    strike: trade.strike,
    expiry: trade.expiry,
    proceeds: trade.proceeds || (trade.quantity * trade.price) || 0
  };

  const result = detectStrategies([mapped]);
  return result.length > 0 ? result[0].detectedStrategy : 'UNKNOWN';
}

/**
 * Valide l'intégrité d'un trade avant l'insertion
 * - Vérifie la présence des champs obligatoires
 * - Valide la cohérence mathématique (P/L)
 * - Valide la chronologie
 */
export function validateTrade(trade) {
  const errors = [];
  const warnings = [];

  const id = trade.trade_id || trade.id;
  if (!id) errors.push('Missing trade_id');
  if (!trade.symbol) errors.push('Missing symbol');

  // 3. Positivity
  const qty = Math.abs(trade.quantity || 0);
  const openPrice = trade.open_price || 0;
  const closePrice = trade.close_price || trade.price || trade.price_avg || 0;
  const comm = trade.commission || 0;
  const pnl = trade.realized_pnl || trade.realizedPnl || 0;

  if (qty <= 0) errors.push('Quantity must be positive');
  if (openPrice <= 0 && closePrice <= 0) errors.push('Price must be positive');
  if (comm < 0) errors.push('Commission cannot be negative');

  // 2. Chronology: close_date >= open_date
  const openDate = trade.open_date || trade.date;
  const closeDate = trade.close_date;

  if (!openDate) {
    errors.push('Missing open_date');
  } else if (closeDate && new Date(closeDate) < new Date(openDate)) {
    errors.push('Close date cannot be before open date');
  }

  // 1. P/L consistency: check if realized_pnl is approximately (close_price - open_price) * qty - commission
  // If there is a big divergence (> 1$), add a warning.
  if (openPrice > 0 && closePrice > 0 && qty > 0) {
    const isOption = (trade.asset_class === 'OPTION' || trade.assetType === 'OPT' || (trade.symbol && trade.symbol.length > 6 && /\d/.test(trade.symbol)));
    const multiplier = isOption ? 100 : 1;
    const expectedPnl = (closePrice - openPrice) * qty * multiplier - comm;

    if (Math.abs(expectedPnl - pnl) > 1.0) {
      warnings.push(`P/L discrepancy: calculated ${expectedPnl.toFixed(2)} vs reported ${pnl.toFixed(2)}`);
    }
  }

  const side = (trade.side || '').toUpperCase();
  if (side && !['BUY', 'SELL', 'BOT', 'SLD'].includes(side)) {
    errors.push('Invalid side');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
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
