// Service de données de marché via Yahoo Finance (Tauri Backend)
import { invoke } from '@tauri-apps/api/core';

/**
 * Récupère les prix pour une liste de symboles.
 * @param {string[]} symbols - Liste des tickers (ex: ['AAPL', 'EURUSD=X'])
 * @returns {Promise<Object>} Map de { symbol: price }
 */
export async function fetchPrices(symbols) {
    if(!symbols || symbols.length === 0) return {};

    // Deduplicate
    const uniqueSymbols = [...new Set(symbols)];

    try {
        const prices = await invoke('fetch_market_quotes', { symbols: uniqueSymbols });
        return prices;
    } catch (e) {
        return {};
    }
}

/**
 * Formate un symbole Forex pour Yahoo (ex: EURUSD -> EURUSD=X)
 * @param {string} pair 
 * @returns 
 */
export function formatForexSymbol(pair) {
    // Si contient déjà =, on ne touche pas
    if(pair.includes('=')) return pair;
    // Si c'est une paire classique (6 lettres), on ajoute =X
    // Attention c'est simpliste, mais efficace pour 99% des cas "EURUSD", "GBPUSD"
    if(/^[A-Z]{6}$/.test(pair)) {
        return pair + '=X';
    }
    return pair;
}

export async function calculatePipValues(pairsConfig, onUpdate) {
    const symbolsToFetch = new Set();
    
    pairsConfig.forEach(p => {
        const pair = p.symbol;
        if(pair.length !== 6) return;
        
        const quote = pair.substring(3, 6);
        
        symbolsToFetch.add(formatForexSymbol(pair));
        if(quote !== 'USD') {
            symbolsToFetch.add(formatForexSymbol(`${quote}USD`));
            symbolsToFetch.add(formatForexSymbol(`USD${quote}`));
        }
    });

    const prices = await fetchPrices(Array.from(symbolsToFetch));
    
    // Calculate and Mutate
    pairsConfig.forEach(p => {
        const pair = p.symbol;
        if(pair.length !== 6) return;
        
        const quote = pair.substring(3, 6);
        let val = 10; 

        if (quote !== 'USD') {
            const qUsd = prices[`${quote}USD=X`];
            if (qUsd && qUsd.price) {
                val = 10 * qUsd.price;
            } else {
                const usdQ = prices[`USD${quote}=X`] || prices[`${pair}=X`]; 
                if (usdQ && usdQ.price) {
                    val = 10 / usdQ.price;
                }
            }
        }

        if (quote === 'JPY') {
            val *= 100;
        }
        
        if (val && Math.abs(p.pip_value - val) > 0.01) {
            p.pip_value = parseFloat(val.toFixed(2));
            if(onUpdate) onUpdate(p);
        }
    });
}
