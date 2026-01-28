import { STRATEGIES } from './constants.js';
import { processRocketLifecycles } from './rocketProcessor.js';
import { parseFrDate } from './dateUtils.js';

function isOppositeSide(side1, side2) {
    const s1 = (side1 === 'BUY' || side1 === 'BOT') ? 1 : -1;
    const s2 = (side2 === 'BUY' || side2 === 'BOT') ? 1 : -1;
    return s1 !== s2;
}

/**
 * Analyse "intelligente" pour deviner les stratégies
 * Regroupe les transactions d'une même journée en stratégies complexes (Spreads, IC, etc.)
 */
export function detectStrategies(executions) {
    // 1. Groupement par Date et Symbole
    const dailyGroups = new Map();

    executions.forEach(exec => {
        const key = `${exec.date}|${exec.symbol}`;
        if (!dailyGroups.has(key)) {
            dailyGroups.set(key, []);
        }
        dailyGroups.get(key).push(exec);
    });

    const finalStrategies = [];
    const unprocessedStocks = []; // Stockage des actions non utilisées dans des Covered Calls

    // 2. Analyse de chaque groupe journalier
    dailyGroups.forEach((groupTrades, key) => {
        // Séparer Actions et Options
        const stocks = groupTrades.filter(t => t.assetType === 'STK');
        const options = groupTrades.filter(t => t.assetType === 'OPT');

        // --- Stratégie 1: Covered Call ---
        let coveredCallStocks = [];
        if (stocks.length > 0 && options.length > 0) {
            const shortCalls = options.filter(o => o.type === 'C' && (o.side === 'SELL' || o.side === 'SLD'));
            const longStocks = stocks.filter(s => s.side === 'BUY' || s.side === 'BOT');

            if (shortCalls.length > 0 && longStocks.length > 0) {
                // On considère que c'est un Covered Call global pour la journée
                finalStrategies.push({
                    id: `cc-${key}-${Math.random().toString(36).substr(2,5)}`,
                    date: groupTrades[0].date,
                    symbol: groupTrades[0].symbol,
                    detectedStrategy: STRATEGIES.COVERED_CALL,
                    description: `Covered Call ${groupTrades[0].symbol}`,
                    legs: [...longStocks, ...shortCalls],
                    quantity: Math.min(longStocks.length, shortCalls.length),
                    price: 0,
                    proceeds: groupTrades.reduce((sum, t) => sum + t.proceeds, 0),
                    commission: groupTrades.reduce((sum, t) => sum + t.commission, 0),
                    side: 'Complex',
                    strike: shortCalls[0].strike, // Strike du short call
                    expiry: shortCalls[0].expiry
                });
                coveredCallStocks = longStocks; // On marque ces stocks comme utilisés
                
                // On return ici pour la daily loop, MAIS attention aux autres options non utilisées (ex: spreads + stock)
                // Simplification : si CC détecté, on assume que tout le groupe est consommé pour l'instant
                return; 
            }
        }
        
        // --- Collecte des stocks NON utilisés ---
        stocks.forEach(stk => {
            if (!coveredCallStocks.includes(stk)) {
                unprocessedStocks.push(stk);
            }
        });

        // --- Stratégie 2: Vertical Spreads (Options pures) ---
        // Même expiration, Même Type (Call/Put), Strikes différents, Sens Opposés
        if (options.length === 2) {
            const leg1 = options[0];
            const leg2 = options[1];

            if (leg1.assetType === 'OPT' && leg2.assetType === 'OPT' &&
                leg1.expiry === leg2.expiry &&
                leg1.type === leg2.type && // Tous les deux Calls ou Puts
                leg1.strike !== leg2.strike &&
                isOppositeSide(leg1.side, leg2.side)) {
                
                finalStrategies.push({
                    id: `vs-${key}`,
                    date: leg1.date,
                    symbol: leg1.symbol,
                    detectedStrategy: STRATEGIES.VERTICAL_SPREAD,
                    description: `Vertical Spread ${leg1.type} ${leg1.expiry}`,
                    legs: [leg1, leg2],
                    quantity: Math.min(Math.abs(leg1.quantity), Math.abs(leg2.quantity)),
                    proceeds: leg1.proceeds + leg2.proceeds,
                    commission: leg1.commission + leg2.commission,
                    side: (leg1.proceeds + leg2.proceeds) > 0 ? 'CREDIT' : 'DEBIT',
                    strike: `${Math.min(leg1.strike, leg2.strike)} / ${Math.max(leg1.strike, leg2.strike)}`,
                    expiry: leg1.expiry,
                    type: leg1.type // Indispensable pour distinguer PCS de CCS plus tard
                });
                return;
            }
        }

        // --- Stratégie 3: Iron Condor / Strangle (4 pattes ou 2 pattes mixtes) ---
        
        // Si aucune stratégie complexe trouvée, on retourne les trades individuels tels quels
        const remainingOptions = options; // Les stocks sont gérés au dessus (ou ici si pas de CC)

        remainingOptions.forEach(trade => {
            // Détection basique unitaire pour les Options
            let strat = STRATEGIES.UNKNOWN;
            if (trade.assetType === 'OPT') {
               if (trade.type === 'P') strat = (trade.side === 'SELL' || trade.side === 'SLD') ? STRATEGIES.SHORT_PUT : STRATEGIES.LONG_PUT;
               else strat = (trade.side === 'SELL' || trade.side === 'SLD') ? STRATEGIES.SHORT_CALL : STRATEGIES.LONG_CALL;
            }

            finalStrategies.push({
                ...trade,
                detectedStrategy: strat
            });
        });
    });
    
    // --- Phase 2.5 : Traitement global des Rockets (Stocks) ---
    const rocketStrategies = processRocketLifecycles(unprocessedStocks);
    finalStrategies.push(...rocketStrategies);
    
    // --- Phase 3 : Regroupement Ultime par Date/Symbole/Stratégie Générale ---
    // Cette étape assure qu'il n'y ait qu'une seule ligne par "Concept"
    const ultraCompactStrategies = new Map();

    finalStrategies.forEach(strat => {
        // Nettoyage de la date pour le regroupement : On ne garde que la date, on ignore l'heure
        // Format supporté : "2024-06-20 09:51:24" -> "2024-06-20"
        const cleanDateKey = strat.date.includes(' ') ? strat.date.split(' ')[0] : strat.date;

        // Clé de fusion : Si même date, même symbole, et que ce sont des "Vertical Spread" -> on fusionne
        // Ou si c'est le même type de stratégie unitaire
        let mergeKey = `${cleanDateKey}|${strat.symbol}|${strat.detectedStrategy}`;
        
        // Cas spécifique Vertical Spread : on veut fusionner TOUS les vertical spreads du même jour/symbol/type
        if (strat.detectedStrategy === STRATEGIES.VERTICAL_SPREAD) {
             // On ajoute le type ( Put ou Call ) pour ne pas mélanger des Call Spreads et Put Spreads
             mergeKey = `${cleanDateKey}|${strat.symbol}|ALL_SPREADS|${strat.type}`;
        }

        if (ultraCompactStrategies.has(mergeKey)) {
            const existing = ultraCompactStrategies.get(mergeKey);
            
            // On enrichit la description et on somme les valeurs
            existing.quantity += strat.quantity;
            existing.proceeds += strat.proceeds;
            existing.commission += strat.commission;
            // Somme P/L Réalisé
            existing.realizedPnl = (existing.realizedPnl || 0) + (strat.realizedPnl || 0);

            // Fusion des strikes pour affichage
            const s1 = String(existing.strike);
            const s2 = String(strat.strike);
            
            if (s1 !== s2) {
                // Éviter les doublons dans l'affichage des strikes '195/200, 195/200' -> '195/200'
                if (!s1.includes(s2)) {
                    existing.strike = `${s1}, ${s2}`;
                }
            }
            
        } else {
            // Avant d'ajouter, on nettoie le nom "Vertical Spread" pour être plus précis (Put Credit Spread / Debit Spread)
            if (strat.detectedStrategy === STRATEGIES.VERTICAL_SPREAD) {
                if (strat.type === 'P') {
                    strat.detectedStrategy = (strat.proceeds > 0) ? 'Put Credit Spread' : 'Put Debit Spread';
                } else if (strat.type === 'C') {
                    strat.detectedStrategy = (strat.proceeds > 0) ? 'Call Credit Spread' : 'Call Debit Spread';
                }
            }
            ultraCompactStrategies.set(mergeKey, strat);
        }
    });

    const dedupedStrategies = Array.from(ultraCompactStrategies.values());
    
    // --- Phase 4 : Application des Règles Métier "Rocket Trading" & Fusion Iron Condor ---
    const mappedStrategies = [];

    // Etape 4a : Renommage initial
    const renamed = dedupedStrategies.map(strat => {
        let name = strat.detectedStrategy;

        // RÈGLE 1 : WHEEL & PROTECTION
        if (name === STRATEGIES.SHORT_PUT || name === STRATEGIES.COVERED_CALL || name === STRATEGIES.SHORT_CALL ||
            name === STRATEGIES.LONG_CALL || name === STRATEGIES.LONG_PUT) {
            name = 'Wheel';
        }

        // RÈGLE 2 : ROCKETS vs WHEEL (Assignation)
        if (name === STRATEGIES.STOCK) {
             // 1. Analyse Description
            const desc = (strat.description || '').toLowerCase();
            const legs = strat.legs || [];
            
            // 2. Analyse jambes (si regroupement complexe détecté en amont)
            const hasOptionLeg = legs.some(l => l.assetType === 'OPT');
            
            // Détection intelligente des assignations IBKR et des Buy-Writes
            if (desc.includes('assign') || desc.includes('exercise') || desc.includes('expiration') || hasOptionLeg) {
                name = 'Wheel';
            } else {
                name = 'Rockets';
            }
        }

        // RÈGLE 3 : PCS STANDARD
        if (name === 'Put Credit Spread' || name === 'Call Credit Spread' || name === 'Call Debit Spread' || name === 'Put Debit Spread') {
            name = 'pcs standard'; // minuscule comme demandé
        }

        // RÈGLE 4 : CONVERSION DEVISE
        if (name === STRATEGIES.UNKNOWN && (strat.assetType === 'CASH' || strat.symbol.includes('.'))) {
            name = 'Change devise';
        }
        
        return { ...strat, detectedStrategy: name };
    });

    // Etape 4b : Fusion Intelligente (PCS + CCS = Iron Condor)
    const groupBySymbolDate = new Map();
    
    renamed.forEach(strat => {
        const key = `${strat.date}|${strat.symbol}`;
        if (!groupBySymbolDate.has(key)) groupBySymbolDate.set(key, []);
        groupBySymbolDate.get(key).push(strat);
    });

    groupBySymbolDate.forEach((strats) => {
        // On cherche s'il y a un PCS Standard ET un Call Credit Spread
        const pcs = strats.find(s => s.detectedStrategy === 'pcs standard');
        const ccs = strats.find(s => s.detectedStrategy === 'Call Credit Spread');

        if (pcs && ccs) {
            // VICTOIRE : C'est un Iron Condor (pcs iron condor)
            const ic = {
                ...pcs,
                detectedStrategy: 'pcs iron condor',
                proceeds: pcs.proceeds + ccs.proceeds,
                commission: pcs.commission + ccs.commission,
                legs: [...(pcs.legs || []), ...(ccs.legs || [])],
                strike: `${pcs.strike} / ${ccs.strike}`, // ex: 195/200 / 210/215
                description: `Iron Condor ${pcs.symbol}`
            };
            mappedStrategies.push(ic);
            
            // On ajoute les autres stratégies qui ne sont NI pc NI ccs
            strats.forEach(s => {
                if (s !== pcs && s !== ccs) mappedStrategies.push(s);
            });

        } else {
            strats.forEach(s => {
                mappedStrategies.push(s);
            });
        }
    });

    return mappedStrategies.sort((a, b) => parseFrDate(b.date) - parseFrDate(a.date));
}
