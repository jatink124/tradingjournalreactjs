'use client';

import { useState, useEffect } from 'react';
import { Entry, JournalForm, Category } from './types';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import { ChecklistModal } from './components/Modals';
import { CompoundingCalculator } from './components/CompoundingCalculator';

export default function Home() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [currentMode, setCurrentMode] = useState('live');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showCalculator, setShowCalculator] = useState(false);
    
    const [formData, setFormData] = useState<JournalForm>({
        entryTime: '', assetType: 'NIFTY', stockName: '', focusArea: 'Price Action',
        liveNotes: '', tradeEntry: '', tradeExit: '', tradeLots: 1, tradeLearning: '',
        negNotes: '', planBias: 'Neutral', keyLevel: '', planNotes: '', mistakes: [],
        resourceRows: [{ k: '', v: '' }], marketTrend: 'Sideways'
    });
    
    const [images, setImages] = useState<string[]>([]);
    const [showChecklist, setShowChecklist] = useState(false);

    useEffect(() => {
        fetchEntries();
        fetchCategories();
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setFormData(prev => ({ ...prev, entryTime: localIso }));
    }, []);

    const fetchEntries = async () => {
        try {
            const res = await fetch('/api/journal');
            const data = await res.json();
            if (data.error || !Array.isArray(data)) return;
            const parsed = data.map((e: any) => ({
                ...e,
                mistakes: typeof e.mistakes === 'string' ? JSON.parse(e.mistakes || "[]") : (e.mistakes || []),
                images: typeof e.images === 'string' ? JSON.parse(e.images || "[]") : (e.images || []),
                pnl: parseFloat(e.pnl || 0),
                market_trend: e.market_trend || 'Sideways'
            }));
            setEntries(parsed);
        } catch (err) { console.error(err); }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            if (Array.isArray(data)) setCategories(data);
        } catch (err) { console.error(err); }
    };

    const calculatePnL = () => {
        const entry = parseFloat(formData.tradeEntry) || 0;
        const exit = parseFloat(formData.tradeExit) || 0;
        const lots = Number(formData.tradeLots) || 0;
        if (entry > 0 && exit > 0) return ((exit - entry) * (lots * 75) - 45).toFixed(2);
        return "0.00";
    };

    const handleSubmit = async () => {
        const dateObj = formData.entryTime ? new Date(formData.entryTime) : new Date();
        const finalId = editingId || dateObj.getTime();

        let notes = "";
        if (currentMode === 'source') notes = JSON.stringify(formData.resourceRows);
        else if (currentMode === 'trade') notes = formData.tradeLearning;
        else if (currentMode === 'eod') notes = "";
        else notes = formData.liveNotes;

        const payload = {
            id: finalId,
            entry_type: currentMode,
            asset: formData.assetType === 'STOCK' ? formData.stockName : formData.assetType,
            timestamp_str: dateObj.toLocaleString(),
            focus_area: formData.focusArea,
            notes: notes,
            mistakes: formData.mistakes,
            neg_notes: formData.negNotes,
            plan_bias: formData.planBias,
            key_level: formData.keyLevel,
            plan_notes: formData.planNotes,
            images: images,
            entry_price: parseFloat(formData.tradeEntry) || 0,
            exit_price: parseFloat(formData.tradeExit) || 0,
            lots: Number(formData.tradeLots) || 0,
            pnl: parseFloat(calculatePnL()),
            market_trend: formData.marketTrend
        };

        try {
            await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            fetchEntries();
            setEditingId(null);
            setImages([]);
            
            // --- CRITICAL FIX: Explicitly reset EOD fields ---
            setFormData(prev => ({ 
                ...prev, 
                liveNotes: '', 
                tradeLearning: '', 
                resourceRows: [{ k: '', v: '' }], 
                marketTrend: 'Sideways',
                // Reset EOD fields so they don't stick
                negNotes: '',
                planNotes: '',
                keyLevel: '',
                planBias: 'Neutral',
                mistakes: []
            }));
        } catch (e) { alert("Error saving entry"); }
    };

    const deleteEntry = async (id: number) => {
        if (confirm("Delete this entry?")) {
            await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
            fetchEntries();
        }
    };

    const downloadSql = () => {
        const sqlContent = entries.map(e => `INSERT INTO journal_entries VALUES (${e.id}, '${e.entry_type}', '${e.asset}', ...);`).join('\n');
        const blob = new Blob([sqlContent], { type: 'application/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'backup.sql'; a.click();
    };

    const clearDb = async () => {
        if (confirm("DANGER: This will delete ALL entries. Continue?")) {
            for (const e of entries) await fetch(`/api/journal?id=${e.id}`, { method: 'DELETE' });
            fetchEntries();
        }
    };

    return (
        <div className="container-flex">
            <div style={{position:'absolute', bottom:'20px', left:'20px', zIndex:100}}>
                 <button onClick={() => setShowCalculator(true)} style={{borderRadius:'50%', width:'50px', height:'50px', boxShadow:'0 4px 10px rgba(0,0,0,0.5)', fontSize:'1.2rem', cursor:'pointer'}} title="Compounding Calculator">
                    <i className="fas fa-calculator"></i>
                 </button>
            </div>

            <LeftPanel currentMode={currentMode} setCurrentMode={setCurrentMode} formData={formData} setFormData={setFormData} handleSubmit={handleSubmit} editingId={editingId} setEditingId={setEditingId} images={images} setImages={setImages} setShowChecklist={setShowChecklist} downloadSql={downloadSql} clearDb={clearDb} categories={categories} refreshCategories={fetchCategories} />
            <RightPanel entries={entries} deleteEntry={deleteEntry} setEditingId={setEditingId} setCurrentMode={setCurrentMode} setFormData={setFormData} />
            <ChecklistModal isOpen={showChecklist} onClose={() => setShowChecklist(false)} />
            <CompoundingCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
        </div>
    );
}