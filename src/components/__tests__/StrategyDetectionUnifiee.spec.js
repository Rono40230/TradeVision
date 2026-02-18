import { describe, it, expect } from 'vitest';
import { detectStrategies } from '../../utils/ibkr/strategyDetector.js';
import { STRATEGIES } from '../../utils/ibkr/constants.js';

describe('Unified Strategy Detector', () => {
    it('should detect ROCKETS for stock trades', () => {
        const executions = [
            { id: '1', date: '01/01/2026', symbol: 'AAPL', assetType: 'STK', side: 'BUY', quantity: 100, price: 150, proceeds: -15000, commission: -1 }
        ];
        const result = detectStrategies(executions);
        expect(result[0].detectedStrategy).toBe('Rockets');
    });

    it('should detect WHEEL for a Sold Put', () => {
        const executions = [
            { id: '2', date: '01/01/2026', symbol: 'AAPL', assetType: 'OPT', side: 'SELL', type: 'P', strike: 140, expiry: '2026-02-20', quantity: -1, price: 2.5, proceeds: 250, commission: -0.5 }
        ];
        const result = detectStrategies(executions);
        expect(result[0].detectedStrategy).toBe('Wheel');
    });

    it('should detect COVERED_CALL when stock and short call are traded together', () => {
        const executions = [
            { id: '3', date: '01/01/2026', symbol: 'TSLA', assetType: 'STK', side: 'BUY', quantity: 100, price: 200, proceeds: -20000, commission: -1 },
            { id: '4', date: '01/01/2026', symbol: 'TSLA', assetType: 'OPT', side: 'SELL', type: 'C', strike: 210, expiry: '2026-02-20', quantity: -1, price: 5, proceeds: 500, commission: -0.5 }
        ];
        const result = detectStrategies(executions);
        // The detector should group these into one Covered Call
        expect(result).toHaveLength(1);
        expect(result[0].detectedStrategy).toBe(STRATEGIES.COVERED_CALL);
    });

    it('should detect VERTICAL_SPREAD for two options same expiry different strike', () => {
        const executions = [
            { id: '5', date: '01/01/2026', symbol: 'NVDA', assetType: 'OPT', side: 'SELL', type: 'P', strike: 495, expiry: '2026-02-20', quantity: -10, price: 10, proceeds: 10000, commission: -5 },
            { id: '6', date: '01/01/2026', symbol: 'NVDA', assetType: 'OPT', side: 'BUY', type: 'P', strike: 490, expiry: '2026-02-20', quantity: 10, price: 5, proceeds: -5000, commission: -5 }
        ];
        const result = detectStrategies(executions);
        expect(result).toHaveLength(1);
        expect(result[0].detectedStrategy).toBe('pcs standard');
    });

    it('should detect IRON_CONDOR for combined puts and calls spreads', () => {
        const executions = [
            // PCS
            { id: '11', date: '01/01/2026', symbol: 'SPY', assetType: 'OPT', side: 'SELL', type: 'P', strike: 400, expiry: '2026-02-20', quantity: -1, price: 5, proceeds: 500 },
            { id: '12', date: '01/01/2026', symbol: 'SPY', assetType: 'OPT', side: 'BUY', type: 'P', strike: 395, expiry: '2026-02-20', quantity: 1, price: 2, proceeds: -200 },
            // CCS
            { id: '13', date: '01/01/2026', symbol: 'SPY', assetType: 'OPT', side: 'SELL', type: 'C', strike: 450, expiry: '2026-02-20', quantity: -1, price: 5, proceeds: 500 },
            { id: '14', date: '01/01/2026', symbol: 'SPY', assetType: 'OPT', side: 'BUY', type: 'C', strike: 455, expiry: '2026-02-20', quantity: 1, price: 2, proceeds: -200 }
        ];
        const result = detectStrategies(executions);
        expect(result[0].detectedStrategy).toBe('pcs iron condor');
    });
});
