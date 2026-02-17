'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Entry } from '../types';
import RightPanel from '../components/RightPanel';
import { useGlobal } from '../context/GlobalContext';

export default function Dashboard() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    return (
        <div className="flex flex-col h-full bg-[#09090b]">
            <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 bg-zinc-950 shrink-0">
                <h1 className="text-sm font-semibold text-white">Dashboard</h1>
                <button 
                    onClick={() => router.push('/journal')} 
                    className="bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                >
                    + New
                </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4 md:space-y-6">
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
                     />
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