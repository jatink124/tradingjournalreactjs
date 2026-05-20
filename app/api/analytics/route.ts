import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function parseNumber(value: unknown, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/₹|,/g, '').trim();
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

function parseDateString(value: string): Date | null {
    const trimmed = value.trim();
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;

    const normalized = trimmed.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    const match = normalized.match(/^([0-9]{1,4})[\/\-. ]([0-9]{1,2})[\/\-. ]([0-9]{2,4})(?:\s+([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?(?:\s*(AM|PM|am|pm))?)?$/);
    if (!match) return null;

    let [_, part1, part2, part3, hour = '0', minute = '0', second = '0', ampm] = match;
    let day = Number(part1);
    let month = Number(part2);
    let year = Number(part3);

    if (year < 100) year += 2000;
    if (part1.length === 4) {
        year = Number(part1);
        month = Number(part2);
        day = Number(part3);
    } else if (year >= 1000) {
        if (day > 12) {
            // likely dd/mm/yyyy
        } else if (month > 12) {
            const tmp = day;
            day = month;
            month = tmp;
        }
    }

    if (ampm) {
        let h = Number(hour);
        if (/pm/i.test(ampm) && h < 12) h += 12;
        if (/am/i.test(ampm) && h === 12) h = 0;
        hour = String(h);
    }

    const date = new Date(year, month - 1, day, Number(hour), Number(minute), Number(second));
    return isNaN(date.getTime()) ? null : date;
}

function sameCalendarDate(dateA: Date, dateB: Date) {
    return dateA.getFullYear() === dateB.getFullYear()
        && dateA.getMonth() === dateB.getMonth()
        && dateA.getDate() === dateB.getDate();
}

function filterEntriesByDate(entries: any[], dateString: string) {
    const targetDate = parseDateString(dateString);
    if (!targetDate) return entries;

    return entries.filter(entry => {
        if (!entry.timestamp_str) return false;
        const entryDate = parseDateString(String(entry.timestamp_str));
        return entryDate ? sameCalendarDate(entryDate, targetDate) : false;
    });
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const analysisType = searchParams.get('type') || 'overview';
    const dateFilter = searchParams.get('date') || '';
    const daysBack = parseInt(searchParams.get('days') || '30');

    try {
        let entries = [] as any[];
        if (dateFilter) {
            entries = await query("SELECT * FROM journal_entries WHERE entry_type IN ('trade', 'trade_import') ORDER BY timestamp_str DESC LIMIT 1000") as any[];
            entries = filterEntriesByDate(entries, dateFilter);
        } else {
            entries = await query("SELECT * FROM journal_entries WHERE entry_type = 'trade' ORDER BY timestamp_str DESC LIMIT 1000") as any[];
        }

        if (analysisType === 'overview') {
            return NextResponse.json(getOverviewAnalysis(entries));
        } else if (analysisType === 'rratio') {
            return NextResponse.json(getRRAnalysis(entries));
        } else if (analysisType === 'timing') {
            return NextResponse.json(getTimingAnalysis(entries));
        } else if (analysisType === 'setup') {
            return NextResponse.json(getSetupAnalysis(entries));
        }

        return NextResponse.json(getOverviewAnalysis(entries));
    } catch (err) {
        console.error('Analytics error:', err);
        return NextResponse.json({ error: 'Analytics failed' }, { status: 500 });
    }
}

function getOverviewAnalysis(entries: any[]) {
    const tradeRows = entries
        .filter(e => e.entry_type === 'trade' && e.pnl !== undefined)
        .map(e => ({
            ...e,
            pnl: parseNumber(e.pnl),
            entry_price: parseNumber(e.entry_price),
            stop_loss: parseNumber(e.stop_loss),
            target_price: parseNumber(e.target_price),
            lots: parseNumber(e.lots, 1)
        }));

    if (tradeRows.length > 0) {
        return computeOverviewFromTradeRows(tradeRows);
    }

    const importRows = entries.filter(e => e.entry_type === 'trade_import');
    if (importRows.length > 0) {
        return computeOverviewFromImportRows(importRows);
    }

    return {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0,
        netPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        rrRatio: 0,
        drawdown: 0,
        streakWin: 0,
        streakLose: 0
    };
}

function computeOverviewFromTradeRows(trades: any[]) {
    const wins = trades.filter(e => e.pnl > 0);
    const losses = trades.filter(e => e.pnl < 0);

    const totalPnL = trades.reduce((sum, e) => sum + e.pnl, 0);
    const winSum = wins.reduce((sum, e) => sum + e.pnl, 0);
    const lossSum = Math.abs(losses.reduce((sum, e) => sum + e.pnl, 0));

    const avgWin = wins.length > 0 ? winSum / wins.length : 0;
    const avgLoss = losses.length > 0 ? lossSum / losses.length : 0;
    const profitFactor = lossSum > 0 ? winSum / lossSum : (winSum > 0 ? Infinity : 0);
    const expectancy = trades.length > 0 ? totalPnL / trades.length : 0;

    const rrRatios = trades
        .map(t => {
            const risk = Math.abs(t.entry_price - t.stop_loss) * t.lots * 75;
            const reward = Math.abs(t.target_price - t.entry_price) * t.lots * 75;
            return risk > 0 ? reward / risk : 0;
        })
        .filter(r => r > 0);
    const rrRatio = rrRatios.length > 0 ? (rrRatios.reduce((a, b) => a + b, 0) / rrRatios.length) : 0;

    let peak = 0;
    let maxDD = 0;
    let cumulative = 0;
    trades.slice().reverse().forEach(t => {
        cumulative += t.pnl;
        peak = Math.max(peak, cumulative);
        maxDD = Math.min(maxDD, peak - cumulative);
    });

    let maxWinStreak = 0, maxLossStreak = 0, currentWinStreak = 0, currentLossStreak = 0;
    trades.forEach(t => {
        if (t.pnl > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        } else {
            currentLossStreak++;
            currentWinStreak = 0;
            maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        }
    });

    return {
        totalTrades: trades.length,
        winTrades: wins.length,
        lossTrades: losses.length,
        winRate: trades.length > 0 ? parseFloat(((wins.length / trades.length) * 100).toFixed(2)) : 0,
        netPnL: parseFloat(totalPnL.toFixed(2)),
        avgWin: parseFloat(avgWin.toFixed(2)),
        avgLoss: parseFloat(avgLoss.toFixed(2)),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        expectancy: parseFloat(expectancy.toFixed(2)),
        rrRatio: parseFloat(rrRatio.toFixed(2)),
        drawdown: parseFloat(maxDD.toFixed(2)),
        streakWin: maxWinStreak,
        streakLose: maxLossStreak
    };
}

function computeOverviewFromImportRows(entries: any[]) {
    const entry = entries[0];
    const summary = entry.plan_notes || '';
    const tradesMatch = summary.match(/(\d+)\s+trades/i);
    const pnlMatch = summary.match(/Net P&L\s*₹?(-?\d+(?:\.\d+)?)/i);
    const winMatch = summary.match(/Win Rate\s*(\d+(?:\.\d+)?)%/i);

    const totalTrades = tradesMatch ? parseInt(tradesMatch[1], 10) : 0;
    const netPnL = pnlMatch ? parseFloat(pnlMatch[1]) : parseNumber(entry.pnl);
    const winRate = winMatch ? parseFloat(winMatch[1]) : 0;

    return {
        totalTrades,
        winTrades: 0,
        lossTrades: 0,
        winRate: parseFloat(winRate.toFixed(2)),
        netPnL: parseFloat(netPnL.toFixed(2)),
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: totalTrades > 0 ? parseFloat((netPnL / totalTrades).toFixed(2)) : 0,
        rrRatio: 0,
        drawdown: 0,
        streakWin: 0,
        streakLose: 0
    };
}

function getRRAnalysis(entries: any[]) {
    const trades = entries
        .map(e => ({
            ...e,
            pnl: parseNumber(e.pnl),
            entry_price: parseNumber(e.entry_price),
            stop_loss: parseNumber(e.stop_loss),
            target_price: parseNumber(e.target_price),
            lots: parseNumber(e.lots, 1)
        }))
        .filter(e => e.pnl !== undefined && e.entry_price > 0 && e.stop_loss > 0 && e.target_price > 0);
    
    const rrGroups: { [key: string]: any[] } = {
        '0.5-1.0': [],
        '1.0-1.5': [],
        '1.5-2.0': [],
        '2.0+': []
    };

    trades.forEach(t => {
        const risk = Math.abs((t.entry_price || 0) - (t.stop_loss || 0)) * (t.lots || 1) * 75;
        const reward = Math.abs((t.target_price || 0) - (t.entry_price || 0)) * (t.lots || 1) * 75;
        const rr = risk > 0 ? reward / risk : 0;

        let key = '2.0+';
        if (rr >= 0.5 && rr < 1.0) key = '0.5-1.0';
        else if (rr >= 1.0 && rr < 1.5) key = '1.0-1.5';
        else if (rr >= 1.5 && rr < 2.0) key = '1.5-2.0';

        rrGroups[key].push(t);
    });

    return Object.entries(rrGroups).map(([ratio, trades]) => {
        const wins = trades.filter(t => t.pnl > 0).length;
        const pnlSum = trades.reduce((sum, t) => sum + t.pnl, 0);
        const lossSum = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
        const winSum = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);

        return {
            ratio,
            count: trades.length,
            winRate: trades.length > 0 ? parseFloat(((wins / trades.length) * 100).toFixed(2)) : 0,
            avgPnL: trades.length > 0 ? parseFloat((pnlSum / trades.length).toFixed(2)) : 0,
            profitFactor: lossSum > 0 ? parseFloat((winSum / lossSum).toFixed(2)) : (winSum > 0 ? Infinity : 0)
        };
    });
}

function getTimingAnalysis(entries: any[]) {
    const trades = entries
        .map(e => ({
            ...e,
            pnl: parseNumber(e.pnl)
        }))
        .filter(e => e.timestamp_str);
    const hourlyMap: { [key: number]: any[] } = {};

    trades.forEach(t => {
        const date = new Date(t.timestamp_str);
        const hour = date.getHours();

        if (!hourlyMap[hour]) hourlyMap[hour] = [];
        hourlyMap[hour].push(t);
    });

    return Object.keys(hourlyMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map(hour => {
            const hourTrades = hourlyMap[hour];
            const wins = hourTrades.filter(t => t.pnl > 0).length;
            const pnlSum = hourTrades.reduce((sum, t) => sum + t.pnl, 0);

            const hourStr = String(hour).padStart(2, '0');
            const nextHourStr = String((hour + 1) % 24).padStart(2, '0');

            return {
                session: `${hourStr}:00-${nextHourStr}:00`,
                trades: hourTrades.length,
                winRate: hourTrades.length > 0 ? parseFloat(((wins / hourTrades.length) * 100).toFixed(2)) : 0,
                avgPnL: hourTrades.length > 0 ? parseFloat((pnlSum / hourTrades.length).toFixed(2)) : 0
            };
        })
        .filter(item => item.trades > 0);
}

function getSetupAnalysis(entries: any[]) {
    const trades = entries
        .map(e => ({
            ...e,
            pnl: parseNumber(e.pnl)
        }))
        .filter(e => e.pnl !== undefined);
    const setupMap: { [key: string]: any[] } = {};

    trades.forEach(t => {
        const setup = t.setup_type || t.focus_area || 'General';
        if (!setupMap[setup]) setupMap[setup] = [];
        setupMap[setup].push(t);
    });

    return Object.entries(setupMap).map(([setup, trades]) => {
        const wins = trades.filter(t => (t.pnl || 0) > 0).length;
        const pnlSum = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const lossSum = Math.abs(trades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));
        const winSum = trades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);

        return {
            setupType: setup,
            trades: trades.length,
            winRate: trades.length > 0 ? parseFloat(((wins / trades.length) * 100).toFixed(2)) : 0,
            avgPnL: trades.length > 0 ? parseFloat((pnlSum / trades.length).toFixed(2)) : 0,
            profitFactor: lossSum > 0 ? parseFloat((winSum / lossSum).toFixed(2)) : (winSum > 0 ? Infinity : 0)
        };
    });
}
