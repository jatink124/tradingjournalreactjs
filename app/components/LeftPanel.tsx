'use client';

import { useState, useEffect } from 'react';
import { JournalForm, Category, MistakeItem } from '../types';

const CLOUD_NAME = 'dsupeybo6'; 
const UPLOAD_PRESET = 'test123'; 

const Label = ({ children }: { children: React.ReactNode }) => <label className="label-base">{children}</label>;
const Input = (props: any) => <input className="input-base" {...props} />;
const Select = (props: any) => <select className="input-base" {...props}>{props.children}</select>;
const TextArea = (props: any) => <textarea className="input-base resize-none" {...props} />;

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
    currentMode, setCurrentMode, formData, setFormData, handleSubmit, editingId,
    images, setImages, setShowChecklist, categories, refreshCategories, addToCalculator
}: LeftPanelProps) {
    
    const [eodSection, setEodSection] = useState<'mistakes' | 'planning'>('mistakes');
    const [isUploading, setIsUploading] = useState(false);
    const [availableMistakes, setAvailableMistakes] = useState<MistakeItem[]>([]);

    useEffect(() => { fetchMistakes(); }, []);
    const fetchMistakes = async () => { try { const res = await fetch('/api/mistakes'); const data = await res.json(); if(Array.isArray(data)) setAvailableMistakes(data); } catch(e){} };
    
    // UPDATED MULTIPLIER: 1 Lot = 65
    const getMultiplier = () => (formData.assetType === 'NIFTY' ? 65 : 1);
    
    const calculatePnLValue = () => {
        const entry = parseFloat(formData.tradeEntry)||0; const exit = parseFloat(formData.tradeExit)||0; const lots = Number(formData.tradeLots)||0;
        return (entry>0 && exit>0) ? ((exit-entry)*(lots*getMultiplier()) - 45).toFixed(2) : "0.00";
    };

    const handleInputChange = (field: keyof JournalForm, value: any) => setFormData(p => ({ ...p, [field]: value }));
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return; setIsUploading(true);
        const files = Array.from(e.target.files);
        try {
            const urls = await Promise.all(files.map(f => {
                const d = new FormData(); d.append('file', f); d.append('upload_preset', UPLOAD_PRESET);
                return fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:d }).then(r=>r.json()).then(d=>d.secure_url);
            }));
            setImages(p => [...p, ...urls]);
        } catch(e){ alert("Upload failed"); } finally { setIsUploading(false); }
    };

    return (
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--card-border)] flex justify-between items-center">
                <div className="flex bg-[var(--background)] p-1 rounded-md border border-[var(--card-border)]">
                    {['live', 'trade', 'eod', 'source'].map(m => (
                        <button key={m} onClick={() => setCurrentMode(m)}
                            className={`px-4 py-1.5 text-xs font-bold uppercase rounded-sm transition-all ${currentMode === m ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                            {m}
                        </button>
                    ))}
                </div>
                <div className="text-xs text-[var(--muted)] font-mono">
                    {formData.entryTime ? new Date(formData.entryTime).toLocaleString() : 'New Entry'}
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Context */}
                <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 border-l-2 border-[var(--card-border)] pl-3">Context</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><Label>Asset Class</Label><Select value={formData.assetType} onChange={(e:any) => handleInputChange('assetType', e.target.value)}><option value="NIFTY">NIFTY 50</option><option value="BTC">Bitcoin</option><option value="STOCK">Stock</option></Select></div>
                        <div><Label>Trend</Label><Select value={formData.marketTrend} onChange={(e:any) => handleInputChange('marketTrend', e.target.value)}><option value="Sideways">Sideways</option><option value="Uptrend">Uptrend</option><option value="Downtrend">Downtrend</option></Select></div>
                        <div><Label>Time</Label><Input type="datetime-local" value={formData.entryTime} onChange={(e:any) => handleInputChange('entryTime', e.target.value)} /></div>
                    </div>
                </div>

                <div className="border-t border-[var(--card-border)] pt-8">
                    {currentMode === 'live' && (
                        <div className="space-y-6">
                            <div className="flex justify-between"><h3 className="text-sm font-semibold text-[var(--foreground)] border-l-2 border-[var(--card-border)] pl-3">Live Obs</h3><button onClick={() => setShowChecklist(true)} className="text-xs text-blue-500 hover:underline">Checklist</button></div>
                            <div className="grid gap-6"><div><Label>Focus</Label><Select value={formData.focusArea} onChange={(e:any) => handleInputChange('focusArea', e.target.value)}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</Select></div><div><Label>Notes</Label><TextArea value={formData.liveNotes} onChange={(e:any) => handleInputChange('liveNotes', e.target.value)} className="input-base h-32" placeholder="Market behavior..." /></div></div>
                        </div>
                    )}

                    {currentMode === 'trade' && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-semibold text-[var(--foreground)] border-l-2 border-[var(--card-border)] pl-3">Execution</h3>
                            <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-md p-4 grid grid-cols-3 gap-4">
                                <div><Label>Entry</Label><Input type="number" value={formData.tradeEntry} onChange={(e:any) => handleInputChange('tradeEntry', e.target.value)} placeholder="0.00" /></div>
                                <div><Label>Stop Loss</Label><Input type="number" value={formData.tradeSL} onChange={(e:any) => handleInputChange('tradeSL', e.target.value)} className="input-base text-red-400" placeholder="0.00" /></div>
                                <div><Label>Target</Label><Input type="number" value={formData.tradeTarget} onChange={(e:any) => handleInputChange('tradeTarget', e.target.value)} className="input-base text-emerald-400" placeholder="0.00" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div><Label>Quantity</Label><Input type="number" value={formData.tradeLots} onChange={(e:any) => handleInputChange('tradeLots', e.target.value)} /></div>
                                <div><Label>Exit Price</Label><div className="flex gap-2"><Input type="number" value={formData.tradeExit} onChange={(e:any) => handleInputChange('tradeExit', e.target.value)} placeholder="Exit" /><div className={`px-3 flex items-center border border-[var(--card-border)] rounded bg-[var(--background)] min-w-[80px] font-mono text-sm font-bold ${parseFloat(calculatePnLValue())>=0?'text-emerald-500':'text-red-500'}`}>{calculatePnLValue()}</div></div></div>
                            </div>
                            <div><Label>Review</Label><TextArea value={formData.tradeLearning} onChange={(e:any) => handleInputChange('tradeLearning', e.target.value)} className="input-base h-24" placeholder="Post-trade analysis..." /></div>
                        </div>
                    )}

                    {currentMode === 'eod' && (
                        <div className="space-y-6">
                            <div className="flex gap-6 border-b border-[var(--card-border)] pb-2 mb-4">
                                <button onClick={()=>setEodSection('mistakes')} className={`text-xs font-bold uppercase pb-2 ${eodSection==='mistakes'?'text-[var(--foreground)] border-b-2 border-[var(--foreground)]':'text-[var(--muted)]'}`}>Mistakes</button>
                                <button onClick={()=>setEodSection('planning')} className={`text-xs font-bold uppercase pb-2 ${eodSection==='planning'?'text-[var(--foreground)] border-b-2 border-[var(--foreground)]':'text-[var(--muted)]'}`}>Planning</button>
                            </div>
                            {eodSection === 'mistakes' ? (
                                <>
                                    <div className="flex flex-wrap gap-2">{availableMistakes.map(m => (<button key={m.id} onClick={() => setFormData(p => { const x = p.mistakes.includes(m.name); return {...p, mistakes: x ? p.mistakes.filter(n=>n!==m.name) : [...p.mistakes, m.name]} })} className={`px-2 py-1 rounded-sm text-[10px] uppercase border font-bold ${formData.mistakes.includes(m.name)?'bg-red-500/10 text-red-500 border-red-500':'bg-[var(--background)] text-[var(--muted)] border-[var(--card-border)]'}`}>{m.name}</button>))}</div>
                                    <TextArea value={formData.negNotes} onChange={(e:any)=>handleInputChange('negNotes', e.target.value)} className="input-base h-32" />
                                </>
                            ) : (
                                <div className="space-y-4"><div><Label>Bias</Label><Select value={formData.planBias} onChange={(e:any)=>handleInputChange('planBias', e.target.value)}><option>Neutral</option><option>Bullish</option><option>Bearish</option></Select></div><div><Label>Plan</Label><TextArea value={formData.planNotes} onChange={(e:any)=>handleInputChange('planNotes', e.target.value)} className="input-base h-32" /></div></div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-[var(--card-border)] pt-6">
                    <div className="flex items-center gap-4 mb-4"><label className="text-xs font-semibold text-blue-500 cursor-pointer">+ Attach Media <input type="file" onChange={handleImageUpload} hidden multiple disabled={isUploading} /></label>{images.length > 0 && <span className="text-xs text-[var(--muted)]">{images.length} attached</span>}</div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setFormData(p=>({...p, liveNotes:''}))} className="py-2.5 rounded-md border border-[var(--card-border)] text-[var(--muted)] text-sm font-medium hover:bg-[var(--card-border)]">Discard</button>
                        <button onClick={handleSubmit} disabled={isUploading} className="py-2.5 rounded-md bg-[var(--foreground)] text-[var(--background)] text-sm font-medium hover:opacity-90">{isUploading ? 'Saving...' : 'Save Entry'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}