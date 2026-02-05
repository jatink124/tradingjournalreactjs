'use client';

import { useState, useEffect } from 'react';
import { JournalForm, Category, MistakeItem } from '../types';

// CONFIGURATION
const CLOUD_NAME = 'dsupeybo6'; 
const UPLOAD_PRESET = 'test123'; 

interface LeftPanelProps {
    currentMode: string;
    setCurrentMode: (m: string) => void;
    formData: JournalForm;
    setFormData: React.Dispatch<React.SetStateAction<JournalForm>>;
    handleSubmit: () => void;
    editingId: number | null;
    setEditingId: (id: number | null) => void;
    images: string[];
    setImages: React.Dispatch<React.SetStateAction<string[]>>;
    setShowChecklist: (show: boolean) => void;
    downloadSql: () => void;
    clearDb: () => void;
    categories: Category[];
    refreshCategories: () => void;
    addToCalculator: (amount: number, note: string) => void;
}

export default function LeftPanel({
    currentMode, setCurrentMode, formData, setFormData, handleSubmit, editingId, setEditingId,
    images, setImages, setShowChecklist, downloadSql, clearDb, categories, refreshCategories, addToCalculator
}: LeftPanelProps) {
    
    const [eodSection, setEodSection] = useState<'mistakes' | 'planning'>('mistakes');
    const [isUploading, setIsUploading] = useState(false);
    
    // NEW: Mistakes State
    const [availableMistakes, setAvailableMistakes] = useState<MistakeItem[]>([]);
    const [isMistakeEditMode, setIsMistakeEditMode] = useState(false);

    // FETCH MISTAKES ON LOAD
    useEffect(() => {
        fetchMistakes();
    }, []);

    const fetchMistakes = async () => {
        try {
            const res = await fetch('/api/mistakes');
            const data = await res.json();
            if (Array.isArray(data)) setAvailableMistakes(data);
        } catch (e) { console.error("Failed to load mistakes"); }
    };

    // --- MISTAKE CRUD HANDLERS ---
    const handleAddMistake = async () => {
        const name = prompt("Enter new mistake label:");
        if (!name) return;
        try {
            await fetch('/api/mistakes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name })
            });
            fetchMistakes();
        } catch (e) { alert("Failed to add mistake"); }
    };

    const handleRenameMistake = async (m: MistakeItem) => {
        const newName = prompt("Rename mistake:", m.name);
        if (!newName || newName === m.name) return;
        try {
            await fetch('/api/mistakes', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id: m.id, name: newName })
            });
            fetchMistakes();
        } catch (e) { alert("Failed to rename"); }
    };

    const handleDeleteMistake = async (id: number) => {
        if (!confirm("Permanently delete this mistake tag?")) return;
        try {
            await fetch(`/api/mistakes?id=${id}`, { method: 'DELETE' });
            fetchMistakes();
        } catch (e) { alert("Failed to delete"); }
    };

    // --- EXISTING HANDLERS ---
    const getMultiplier = () => {
        if (formData.assetType === 'NIFTY') return 65;
        if (formData.assetType === 'BTC') return 1;
        return 1;
    };

    const calculatePnLValue = () => {
        const entry = parseFloat(formData.tradeEntry) || 0;
        const exit = parseFloat(formData.tradeExit) || 0;
        const lots = Number(formData.tradeLots) || 0;
        if (entry > 0 && exit > 0) {
            const gross = (exit - entry) * (lots * getMultiplier());
            return (gross - 45).toFixed(2);
        }
        return "0.00";
    };

    const entryPrice = parseFloat(formData.tradeEntry) || 0;
    const slPrice = parseFloat(formData.tradeSL) || 0;
    const targetPrice = parseFloat(formData.tradeTarget) || 0;
    const riskPoints = entryPrice > 0 && slPrice > 0 ? Math.abs(entryPrice - slPrice) : 0;
    const rewardPoints = entryPrice > 0 && targetPrice > 0 ? Math.abs(targetPrice - entryPrice) : 0;
    const rrRatio = riskPoints > 0 ? (rewardPoints / riskPoints).toFixed(1) : "0";
    
    const calculateSuggestedLots = () => {
        const riskAmount = parseFloat(formData.tradeRisk) || 0;
        if (riskAmount > 0 && riskPoints > 0) {
            const multi = getMultiplier();
            const rawLots = riskAmount / (riskPoints * multi);
            return Math.floor(rawLots);
        }
        return 0;
    };
    const suggestedLots = calculateSuggestedLots();

    const handleInputChange = (field: keyof JournalForm, value: any) => {
        setFormData((prev: JournalForm) => ({ ...prev, [field]: value }));
    };

    const applySuggestedLots = () => {
        if (suggestedLots > 0) handleInputChange('tradeLots', suggestedLots);
    };

    const handleSendToCalc = () => {
        const pnl = parseFloat(calculatePnLValue());
        if (pnl !== 0) addToCalculator(pnl, `${formData.assetType} Trade`);
    };

    const handleAddCategory = async () => {
        const newCat = prompt("Enter new Focus Area name:");
        if (newCat) {
            try {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name: newCat })
                });
                if(!res.ok) throw new Error("Failed");
                refreshCategories();
                setFormData((prev: JournalForm) => ({ ...prev, focusArea: newCat }));
            } catch (e) { alert("Failed to add category"); }
        }
    };

    const handleDeleteCategory = async () => {
        const cat = categories.find(c => c.name === formData.focusArea);
        if (cat && confirm(`Delete category "${cat.name}" permanently?`)) {
            try {
                await fetch(`/api/categories?id=${cat.id}`, { method: 'DELETE' });
                refreshCategories();
                setFormData((prev: JournalForm) => ({ ...prev, focusArea: categories[0]?.name || '' }));
            } catch (e) { alert("Failed to delete category"); }
        }
    };

    const toggleMistake = (mistakeName: string) => {
        setFormData((prev: JournalForm) => {
            const exists = prev.mistakes.includes(mistakeName);
            return { ...prev, mistakes: exists ? prev.mistakes.filter((m: string) => m !== mistakeName) : [...prev.mistakes, mistakeName] };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsUploading(true);
        const files = Array.from(e.target.files);
        try {
            const uploadPromises = files.map(file => {
                const uploadData = new FormData();
                uploadData.append('file', file);
                uploadData.append('upload_preset', UPLOAD_PRESET);
                return fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                    method: 'POST', body: uploadData
                }).then(res => res.json()).then(data => {
                    if (data.secure_url) return data.secure_url;
                    throw new Error("Upload failed");
                });
            });
            const uploadedUrls = await Promise.all(uploadPromises);
            setImages(prev => [...prev, ...uploadedUrls]);
        } catch (error) { alert("Failed to upload image."); } 
        finally { setIsUploading(false); e.target.value = ''; }
    };

    const handleResourceRowChange = (index: number, key: 'k' | 'v', val: string) => {
        setFormData((prev: JournalForm) => {
            const newRows = [...prev.resourceRows];
            const row = newRows[index];
            if (!row) return prev;
            newRows[index] = { ...row, [key]: val };
            return { ...prev, resourceRows: newRows };
        });
    };
    const addResourceRow = () => setFormData((prev: JournalForm) => ({ ...prev, resourceRows: [...prev.resourceRows, { k: '', v: '' }] }));
    const removeResourceRow = (index: number) => setFormData((prev: JournalForm) => ({ ...prev, resourceRows: prev.resourceRows.filter((_: any, i: number) => i !== index) }));

    return (
        <div className="input-panel">
            {/* TABS */}
            <div className="mode-tabs">
                {['live', 'trade', 'eod', 'source'].map(m => (
                    <div key={m}
                        className={`mode-tab ${currentMode === m ? (m === 'eod' ? 'active-eod' : m === 'source' ? 'active-cyan' : m === 'trade' ? 'active-green' : 'active') : ''}`}
                        onClick={() => setCurrentMode(m)}>
                        {m === 'live' ? '⚡ Live' : m === 'trade' ? '💰 Trade' : m === 'eod' ? '📖 EOD' : '🌐 Res'}
                    </div>
                ))}
            </div>

            {/* SHARED INPUTS */}
            <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:'10px'}}>
                <div>
                    <label>Date & Time</label>
                    <input type="datetime-local" value={formData.entryTime} onChange={(e) => handleInputChange('entryTime', e.target.value)} />
                </div>
                <div>
                    <label>Trend</label>
                    <select value={formData.marketTrend} onChange={(e) => handleInputChange('marketTrend', e.target.value)}>
                        <option value="Sideways">🟡 Side</option>
                        <option value="Uptrend">🟢 Up</option>
                        <option value="Downtrend">🔴 Down</option>
                    </select>
                </div>
            </div>

            <label>Asset</label>
            <div style={{display:'flex', gap:'5px'}}>
                <select style={{flex:1}} value={formData.assetType} onChange={(e) => handleInputChange('assetType', e.target.value)}>
                    <option value="NIFTY">NIFTY</option>
                    <option value="BTC">BTC</option>
                    <option value="STOCK">Stock</option>
                </select>
                {formData.assetType === 'STOCK' && (
                    <input style={{flex:1}} type="text" placeholder="Symbol" value={formData.stockName} onChange={(e) => handleInputChange('stockName', e.target.value)} />
                )}
            </div>

            {/* LIVE FORM */}
            {currentMode === 'live' && (
                <div>
                    <h2>Micro Observation</h2>
                    <button className="btn-checklist" onClick={() => setShowChecklist(true)}><i className="fas fa-clipboard-check"></i> Consult Checklist</button>
                    <label>Focus Area</label>
                    <div className="dyn-row">
                        <select value={formData.focusArea} onChange={(e) => handleInputChange('focusArea', e.target.value)} style={{marginBottom:0}}>
                            {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option>Loading...</option>}
                        </select>
                        <button onClick={handleAddCategory} style={{width:'40px', background:'var(--success)', padding:0, display:'flex', alignItems:'center', justifyContent:'center', height:'38px'}}>+</button>
                        <button onClick={handleDeleteCategory} style={{width:'40px', background:'var(--danger)', padding:0, display:'flex', alignItems:'center', justifyContent:'center', height:'38px'}}><i className="fas fa-trash"></i></button>
                    </div>
                    <label>Notes</label>
                    <textarea value={formData.liveNotes} onChange={(e) => handleInputChange('liveNotes', e.target.value)} placeholder="Market behavior..."></textarea>
                </div>
            )}

            {/* TRADE FORM */}
            {currentMode === 'trade' && (
                <div className="fade-in">
                    <h2 style={{ color: 'var(--success)', display:'flex', justifyContent:'space-between' }}>
                        Trade Execution <span style={{fontSize:'0.7rem', opacity:0.6, fontWeight:'normal'}}>Multiplier: {getMultiplier()}x</span>
                    </h2>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', marginBottom: '10px', border:'1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div><label style={{color:'var(--text-muted)', fontSize:'0.75rem'}}>Entry</label><input type="number" value={formData.tradeEntry} onChange={(e) => handleInputChange('tradeEntry', e.target.value)} style={{borderBottom:'2px solid var(--text-main)'}} /></div>
                            <div><label style={{color:'var(--danger)', fontSize:'0.75rem'}}>Stop Loss</label><input type="number" value={formData.tradeSL} onChange={(e) => handleInputChange('tradeSL', e.target.value)} style={{borderBottom:'2px solid var(--danger)'}} /></div>
                            <div><label style={{color:'var(--success)', fontSize:'0.75rem'}}>Target</label><input type="number" value={formData.tradeTarget} onChange={(e) => handleInputChange('tradeTarget', e.target.value)} style={{borderBottom:'2px solid var(--success)'}} /></div>
                        </div>
                        {riskPoints > 0 && (
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'8px', fontSize:'0.8rem' }}>
                                <span style={{color:'var(--text-muted)'}}>Risk: {riskPoints.toFixed(2)} pts</span>
                                <span style={{fontWeight:'bold', color: parseFloat(rrRatio) >= 2 ? 'var(--success)' : parseFloat(rrRatio) >= 1 ? 'var(--accent)' : 'var(--danger)'}}>1 : {rrRatio} R/R</span>
                            </div>
                        )}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'10px', alignItems:'end', marginBottom:'15px' }}>
                        <div><label>Risk Limit (₹)</label><input type="number" placeholder="e.g. 500" value={formData.tradeRisk} onChange={(e) => handleInputChange('tradeRisk', e.target.value)} /></div>
                        <div>
                            <label>Lots / Qty</label>
                            <div style={{display:'flex'}}>
                                <input type="number" value={formData.tradeLots} onChange={(e) => handleInputChange('tradeLots', e.target.value)} style={{borderTopRightRadius:0, borderBottomRightRadius:0}} />
                                {suggestedLots > 0 && <button onClick={applySuggestedLots} style={{width:'auto', padding:'0 8px', fontSize:'0.7rem', background:'var(--cyan)', color:'#000', borderTopLeftRadius:0, borderBottomLeftRadius:0}}>Use {suggestedLots}</button>}
                            </div>
                        </div>
                    </div>
                    <div style={{ borderTop:'1px dashed var(--border)', paddingTop:'15px', marginTop:'5px' }}>
                         <label>Exit Price</label>
                         <input type="number" value={formData.tradeExit} onChange={(e) => handleInputChange('tradeExit', e.target.value)} />
                         <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px' }}>
                            <div><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display:'block' }}>Net P&L (approx)</span><div style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'monospace' }} className={parseFloat(calculatePnLValue()) >= 0 ? 'pnl-green' : 'pnl-red'}>{calculatePnLValue()}</div></div>
                            <button onClick={handleSendToCalc} style={{ height:'36px', background:'var(--accent)', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'5px', padding:'0 12px' }}><i className="fas fa-calculator"></i> To Calc</button>
                        </div>
                    </div>
                    <label style={{marginTop:'10px'}}>Learning / Notes</label>
                    <textarea value={formData.tradeLearning} onChange={(e) => handleInputChange('tradeLearning', e.target.value)} placeholder="What did I learn?"></textarea>
                </div>
            )}

            {/* EOD FORM (UPDATED WITH CRUD MISTAKES) */}
            {currentMode === 'eod' && (
                <div>
                    <h2 style={{ color: 'var(--purple)' }}>Daily Review</h2>
                    <div style={{display:'flex', marginBottom:'15px', background:'var(--feed-bg)', borderRadius:'6px', padding:'4px', border:'1px solid var(--border)'}}>
                        <div onClick={() => setEodSection('mistakes')} style={{flex:1, textAlign:'center', padding:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'600', borderRadius:'4px', transition:'0.2s', background: eodSection === 'mistakes' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: eodSection === 'mistakes' ? 'var(--danger)' : 'var(--text-muted)'}}>Mistakes 🛑</div>
                        <div onClick={() => setEodSection('planning')} style={{flex:1, textAlign:'center', padding:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'600', borderRadius:'4px', transition:'0.2s', background: eodSection === 'planning' ? 'rgba(16, 185, 129, 0.2)' : 'transparent', color: eodSection === 'planning' ? 'var(--success)' : 'var(--text-muted)'}}>Planning 🎯</div>
                    </div>

                    {eodSection === 'mistakes' && (
                        <div className="fade-in">
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
                                <label style={{color:'var(--danger)', margin:0}}>Identify Mistakes</label>
                                <div style={{display:'flex', gap:'5px'}}>
                                    <button onClick={handleAddMistake} style={{padding:'2px 8px', fontSize:'0.7rem', background:'var(--success)', height:'auto'}} title="Add new">+ Add</button>
                                    <button onClick={() => setIsMistakeEditMode(!isMistakeEditMode)} style={{padding:'2px 8px', fontSize:'0.7rem', background: isMistakeEditMode ? 'var(--accent)' : 'var(--border)', height:'auto'}} title="Manage Mistakes">{isMistakeEditMode ? 'Done' : 'Edit'}</button>
                                </div>
                            </div>

                            <div className="chip-container">
                                {availableMistakes.map(m => (
                                    <div 
                                        key={m.id} 
                                        className={`chip ${formData.mistakes.includes(m.name) ? 'selected' : ''}`} 
                                        onClick={() => isMistakeEditMode ? handleRenameMistake(m) : toggleMistake(m.name)}
                                        style={{position:'relative', paddingRight: isMistakeEditMode ? '25px' : '10px'}}
                                    >
                                        {m.name}
                                        {isMistakeEditMode && (
                                            <span 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteMistake(m.id); }}
                                                style={{position:'absolute', right:'5px', top:'50%', transform:'translateY(-50%)', width:'16px', height:'16px', background:'var(--danger)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', color:'#fff'}}
                                            >
                                                &times;
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {availableMistakes.length === 0 && <span style={{fontSize:'0.8rem', color:'var(--text-muted)', fontStyle:'italic'}}>No mistakes defined. Click "+ Add".</span>}
                            </div>

                            <label style={{marginTop:'15px'}}>Mistake Details / Psychology</label>
                            <textarea value={formData.negNotes} onChange={(e) => handleInputChange('negNotes', e.target.value)} placeholder="Why did I make these mistakes?" style={{minHeight:'100px', borderColor:'rgba(239, 68, 68, 0.3)'}}></textarea>
                        </div>
                    )}

                    {eodSection === 'planning' && (
                        <div className="fade-in">
                            <label style={{color:'var(--success)'}}>Market Bias</label>
                            <select value={formData.planBias} onChange={(e) => handleInputChange('planBias', e.target.value)}><option>Neutral</option><option>Bullish 🐂</option><option>Bearish 🐻</option></select>
                            <label>Key Level (Support/Resistance)</label>
                            <input type="text" value={formData.keyLevel} onChange={(e) => handleInputChange('keyLevel', e.target.value)} placeholder="e.g., 22500, 48000" />
                            <label>Action Plan for Tomorrow</label>
                            <textarea value={formData.planNotes} onChange={(e) => handleInputChange('planNotes', e.target.value)} placeholder="Plan..." style={{minHeight:'100px', borderColor:'rgba(16, 185, 129, 0.3)'}}></textarea>
                        </div>
                    )}
                </div>
            )}

            {currentMode === 'source' && (
                <div>
                    <h2 style={{ color: 'var(--cyan)' }}>External Insights</h2>
                    {formData.resourceRows.map((row: any, i: number) => (
                        <div className="dyn-row" key={i}>
                            <input type="text" placeholder="Source" value={row.k} onChange={(e) => handleResourceRowChange(i, 'k', e.target.value)} />
                            <input type="text" placeholder="Info" value={row.v} onChange={(e) => handleResourceRowChange(i, 'v', e.target.value)} />
                            <div className="dyn-del" onClick={() => removeResourceRow(i)}>&times;</div>
                        </div>
                    ))}
                    <button onClick={addResourceRow} style={{ background: 'var(--border)', width: '100%', marginTop: '5px', fontSize: '0.8rem' }}>+ Add Field</button>
                </div>
            )}

            <label>Screenshots {isUploading && <span style={{color: 'var(--cyan)'}}>(Uploading...)</span>}</label>
            <div className="drop-zone" style={{ position: 'relative', border: `1px dashed ${isUploading ? 'var(--cyan)' : 'var(--border)'}`, padding: '15px', textAlign: 'center', cursor: isUploading ? 'not-allowed' : 'pointer', marginBottom: '10px' }}>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>{isUploading ? "Uploading..." : "Add Images (Click or Drop)"}</p>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={isUploading} style={{ opacity: 0, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', cursor: isUploading ? 'not-allowed' : 'pointer' }} />
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {images.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                        <img src={img} style={{ width: '50px', height: '50px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                        <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 0, right: 0, background: 'red', padding: '2px 5px', fontSize: '0.6rem' }}>X</button>
                    </div>
                ))}
            </div>

            <button id="btnSubmit" onClick={handleSubmit} disabled={isUploading} style={{opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer'}}>
                {isUploading ? "Uploading Images..." : (editingId ? "Update Entry" : `Save ${currentMode === 'eod' ? (eodSection === 'mistakes' ? 'Mistakes' : 'Plan') : 'Entry'}`)}
            </button>
            {editingId && <button onClick={() => { setEditingId(null); setImages([]); }} style={{ background: 'var(--border)', marginTop: '5px' }}>Cancel Edit</button>}

            <div className="btn-group">
                <button className="btn-sql" onClick={downloadSql} style={{ background: 'var(--cyan)', color: '#000', fontSize: '0.7rem' }}>SQL EXPORT</button>
                <button className="btn-clear" onClick={clearDb} style={{ background: 'var(--danger)', fontSize: '0.7rem' }}>CLEAR DB</button>
            </div>
        </div>
    );
}
