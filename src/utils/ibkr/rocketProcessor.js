import { STRATEGIES } from './constants.js';
import { parseFrDate } from './dateUtils.js';

/**
 * Traitement spécifique pour les Rockets (Actions)
 * Regroupe Achat -> Neutralisation -> Clôture sur une seule ligne basée sur la date d'achat.
 */
export function processRocketLifecycles(stockTrades) {
    if (!stockTrades || stockTrades.length === 0) return [];

    // 1. Tri chronologique indispensable pour reconstruire l'histoire
    stockTrades.sort((a, b) => parseFrDate(a.date) - parseFrDate(b.date));

    const rockets = [];
    const activePositions = new Map(); // Key: Symbol -> Position Object

    stockTrades.forEach(trade => {
        const symbol = trade.symbol;
        
        // Est-ce un Achat (Ouverture/Renfort) ou une Vente (Fermeture/Neutralisation) ?
        // NB: Quantité est signée (positive pour achat, négative pour vente)
        const isBuy = trade.quantity > 0;
        
        let position = activePositions.get(symbol);

        if (isBuy) {
            // ACHAT
            if (!position) {
                // Nouvelle Position Rocket
                position = {
                    ...trade,
                    id: `roc-${trade.symbol}-${Math.random().toString(36).substr(2,5)}`,
                    detectedStrategy: STRATEGIES.STOCK, // "Rockets" via la constante
                    description: `Rockets ${trade.symbol}`,
                    originalQuantity: trade.quantity, // On garde la trace de la taille initiale
                    currentQuantity: trade.quantity,  // Ce qui reste en main
                    totalRealizedPnl: 0, // Le P/L accumulé des ventes partielles
                    status: 'OPEN',
                    subTrades: [trade] // Historique interne
                };
                activePositions.set(symbol, position);
                rockets.push(position);
            } else {
                // Renfort (Pyramiding) : On ajoute à la position existante
                // On met à jour la ligne existante (celle de la date du 1er achat)
                position.quantity += trade.quantity;
                position.originalQuantity += trade.quantity;
                position.currentQuantity += trade.quantity;
                
                position.subTrades.push(trade);
            }
        } else {
            // VENTE (Neutralisation ou Clôture)
            if (position && position.currentQuantity > 0) {
                // On a une position ouverte, on tape dedans
                position.currentQuantity += trade.quantity; // trade.quantity est négatif
                position.totalRealizedPnl += (trade.realizedPnl || 0); // Accumule le P/L
                
                // Detection statut
                if (position.currentQuantity <= 0.01) { // Tolérance float
                    position.status = 'CLOSED';
                    position.currentQuantity = 0; // Clean
                    activePositions.delete(symbol); // On retire de la map des actifs
                    position.description = `Rockets ${trade.symbol} (Fermé)`;
                } else {
                    position.description = `Rockets ${trade.symbol} (Partiel)`;
                }
                
                // Mise à jour des champs d'affichage principaux
                position.proceeds += trade.proceeds; // On somme le cash flow
                // Le realizedPnl principal de l'objet doit refléter la somme totale
                position.realizedPnl = position.totalRealizedPnl;
                
                position.subTrades.push(trade);
            } else {
                // Vente orpheline (ex: Short ou fin de position d'avant l'historique)
                // On la traite comme un trade isolé
                rockets.push({
                    ...trade,
                    detectedStrategy: STRATEGIES.STOCK,
                    description: `Rockets ${trade.symbol} (Orphelin)`,
                    status: 'CLOSED' // Par défaut on considère ça comme un flux sortant fini
                });
            }
        }
    });

    return rockets;
}
