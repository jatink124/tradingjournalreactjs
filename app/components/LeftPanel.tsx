'use client';

import React, { useState } from 'react';
import { JournalForm, Category } from '../types';

// --- CONFIGURATION ---
// REPLACE THESE WITH YOUR CLOUDINARY DETAILS
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
}

export default function LeftPanel({
    currentMode, setCurrentMode, formData, setFormData, handleSubmit, editingId, setEditingId,
    images, setImages, setShowChecklist, downloadSql, clearDb, categories, refreshCategories
}: LeftPanelProps) {
    
    // --- LOCAL STATE ---
    const [eodSection, setEodSection] = useState<'mistakes' | 'planning'>('mistakes');
    const [isUploading, setIsUploading] = useState(false); // New state for loading spinner

    // --- CATEGORY CRUD LOGIC ---
    const handleAddCategory = async () => {
        const newCat = prompt("Enter new Focus Area name:");
        if (newCat) {
            try {
                await fetch('/api/categories', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name: newCat })
                });
                refreshCategories();
                setFormData(prev => ({ ...prev, focusArea: newCat }));
            } catch (e) { alert("Failed to add category"); }
        }
    };

    const handleDeleteCategory = async () => {
        const cat = categories.find(c => c.name === formData.focusArea);
        if (cat && confirm(`Delete category "${cat.name}" permanently?`)) {
            try {
                await fetch(`/api/categories?id=${cat.id}`, { method: 'DELETE' });
                refreshCategories();
                setFormData(prev => ({ ...prev, focusArea: categories[0]?.name || '' }));
            } catch (e) { alert("Failed to delete category"); }
        }
    };

    // --- FORM HANDLERS ---
    const handleInputChange = (field: keyof JournalForm, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleMistake = (mistake: string) => {
        setFormData(prev => {
            const exists = prev.mistakes.includes(mistake);
            return { ...prev, mistakes: exists ? prev.mistakes.filter(m => m !== mistake) : [...prev.mistakes, mistake] };
        });
    };

    const calculatePnL = () => {
        const entry = parseFloat(formData.tradeEntry) || 0;
        const exit = parseFloat(formData.tradeExit) || 0;
        const lots = Number(formData.tradeLots) || 0;
        if (entry > 0 && exit > 0) return ((exit - entry) * (lots * 75) - 45).toFixed(2);
        return "0.00";
    };

    // --- NEW CLOUDINARY UPLOAD LOGIC ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        const files = Array.from(e.target.files);

        try {
            const uploadPromises = files.map(file => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', UPLOAD_PRESET);

                // Upload to Cloudinary API
                return fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.secure_url) {
                        return data.secure_url;
                    } else {
                        console.error("Upload error:", data);
                        throw new Error("Upload failed");
                    }
                });
            });

            // Wait for all files to upload
            const uploadedUrls = await Promise.all(uploadPromises);
            
            // Add new URLs to the existing images list
            setImages(prev => [...prev, ...uploadedUrls]);

        } catch (error) {
            console.error("Error uploading images:", error);
            alert("Failed to upload image. Check your Cloud Name and Preset.");
        } finally {
            setIsUploading(false);
            // Clear the input so you can upload the same file again if needed
            e.target.value = ''; 
        }
    };

    const handleResourceRowChange = (index: number, key: 'k' | 'v', val: string) => {
        const newRows = [...formData.resourceRows];
        newRows[index][key] = val;
        setFormData(prev => ({ ...prev, resourceRows: newRows }));
    };

    const addResourceRow = () => setFormData(prev => ({ ...prev, resourceRows: [...prev.resourceRows, { k: '', v: '' }] }));
    const removeResourceRow = (index: number) => setFormData(prev => ({ ...prev, resourceRows: prev.resourceRows.filter((_, i) => i !== index) }));

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

            {/* GLOBAL INPUTS */}
            <label>Date & Time</label>
            <input type="datetime-local" value={formData.entryTime} onChange={(e) => handleInputChange('entryTime', e.target.value)} />

            <label>Asset</label>
            <select value={formData.assetType} onChange={(e) => handleInputChange('assetType', e.target.value)}>
                <option value="NIFTY">NIFTY</option>
                <option value="BTC">BTC</option>
                <option value="STOCK">Individual Stock</option>
            </select>
            {formData.assetType === 'STOCK' && (
                <input type="text" placeholder="Symbol" value={formData.stockName} onChange={(e) => handleInputChange('stockName', e.target.value)} />
            )}

            <label>Market Trend</label>
            <select value={formData.marketTrend} onChange={(e) => handleInputChange('marketTrend', e.target.value)}>
                <option value="Sideways">Sideways 🟡</option>
                <option value="Uptrend">Uptrend 🟢</option>
                <option value="Downtrend">Downtrend 🔴</option>
            </select>

            {/* LIVE FORM */}
            {currentMode === 'live' && (
                <div>
                    <h2>Micro Observation</h2>
                    <button className="btn-checklist" onClick={() => setShowChecklist(true)}><i className="fas fa-clipboard-check"></i> Consult Checklist</button>
                    
                    <label>Focus Area</label>
                    <div className="dyn-row">
                        <select value={formData.focusArea} onChange={(e) => handleInputChange('focusArea', e.target.value)} style={{marginBottom:0}}>
                            {categories.length > 0 ? (
                                categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                            ) : (
                                <option>Loading...</option>
                            )}
                        </select>
                        <button onClick={handleAddCategory} style={{width:'40px', background:'var(--success)', padding:0, display:'flex', alignItems:'center', justifyContent:'center', height:'38px'}} title="Add Category">+</button>
                        <button onClick={handleDeleteCategory} style={{width:'40px', background:'var(--danger)', padding:0, display:'flex', alignItems:'center', justifyContent:'center', height:'38px'}} title="Delete Selected"><i className="fas fa-trash"></i></button>
                    </div>

                    <label>Notes</label>
                    <textarea value={formData.liveNotes} onChange={(e) => handleInputChange('liveNotes', e.target.value)} placeholder="Market behavior..."></textarea>
                </div>
            )}

            {/* TRADE FORM */}
            {currentMode === 'trade' && (
                <div>
                    <h2 style={{ color: 'var(--success)' }}>Trade Log</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><label>Entry</label><input type="number" value={formData.tradeEntry} onChange={(e) => handleInputChange('tradeEntry', e.target.value)} /></div>
                        <div><label>Exit</label><input type="number" value={formData.tradeExit} onChange={(e) => handleInputChange('tradeExit', e.target.value)} /></div>
                    </div>
                    <label>Lots</label>
                    <input type="number" value={formData.tradeLots} onChange={(e) => handleInputChange('tradeLots', e.target.value)} />
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net P&L</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }} className={parseFloat(calculatePnL()) >= 0 ? 'pnl-green' : 'pnl-red'}>
                            {calculatePnL()}
                        </div>
                    </div>
                    <label>Learning</label>
                    <textarea value={formData.tradeLearning} onChange={(e) => handleInputChange('tradeLearning', e.target.value)}></textarea>
                </div>
            )}

            {/* EOD FORM (SPLIT INTO SECTIONS) */}
            {currentMode === 'eod' && (
                <div>
                    <h2 style={{ color: 'var(--purple)' }}>Daily Review</h2>
                    
                    {/* SUB-TABS */}
                    <div style={{display:'flex', marginBottom:'15px', background:'var(--feed-bg)', borderRadius:'6px', padding:'4px', border:'1px solid var(--border)'}}>
                        <div 
                            onClick={() => setEodSection('mistakes')}
                            style={{
                                flex:1, textAlign:'center', padding:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'600',
                                borderRadius:'4px', transition:'0.2s',
                                background: eodSection === 'mistakes' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                color: eodSection === 'mistakes' ? 'var(--danger)' : 'var(--text-muted)'
                            }}
                        >
                            Mistakes 🛑
                        </div>
                        <div 
                            onClick={() => setEodSection('planning')}
                            style={{
                                flex:1, textAlign:'center', padding:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'600',
                                borderRadius:'4px', transition:'0.2s',
                                background: eodSection === 'planning' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                color: eodSection === 'planning' ? 'var(--success)' : 'var(--text-muted)'
                            }}
                        >
                            Planning 🎯
                        </div>
                    </div>

                    {/* MISTAKES SECTION */}
                    {eodSection === 'mistakes' && (
                        <div className="fade-in">
                            <label style={{color:'var(--danger)'}}>Identify Mistakes</label>
                            <div className="chip-container">
                                {['FOMO', 'Overtrading', 'Sizing', 'Revenge', 'Early Exit', 'Late Entry'].map(m => (
                                    <div key={m} className={`chip ${formData.mistakes.includes(m) ? 'selected' : ''}`} onClick={() => toggleMistake(m)}>{m}</div>
                                ))}
                            </div>
                            <label>Mistake Details / Psychology</label>
                            <textarea 
                                value={formData.negNotes} 
                                onChange={(e) => handleInputChange('negNotes', e.target.value)} 
                                placeholder="Why did I make these mistakes? What was I thinking?"
                                style={{minHeight:'100px', borderColor:'rgba(239, 68, 68, 0.3)'}}
                            ></textarea>
                        </div>
                    )}

                    {/* PLANNING SECTION */}
                    {eodSection === 'planning' && (
                        <div className="fade-in">
                            <label style={{color:'var(--success)'}}>Market Bias</label>
                            <select value={formData.planBias} onChange={(e) => handleInputChange('planBias', e.target.value)}>
                                <option>Neutral</option>
                                <option>Bullish 🐂</option>
                                <option>Bearish 🐻</option>
                            </select>
                            
                            <label>Key Level (Support/Resistance)</label>
                            <input 
                                type="text" 
                                value={formData.keyLevel} 
                                onChange={(e) => handleInputChange('keyLevel', e.target.value)} 
                                placeholder="e.g., 22500, 48000"
                            />
                            
                            <label>Action Plan for Tomorrow</label>
                            <textarea 
                                value={formData.planNotes} 
                                onChange={(e) => handleInputChange('planNotes', e.target.value)} 
                                placeholder="If market opens flat, I will... If gap up..."
                                style={{minHeight:'100px', borderColor:'rgba(16, 185, 129, 0.3)'}}
                            ></textarea>
                        </div>
                    )}
                </div>
            )}

            {/* SOURCE FORM */}
            {currentMode === 'source' && (
                <div>
                    <h2 style={{ color: 'var(--cyan)' }}>External Insights</h2>
                    {formData.resourceRows.map((row, i) => (
                        <div className="dyn-row" key={i}>
                            <input type="text" placeholder="Source" value={row.k} onChange={(e) => handleResourceRowChange(i, 'k', e.target.value)} />
                            <input type="text" placeholder="Info" value={row.v} onChange={(e) => handleResourceRowChange(i, 'v', e.target.value)} />
                            <div className="dyn-del" onClick={() => removeResourceRow(i)}>&times;</div>
                        </div>
                    ))}
                    <button onClick={addResourceRow} style={{ background: 'var(--border)', width: '100%', marginTop: '5px', fontSize: '0.8rem' }}>+ Add Field</button>
                </div>
            )}

            {/* IMAGE UPLOAD */}
            <label>Screenshots {isUploading && <span style={{color: 'var(--cyan)'}}>(Uploading...)</span>}</label>
            <div className="drop-zone" style={{ position: 'relative', border: `1px dashed ${isUploading ? 'var(--cyan)' : 'var(--border)'}`, padding: '15px', textAlign: 'center', cursor: isUploading ? 'not-allowed' : 'pointer', marginBottom: '10px' }}>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>
                    {isUploading ? "Please wait, uploading to Cloud..." : "Add Images (Click or Drop)"}
                </p>
                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageUpload} 
                    disabled={isUploading}
                    style={{ opacity: 0, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', cursor: isUploading ? 'not-allowed' : 'pointer' }} 
                />
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {images.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                        <img src={img} style={{ width: '50px', height: '50px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                        <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 0, right: 0, background: 'red', padding: '2px 5px', fontSize: '0.6rem' }}>X</button>
                    </div>
                ))}
            </div>

            {/* ACTIONS */}
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