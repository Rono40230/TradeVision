import { describe, it, expect } from 'vitest';
import { reconcileTrades, detectStrategy, validateTrade } from '../../utils/ibReconciliation.js';

describe('IBSync Reconciliation', () => {
  
  describe('reconcileTrades', () => {
    it('should filter null/undefined trades', () => {
      const trades = [
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '2026-01-01' },
        null,
        undefined,
        { trade_id: '2', symbol: 'TSLA', side: 'SELL', quantity: 50, price: 250, open_date: '2026-01-02' }
      ];
      
      const result = reconcileTrades(trades.filter(Boolean), null);
      expect(result).toHaveLength(2);
    });

    it('should deduplicate by trade_id', () => {
      const trades = [
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '2026-01-01' },
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '2026-01-01' },
        { trade_id: '2', symbol: 'TSLA', side: 'SELL', quantity: 50, price: 250, open_date: '2026-01-02' }
      ];
      
      const result = reconcileTrades(trades, null);
      expect(result).toHaveLength(2);
      expect(result[0].trade_id).toBe('1');
    });

    it('should add strategy field', () => {
      const trades = [
        { trade_id: '1', symbol: 'AAPL', side: 'BUY', asset_class: 'STOCK', quantity: 100, price: 150, open_date: '2026-01-01' }
      ];
      
      const result = reconcileTrades(trades, null);
      expect(result[0]).toHaveProperty('strategy');
      expect(result[0].strategy).toBe('ROCKETS');
    });
  });

  describe('detectStrategy', () => {
    it('should detect ROCKETS for stock BUY', () => {
      const trade = { symbol: 'AAPL', asset_class: 'STOCK', side: 'BUY' };
      expect(detectStrategy(trade)).toBe('ROCKETS');
    });

    it('should detect ROCKETS for option BUY', () => {
      const trade = { symbol: 'AAPL 250221C150', asset_class: 'OPTION', side: 'BUY' };
      expect(detectStrategy(trade)).toBe('ROCKETS');
    });

    it('should detect WHEEL for call SELL', () => {
      const trade = { symbol: 'AAPL 250221C150', asset_class: 'OPTION', side: 'SELL' };
      expect(detectStrategy(trade)).toBe('WHEEL');
    });

    it('should detect WHEEL for put SELL', () => {
      const trade = { symbol: 'AAPL 250221P150', asset_class: 'OPTION', side: 'SELL' };
      expect(detectStrategy(trade)).toBe('WHEEL');
    });

    it('should detect PCS for put BUY', () => {
      const trade = { symbol: 'AAPL 250221P150', asset_class: 'OPTION', side: 'BUY' };
      expect(detectStrategy(trade)).toBe('PCS');
    });

    it('should return UNKNOWN for missing symbol', () => {
      const trade = { asset_class: 'STOCK', side: 'BUY' };
      expect(detectStrategy(trade)).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for unknown asset class', () => {
      const trade = { symbol: 'XYZ', asset_class: 'CRYPTO', side: 'BUY' };
      expect(detectStrategy(trade)).toBe('UNKNOWN');
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
        open_date: '2026-01-01'
      };
      
      const result = validateTrade(trade);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on missing trade_id', () => {
      const trade = { symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150, open_date: '2026-01-01' };
      const result = validateTrade(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing trade_id');
    });

    it('should fail on invalid side', () => {
      const trade = {
        trade_id: '1',
        symbol: 'AAPL',
        side: 'INVALID',
        quantity: 100,
        price: 150,
        open_date: '2026-01-01'
      };
      const result = validateTrade(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid side');
    });

    it('should return all errors', () => {
      const trade = {};
      const result = validateTrade(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });
});
