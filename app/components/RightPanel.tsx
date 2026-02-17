'use client';

import React, { useState, useMemo } from 'react';
import { Entry, JournalForm, GalleryItem } from '../types';
import { GalleryModal } from './Modals';

interface RightPanelProps {
    entries: Entry[];
    deleteEntry: (id: number) => void;
    setEditingId: (id: number | null) => void;
    setCurrentMode: (m: string) => void;
    setFormData: React.Dispatch<React.SetStateAction<JournalForm>>;
    onRefresh: () => void;
    isLoading: boolean;
}

export default function RightPanel({ entries, deleteEntry, setEditingId, onRefresh, isLoading }: RightPanelProps) {
    const [activeTab, setActiveTab] = useState('all');
    const [filterAsset, setFilterAsset] = useState('ALL');
    const [search, setSearch] = useState('');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleryStart, setGalleryStart] = useState(0);

    // CHANGED: Logic inverted. Now tracking 'expanded' state.
    // Default {} means nothing is expanded (All Hidden).
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (date: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            if (activeTab !== 'all' && e.entry_type !== activeTab) return false;
            if (filterAsset !== 'ALL') {
                if (filterAsset === 'STOCK') { if (['NIFTY', 'BTC'].includes(e.asset)) return false; }
                else if (e.asset !== filterAsset) return false;
            }
            const q = search.toLowerCase();
            if (search && !e.notes?.toLowerCase().includes(q) && !e.asset.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [entries, activeTab, filterAsset, search]);

    // Grouping Logic
    const groupedEntries = useMemo(() => {
        const groups: { date: string; dateObj: Date; entries: Entry[]; dailyPnL: number }[] = [];
        
        filteredEntries.forEach(e => {
            const d = new Date(e.id);
            const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            
            let lastGroup = groups[groups.length - 1];
            if (!lastGroup || lastGroup.date !== dateStr) {
                groups.push({ date: dateStr, dateObj: d, entries: [e], dailyPnL: e.pnl || 0 });
            } else {
                lastGroup.entries.push(e);
                lastGroup.dailyPnL += (e.pnl || 0);
            }
        });
        return groups;
    }, [filteredEntries]);

    const galleryItems = useMemo(() => filteredEntries.flatMap(e => e.images.map(img => ({ src: img, desc: e.asset }))), [filteredEntries]);
    
    const getGlobalImgIndex = (entry: Entry) => {
        let idx = 0;
        for (const e of filteredEntries) {
            if (e.id === entry.id) break;
            idx += e.images.length;
        }
        return idx;
    };

    const renderSourceContent = (note: string) => {
        try {
            const parsed = JSON.parse(note);
            if (Array.isArray(parsed)) {
                return (
                    <div className="flex flex-wrap gap-2">
                        {parsed.map((item: { k: string, v: string }, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] text-[10px]">
                                <span className="font-bold text-[var(--muted)] uppercase">{item.k}:</span>
                                <span className="text-[var(--foreground)] font-medium">{item.v}</span>
                            </span>
                        ))}
                    </div>
                );
            }
            return note;
        } catch (e) { return note; }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 p-3 border-b border-[var(--card-border)] bg-[var(--card)]/50">
                <div className="flex p-1 bg-[var(--background)] border border-[var(--card-border)] rounded-md overflow-x-auto no-scrollbar">
                    {['all', 'live', 'trade', 'eod', 'source'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t)}
                            className={`px-3 py-1 text-[11px] font-bold uppercase rounded-sm transition-all whitespace-nowrap ${activeTab === t ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                <div className="h-4 w-px bg-[var(--card-border)] hidden md:block mx-1"></div>
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1 md:flex-none">
                        <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs"></i>
                        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} 
                            className="w-full md:w-48 bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] text-xs rounded-md pl-8 pr-3 py-1.5 focus:border-[var(--accent)] outline-none transition-colors" />
                    </div>
                    <select value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)} 
                        className="bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] text-xs rounded-md px-2 py-1.5 outline-none focus:border-[var(--accent)] cursor-pointer">
                        <option value="ALL">All Assets</option><option value="NIFTY">NIFTY</option><option value="BTC">BTC</option><option value="STOCK">Stock</option>
                    </select>
                </div>
                <button onClick={onRefresh} className={`text-[var(--muted)] hover:text-[var(--foreground)] p-1.5 rounded hover:bg-[var(--card-border)] ${isLoading ? 'animate-spin' : ''}`}><i className="fas fa-sync-alt"></i></button>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--background)] sticky top-0 z-10 border-b border-[var(--card-border)] backdrop-blur-sm">
                        <tr>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider w-24">Time</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider w-24">Type</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider w-24">Asset</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider w-32">Trend</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Details</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider w-24 text-right">PnL</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider w-20 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                        {groupedEntries.map((group) => {
                            // Logic Check: Undefined/False = Hidden, True = Expanded
                            const isExpanded = expandedGroups[group.date];
                            return (
                                <React.Fragment key={group.date}>
                                    {/* Date Header Row (Clickable) */}
                                    <tr 
                                        onClick={() => toggleGroup(group.date)}
                                        className="bg-[var(--card)]/80 border-y border-[var(--card-border)] cursor-pointer hover:bg-[var(--card)] transition-colors select-none"
                                    >
                                        <td colSpan={7} className="px-4 py-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {/* Chevron Icon: Points Right (Closed) by default */}
                                                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px] w-4 text-[var(--muted)] transition-transform`}></i>
                                                    
                                                    <span className="text-[11px] font-bold text-[var(--foreground)] uppercase tracking-wide opacity-90 flex items-center gap-2">
                                                        <i className="far fa-calendar-alt opacity-50"></i>
                                                        {group.date}
                                                    </span>
                                                    
                                                    {/* Count Badge */}
                                                    <span className="text-[10px] bg-[var(--background)] border border-[var(--card-border)] px-1.5 rounded-full text-[var(--muted)]">
                                                        {group.entries.length}
                                                    </span>
                                                </div>

                                                {/* Daily PnL Summary (Always Visible) */}
                                                {Math.abs(group.dailyPnL) > 0 && (
                                                    <span className="text-[10px] font-mono font-medium opacity-90">
                                                        Daily Net: <span className={group.dailyPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}>{group.dailyPnL > 0 ? '+' : ''}{group.dailyPnL.toFixed(2)}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* Entries for this date (Shown ONLY if Expanded) */}
                                    {isExpanded && group.entries.map((e) => (
                                        <tr key={e.id} className="group hover:bg-[var(--card)] transition-colors animate-in fade-in slide-in-from-top-1 duration-200">
                                            <td className="px-4 py-3 text-xs text-[var(--muted)] font-mono whitespace-nowrap pl-8">
                                                {new Date(e.id).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase border ${
                                                    e.entry_type==='trade'?'border-emerald-900/50 text-emerald-500 bg-emerald-900/10':
                                                    e.entry_type==='mistake'?'border-red-900/50 text-red-500 bg-red-900/10':
                                                    e.entry_type==='source'?'border-cyan-900/50 text-cyan-500 bg-cyan-900/10':
                                                    'border-[var(--card-border)] text-[var(--muted)] bg-[var(--background)]'}`}>
                                                    {e.entry_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium text-[var(--foreground)]">{e.asset}</td>
                                            <td className="px-4 py-3 text-xs">
                                                {e.market_trend === 'Uptrend' ? <span className="text-emerald-500">Bullish</span> : e.market_trend === 'Downtrend' ? <span className="text-red-500">Bearish</span> : <span className="text-[var(--muted)]">Range</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-[var(--muted)] max-w-xl">
                                                {e.entry_type === 'trade' ? (
                                                    <div className="flex gap-3 font-mono text-[11px]">
                                                        <span>IN: <span className="text-[var(--foreground)]">{e.entry_price}</span></span>
                                                        <span>OUT: <span className="text-[var(--foreground)]">{e.exit_price}</span></span>
                                                    </div>
                                                ) : e.entry_type === 'source' ? (
                                                    renderSourceContent(e.notes)
                                                ) : (
                                                    <div className="truncate max-w-md">{e.notes || e.neg_notes}</div>
                                                )}
                                                {e.images.length > 0 && <span className="ml-2 text-blue-500 cursor-pointer inline-flex items-center" onClick={()=> {setGalleryStart(getGlobalImgIndex(e)); setIsGalleryOpen(true)}}><i className="fas fa-paperclip mr-1"></i></span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-right font-mono font-medium">
                                                {e.entry_type === 'trade' ? (
                                                    <span className={e.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>{e.pnl > 0 ? '+' : ''}{e.pnl}</span>
                                                ) : <span className="text-[var(--muted)]">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-right">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                                    <button onClick={()=>setEditingId(e.id)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><i className="fas fa-pen"></i></button>
                                                    <button onClick={()=>deleteEntry(e.id)} className="text-[var(--muted)] hover:text-red-500"><i className="fas fa-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                        {groupedEntries.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-xs text-[var(--muted)]">No entries found.</td></tr>}
                    </tbody>
                </table>
            </div>
            <GalleryModal isOpen={isGalleryOpen} initialIndex={galleryStart} items={galleryItems} onClose={() => setIsGalleryOpen(false)} />
        </div>
    );
}