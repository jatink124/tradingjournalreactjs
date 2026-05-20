'use client';

import { useState } from 'react';

interface Trade {
    time: string;
    instrument: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    value: number;
}

interface Analysis {
    totalTrades: number;
    instruments: string[];
    buyTotal: number;
    sellTotal: number;
    pnl: number;
    winTrades: number;
    lossTrades: number;
    winRate: number;
}

export default function TradeSummaryAnalyzer() {
    const [summaryText, setSummaryText] = useState('');
    const [trades, setTrades] = useState<Trade[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [saveStatus, setSaveStatus] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const parseSummary = (text: string): Trade[] => {
        const lines = text.split('\n');
        let start = false;
        const parsedTrades: Trade[] = [];

        for (const line of lines) {
            if (line.includes('Trade Details')) {
                start = true;
                continue;
            }
            if (start && line.trim() === '') continue;
            if (start && line.includes('Trade Summary')) break;
            if (start && line.trim()) {
                // Split by tab or multiple spaces
                const parts = line.split(/\t|\s{2,}/);
                if (parts.length >= 6) {
                    const [time, instrument, action, qty, price, value] = parts.slice(0, 6);
                    parsedTrades.push({
                        time,
                        instrument,
                        action: action as 'BUY' | 'SELL',
                        quantity: parseInt(qty.replace(',', '')),
                        price: parseFloat(price.replace('₹', '').replace(',', '')),
                        value: parseFloat(value.replace('₹', '').replace(',', ''))
                    });
                }
            }
        }
        return parsedTrades;
    };

    const analyzeTrades = (trades: Trade[]): Analysis => {
        const totalTrades = trades.length;
        const instruments = [...new Set(trades.map(t => t.instrument))];
        const buyTotal = trades.filter(t => t.action === 'BUY').reduce((sum, t) => sum + t.value, 0);
        const sellTotal = trades.filter(t => t.action === 'SELL').reduce((sum, t) => sum + t.value, 0);
        const pnl = sellTotal - buyTotal;

        // For win/loss, we need to group by instrument and calculate per pair
        const instrumentGroups: { [key: string]: Trade[] } = {};
        trades.forEach(trade => {
            if (!instrumentGroups[trade.instrument]) {
                instrumentGroups[trade.instrument] = [];
            }
            instrumentGroups[trade.instrument].push(trade);
        });

        let winTrades = 0;
        let lossTrades = 0;

        for (const inst in instrumentGroups) {
            const group = instrumentGroups[inst].sort((a, b) => a.time.localeCompare(b.time));
            let buyValue = 0;
            let sellValue = 0;
            for (const trade of group) {
                if (trade.action === 'BUY') {
                    buyValue += trade.value;
                } else {
                    sellValue += trade.value;
                }
            }
            const instPnl = sellValue - buyValue;
            if (instPnl > 0) winTrades++;
            else if (instPnl < 0) lossTrades++;
        }

        const totalPairs = winTrades + lossTrades;
        const winRate = totalPairs > 0 ? (winTrades / totalPairs) * 100 : 0;

        return {
            totalTrades,
            instruments,
            buyTotal,
            sellTotal,
            pnl,
            winTrades,
            lossTrades,
            winRate
        };
    };

    const parseAnalysisPeriodDate = (text: string): Date | null => {
        const match = text.match(/Analysis Period:\s*(.+)/i);
        if (!match) return null;

        const parsed = new Date(match[1].trim());
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    const getImportDate = () => {
        const parsedDate = parseAnalysisPeriodDate(summaryText);
        return parsedDate || new Date();
    };

    const createSavePayload = (analysisResult: Analysis) => {
        const importDate = getImportDate();
        const timestampStr = importDate.toLocaleDateString('en-GB');
        const id = Date.now();

        return {
            id,
            entry_type: 'trade_import',
            asset: analysisResult.instruments.length === 1 ? analysisResult.instruments[0] : 'Imported Trades',
            timestamp_str: timestampStr,
            focus_area: 'Imported trade summary',
            notes: summaryText,
            mistakes: [],
            neg_notes: '',
            plan_bias: '',
            key_level: '',
            plan_notes: `Net P&L ₹${analysisResult.pnl.toFixed(2)}, Win Rate ${analysisResult.winRate.toFixed(1)}%, ${analysisResult.totalTrades} trades, instruments: ${analysisResult.instruments.join(', ')}`,
            images: [],
            entry_price: 0,
            exit_price: 0,
            lots: 0,
            pnl: analysisResult.pnl,
            market_trend: 'Imported'
        };
    };

    const saveAnalysis = async (analysisResult: Analysis) => {
        setSaving(true);
        setSaveStatus('Saving analysis...');

        try {
            const payload = createSavePayload(analysisResult);
            const response = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to save analysis');
            }

            setSaveStatus('Analysis saved successfully.');
        } catch (error: any) {
            console.error('Save failed:', error);
            setSaveStatus(`Save failed: ${error.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAnalysis = async () => {
        if (!analysis) return;
        await saveAnalysis(analysis);
    };

    const handleAnalyze = async () => {
        const parsedTrades = parseSummary(summaryText);
        setTrades(parsedTrades);
        const analysisResult = analyzeTrades(parsedTrades);
        setAnalysis(analysisResult);
        setSaveStatus('');

        if (parsedTrades.length > 0) {
            await saveAnalysis(analysisResult);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Import Trade Summary</h2>
                <textarea
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    placeholder="Paste your trade summary here..."
                    className="w-full h-64 bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-zinc-200 font-mono text-sm"
                />
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleAnalyze}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Analyze Trades
                    </button>
                    <button
                        onClick={handleSaveAnalysis}
                        disabled={!analysis || saving}
                        className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Analysis'}
                    </button>
                </div>
                {saveStatus && (
                    <p className="mt-3 text-sm text-zinc-300">{saveStatus}</p>
                )}
            </div>

            {analysis && (
                <div className="space-y-4">
                    <h3 className="text-md font-semibold text-white">Analysis Results</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-800 p-4 rounded-lg">
                            <p className="text-zinc-400 text-sm">Total Trades</p>
                            <p className="text-white text-xl font-bold">{analysis.totalTrades}</p>
                        </div>
                        <div className="bg-zinc-800 p-4 rounded-lg">
                            <p className="text-zinc-400 text-sm">Net P&L</p>
                            <p className={`text-xl font-bold ${analysis.pnl > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                ₹{analysis.pnl.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-zinc-800 p-4 rounded-lg">
                            <p className="text-zinc-400 text-sm">Win Rate</p>
                            <p className="text-white text-xl font-bold">{analysis.winRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-zinc-800 p-4 rounded-lg">
                            <p className="text-zinc-400 text-sm">Instruments</p>
                            <p className="text-white text-xl font-bold">{analysis.instruments.length}</p>
                        </div>
                    </div>
                    <div className="bg-zinc-800 p-4 rounded-lg">
                        <p className="text-zinc-400 text-sm mb-2">Instruments Traded</p>
                        <div className="flex flex-wrap gap-2">
                            {analysis.instruments.map(inst => (
                                <span key={inst} className="bg-zinc-700 px-2 py-1 rounded text-xs text-zinc-200">
                                    {inst}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {trades.length > 0 && (
                <div>
                    <h3 className="text-md font-semibold text-white mb-4">Trade Details</h3>
                    <div className="bg-zinc-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-zinc-200">Time</th>
                                    <th className="px-4 py-2 text-left text-zinc-200">Instrument</th>
                                    <th className="px-4 py-2 text-left text-zinc-200">Action</th>
                                    <th className="px-4 py-2 text-left text-zinc-200">Qty</th>
                                    <th className="px-4 py-2 text-left text-zinc-200">Price</th>
                                    <th className="px-4 py-2 text-left text-zinc-200">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map((trade, idx) => (
                                    <tr key={idx} className="border-t border-zinc-700">
                                        <td className="px-4 py-2 text-zinc-300">{trade.time}</td>
                                        <td className="px-4 py-2 text-zinc-300">{trade.instrument}</td>
                                        <td className={`px-4 py-2 font-semibold ${trade.action === 'BUY' ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {trade.action}
                                        </td>
                                        <td className="px-4 py-2 text-zinc-300">{trade.quantity}</td>
                                        <td className="px-4 py-2 text-zinc-300">₹{trade.price.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-zinc-300">₹{trade.value.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}