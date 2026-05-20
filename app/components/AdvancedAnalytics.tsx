'use client';

import { useState, useEffect } from 'react';
import { TradeAnalysis, RRAnalysis, TimingAnalysis, SetupAnalysis } from '../types';
import TradeSummaryAnalyzer from './TradeSummaryAnalyzer';

interface AnalyticsData {
    overview?: TradeAnalysis;
    rrRatio?: RRAnalysis[];
    timing?: TimingAnalysis[];
    setup?: SetupAnalysis[];
}

export default function AdvancedAnalytics() {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<AnalyticsData>({});
    const [savedImports, setSavedImports] = useState<any[]>([]);
    const [selectedSavedImport, setSelectedSavedImport] = useState<{ date: string; asset: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'saved') {
            fetchSavedImports();
        } else if (activeTab !== 'import') {
            fetchAnalytics(selectedSavedImport?.date || undefined);
        } else {
            setLoading(false);
        }
    }, [activeTab, selectedSavedImport?.date]);

    const fetchSavedImports = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/journal?type=trade_import');
            const json = await response.json();
            if (!response.ok || json?.error) {
                console.error('Failed to load saved imports:', json);
                setSavedImports([]);
            } else {
                setSavedImports(Array.isArray(json) ? json : []);
            }
        } catch (err) {
            console.error('Failed to load saved imports:', err);
            setSavedImports([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async (date?: string) => {
        setLoading(true);
        try {
            const types = ['overview', 'rratio', 'timing', 'setup'];

            const fetchType = async (type: string) => {
                const queryParam = date ? `&date=${encodeURIComponent(date)}` : '';
                const response = await fetch(`/api/analytics?type=${type}${queryParam}`);
                const json = await response.json();
                if (!response.ok || json?.error) {
                    console.error('Analytics fetch failed:', type, json);
                    return type === 'overview' ? {} : [];
                }
                return json;
            };

            const responses = await Promise.all(types.map(fetchType));

            setData({
                overview: responses[0] as TradeAnalysis,
                rrRatio: Array.isArray(responses[1]) ? responses[1] : [],
                timing: Array.isArray(responses[2]) ? responses[2] : [],
                setup: Array.isArray(responses[3]) ? responses[3] : []
            });
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSavedAnalysisSelect = async (entry: any) => {
        const date = entry.timestamp_str;
        setSelectedSavedImport({ date, asset: entry.asset || 'Imported Trades' });
        await fetchAnalytics(date);
    };

    const clearSelectedSavedImport = () => {
        setSelectedSavedImport(null);
        setData({});
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b]">
            {/* Header */}
            <div className="h-14 border-b border-zinc-800 flex items-center px-6 bg-zinc-950 shrink-0">
                <h1 className="text-sm font-semibold text-white">Advanced Analytics</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-800 flex overflow-x-auto bg-zinc-900">
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'rratio', label: '⚖️ RR Ratio' },
                    { id: 'timing', label: '🕐 Timing' },
                    { id: 'setup', label: '🎯 Setup Analysis' },
                    { id: 'saved', label: '💾 Saved Imports' },
                    { id: 'import', label: '📥 Import Summary' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                            activeTab === tab.id
                                ? 'text-blue-400 border-b-2 border-blue-500'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-zinc-400">Loading analytics...</p>
                    </div>
                ) : activeTab === 'overview' ? (
                    <OverviewTab data={data.overview} />
                ) : activeTab === 'rratio' ? (
                    <RRRatioTab data={data.rrRatio || []} />
                ) : activeTab === 'timing' ? (
                    <TimingTab data={data.timing || []} />
                ) : activeTab === 'setup' ? (
                    <SetupTab data={data.setup || []} />
                ) : activeTab === 'saved' ? (
                    <SavedImportsTab
                        data={savedImports}
                        selectedSavedImport={selectedSavedImport}
                        selectedAnalytics={data}
                        onSelectEntry={handleSavedAnalysisSelect}
                        onClearSelection={clearSelectedSavedImport}
                    />
                ) : (
                    <TradeSummaryAnalyzer />
                )}
            </div>
        </div>
    );
}

function OverviewTab({ data }: { data?: TradeAnalysis }) {
    if (!data || Object.keys(data).length === 0) return <p className="text-zinc-400">No data available</p>;

    const safeNumber = (value: unknown) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    };

    const metrics = [
        { label: 'Total Trades', value: safeNumber(data.totalTrades), color: 'text-blue-400' },
        { label: 'Win Rate', value: `${safeNumber(data.winRate)}%`, color: safeNumber(data.winRate) > 50 ? 'text-emerald-500' : 'text-red-500' },
        { label: 'Net P&L', value: `₹${safeNumber(data.netPnL)}`, color: safeNumber(data.netPnL) > 0 ? 'text-emerald-500' : 'text-red-500' },
        { label: 'Avg Win', value: `₹${safeNumber(data.avgWin)}`, color: 'text-emerald-500' },
        { label: 'Avg Loss', value: `₹${safeNumber(data.avgLoss)}`, color: 'text-red-500' },
        { label: 'Profit Factor', value: safeNumber(data.profitFactor), color: 'text-blue-400' },
        { label: 'Expectancy', value: `₹${safeNumber(data.expectancy)}`, color: safeNumber(data.expectancy) > 0 ? 'text-emerald-500' : 'text-red-500' },
        { label: 'Avg RR Ratio', value: safeNumber(data.rrRatio), color: 'text-blue-400' },
        { label: 'Max Drawdown', value: `₹${safeNumber(data.drawdown)}`, color: 'text-orange-500' },
        { label: 'Max Win Streak', value: safeNumber(data.streakWin), color: 'text-emerald-500' },
        { label: 'Max Loss Streak', value: safeNumber(data.streakLose), color: 'text-red-500' }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {metrics.map((m, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500 font-semibold uppercase mb-2">{m.label}</p>
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                </div>
            ))}
        </div>
    );
}

function RRRatioTab({ data }: { data: RRAnalysis[] }) {
    const rows = Array.isArray(data) ? data : [];

    if (rows.length === 0) {
        return <p className="text-zinc-400">No RR ratio data available.</p>;
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-zinc-300 mb-4">Performance by Risk-Reward Ratio</p>
            {rows.map((item, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="font-bold text-blue-400">RR {item.ratio}</p>
                            <p className="text-xs text-zinc-400">{item.count} trades</p>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${item.winRate > 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {item.winRate}% Win Rate
                            </p>
                            <p className={`text-sm ${item.avgPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                ₹{item.avgPnL} avg
                            </p>
                        </div>
                    </div>
                    <div className="bg-zinc-800/50 h-2 rounded overflow-hidden">
                        <div
                            className={`h-full ${item.winRate > 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${item.winRate}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">Profit Factor: {item.profitFactor}</p>
                </div>
            ))}
        </div>
    );
}

function TimingTab({ data }: { data: TimingAnalysis[] }) {
    return (
        <div className="space-y-3">
            <p className="text-sm text-zinc-300 mb-4">Performance by Trading Session</p>
            {data.map((item, i) => (
                item.trades > 0 && (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="font-bold text-blue-400">{item.session}</p>
                                <p className="text-xs text-zinc-400">{item.trades} trades</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${item.winRate > 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {item.winRate}% Win Rate
                                </p>
                                <p className={`text-sm ${item.avgPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ₹{item.avgPnL} avg
                                </p>
                            </div>
                        </div>
                        <div className="bg-zinc-800/50 h-2 rounded overflow-hidden">
                            <div
                                className={`h-full ${item.winRate > 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${item.winRate}%` }}
                            ></div>
                        </div>
                    </div>
                )
            ))}
        </div>
    );
}

function SavedImportsTab({ data, selectedSavedImport, selectedAnalytics, onSelectEntry, onClearSelection }: { data: any[]; selectedSavedImport: { date: string; asset: string } | null; selectedAnalytics: AnalyticsData; onSelectEntry: (entry: any) => void; onClearSelection: () => void; }) {
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
        return <p className="text-zinc-400">No saved imported analysis available yet.</p>;
    }

    const groupedByDate = rows.reduce((acc: Record<string, any[]>, row) => {
        const date = row.timestamp_str || 'Unknown Date';
        acc[date] = acc[date] || [];
        acc[date].push(row);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {selectedSavedImport && (
                <div className="rounded-lg border border-blue-500 bg-zinc-950 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-blue-300">Selected saved date</p>
                            <h3 className="text-lg font-semibold text-white">{selectedSavedImport.date}</h3>
                            <p className="text-xs text-zinc-400">Import asset: {selectedSavedImport.asset}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClearSelection}
                            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-blue-500 hover:text-white"
                        >
                            Clear selection
                        </button>
                    </div>

                    <div className="mt-6 space-y-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-white mb-3">Overview</h4>
                                <OverviewTab data={selectedAnalytics.overview} />
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-white mb-3">RR Ratio</h4>
                                <RRRatioTab data={selectedAnalytics.rrRatio || []} />
                            </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-white mb-3">Timing</h4>
                                <TimingTab data={selectedAnalytics.timing || []} />
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-white mb-3">Setup Analysis</h4>
                                <SetupTab data={selectedAnalytics.setup || []} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {Object.entries(groupedByDate).map(([date, entries]) => (
                <div key={date} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-white">{date}</h3>
                        <p className="text-xs text-zinc-500">{entries.length} saved import{entries.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="space-y-3">
                        {entries.sort((a, b) => Number(b.id) - Number(a.id)).map((entry, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => onSelectEntry(entry)}
                                className="w-full rounded-lg bg-zinc-800 p-4 border border-zinc-700 text-left transition hover:border-blue-500"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-blue-400">{entry.asset || 'Imported Trades'}</p>
                                        <p className="text-xs text-zinc-500">{entry.plan_notes}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-white">₹{entry.pnl ?? 0}</p>
                                        <p className="text-xs text-zinc-500">Entry saved on {new Date(Number(entry.id) || Date.now()).toLocaleTimeString('en-GB')}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SetupTab({ data }: { data: SetupAnalysis[] }) {
    const sortedData = [...data].sort((a, b) => b.trades - a.trades);
    
    return (
        <div className="space-y-3">
            <p className="text-sm text-zinc-300 mb-4">Performance by Setup Type</p>
            {sortedData.map((item, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="font-bold text-blue-400">{item.setupType}</p>
                            <p className="text-xs text-zinc-400">{item.trades} trades</p>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${item.winRate > 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {item.winRate}% Win Rate
                            </p>
                            <p className={`text-sm ${item.avgPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                ₹{item.avgPnL} avg
                            </p>
                        </div>
                    </div>
                    <div className="bg-zinc-800/50 h-2 rounded overflow-hidden">
                        <div
                            className={`h-full ${item.winRate > 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${item.winRate}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">Profit Factor: {item.profitFactor}</p>
                </div>
            ))}
        </div>
    );
}
