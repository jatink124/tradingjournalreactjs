'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LeftPanel from '../components/LeftPanel';
import { ChecklistModal } from '../components/Modals';
import { JournalForm, Category } from '../types';
import { useGlobal } from '../context/GlobalContext';

function JournalContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const { addToCalculator, isAuthenticated } = useGlobal();

    const [categories, setCategories] = useState<Category[]>([]);
    const [currentMode, setCurrentMode] = useState('live');
    const [images, setImages] = useState<string[]>([]);
    const [showChecklist, setShowChecklist] = useState(false);
    
    const [formData, setFormData] = useState<JournalForm>({
        entryTime: '', assetType: 'NIFTY', stockName: '', focusArea: 'Price Action',
        liveNotes: '', tradeEntry: '', tradeExit: '', tradeSL: '', tradeTarget: '', 
        tradeRisk: '', tradeLots: 1, tradeLearning: '', negNotes: '', planBias: 'Neutral', 
        keyLevel: '', planNotes: '', mistakes: [], resourceRows: [{ k: '', v: '' }], 
        marketTrend: 'Sideways'
    });

    useEffect(() => {
        if (!isAuthenticated) router.push('/');
        
        fetchCategories();
        
        // Initialize Time
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setFormData(prev => ({ ...prev, entryTime: localIso }));

        // If Editing, Load Data
        if (editId) loadEntry(editId);
    }, [editId, isAuthenticated]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            if (Array.isArray(data)) setCategories(data);
        } catch (err) { console.error(err); }
    };

    const loadEntry = async (id: string) => {
        try {
            // In a real app, we might have a single entry endpoint. 
            // Here we filter from the list or fetch all.
            // Let's assume we can fetch all and find it, or the API supports id param.
            // Note: The existing API supports filtering but returns array.
            const res = await fetch('/api/journal');
            const data = await res.json();
            const entry = data.find((e: any) => e.id == id);
            
            if (entry) {
                setCurrentMode(entry.entry_type);
                setImages(JSON.parse(entry.images || "[]"));
                
                const updates: any = {};
                updates.assetType = ['NIFTY', 'BTC'].includes(entry.asset) ? entry.asset : 'STOCK';
                updates.stockName = entry.asset;
                updates.marketTrend = entry.market_trend || 'Sideways';
                updates.entryTime = new Date(entry.id).toISOString().slice(0, 16);
                
                if (entry.entry_type === 'live') {
                    updates.liveNotes = entry.notes;
                    updates.focusArea = entry.focus_area;
                } else if (entry.entry_type === 'trade') {
                    updates.tradeEntry = entry.entry_price;
                    updates.tradeExit = entry.exit_price;
                    updates.tradeLots = entry.lots;
                    updates.tradeLearning = entry.notes;
                    updates.tradeSL = entry.stop_loss;
                    updates.tradeTarget = entry.target_price;
                } else if (entry.entry_type === 'eod') {
                    updates.negNotes = entry.neg_notes;
                    updates.planBias = entry.plan_bias;
                    updates.keyLevel = entry.key_level;
                    updates.planNotes = entry.plan_notes;
                    updates.mistakes = typeof entry.mistakes === 'string' ? JSON.parse(entry.mistakes) : entry.mistakes;
                }
                setFormData(prev => ({ ...prev, ...updates }));
            }
        } catch (e) { console.error("Failed to load entry", e); }
    };

    const calculatePnL = () => {
        const entry = parseFloat(formData.tradeEntry) || 0;
        const exit = parseFloat(formData.tradeExit) || 0;
        const lots = Number(formData.tradeLots) || 0;
        if (entry > 0 && exit > 0) {
             let multiplier = 1;
             if(formData.assetType === 'NIFTY') multiplier = 75;
             return ((exit - entry) * (lots * multiplier) - 45).toFixed(2);
        }
        return "0.00";
    };

    const handleSubmit = async () => {
        const dateObj = formData.entryTime ? new Date(formData.entryTime) : new Date();
        const finalId = editId ? parseInt(editId) : dateObj.getTime();

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
            stop_loss: parseFloat(formData.tradeSL) || 0,
            target_price: parseFloat(formData.tradeTarget) || 0,
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
            // After save, go to dashboard
            router.push('/dashboard');
        } catch (e) { alert("Error saving entry"); }
    };

    return (
        <div className="flex justify-center p-4 md:p-8">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-200">
                        {editId ? 'Edit Entry' : 'New Journal Entry'}
                    </h1>
                    <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white">
                        Cancel
                    </button>
                </div>

                <LeftPanel 
                    currentMode={currentMode}
                    setCurrentMode={setCurrentMode}
                    formData={formData}
                    setFormData={setFormData}
                    handleSubmit={handleSubmit}
                    editingId={editId ? parseInt(editId) : null}
                    setEditingId={() => {}}
                    images={images}
                    setImages={setImages}
                    setShowChecklist={setShowChecklist}
                    downloadSql={() => {}} 
                    clearDb={() => {}}
                    categories={categories}
                    refreshCategories={fetchCategories}
                    addToCalculator={addToCalculator}
                />
                
                <ChecklistModal isOpen={showChecklist} onClose={() => setShowChecklist(false)} />
            </div>
        </div>
    );
}

export default function JournalPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <JournalContent />
        </Suspense>
    );
}