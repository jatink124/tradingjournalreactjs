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

type SimulationRow = {
    index: number;
    type: 'win' | 'loss' | 'fixed';
    changePct: number;
    change: number;
    result: number;
    drawdown: number;
};

export function CompoundingCalculator({ isOpen, onClose }: CompoundingCalculatorProps) {
    // --- TABS: 'manual' | 'projection' | 'goal' ---
    const [mode, setMode] = useState<'manual' | 'projection' | 'goal'>('manual');
    const [initialCapital, setInitialCapital] = useState<number>(3000);

    // --- MANUAL MODE STATE ---
    const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
    const [newVal, setNewVal] = useState('');
    const [isNewValPct, setIsNewValPct] = useState(false);
    const [newNote, setNewNote] = useState('');

    // --- PROJECTION MODE STATE ---
    const [projType, setProjType] = useState<'constant' | 'variable'>('constant');
    const [days, setDays] = useState(20);
    const [dailyPct, setDailyPct] = useState(2); // Constant mode
    const [simWinRate, setSimWinRate] = useState(60); 
    const [simWinPct, setSimWinPct] = useState(2);    
    const [simLossPct, setSimLossPct] = useState(1);
    const [simResults, setSimResults] = useState<SimulationRow[]>([]);

    // --- GOAL PLANNER STATE (New Feature) ---
    const [targetCapital, setTargetCapital] = useState<number>(10000); // "Return of 10000"
    const [goalDays, setGoalDays] = useState<number>(20);
    const [goalWinRate, setGoalWinRate] = useState<number>(60);
    const [goalLossPct, setGoalLossPct] = useState<number>(1); // User's preferred risk
    
    // Calculated requirements
    const [reqDailyPct, setReqDailyPct] = useState(0);
    const [reqWinPct, setReqWinPct] = useState(0);

    // --- EFFECT: Recalculate when inputs change ---
    useEffect(() => {
        if (!isOpen) return;

        if (mode === 'projection') {
            runSimulation();
        } else if (mode === 'goal') {
            calculateGoal();
        }
    }, [
        initialCapital, days, dailyPct, projType, simWinRate, simWinPct, simLossPct, // Projection deps
        targetCapital, goalDays, goalWinRate, goalLossPct,                           // Goal deps
        mode, isOpen
    ]);

    if (!isOpen) return null;

    // ==========================================
    // 1. LOGIC: MANUAL JOURNAL
    // ==========================================
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
        return manualEntries.map((e, i) => {
            let change = e.isPercentage ? currentCap * (e.val / 100) : e.val;
            currentCap += change;
            return { index: i + 1, change, result: currentCap, note: e.note };
        });
    };
    
    const manualResults = calculateManual();
    const finalManualCap = manualResults.length > 0 ? manualResults[manualResults.length - 1].result : initialCapital;

    // ==========================================
    // 2. LOGIC: PROJECTION (SIMULATION)
    // ==========================================
    const runSimulation = () => {
        let currentCap = initialCapital;
        let peakCap = initialCapital;
        const rows: SimulationRow[] = [];

        for (let i = 1; i <= days; i++) {
            let changePct = 0;
            let type: 'fixed' | 'win' | 'loss' = 'fixed';

            if (projType === 'constant') {
                changePct = dailyPct;
                type = 'fixed';
            } else {
                const isWin = Math.random() * 100 < simWinRate;
                changePct = isWin ? simWinPct : -simLossPct;
                type = isWin ? 'win' : 'loss';
            }

            const change = currentCap * (changePct / 100);
            currentCap += change;
            
            // Drawdown Calc
            if (currentCap > peakCap) peakCap = currentCap;
            const drawdown = ((peakCap - currentCap) / peakCap) * 100;

            rows.push({ index: i, type, changePct, change, result: currentCap, drawdown });
        }
        setSimResults(rows);
    };

    const finalSimCap = simResults.length > 0 ? simResults[simResults.length - 1].result : initialCapital;
    const simROI = initialCapital > 0 ? ((finalSimCap - initialCapital) / initialCapital) * 100 : 0;

    // ==========================================
    // 3. LOGIC: GOAL PLANNER
    // ==========================================
    const calculateGoal = () => {
        if (goalDays <= 0 || initialCapital <= 0) return;

        // Step A: Calculate "Required Average Daily Growth" (CAGR)
        // Formula: (Target / Initial)^(1/Days) - 1
        const ratio = targetCapital / initialCapital;
        const dailyRate = Math.pow(ratio, 1 / goalDays) - 1;
        setReqDailyPct(dailyRate * 100);

        // Step B: Solve for "Required Win %" (Reward) given a Risk %
        // Equation: (1 + Daily)^1 = (1 + WinPct)^WinRate * (1 - LossPct)^LossRate
        // Rearranged to find WinPct.
        const WR = goalWinRate / 100;
        const LR = 1 - WR;
        const LP = goalLossPct / 100; // Loss % as decimal (positive value)

        if (WR > 0) {
            const log1PlusDaily = Math.log(1 + dailyRate);
            const log1MinusLoss = Math.log(1 - LP);
            
            // Algebra: ln(1+W) = [ ln(1+D) - LR*ln(1-L) ] / WR
            const numerator = log1PlusDaily - (LR * log1MinusLoss);
            const log1PlusWin = numerator / WR;
            
            const requiredWinDecimal = Math.exp(log1PlusWin) - 1;
            setReqWinPct(requiredWinDecimal * 100);
        } else {
            setReqWinPct(0);
        }
    };

    return (
        <div className="modal" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'var(--card-bg)', 
                width: '750px', 
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
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                    <div onClick={() => setMode('manual')}
                        style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', background: mode === 'manual' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: mode === 'manual' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                        Sequence
                    </div>
                    <div onClick={() => setMode('projection')}
                        style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', background: mode === 'projection' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: mode === 'projection' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                        Projection
                    </div>
                    <div onClick={() => setMode('goal')}
                        style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', background: mode === 'goal' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: mode === 'goal' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                        Goal Planner
                    </div>
                </div>

                {/* BODY CONTENT */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    
                    {/* GLOBAL INPUT: Initial Capital */}
                    <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                        <label style={{color:'var(--text-muted)', fontSize:'0.85rem', display:'block', marginBottom:'5px'}}>Initial Investment (₹)</label>
                        <input 
                            type="number" 
                            value={initialCapital} 
                            onChange={e => setInitialCapital(parseFloat(e.target.value) || 0)} 
                            style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)', width:'100%', background:'transparent', border:'none', borderBottom:'1px solid var(--border)', padding:'5px' }} 
                        />
                    </div>

                    {/* --- TAB 1: MANUAL SEQUENCE --- */}
                    {mode === 'manual' && (
                        <>
                            {/* INPUT FORM */}
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
                                    <label>Note</label>
                                    <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Day 1..." />
                                </div>
                                <button onClick={addManualEntry} style={{ height: '42px', marginBottom: '10px', background: 'var(--accent)' }}>Add</button>
                            </div>

                            {/* TABLE */}
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
                                            <div style={{ color: row.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>{row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}</div>
                                            <div style={{ fontWeight: 'bold' }}>₹{row.result.toFixed(2)}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.note || '-'}</div>
                                            <div style={{ textAlign: 'right' }}><i className="fas fa-trash" style={{ cursor: 'pointer', color: 'var(--danger)', opacity: 0.7 }} onClick={() => removeManualEntry(manualEntries[i].id)}></i></div>
                                        </div>
                                    ))}
                                    {manualResults.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Add days to see projection</div>}
                                </div>
                                <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net P&L: <span style={{ color: (finalManualCap - initialCapital) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{(finalManualCap - initialCapital).toFixed(2)}</span></div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>₹{finalManualCap.toFixed(2)}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TAB 2: PROJECTION --- */}
                    {mode === 'projection' && (
                        <>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <button onClick={() => setProjType('constant')} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: projType === 'constant' ? '1px solid var(--accent)' : '1px solid var(--border)', background: projType === 'constant' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: projType === 'constant' ? 'var(--accent)' : 'var(--text-muted)' }}>Constant Growth</button>
                                <button onClick={() => setProjType('variable')} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: projType === 'variable' ? '1px solid var(--accent)' : '1px solid var(--border)', background: projType === 'variable' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: projType === 'variable' ? 'var(--accent)' : 'var(--text-muted)' }}>Win/Loss Sim</button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 80px' }}><label>Days</label><input type="number" value={days} onChange={e => setDays(parseInt(e.target.value) || 1)} /></div>
                                {projType === 'constant' ? (
                                    <div style={{ flex: '1 1 150px' }}><label>Daily Growth (%)</label><input type="number" value={dailyPct} onChange={e => setDailyPct(parseFloat(e.target.value) || 0)} /></div>
                                ) : (
                                    <>
                                        <div style={{ flex: '1 1 80px' }}><label>Win Rate (%)</label><input type="number" value={simWinRate} onChange={e => setSimWinRate(parseFloat(e.target.value) || 50)} /></div>
                                        <div style={{ flex: '1 1 80px' }}><label>Win (%)</label><input type="number" value={simWinPct} onChange={e => setSimWinPct(parseFloat(e.target.value) || 0)} style={{ borderColor: 'var(--success)' }} /></div>
                                        <div style={{ flex: '1 1 80px' }}><label>Loss (%)</label><input type="number" value={simLossPct} onChange={e => setSimLossPct(parseFloat(e.target.value) || 0)} style={{ borderColor: 'var(--danger)' }} /></div>
                                    </>
                                )}
                            </div>
                            {projType === 'variable' && <button onClick={runSimulation} style={{ width: '100%', marginBottom: '15px', background: 'var(--accent)', color: 'white', padding: '8px', borderRadius: '6px' }}><i className="fas fa-random"></i> Re-Simulate</button>}
                            
                            <div style={{ background: '#0f172a', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 1fr', padding: '10px', background: 'rgba(255,255,255,0.05)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    <div>Day</div><div>Result</div><div>%</div><div>P/L</div><div>Cap</div>
                                </div>
                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                    {simResults.map((row) => (
                                        <div key={row.index} style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 1fr', padding: '10px', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', alignItems: 'center' }}>
                                            <div style={{ color: 'var(--text-muted)' }}>{row.index}</div>
                                            <div style={{ fontSize: '0.75rem', fontWeight:'bold', color: row.type==='win'?'var(--success)':row.type==='loss'?'var(--danger)':'var(--accent)' }}>{row.type.toUpperCase()}</div>
                                            <div style={{ color: row.changePct >= 0 ? 'var(--success)' : 'var(--danger)' }}>{row.changePct >= 0 ? '+' : ''}{row.changePct}%</div>
                                            <div style={{ color: row.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>{Math.round(row.change)}</div>
                                            <div style={{ fontWeight: 'bold' }}>₹{Math.round(row.result)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderTop: '1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>ROI: {simROI.toFixed(1)}%</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>₹{finalSimCap.toFixed(0)}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TAB 3: GOAL PLANNER (Requested Feature) --- */}
                    {mode === 'goal' && (
                        <>
                            {/* GOAL INPUTS */}
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap:'wrap' }}>
                                <div style={{ flex: '1 1 150px' }}>
                                    <label>Target Capital (₹)</label>
                                    <input type="number" value={targetCapital} onChange={e => setTargetCapital(parseFloat(e.target.value) || 0)} style={{ borderColor: 'var(--accent)' }} />
                                    <small style={{display:'block', color:'var(--text-muted)', fontSize:'0.7rem', marginTop:'2px'}}>e.g. 10000</small>
                                </div>
                                <div style={{ flex: '1 1 100px' }}>
                                    <label>Days</label>
                                    <input type="number" value={goalDays} onChange={e => setGoalDays(parseInt(e.target.value) || 20)} />
                                </div>
                            </div>

                            {/* ASSUMPTIONS */}
                            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '20px', border:'1px solid var(--border)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Trading Stats (Assumptions)</h4>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label>Win Rate (%)</label>
                                        <input type="number" value={goalWinRate} onChange={e => setGoalWinRate(parseFloat(e.target.value) || 50)} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Max Loss per Trade (%)</label>
                                        <input type="number" value={goalLossPct} onChange={e => setGoalLossPct(parseFloat(e.target.value) || 1)} style={{ borderColor: 'var(--danger)' }} />
                                    </div>
                                </div>
                            </div>

                            {/* RESULTS CARD */}
                            <div style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom:'20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <div style={{textAlign:'center', flex:1}}>
                                        <div style={{fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'5px'}}>Req. Daily Growth</div>
                                        <div style={{fontSize:'1.8rem', fontWeight:'bold', color: reqDailyPct > 5 ? '#f87171' : 'var(--success)'}}>
                                            {reqDailyPct.toFixed(2)}%
                                        </div>
                                        {reqDailyPct > 5 && <div style={{fontSize:'0.7rem', color:'#f87171'}}>High Difficulty!</div>}
                                    </div>
                                    <div style={{width:'1px', background:'var(--border)'}}></div>
                                    <div style={{textAlign:'center', flex:1}}>
                                        <div style={{fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'5px'}}>Required Profit (Win %)</div>
                                        <div style={{fontSize:'1.8rem', fontWeight:'bold', color: 'var(--accent)'}}>
                                            {reqWinPct.toFixed(2)}%
                                        </div>
                                        <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>
                                            Reward:Risk = {(reqWinPct/goalLossPct).toFixed(1)}:1
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', background:'rgba(0,0,0,0.2)', padding:'10px', borderRadius:'6px' }}>
                                    To grow from <b>₹{initialCapital}</b> to <b>₹{targetCapital}</b> in <b>{goalDays} days</b>:
                                    <br />
                                    You need a <b>{reqWinPct.toFixed(2)}%</b> gain on winning trades, assuming you lose <b>{goalLossPct}%</b> on losing trades (with {goalWinRate}% accuracy).
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}