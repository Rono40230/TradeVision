import { describe, it, expect } from 'vitest';
import { reconcileTrades, detectStrategy, validateTrade } from '../../utils/ibReconciliation.js';

describe('IBSync Reconciliation', () => {
  
  describe('reconcileTrades', () => {
    it('should filter null/undefined trades', () => {
      const trades = [
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '01/01/2026' },
        null,
        undefined,
        { trade_id: '2', symbol: 'TSLA', side: 'SELL', quantity: 50, price: 250, open_date: '01/01/2026' }
      ];
      
      const result = reconcileTrades(trades);
      expect(result).toHaveLength(2);
    });

    it('should deduplicate by trade_id', () => {
      const trades = [
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '01/01/2026' },
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '01/01/2026' },
        { trade_id: '2', symbol: 'TSLA', side: 'SELL', quantity: 50, price: 250, open_date: '01/01/2026' }
      ];
      
      const result = reconcileTrades(trades);
      expect(result).toHaveLength(2);
      const ids = result.map(r => r.trade_id);
      expect(ids).toContain('1');
      expect(ids).toContain('2');
    });

    it('should add strategy field', () => {
      const trades = [
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', asset_class: 'STOCK', quantity: 100, price: 150, open_date: '01/01/2026' }
      ];
      
      const result = reconcileTrades(trades);
      expect(result[0]).toHaveProperty('strategy');
      expect(result[0].strategy).toBe('Rockets');
    });
  });

  describe('detectStrategy', () => {
    it('should detect Rockets for stock BUY', () => {
      const trade = { symbol: 'AAPL', asset_class: 'STOCK', side: 'BUY', open_date: '01/01/2026' };
      expect(detectStrategy(trade)).toBe('Rockets');
    });

    it('should detect Wheel for option SELL', () => {
      const trade = { symbol: 'AAPL 220224P150', asset_class: 'OPTION', side: 'SELL', type: 'P', open_date: '01/01/2026' };
      expect(detectStrategy(trade)).toBe('Wheel');
    });

    it('should detect pcs standard for vertical spread candidates', () => {
        const trades = [
            { trade_id: '1', date: '01/01/2026', symbol: 'AAPL', assetType: 'OPT', side: 'SELL', type: 'P', strike: 150, expiry: '2026-02-20', quantity: -1, price: 5, proceeds: 500 },
            { trade_id: '2', date: '01/01/2026', symbol: 'AAPL', assetType: 'OPT', side: 'BUY', type: 'P', strike: 145, expiry: '2026-02-20', quantity: 1, price: 2, proceeds: -200 }
        ];
        // Note: reconcileTrades handles the full array and detects strategies
        const result = reconcileTrades(trades);
        expect(result[0].strategy).toBe('pcs standard');
    });
  });

  describe('validateTrade', () => {
    it('should validate complete trade', () => {
      const trade = {
        trade_id: '1',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        price: 150,
        open_date: '01/01/2026'
      };
      
      const result = validateTrade(trade);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on missing trade_id', () => {
      const trade = { symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '01/01/2026' };
      const result = validateTrade(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing trade_id');
    });
  });
});
