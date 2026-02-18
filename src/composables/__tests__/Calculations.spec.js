import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useAnalytics } from '../useAnalytics.js';

describe('Performance Calculations (useAnalytics)', () => {
    it('should calculate correct metrics for a simple set of trades', () => {
        const trades = ref([
            { realized_pnl: 100, open_date: '2026-01-01', close_date: '2026-01-05' }, // +100, 4 days
            { realized_pnl: -50, open_date: '2026-01-02', close_date: '2026-01-03' },  // -50, 1 day
            { realized_pnl: 200, open_date: '2026-01-10', close_date: '2026-01-12' }   // +200, 2 days
        ]);

        const { stats } = useAnalytics(trades);

        expect(stats.value.totalTrades).toBe(3);
        expect(stats.value.winRate).toBe(66.7);
        expect(stats.value.totalGains).toBe(300);
        expect(stats.value.totalLosses).toBe(50);
        expect(stats.value.profitFactor).toBe(6); // 300 / 50
        expect(stats.value.avgWin).toBe(150); // (100+200)/2
        expect(stats.value.avgLoss).toBe(50);
        expect(stats.value.avgHoldingTime).toBe(2.3); // (4+1+2)/3 = 2.33
    });

    it('should calculate win streaks correctly', () => {
        const trades = ref([
            { realized_pnl: 10, close_date: '2026-01-01' },
            { realized_pnl: 20, close_date: '2026-01-02' },
            { realized_pnl: -5, close_date: '2026-01-03' },
            { realized_pnl: 30, close_date: '2026-01-04' },
            { realized_pnl: 40, close_date: '2026-01-05' },
            { realized_pnl: 50, close_date: '2026-01-06' }
        ]);

        const { stats } = useAnalytics(trades);
        expect(stats.value.maxWinStreak).toBe(3); // The last 3 trades
    });

    it('should group monthly P/L correctly', () => {
        const trades = ref([
            { realized_pnl: 100, close_date: '2026-01-15' },
            { realized_pnl: 200, close_date: '2026-01-20' },
            { realized_pnl: 150, close_date: '2026-02-05' }
        ]);

        const { monthlyPL } = useAnalytics(trades);
        
        expect(monthlyPL.value).toHaveLength(2);
        expect(monthlyPL.value[0]).toEqual({ month: '2026-01', pnl: 300 });
        expect(monthlyPL.value[1]).toEqual({ month: '2026-02', pnl: 150 });
    });
});
