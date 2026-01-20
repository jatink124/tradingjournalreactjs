'use client';

import React, { useState, useEffect } from 'react';

interface CompoundingCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
}

type ManualEntry = {
    id: number;
    val: number;
    isPercentage: boolean;
    note: string;
};

export function CompoundingCalculator({ isOpen, onClose }: CompoundingCalculatorProps) {
    const [mode, setMode] = useState<'manual' | 'fixed'>('manual');
    const [initialCapital, setInitialCapital] = useState<number>(3000); // Default from your example

    // --- MANUAL MODE STATE ---
    const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
    const [newVal, setNewVal] = useState('');
    const [isNewValPct, setIsNewValPct] = useState(false);
    const [newNote, setNewNote] = useState('');

    // --- FIXED MODE STATE ---
    const [dailyPct, setDailyPct] = useState(2);
    const [days, setDays] = useState(20);

    if (!isOpen) return null;

    // --- LOGIC: MANUAL ---
    const addManualEntry = () => {
        const val = parseFloat(newVal);
        if (isNaN(val)) return;
        setManualEntries([...manualEntries, { 
            id: Date.now(), 
            val, 
            isPercentage: isNewValPct,
            note: newNote 
        }]);
        setNewVal('');
        setNewNote('');
    };

    const removeManualEntry = (id: number) => {
        setManualEntries(manualEntries.filter(e => e.id !== id));
    };

    const calculateManual = () => {
        let currentCap = initialCapital;
        const rows = manualEntries.map((e, i) => {
            let change = 0;
            if (e.isPercentage) {
                change = currentCap * (e.val / 100);
            } else {
                change = e.val;
            }
            currentCap += change;
            return { index: i + 1, change, result: currentCap, note: e.note };
        });
        return rows;
    };

    const manualResults = calculateManual();
    const finalManualCap = manualResults.length > 0 ? manualResults[manualResults.length - 1].result : initialCapital;
    const manualTotalPnL = finalManualCap - initialCapital;

    // --- LOGIC: FIXED ---
    const calculateFixed = () => {
        let currentCap = initialCapital;
        const rows = [];
        for (let i = 1; i <= days; i++) {
            const change = currentCap * (dailyPct / 100);
            currentCap += change;
            rows.push({ index: i, change, result: currentCap });
        }
        return rows;
    };

    const fixedResults = calculateFixed();
    const finalFixedCap = fixedResults.length > 0 ? fixedResults[fixedResults.length - 1].result : initialCapital;

    return (
        <div className="modal" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'var(--card-bg)', 
                width: '600px', 
                maxWidth: '95%', 
                borderRadius: '12px', 
                border: '1px solid var(--border)', 
                display: 'flex', 
                flexDirection: 'column',
                maxHeight: '90vh'
            }}>
                {/* HEADER */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}><i className="fas fa-calculator"></i> Compounding Calc</h2>
                    <button onClick={onClose} style={{ background: 'transparent', fontSize: '1.2rem', padding: 0, color: 'var(--text-muted)' }}>&times;</button>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                    <div 
                        onClick={() => setMode('manual')}
                        style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', background: mode === 'manual' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: mode === 'manual' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 'bold' }}
                    >
                        Sequence (Day-by-Day)
                    </div>
                    <div 
                        onClick={() => setMode('fixed')}
                        style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', background: mode === 'fixed' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: mode === 'fixed' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 'bold' }}
                    >
                        Fixed Growth %
                    </div>
                </div>

                {/* BODY */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    
                    {/* GLOBAL INPUT */}
                    <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                        <label>Initial Investment (₹)</label>
                        <input type="number" value={initialCapital} onChange={e => setInitialCapital(parseFloat(e.target.value) || 0)} style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }} />
                    </div>

                    {mode === 'manual' ? (
                        <>
                            {/* MANUAL INPUT FORM */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label>P/L Amount</label>
                                    <input type="number" value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="+200 or -100" />
                                </div>
                                <div style={{ width: '80px', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                                    <label style={{ fontSize: '0.7rem' }}>Type</label>
                                    <div 
                                        onClick={() => setIsNewValPct(!isNewValPct)}
                                        style={{ cursor: 'pointer', background: '#0f172a', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', color: isNewValPct ? 'var(--accent)' : 'var(--text-muted)' }}
                                    >
                                        {isNewValPct ? '%' : '₹'}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Note (Optional)</label>
                                    <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Day 1..." />
                                </div>
                                <button onClick={addManualEntry} style={{ height: '42px', marginBottom: '10px', background: 'var(--accent)' }}>Add</button>
                            </div>

                            {/* MANUAL TABLE */}
                            <div style={{ background: '#0f172a', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr', padding: '10px', background: 'rgba(255,255,255,0.05)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    <div>#</div>
                                    <div>P/L</div>
                                    <div>Capital</div>
                                    <div>Note</div>
                                    <div></div>
                                </div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {manualResults.map((row, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr', padding: '10px', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', alignItems: 'center' }}>
                                            <div style={{ color: 'var(--text-muted)' }}>{row.index}</div>
                                            <div style={{ color: row.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}
                                            </div>
                                            <div style={{ fontWeight: 'bold' }}>₹{row.result.toFixed(2)}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.note || '-'}</div>
                                            <div style={{ textAlign: 'right' }}>
                                                <i className="fas fa-trash" style={{ cursor: 'pointer', color: 'var(--danger)', opacity: 0.7 }} onClick={() => removeManualEntry(manualEntries[i].id)}></i>
                                            </div>
                                        </div>
                                    ))}
                                    {manualResults.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Add days to see projection</div>}
                                </div>
                                <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Days: {manualResults.length}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net P&L: <span style={{ color: manualTotalPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}>{manualTotalPnL.toFixed(2)}</span></div>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>₹{finalManualCap.toFixed(2)}</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* FIXED MODE INPUTS */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Daily Growth (%)</label>
                                    <input type="number" value={dailyPct} onChange={e => setDailyPct(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Number of Days</label>
                                    <input type="number" value={days} onChange={e => setDays(parseInt(e.target.value) || 1)} />
                                </div>
                            </div>

                            {/* FIXED TABLE */}
                            <div style={{ background: '#0f172a', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr', padding: '10px', background: 'rgba(255,255,255,0.05)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    <div>Day</div>
                                    <div>Profit</div>
                                    <div>Capital</div>
                                </div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {fixedResults.map((row) => (
                                        <div key={row.index} style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr', padding: '10px', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                            <div style={{ color: 'var(--text-muted)' }}>{row.index}</div>
                                            <div style={{ color: 'var(--success)' }}>+{row.change.toFixed(2)}</div>
                                            <div style={{ fontWeight: 'bold' }}>₹{row.result.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{days} Days @ {dailyPct}%</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>₹{finalFixedCap.toFixed(2)}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}