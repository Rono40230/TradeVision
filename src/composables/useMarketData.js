// Service de données de marché via Yahoo Finance (Tauri Backend)
import { invoke } from '@tauri-apps/api/core';

/**
 * Récupère les prix pour une liste de symboles.
 * Tente d'abord Binance (API Public) puis fallback sur Yahoo (Tauri).
 * @param {string[]} symbols - Liste des tickers (ex: ['BTCUSDT', 'EURUSD=X'])
 * @returns {Promise<Object>} Map de { symbol: { price: number } }
 */
export async function fetchPrices(symbols) {
    if(!symbols || symbols.length === 0) return {};

    // Deduplicate
    const uniqueSymbols = [...new Set(symbols)];
    const prices = {};
    const yahooSymbols = [];

    // Séparer les requêtes Binance (Crypto) vs Yahoo (Stocks/Forex/Options)
    // On considère comme "Crypto" ce qui ressemble à des paires USDT/USDC ou coins connus
    // Convention Rocket: Crypto souvent en XXXUSDT
    const cryptoSymbols = [];
    
    uniqueSymbols.forEach(s => {
        // Détection simple: Contient USDT, USDC ou BTC/ETH... 
        // Ou si l'utilisateur a entré "BTC/USD"
        const clean = s.replace('/', '').toUpperCase();
        if (clean.endsWith('USDT') || clean.endsWith('USDC') || clean.endsWith('BUSD')) {
            cryptoSymbols.push(clean);
        } else {
            // Tout ce qui n'est pas explicitement crypto-like va vers Yahoo
            yahooSymbols.push(s);
        }
    });

    // 1. Fetch Binance Direct (HTTP REST)
    if (cryptoSymbols.length > 0) {
        try {
            // Binance public ticker endpoint (24hr stats pour avoir le change_percent)
            // https://api.binance.com/api/v3/ticker/24hr
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            if (response.ok) {
                const data = await response.json();
                // data est [{ symbol: 'BTCUSDT', lastPrice: '40000.00', priceChangePercent: '2.5' }, ...]
                
                cryptoSymbols.forEach(target => {
                    const found = data.find(item => item.symbol === target);
                    if (found) {
                        const original = uniqueSymbols.find(u => u.replace('/', '').toUpperCase() === target);
                        if (original) {
                            prices[original] = { 
                                price: parseFloat(found.lastPrice),
                                change_percent: parseFloat(found.priceChangePercent)
                            };
                        }
                    } else {
                        // fallback Yahoo
                        yahooSymbols.push(uniqueSymbols.find(u => u.replace('/', '').toUpperCase() === target));
                    }
                });
            }
        } catch (e) {
            // En cas d'erreur réseau Binance, fallback tout sur Yahoo
            uniqueSymbols.forEach(s => {
                if(cryptoSymbols.some(c => s.includes(c))) yahooSymbols.push(s);
            });
        }
    }

    // 2. Fetch Yahoo (Reste) via Backend Rust
    if (yahooSymbols.length > 0) {
        try {
            const yPrices = await invoke('fetch_market_quotes', { symbols: yahooSymbols });
            Object.assign(prices, yPrices);
        } catch (e) {
           // Silent
        }
    }

    return prices;
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
