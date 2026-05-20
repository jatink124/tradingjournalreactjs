'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    initialTab?: string;
}

export default function RightPanel({ entries, deleteEntry, setEditingId, onRefresh, isLoading, initialTab }: RightPanelProps) {
    const [activeTab, setActiveTab] = useState(initialTab ?? 'all');
    const [filterAsset, setFilterAsset] = useState('ALL');
    const [search, setSearch] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleryStart, setGalleryStart] = useState(0);

    // CHANGED: Logic inverted. Now tracking 'expanded' state.
    // Default {} means nothing is expanded (All Hidden).
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

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
            
            // Date filtering
            if (dateStart || dateEnd) {
                const entryDate = new Date(e.id);
                if (dateStart) {
                    const startDate = new Date(dateStart);
                    startDate.setHours(0, 0, 0, 0);
                    if (entryDate < startDate) return false;
                }
                if (dateEnd) {
                    const endDate = new Date(dateEnd);
                    endDate.setHours(23, 59, 59, 999);
                    if (entryDate > endDate) return false;
                }
            }
            
            return true;
        });
    }, [entries, activeTab, filterAsset, search, dateStart, dateEnd]);

    // Grouping Logic
    const groupedEntries = useMemo(() => {
        const groups: { date: string; dateObj: Date; entries: Entry[]; dailyPnL: number }[] = [];
        
        filteredEntries.forEach(e => {
            const d = new Date(e.id);
            const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            
            let lastGroup = groups[groups.length - 1];
            if (!lastGroup || lastGroup.date !== dateStr) {
                const newPnL = e.pnl || 0;
                console.log(`[NEW GROUP] Date: ${dateStr}, Entry Asset: ${e.asset}, Entry PnL: ${e.pnl}, Initial dailyPnL: ${newPnL}`);
                groups.push({ date: dateStr, dateObj: d, entries: [e], dailyPnL: newPnL });
            } else {
                const entryPnL = e.pnl || 0;
                console.log(`[ADD TO GROUP] Date: ${dateStr}, Entry Asset: ${e.asset}, Entry PnL: ${e.pnl}, Before: ${lastGroup.dailyPnL}, After: ${lastGroup.dailyPnL + entryPnL}`);
                lastGroup.entries.push(e);
                lastGroup.dailyPnL += entryPnL;
            }
        });
        console.log('=== FINAL GROUPED ENTRIES ===', groups);
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
                const rows = parsed.filter((item: any) => (item.k?.trim() || item.v?.trim()));
                return rows.length === 0 ? <div className="text-[11px] text-[var(--muted)]">No source details.</div> : (
                    <div className="space-y-2">
                        {rows.map((item: { k: string, v: string }, idx: number) => (
                            <div key={idx} className="grid grid-cols-[auto_1fr] gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-2 text-[11px]">
                                <span className="font-semibold text-[var(--muted)]">{item.k || 'Note'}</span>
                                <span className="text-[var(--foreground)] break-words">{item.v}</span>
                            </div>
                        ))}
                    </div>
                );
            }
            if (parsed && typeof parsed === 'object') {
                const rows = Array.isArray(parsed.rows) ? parsed.rows.filter((item: any) => (item.k?.trim() || item.v?.trim())) : [];
                return (
                    <div className="space-y-3">
                        {rows.length > 0 && (
                            <div className="grid gap-2">
                                {rows.map((item: { k: string, v: string }, idx: number) => (
                                    <div key={idx} className="grid grid-cols-[auto_1fr] gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-2 text-[11px]">
                                        <span className="font-semibold text-[var(--muted)]">{item.k || 'Note'}</span>
                                        <span className="text-[var(--foreground)] break-words">{item.v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {parsed.summary && <div className="whitespace-pre-wrap text-[11px] text-[var(--muted)]">{parsed.summary}</div>}
                        {rows.length === 0 && !parsed.summary && <div className="text-[11px] text-[var(--muted)]">No source details.</div>}
                    </div>
                );
            }
            return String(parsed);
        } catch (e) { return note; }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 p-3 border-b border-[var(--card-border)] bg-[var(--card)]/50">
                {/* Type & Search Row */}
                <div className="flex flex-col md:flex-row md:items-center gap-3">
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

                {/* Date Range Row */}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wide whitespace-nowrap">Date Range:</label>
                    <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
                        className="flex-1 sm:flex-none bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] text-xs rounded-md px-2 py-1.5 outline-none focus:border-[var(--accent)] cursor-pointer" 
                        title="Start Date" />
                    <span className="text-[10px] text-[var(--muted)] hidden sm:inline">to</span>
                    <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
                        className="flex-1 sm:flex-none bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] text-xs rounded-md px-2 py-1.5 outline-none focus:border-[var(--accent)] cursor-pointer" 
                        title="End Date" />
                    {(dateStart || dateEnd) && (
                        <button onClick={() => { setDateStart(''); setDateEnd(''); }}
                            className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1.5 rounded hover:bg-[var(--card-border)] transition">
                            Clear Dates
                        </button>
                    )}
                </div>
            </div>

            {/* GRIDED DATE CARDS */}
            <div className="flex-1 overflow-auto p-3">
                {groupedEntries.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--muted)]">No entries found.</div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {groupedEntries.map((group) => {
                            const isExpanded = expandedGroups[group.date];
                            return (
                                <div key={group.date} className="group overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                    <button type="button" onClick={() => toggleGroup(group.date)}
                                        className="flex w-full items-center justify-between gap-3 p-4 text-left bg-[var(--background)]/80 hover:bg-[var(--background)] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px] text-[var(--muted)]`} />
                                            <div>
                                                <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--foreground)]">{group.date}</div>
                                                <div className="text-[11px] text-[var(--muted)]">{group.entries.length} entries</div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-mono font-medium text-[var(--muted)]">
                                            Daily Net: <span className={group.dailyPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}>{group.dailyPnL > 0 ? '+' : ''}{group.dailyPnL.toFixed(2)}</span>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="space-y-3 p-4 bg-[var(--background)]/5">
                                            <div className="grid gap-3">
                                                {group.entries.map((e) => (
                                                    <article key={e.id} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--background)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{new Date(e.id).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'})}</div>
                                                                <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{e.asset}</div>
                                                            </div>
                                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                                e.entry_type === 'trade' ? 'border-emerald-900/50 text-emerald-500 bg-emerald-900/10' :
                                                                e.entry_type === 'mistake' ? 'border-red-900/50 text-red-500 bg-red-900/10' :
                                                                e.entry_type === 'source' ? 'border-cyan-900/50 text-cyan-500 bg-cyan-900/10' :
                                                                'border-[var(--card-border)] text-[var(--muted)] bg-[var(--background)]'}
                                                            `}>
                                                                {e.entry_type}
                                                            </span>
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                                                            <span>{e.market_trend === 'Uptrend' ? 'Bullish' : e.market_trend === 'Downtrend' ? 'Bearish' : 'Range'}</span>
                                                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--card-border)]" />
                                                            <span>{e.entry_type === 'trade' ? `${e.entry_price} → ${e.exit_price}` : e.asset}</span>
                                                        </div>

                                                        <div className="mt-4 text-[12px] text-[var(--foreground)] space-y-2">
                                                            {e.entry_type === 'trade' ? (
                                                                <div className="grid gap-2 text-[11px] text-[var(--muted)]">
                                                                    <div className="flex justify-between"><span>Entry</span><span>{e.entry_price}</span></div>
                                                                    <div className="flex justify-between"><span>Exit</span><span>{e.exit_price}</span></div>
                                                                    <div className="flex justify-between"><span>Stop</span><span>{e.stop_loss}</span></div>
                                                                    <div className="flex justify-between"><span>Target</span><span>{e.target_price}</span></div>
                                                                </div>
                                                            ) : e.entry_type === 'source' ? (
                                                                <div className="text-[11px] text-[var(--muted)]">{renderSourceContent(e.notes)}</div>
                                                            ) : (
                                                                <div className="text-[11px] text-[var(--muted)] truncate">{e.notes || e.neg_notes}</div>
                                                            )}
                                                        </div>

                                                        <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
                                                            <div className={`font-mono font-semibold ${e.entry_type === 'trade' ? (e.pnl >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-[var(--muted)]'}`}>
                                                                {e.entry_type === 'trade' ? (e.pnl > 0 ? '+' : '') + e.pnl : '-'}
                                                            </div>
                                                            <div className="flex gap-2 transition-opacity">
                                                                <button onClick={() => setEditingId(e.id)} className="text-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Edit entry"><i className="fas fa-pen"></i></button>
                                                                <button onClick={() => deleteEntry(e.id)} className="text-[var(--muted)] hover:text-red-500" aria-label="Delete entry"><i className="fas fa-trash"></i></button>
                                                            </div>
                                                        </div>

                                                        {e.images.length > 0 && (
                                                            <button type="button" onClick={() => { setGalleryStart(getGlobalImgIndex(e)); setIsGalleryOpen(true); }}
                                                                className="mt-4 inline-flex items-center gap-2 text-[11px] text-blue-400 hover:text-blue-300">
                                                                <i className="fas fa-paperclip"></i> View {e.images.length} photo{e.images.length > 1 ? 's' : ''}
                                                            </button>
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <GalleryModal isOpen={isGalleryOpen} initialIndex={galleryStart} items={galleryItems} onClose={() => setIsGalleryOpen(false)} />
        </div>
    );
}