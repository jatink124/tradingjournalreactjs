'use client';

import { useMemo, useState } from 'react';
import { Entry } from '../types';

interface SourcePanelProps {
    sourceEntries: Entry[];
    onOpenSourceTab: () => void;
    onAddSource: () => void;
    onEditSourceEntry?: (id: number) => void;
    onDeleteSourceEntry?: (id: number) => void;
    onRefresh?: () => void;
}

interface RecentSourceRow {
    k: string;
    v: string;
    date: string;
    asset: string;
    entryId: number;
    rowIndex: number;
}

export default function SourcePanel({ sourceEntries, onOpenSourceTab, onAddSource, onEditSourceEntry, onDeleteSourceEntry, onRefresh }: SourcePanelProps) {
    const [rowLimit, setRowLimit] = useState(5);
    const [selectedRow, setSelectedRow] = useState<RecentSourceRow | null>(null);
    const [isEditingSelection, setIsEditingSelection] = useState(false);
    const [editKey, setEditKey] = useState('');
    const [editValue, setEditValue] = useState('');
    const [isSavingSelection, setIsSavingSelection] = useState(false);
    const latestSource = sourceEntries[0];

    const latestRows = useMemo(() => {
        const rows: RecentSourceRow[] = [];

        sourceEntries.forEach(entry => {
            try {
                const parsed = typeof entry.notes === 'string' ? JSON.parse(entry.notes || '{}') : entry.notes;
                const list = Array.isArray(parsed) ? parsed : parsed?.rows || [];
                if (Array.isArray(list)) {
                    list.forEach((item: any, rowIndex: number) => {
                        if (item && (item.k?.trim() || item.v?.trim())) {
                            rows.push({
                                k: item.k || '',
                                v: item.v || '',
                                asset: entry.asset || '',
                                date: new Date(entry.id).toLocaleString(),
                                entryId: Number(entry.id),
                                rowIndex
                            });
                        }
                    });
                }
            } catch {
                // ignore invalid JSON
            }
        });

        return rows.sort((a, b) => b.entryId - a.entryId).slice(0, rowLimit);
    }, [sourceEntries, rowLimit]);

    const selectRow = (row: RecentSourceRow) => {
        setSelectedRow(row);
        setIsEditingSelection(false);
        setEditKey(row.k);
        setEditValue(row.v);
    };

    const saveSelectedRow = async () => {
        if (!selectedRow) return;
        const sourceEntry = sourceEntries.find(e => e.id === selectedRow.entryId);
        if (!sourceEntry) return;

        try {
            setIsSavingSelection(true);
            const parsed = typeof sourceEntry.notes === 'string' ? JSON.parse(sourceEntry.notes || '{}') : sourceEntry.notes || {};
            const list = Array.isArray(parsed) ? [...parsed] : Array.isArray(parsed.rows) ? [...parsed.rows] : [];
            if (selectedRow.rowIndex < 0 || selectedRow.rowIndex >= list.length) return;
            list[selectedRow.rowIndex] = { k: editKey, v: editValue };
            const notes = Array.isArray(parsed)
                ? JSON.stringify(list)
                : JSON.stringify({ ...parsed, rows: list });

            const payload = {
                ...sourceEntry,
                notes,
                mistakes: sourceEntry.mistakes,
                images: sourceEntry.images,
                pnl: sourceEntry.pnl || 0,
                entry_price: sourceEntry.entry_price || 0,
                exit_price: sourceEntry.exit_price || 0,
                stop_loss: sourceEntry.stop_loss || 0,
                target_price: sourceEntry.target_price || 0,
                lots: sourceEntry.lots || 0,
                market_trend: sourceEntry.market_trend || 'Sideways'
            };

            await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setSelectedRow({ ...selectedRow, k: editKey, v: editValue });
            setIsEditingSelection(false);
            onRefresh?.();
        } catch (error) {
            console.error('Failed to save source row', error);
        } finally {
            setIsSavingSelection(false);
        }
    };

    const deleteSelectedRow = async () => {
        if (!selectedRow) return;
        if (!confirm('Delete this source row?')) return;
        const sourceEntry = sourceEntries.find(e => e.id === selectedRow.entryId);
        if (!sourceEntry) return;

        try {
            setIsSavingSelection(true);
            const parsed = typeof sourceEntry.notes === 'string' ? JSON.parse(sourceEntry.notes || '{}') : sourceEntry.notes || {};
            const list = Array.isArray(parsed) ? [...parsed] : Array.isArray(parsed.rows) ? [...parsed.rows] : [];
            if (selectedRow.rowIndex < 0 || selectedRow.rowIndex >= list.length) return;
            list.splice(selectedRow.rowIndex, 1);
            const notes = Array.isArray(parsed)
                ? JSON.stringify(list)
                : JSON.stringify({ ...parsed, rows: list });

            const payload = {
                ...sourceEntry,
                notes,
                mistakes: sourceEntry.mistakes,
                images: sourceEntry.images,
                pnl: sourceEntry.pnl || 0,
                entry_price: sourceEntry.entry_price || 0,
                exit_price: sourceEntry.exit_price || 0,
                stop_loss: sourceEntry.stop_loss || 0,
                target_price: sourceEntry.target_price || 0,
                lots: sourceEntry.lots || 0,
                market_trend: sourceEntry.market_trend || 'Sideways'
            };

            await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setSelectedRow(null);
            setIsEditingSelection(false);
            onRefresh?.();
        } catch (error) {
            console.error('Failed to delete source row', error);
        } finally {
            setIsSavingSelection(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Source Insights</div>
                        <div className="mt-2 text-sm text-zinc-200">
                            {latestSource ? latestSource.asset : 'No source entries yet.'}
                        </div>
                    </div>
                    <button onClick={onAddSource} className="rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold uppercase text-black hover:bg-cyan-400 transition-colors">
                        + Add Source
                    </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-zinc-950 p-3 text-xs text-zinc-300">
                        <div className="font-semibold text-zinc-100">Total Source</div>
                        <div className="mt-2 text-2xl text-white">{sourceEntries.length}</div>
                    </div>
                    <div className="rounded-xl bg-zinc-950 p-3 text-xs text-zinc-300">
                        <div className="font-semibold text-zinc-100">Latest Time</div>
                        <div className="mt-2 text-sm text-white">{latestSource ? new Date(latestSource.id).toLocaleString() : '-'}</div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-white">Recent Source Entries</div>
                    <span className="text-xs uppercase text-zinc-500">Open source tab to edit</span>
                </div>

                {sourceEntries.length === 0 ? (
                    <div className="mt-4 text-sm text-zinc-500">No source data is available yet. Add a new source entry to track insights and market context.</div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {sourceEntries.slice(0, 5).map(entry => {
                            const parsedNotes = (() => {
                                try {
                                    const parsed = JSON.parse(entry.notes || '{}');
                                    if (parsed.summary) return parsed.summary;
                                    if (Array.isArray(parsed)) return parsed.map((item: any) => `${item.k}: ${item.v}`).join(' • ');
                                    return entry.notes;
                                } catch {
                                    return entry.notes;
                                }
                            })();
                            return (
                                <div key={entry.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-zinc-500">{entry.asset}</div>
                                            <div className="mt-1 text-sm text-zinc-100 line-clamp-2">{parsedNotes || 'No summary available.'}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => onEditSourceEntry?.(entry.id)} className="rounded-md border border-emerald-700 px-2 py-1 text-[11px] text-emerald-400 hover:bg-emerald-500/10 transition">Edit Entry</button>
                                            <button onClick={() => onDeleteSourceEntry?.(entry.id)} className="rounded-md border border-red-700 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/10 transition">Delete Entry</button>
                                            <button onClick={onOpenSourceTab} className="rounded-md border border-cyan-700 px-2 py-1 text-[11px] text-cyan-400 hover:bg-cyan-500/10 transition">Open Source Tab</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-white">Latest source keys</div>
                    <div className="flex gap-2">
                        {[5, 10].map((count) => (
                            <button key={count} onClick={() => setRowLimit(count)}
                                className={`rounded-md px-2 py-1 text-xs font-semibold uppercase transition ${rowLimit === count ? 'bg-cyan-500 text-black' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>
                                Top {count}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedRow && (
                    <div className="rounded-2xl border border-cyan-700 bg-zinc-950 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="text-[11px] uppercase tracking-wide text-cyan-300">Selected source row</div>
                                <div className="mt-2 text-sm text-white">{selectedRow.asset}</div>
                                <div className="text-[11px] text-zinc-400">{selectedRow.date}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => { setIsEditingSelection(true); setEditKey(selectedRow.k); setEditValue(selectedRow.v); }} className="rounded-md border border-emerald-700 bg-emerald-700/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-700/20 transition">Edit Selected</button>
                                <button onClick={deleteSelectedRow} className="rounded-md border border-red-700 bg-red-700/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-700/20 transition">Delete Selected</button>
                                <button onClick={() => { setSelectedRow(null); setIsEditingSelection(false); }} className="rounded-md border border-zinc-700 bg-zinc-700/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700/20 transition">Clear Selection</button>
                            </div>
                        </div>
                        {isEditingSelection && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Key</div>
                                    <input value={editKey} onChange={(e) => setEditKey(e.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none" />
                                </div>
                                <div>
                                    <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Value</div>
                                    <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none" />
                                </div>
                                <div className="flex items-end gap-2 sm:col-span-2">
                                    <button onClick={saveSelectedRow} disabled={isSavingSelection} className="rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-400 transition disabled:opacity-50">{isSavingSelection ? 'Saving...' : 'Save'}</button>
                                    <button onClick={() => setIsEditingSelection(false)} className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700/20 transition">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {latestRows.length === 0 ? (
                    <div className="mt-4 text-sm text-zinc-500">No source keys found in recent source entries.</div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {latestRows.map((row, idx) => (
                            <div key={`${row.entryId}-${row.rowIndex}-${idx}`} className={`rounded-2xl border ${selectedRow && selectedRow.entryId === row.entryId && selectedRow.rowIndex === row.rowIndex ? 'border-cyan-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-950'} p-3`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                            <span>{row.asset}</span>
                                            <span>•</span>
                                            <span>{row.date}</span>
                                        </div>
                                        <div className="mt-2 text-sm text-white">
                                            <span className="font-semibold">{row.k || 'Key'}</span>: {row.v || 'No source description'}
                                        </div>
                                    </div>
                                    <button onClick={() => selectRow(row)} className="rounded-md border border-cyan-700 px-2 py-1 text-[11px] text-cyan-400 hover:bg-cyan-500/10 transition">Select</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
