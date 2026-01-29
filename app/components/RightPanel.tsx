'use client';

import React, { useState, useMemo } from 'react';
import { Entry, JournalForm, GalleryItem } from '../types';
import { GalleryModal } from './Modals';

interface RightPanelProps {
    entries: Entry[];
    deleteEntry: (id: number) => void;
    setEditingId: (id: number | null) => void;
    setCurrentMode: (m: string) => void;
    setFormData: React.Dispatch<React.SetStateAction<JournalForm>>;
    // NEW PROPS
    onRefresh: () => void;
    isLoading: boolean;
}

const getFriendlyDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

// --- SUB-COMPONENT: EOD CARD WITH TABS ---
const EODCard = ({ entry, onEdit, onDelete, onImageClick }: { entry: Entry, onEdit: (e: Entry) => void, onDelete: (id: number) => void, onImageClick: (idx: number) => void }) => {
    const [activeTab, setActiveTab] = useState<'mistakes' | 'plan'>('mistakes');

    return (
        <div className="eod-card">
            {/* HEADER */}
            <div className="eod-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(0,0,0,0.2)' }}>
                <div className="asset-title" style={{ fontWeight: 'bold' }}>{entry.asset}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Daily Review</div>
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                <div 
                    onClick={() => setActiveTab('mistakes')}
                    style={{ 
                        flex: 1, textAlign: 'center', padding: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', transition: '0.2s',
                        borderBottom: activeTab === 'mistakes' ? '2px solid var(--danger)' : '1px solid transparent', 
                        color: activeTab === 'mistakes' ? 'var(--danger)' : 'var(--text-muted)',
                        background: activeTab === 'mistakes' ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                    }}
                >
                    Mistakes
                </div>
                <div 
                    onClick={() => setActiveTab('plan')}
                    style={{ 
                        flex: 1, textAlign: 'center', padding: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', transition: '0.2s',
                        borderBottom: activeTab === 'plan' ? '2px solid var(--success)' : '1px solid transparent', 
                        color: activeTab === 'plan' ? 'var(--success)' : 'var(--text-muted)',
                        background: activeTab === 'plan' ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                    }}
                >
                    Plan
                </div>
            </div>

            {/* BODY */}
            <div className="eod-body" style={{ padding: '15px' }}>
                {activeTab === 'mistakes' && (
                    <div className="fade-in">
                        {entry.mistakes.length > 0 && (
                            <div className="chip-container" style={{ marginBottom: '10px' }}>
                                {entry.mistakes.map(m => <div key={m} className="chip" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{m}</div>)}
                            </div>
                        )}
                        <div className="detail-text" style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                            {entry.neg_notes || <span style={{fontStyle:'italic', opacity:0.5}}>No mistakes recorded.</span>}
                        </div>
                    </div>
                )}

                {activeTab === 'plan' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <div className="stat-box" style={{ flex: 1, textAlign:'center' }}>
                                <span className="stat-label">Bias</span>
                                <span className={`stat-value ${entry.plan_bias === 'Bullish' ? 'bias-bullish' : entry.plan_bias === 'Bearish' ? 'bias-bearish' : 'bias-neutral'}`} style={{display:'block', fontSize:'1rem'}}>
                                    {entry.plan_bias}
                                </span>
                            </div>
                            <div className="stat-box" style={{ flex: 1, textAlign:'center' }}>
                                <span className="stat-label">Key Level</span>
                                <span className="stat-value" style={{ fontFamily: 'monospace', color: 'var(--cyan)', display:'block', fontSize:'1rem' }}>
                                    {entry.key_level || '-'}
                                </span>
                            </div>
                        </div>
                        <div className="plan-text" style={{ whiteSpace: 'pre-wrap', paddingLeft:0, borderLeft:'none' }}>
                            {entry.plan_notes || <span style={{fontStyle:'italic', opacity:0.5}}>No plan recorded.</span>}
                        </div>
                    </div>
                )}

                {/* SHARED GALLERY (Visible in both tabs if images exist) */}
                {entry.images.length > 0 && (
                    <div className="entry-gallery" style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                        {entry.images.map((img, i) => (
                            <img key={i} src={img} className="entry-img" onClick={() => onImageClick(i)} />
                        ))}
                    </div>
                )}
            </div>

            {/* ACTION BAR */}
            <div className="action-bar">
                <i className="fas fa-edit action-icon" onClick={() => onEdit(entry)}></i>
                <i className="fas fa-trash action-icon del" onClick={() => onDelete(entry.id)} style={{ marginLeft: '10px' }}></i>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function RightPanel({ entries, deleteEntry, setEditingId, setCurrentMode, setFormData, onRefresh, isLoading }: RightPanelProps) {
    const [currentRightTab, setCurrentRightTab] = useState('live');
    const [layout, setLayout] = useState(1);
    
    // Gallery State
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleryStartIndex, setGalleryStartIndex] = useState(0);

    // Filters
    const [filterAsset, setFilterAsset] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    const focusAreas = ["Price Action", "Volume", "Support/Resistance", "Breakout", "Reversal"];
    let lastDateStr = "";

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            if (e.entry_type !== currentRightTab) return false;
            if (filterAsset !== 'ALL') {
                if (filterAsset === 'STOCK') { if (['NIFTY', 'BTC'].includes(e.asset)) return false; }
                else if (e.asset !== filterAsset) return false;
            }
            if (filterCategory !== 'ALL' && e.focus_area !== filterCategory) return false;
            const searchLower = filterSearch.toLowerCase();
            const matchSearch = (e.notes && e.notes.toLowerCase().includes(searchLower)) ||
                (e.asset && e.asset.toLowerCase().includes(searchLower));
            if (!matchSearch) return false;
            const entryDate = new Date(e.id);
            if (filterDateStart && entryDate < new Date(filterDateStart)) return false;
            if (filterDateEnd) {
                const endDate = new Date(filterDateEnd);
                endDate.setHours(23, 59, 59);
                if (entryDate > endDate) return false;
            }
            return true;
        });
    }, [entries, currentRightTab, filterAsset, filterCategory, filterSearch, filterDateStart, filterDateEnd]);

    const galleryItems: GalleryItem[] = useMemo(() => {
        return filteredEntries.flatMap(e => 
            e.images.map(img => ({ src: img, desc: e.asset }))
        );
    }, [filteredEntries]);

    const entryImageOffsets = useMemo(() => {
        let count = 0;
        return filteredEntries.map(e => {
            const start = count;
            count += e.images.length;
            return start;
        });
    }, [filteredEntries]);

    const handleEdit = (e: Entry) => {
        setEditingId(e.id);
        setCurrentMode(e.entry_type);
        const updates: any = {};
        updates.assetType = ['NIFTY', 'BTC'].includes(e.asset) ? e.asset : 'STOCK';
        updates.stockName = e.asset;
        updates.marketTrend = e.market_trend || 'Sideways';
        
        if (e.entry_type === 'live') {
            updates.liveNotes = e.notes;
            updates.focusArea = e.focus_area;
        } else if (e.entry_type === 'trade') {
            updates.tradeEntry = e.entry_price.toString();
            updates.tradeExit = e.exit_price.toString();
            updates.tradeLots = e.lots;
            updates.tradeLearning = e.notes;
        } else if (e.entry_type === 'eod') {
            updates.negNotes = e.neg_notes;
            updates.planBias = e.plan_bias;
            updates.keyLevel = e.key_level;
            updates.planNotes = e.plan_notes;
            updates.mistakes = e.mistakes;
        } else if (e.entry_type === 'source') {
             try { updates.resourceRows = JSON.parse(e.notes || "[]"); } catch(er) {}
        }
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const openGallery = (globalIndex: number) => {
        setGalleryStartIndex(globalIndex);
        setIsGalleryOpen(true);
    };

    return (
        <div className="journal-feed">
            <div className="right-tabs-header">
                {['live', 'trade', 'eod', 'source'].map(t => (
                    <div key={t} className={`rt-tab ${currentRightTab === t ? (t === 'eod' ? 'active-purple' : t === 'source' ? 'active-cyan' : t === 'trade' ? 'active-green' : 'active') : ''}`} onClick={() => setCurrentRightTab(t)}>{t.toUpperCase()}</div>
                ))}
            </div>
            <div className="filter-bar">
                {/* REFRESH BUTTON ADDED HERE */}
                <div 
                    className="filter-group" 
                    onClick={isLoading ? undefined : onRefresh} 
                    style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'40px', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'4px'}}
                    title="Refresh Data"
                >
                    <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`} style={{color:'var(--cyan)'}}></i>
                </div>

                <div className="filter-group">
                    <label>Asset</label>
                    <select value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)}>
                        <option value="ALL">All</option><option value="NIFTY">NIFTY</option><option value="BTC">BTC</option><option value="STOCK">Stocks</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Category</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="ALL">All</option>
                        {focusAreas.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                <div className="filter-group" style={{ minWidth: '150px' }}>
                    <label>Search</label>
                    <input type="text" placeholder="剥 Search..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                </div>
                <div className="filter-group">
                    <label>Layout</label>
                    <div className="layout-controls">
                        {[1, 2, 3].map(n => (<div key={n} className={`layout-btn ${layout === n ? 'active' : ''}`} onClick={() => setLayout(n)}>{n}</div>))}
                    </div>
                </div>
                <div className="filter-group"><label>From</label><input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} /></div>
                <div className="filter-group"><label>To</label><input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} /></div>
            </div>

            {/* LOADING OVERLAY */}
            {isLoading && (
                <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>
                    <i className="fas fa-circle-notch fa-spin"></i> Loading journal data...
                </div>
            )}

            <div className="right-content-area" style={{opacity: isLoading ? 0.5 : 1}}>
                <div className={`feed-grid layout-${layout}`}>
                    {filteredEntries.map((e, index) => {
                        const currentDateStr = getFriendlyDate(e.id);
                        const showDateHeader = currentDateStr !== lastDateStr;
                        if (showDateHeader) lastDateStr = currentDateStr;
                        const imageBaseIndex = entryImageOffsets[index];

                        return (
                            <div key={e.id} style={{ display: 'contents' }}>
                                {showDateHeader && <div className="date-header"><i className="far fa-calendar-alt"></i> {currentDateStr}</div>}
                                
                                {e.entry_type === 'live' && (
                                    <div className="live-card">
                                        <div className="live-time">{e.timestamp_str.split(',')[1]?.trim()}</div>
                                        <div className="live-content">
                                            <div className="live-header" style={{padding:'10px 15px', display:'flex', justifyContent:'space-between'}}>
                                                <div style={{ fontWeight: 'bold' }}>{e.asset}</div>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <div className="live-badge">{e.focus_area}</div>
                                                    <div className="live-badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{e.market_trend === 'Uptrend' ? '泙' : e.market_trend === 'Downtrend' ? '閥' : '泯'}</div>
                                                </div>
                                            </div>
                                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', padding:'0 15px' }}>{e.notes}</div>
                                            <div className="entry-gallery" style={{padding:'0 15px'}}>
                                                {e.images.map((img, i) => (<img key={i} src={img} className="entry-img" onClick={() => openGallery(imageBaseIndex + i)} />))}
                                            </div>
                                            <div className="action-bar"><i className="fas fa-edit action-icon" onClick={() => handleEdit(e)}></i><i className="fas fa-trash action-icon del" onClick={() => deleteEntry(e.id)} style={{marginLeft:'10px'}}></i></div>
                                        </div>
                                    </div>
                                )}

                                {e.entry_type === 'trade' && (
                                    <div className="trade-card">
                                        <div className="trade-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontWeight: 'bold' }}>{e.asset}</div>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{e.market_trend === 'Uptrend' ? '泙' : e.market_trend === 'Downtrend' ? '閥' : '泯'}</span>
                                            </div>
                                            <div className={`trade-pnl ${e.pnl >= 0 ? 'pnl-green' : 'pnl-red'}`}>{e.pnl}</div>
                                        </div>
                                        <div className="trade-body">
                                            <div className="trade-grid">
                                                <div className="trade-stat"><span className="ts-lbl">Entry</span><span className="ts-val">{e.entry_price}</span></div>
                                                <div className="trade-stat"><span className="ts-lbl">Exit</span><span className="ts-val">{e.exit_price}</span></div>
                                                <div className="trade-stat"><span className="ts-lbl">Lots</span><span className="ts-val">{e.lots}</span></div>
                                            </div>
                                            <div className="trade-learning">{e.notes}</div>
                                            <div className="entry-gallery">
                                                {e.images.map((img, i) => (<img key={i} src={img} className="entry-img" onClick={() => openGallery(imageBaseIndex + i)} />))}
                                            </div>
                                        </div>
                                        <div className="action-bar"><i className="fas fa-edit action-icon" onClick={() => handleEdit(e)}></i><i className="fas fa-trash action-icon del" onClick={() => deleteEntry(e.id)}></i></div>
                                    </div>
                                )}

                                {/* EOD CARD WITH TABS */}
                                {e.entry_type === 'eod' && (
                                    <EODCard 
                                        entry={e} 
                                        onEdit={handleEdit} 
                                        onDelete={deleteEntry} 
                                        onImageClick={(i) => openGallery(imageBaseIndex + i)} 
                                    />
                                )}

                                {e.entry_type === 'source' && (
                                    <div className="resource-card">
                                        <div style={{ padding:'10px 15px', display: 'flex', justifyContent: 'space-between' }}>
                                            <div style={{ fontWeight: 'bold', color:'var(--cyan)' }}><i className="fas fa-globe"></i> {e.asset} Resource</div>
                                        </div>
                                        <div style={{ padding:'0 15px 15px 15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {(() => { try { return JSON.parse(e.notes || "[]").map((f: any, i: number) => (<div key={i} className="resource-item"><span className="resource-label">{f.k}</span><span className="resource-val">{f.v}</span></div>)); } catch (er) { return null; } })()}
                                            <div className="entry-gallery">
                                                {e.images.map((img, i) => (<img key={i} src={img} className="entry-img" onClick={() => openGallery(imageBaseIndex + i)} />))}
                                            </div>
                                        </div>
                                        <div className="action-bar"><i className="fas fa-trash action-icon del" onClick={() => deleteEntry(e.id)}></i></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <GalleryModal isOpen={isGalleryOpen} initialIndex={galleryStartIndex} items={galleryItems} onClose={() => setIsGalleryOpen(false)} />
        </div>
    );
}