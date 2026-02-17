'use client';

import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { CalculatorEntry } from '../types';

interface CalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    entries: CalculatorEntry[];
    setEntries: React.Dispatch<React.SetStateAction<CalculatorEntry[]>>;
}

export function CompoundingCalculator({ isOpen, onClose, entries, setEntries }: CalculatorProps) {
    const { theme } = useGlobal();
    const [initialCapital, setInitialCapital] = useState(100000);
    const [mode, setMode] = useState<'manual' | 'projection'>('manual');
    
    // Projection State
    const [projDays, setProjDays] = useState(30);
    const [projWinRate, setProjWinRate] = useState(60);
    const [projRR, setProjRR] = useState(2);
    const [projRisk, setProjRisk] = useState(1); // Risk per trade %

    if (!isOpen) return null;

    // --- CALCULATIONS ---
    const currentBalance = entries.reduce((acc, curr) => {
        return curr.isPercentage ? acc * (1 + curr.val / 100) : acc + curr.val;
    }, initialCapital);

    const profit = currentBalance - initialCapital;
    const roi = ((profit / initialCapital) * 100).toFixed(2);

    const addManualEntry = (val: number, isPercentage: boolean) => {
        setEntries([...entries, { id: Date.now(), val, isPercentage, note: 'Manual' }]);
    };

    const clearEntries = () => {
        if(confirm("Clear calculation history?")) setEntries([]);
    };

    // Projection Simulation
    const projectionData = [];
    let simBalance = initialCapital;
    for(let i=1; i<=projDays; i++) {
        const isWin = i % (100/projWinRate) <= 1; // Simplified deterministic distribution
        const outcome = isWin ? (simBalance * (projRisk/100) * projRR) : -(simBalance * (projRisk/100));
        simBalance += outcome;
        projectionData.push({ day: i, balance: simBalance, outcome });
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-[var(--card)] border border-[var(--card-border)] w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden" 
                onClick={e => e.stopPropagation()}
                data-theme={theme}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--background)] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold">
                            <i className="fas fa-calculator"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--foreground)]">Compounding Engine</h2>
                            <p className="text-xs text-[var(--muted)]">Risk & Growth Simulator</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                {/* CONTENT GRID */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    
                    {/* LEFT SIDE: CONTROLS (Scrollable on mobile, Fixed width on desktop) */}
                    <div className="lg:col-span-4 bg-[var(--background)] border-b lg:border-b-0 lg:border-r border-[var(--card-border)] p-6 overflow-y-auto">
                        
                        {/* 1. Global Inputs */}
                        <div className="mb-8">
                            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide mb-2 block">Starting Capital</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] text-lg">₹</span>
                                <input 
                                    type="number" 
                                    value={initialCapital} 
                                    onChange={e => setInitialCapital(Number(e.target.value))}
                                    className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg py-3 pl-10 pr-4 text-xl font-mono font-bold text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                                />
                            </div>
                        </div>

                        {/* 2. Mode Toggle */}
                        <div className="flex bg-[var(--card)] p-1 rounded-lg border border-[var(--card-border)] mb-6">
                            <button 
                                onClick={() => setMode('manual')}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${mode === 'manual' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                            >
                                Manual Log
                            </button>
                            <button 
                                onClick={() => setMode('projection')}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${mode === 'projection' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                            >
                                Simulator
                            </button>
                        </div>

                        {/* 3. Dynamic Controls */}
                        {mode === 'manual' ? (
                            <div className="space-y-6 animate-in">
                                <div className="p-4 rounded-lg bg-[var(--card)] border border-[var(--card-border)]">
                                    <h3 className="text-xs font-bold text-[var(--muted)] uppercase mb-3">Quick Add</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => addManualEntry(500, false)} className="btn-quick">+500</button>
                                        <button onClick={() => addManualEntry(-500, false)} className="btn-quick text-red-400">-500</button>
                                        <button onClick={() => addManualEntry(1, true)} className="btn-quick">+1%</button>
                                        <button onClick={() => addManualEntry(-1, true)} className="btn-quick text-red-400">-1%</button>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex gap-2">
                                        <input id="customVal" type="number" placeholder="Custom" className="flex-1 bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-2 text-sm text-[var(--foreground)] outline-none" />
                                        <button onClick={() => { const val = parseFloat((document.getElementById('customVal') as HTMLInputElement).value); if(val) addManualEntry(val, false); }} className="px-4 bg-[var(--accent)] text-white rounded font-bold hover:opacity-90">+</button>
                                    </div>
                                </div>
                                <button onClick={clearEntries} className="w-full py-3 border border-red-500/30 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/10 transition-colors">Reset History</button>
                            </div>
                        ) : (
                            <div className="space-y-5 animate-in">
                                <div><label className="label-sm">Days to Simulate</label><input type="range" min="10" max="365" value={projDays} onChange={e=>setProjDays(Number(e.target.value))} className="w-full" /><div className="text-right text-xs font-mono">{projDays} Days</div></div>
                                <div><label className="label-sm">Win Rate (%)</label><input type="range" min="10" max="90" value={projWinRate} onChange={e=>setProjWinRate(Number(e.target.value))} className="w-full" /><div className="text-right text-xs font-mono">{projWinRate}%</div></div>
                                <div><label className="label-sm">Risk Reward (1:X)</label><input type="range" min="1" max="5" step="0.5" value={projRR} onChange={e=>setProjRR(Number(e.target.value))} className="w-full" /><div className="text-right text-xs font-mono">1:{projRR}</div></div>
                                <div><label className="label-sm">Risk Per Trade (%)</label><input type="range" min="0.5" max="5" step="0.5" value={projRisk} onChange={e=>setProjRisk(Number(e.target.value))} className="w-full" /><div className="text-right text-xs font-mono">{projRisk}%</div></div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE: RESULTS (Scrollable) */}
                    <div className="lg:col-span-8 bg-[var(--card)]/50 p-6 overflow-y-auto flex flex-col">
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 shrink-0">
                            <StatBox label="Current Balance" value={mode==='manual' ? currentBalance.toFixed(2) : projectionData[projectionData.length-1]?.balance.toFixed(2)} isMain />
                            <StatBox label="Net Profit" value={mode==='manual' ? profit.toFixed(2) : (projectionData[projectionData.length-1]?.balance - initialCapital).toFixed(2)} />
                            <StatBox label="Growth" value={mode==='manual' ? `${roi}%` : `${(((projectionData[projectionData.length-1]?.balance - initialCapital)/initialCapital)*100).toFixed(2)}%`} />
                            <StatBox label="Trades" value={mode==='manual' ? entries.length : projDays} />
                        </div>

                        {/* DATA TABLE */}
                        <div className="flex-1 border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--background)] flex flex-col">
                            <div className="grid grid-cols-4 bg-[var(--card)] border-b border-[var(--card-border)] p-3 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider shrink-0">
                                <div># Sequence</div>
                                <div>Type</div>
                                <div className="text-right">Change</div>
                                <div className="text-right">Balance</div>
                            </div>
                            
                            <div className="overflow-y-auto flex-1 p-0">
                                {mode === 'manual' ? (
                                    entries.length === 0 ? 
                                    <div className="h-full flex items-center justify-center text-[var(--muted)] text-sm italic">No entries logged yet.</div> :
                                    [...entries].reverse().map((e, i) => {
                                        // Calculate running balance for manual mode is complex in reverse, so we just show list
                                        return (
                                            <div key={e.id} className="grid grid-cols-4 p-3 border-b border-[var(--card-border)] hover:bg-[var(--card)] transition-colors text-sm">
                                                <div className="font-mono text-[var(--muted)]">{entries.length - i}</div>
                                                <div className="text-[var(--foreground)]">{e.note}</div>
                                                <div className={`text-right font-mono font-bold ${e.val >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{e.val > 0 ? '+' : ''}{e.val}{e.isPercentage ? '%' : ''}</div>
                                                <div className="text-right font-mono text-[var(--muted)]">-</div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    projectionData.map((d) => (
                                        <div key={d.day} className="grid grid-cols-4 p-3 border-b border-[var(--card-border)] hover:bg-[var(--card)] transition-colors text-sm">
                                            <div className="font-mono text-[var(--muted)]">Day {d.day}</div>
                                            <div className="text-[var(--foreground)]">{d.outcome > 0 ? 'Win' : 'Loss'}</div>
                                            <div className={`text-right font-mono font-bold ${d.outcome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{d.outcome > 0 ? '+' : ''}{d.outcome.toFixed(2)}</div>
                                            <div className="text-right font-mono font-bold text-[var(--foreground)]">{d.balance.toFixed(2)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .btn-quick {
                    @apply py-2 rounded border border-[var(--card-border)] bg-[var(--background)] text-sm font-bold text-[var(--foreground)] hover:bg-[var(--card)] transition-colors;
                }
                .label-sm {
                    @apply text-[10px] font-bold text-[var(--muted)] uppercase tracking-wide block mb-1;
                }
            `}</style>
        </div>
    );
}

const StatBox = ({ label, value, isMain }: { label: string, value: any, isMain?: boolean }) => (
    <div className={`p-4 rounded-lg border ${isMain ? 'bg-[var(--accent)] border-transparent text-white' : 'bg-[var(--background)] border-[var(--card-border)]'}`}>
        <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isMain ? 'text-white/70' : 'text-[var(--muted)]'}`}>{label}</div>
        <div className="text-xl font-mono font-bold truncate" title={value}>{value}</div>
    </div>
);