'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Entry } from '../types';
import RightPanel from '../components/RightPanel';
import SourcePanel from '../components/SourcePanel';
import { useGlobal } from '../context/GlobalContext';

export default function Dashboard() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePanelTab, setActivePanelTab] = useState('all');
    const router = useRouter();
    const { isAuthenticated } = useGlobal();

    useEffect(() => {
        if (!isAuthenticated) router.push('/');
        fetchEntries();
    }, [isAuthenticated]);

    const fetchEntries = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/journal');
            const data = await res.json();
            if (Array.isArray(data)) {
                const parsed = data.map((e: any) => ({
                    ...e,
                    mistakes: typeof e.mistakes === 'string' ? JSON.parse(e.mistakes || "[]") : (e.mistakes || []),
                    images: typeof e.images === 'string' ? JSON.parse(e.images || "[]") : (e.images || []),
                    pnl: parseFloat(e.pnl || 0),
                    stop_loss: parseFloat(e.stop_loss || 0),
                    target_price: parseFloat(e.target_price || 0)
                }));
                setEntries(parsed);
            }
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const deleteEntry = async (id: number) => {
        if (confirm("Delete entry?")) {
            await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
            fetchEntries();
        }
    };

    const totalTrades = entries.filter(e => e.entry_type === 'trade').length;
    const winTrades = entries.filter(e => e.entry_type === 'trade' && e.pnl > 0).length;
    const netPnL = entries.filter(e => e.entry_type === 'trade').reduce((acc, curr) => acc + curr.pnl, 0).toFixed(2);
    const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : "0.0";

    const sourceEntries = entries.filter(e => e.entry_type === 'source');
    const latestSource = sourceEntries[0];
    const latestTrade = entries.find(e => e.entry_type === 'trade');
    const sourceCount = sourceEntries.length;
    const formatSourcePreview = (raw: string) => {
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (parsed?.summary) return String(parsed.summary);
            if (Array.isArray(parsed)) {
                const filtered = parsed.filter((item: any) => item.k?.trim() || item.v?.trim());
                return filtered.map((item: any) => `${item.k || 'Note'}: ${item.v}`).join(' • ') || raw;
            }
            if (parsed?.rows) {
                const filtered = parsed.rows.filter((item: any) => item.k?.trim() || item.v?.trim());
                return filtered.map((item: any) => `${item.k || 'Note'}: ${item.v}`).join(' • ') || raw;
            }
        } catch (_err) {
            // ignore and fall through to raw string
        }
        return raw;
    };

    const latestSourcePreview = latestSource ? formatSourcePreview(latestSource.notes || latestSource.plan_notes || latestSource.neg_notes || 'Recent source observation available.') : 'No source data saved yet.';
    const latestTradeSummary = latestTrade ? `${latestTrade.asset} ${latestTrade.pnl >= 0 ? '+' : ''}${latestTrade.pnl.toFixed(2)}` : 'No recent trade';

    const openSourceEditor = () => router.push('/journal?mode=source');
    const editEntry = (id: number) => router.push(`/journal?id=${id}`);

    return (
        <div className="flex flex-col h-full bg-[#09090b]">
            <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 bg-zinc-950 shrink-0">
                <h1 className="text-sm font-semibold text-white">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setActivePanelTab('source')} 
                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    >
                        Source Data
                    </button>
                    <button 
                        onClick={() => router.push('/journal')} 
                        className="bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    >
                        + New
                    </button>
                </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4 md:space-y-6">
                <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Recent source insight</div>
                                    <p className="mt-2 text-sm leading-6 text-zinc-200">{latestSourcePreview}</p>
                                </div>
                                <button 
                                    onClick={openSourceEditor} 
                                    className="self-start rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold uppercase text-black hover:bg-cyan-400 transition-colors"
                                >
                                    Add Source
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <MetricCard label="Source Notes" value={sourceCount.toString()} />
                                <MetricCard label="Latest Trade" value={latestTradeSummary} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Stats Grid: 2 columns on mobile, 4 on desktop */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                <MetricCard label="Net P&L" value={netPnL} isCurrency />
                                <MetricCard label="Win Rate" value={`${winRate}%`} />
                                <MetricCard label="Trades" value={totalTrades.toString()} />
                                <MetricCard label="Avg Risk" value="--" />
                            </div>

                            {/* Table Container */}
                            <div className="border border-zinc-800 rounded-lg bg-zinc-900 overflow-hidden flex flex-col h-[500px] md:h-[600px] shadow-sm">
                                <RightPanel 
                                    entries={entries}
                                    deleteEntry={deleteEntry}
                                    setEditingId={(id) => { if(id) router.push(`/journal?id=${id}`); }}
                                    setCurrentMode={() => {}}
                                    setFormData={() => {}}
                                    onRefresh={fetchEntries}
                                    isLoading={isLoading}
                                    initialTab={activePanelTab}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <SourcePanel
                            sourceEntries={sourceEntries}
                            onAddSource={openSourceEditor}
                            onOpenSourceTab={() => setActivePanelTab('source')}
                            onEditSourceEntry={editEntry}
                            onDeleteSourceEntry={deleteEntry}
                            onRefresh={fetchEntries}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, isCurrency = false }: { label: string, value: string, isCurrency?: boolean }) {
    const num = parseFloat(value);
    const colorClass = isCurrency ? (num >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-zinc-200';
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 md:p-4 rounded-lg">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">{label}</div>
            <div className={`text-xl md:text-2xl font-mono font-medium ${colorClass}`}>
                {isCurrency && num > 0 ? '+' : ''}{value}
            </div>
        </div>
    );
}