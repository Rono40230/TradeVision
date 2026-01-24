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
