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
    onRefresh: () => void;
    isLoading: boolean;
}

const getFriendlyDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

// --- HELPER: Calculate R:R for display ---
const getRR = (e: Entry) => {
    if (!e.entry_price || !e.stop_loss || !e.target_price) return "-";
    const risk = Math.abs(e.entry_price - e.stop_loss);
    const reward = Math.abs(e.target_price - e.entry_price);
    if (risk === 0) return "-";
    return `1:${(reward / risk).toFixed(1)}`;
};

// --- SUB-COMPONENT: EOD CARD (Kept for 'Cards' View) ---
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

                {/* SHARED GALLERY */}
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
    
    // NEW STATES FOR VIEW MODE
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [isMaximized, setIsMaximized] = useState(false);
    
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
        updates.entryTime = new Date(e.id).toISOString().slice(0, 16);
        
        if (e.entry_type === 'live') {
            updates.liveNotes = e.notes;
            updates.focusArea = e.focus_area;
        } else if (e.entry_type === 'trade') {
            updates.tradeEntry = e.entry_price.toString();
            updates.tradeExit = e.exit_price.toString();
            updates.tradeLots = e.lots;
            updates.tradeLearning = e.notes;
            updates.tradeSL = e.stop_loss ? e.stop_loss.toString() : '';
            updates.tradeTarget = e.target_price ? e.target_price.toString() : '';
            // Calc risk if possible or leave blank
            updates.tradeRisk = ''; 
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

    // --- RENDER TABLE ROW ---
    const renderTableRow = (e: Entry, index: number) => {
        const dateStr = new Date(e.id).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' });
        const rr = getRR(e);

        return (
            <tr key={e.id} style={{borderBottom:'1px solid var(--border)', fontSize:'0.9rem'}}>
                <td style={{padding:'10px', color:'var(--text-muted)'}}>{dateStr}</td>
                <td style={{padding:'10px', fontWeight:'bold'}}>{e.asset}</td>
                <td style={{padding:'10px'}}>{e.focus_area}</td>
                <td style={{padding:'10px'}}>
                    {e.market_trend === 'Uptrend' ? <span style={{color:'var(--success)'}}>🟢 Up</span> : 
                     e.market_trend === 'Downtrend' ? <span style={{color:'var(--danger)'}}>🔴 Down</span> : 
                     <span style={{color:'var(--accent)'}}>🟡 Side</span>}
                </td>
                {e.entry_type === 'trade' ? (
                    <>
                        <td style={{padding:'10px', fontFamily:'monospace'}}>{e.entry_price}</td>
                        <td style={{padding:'10px', fontFamily:'monospace', fontWeight:'bold', color: e.pnl >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                            {e.pnl > 0 ? '+' : ''}{e.pnl}
                        </td>
                        <td style={{padding:'10px', fontSize:'0.8rem'}}>{rr}</td>
                    </>
                ) : (
                    <td colSpan={3} style={{padding:'10px', fontStyle:'italic', opacity:0.6}}>{e.notes.substring(0, 50)}...</td>
                )}
                
                <td style={{padding:'10px'}}>
                    {e.images.length > 0 && <span title="Has Images" style={{cursor:'pointer', marginRight:'10px'}} onClick={() => openGallery(entryImageOffsets[index])}>📷 {e.images.length}</span>}
                    {e.mistakes.length > 0 && <span title="Has Mistakes" style={{color:'var(--danger)', fontWeight:'bold'}}>🛑 {e.mistakes.length}</span>}
                </td>
                <td style={{padding:'10px'}}>
                    <i className="fas fa-edit action-icon" onClick={() => handleEdit(e)} title="Edit"></i>
                    <i className="fas fa-trash action-icon del" onClick={() => deleteEntry(e.id)} style={{marginLeft:'10px'}} title="Delete"></i>
                </td>
            </tr>
        );
    };

    return (
        <div 
            className="journal-feed" 
            style={isMaximized ? {
                position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:999, 
                background:'#0f172a', margin:0, padding:'20px', borderRadius:0
            } : {}}
        >
            <div className="right-tabs-header">
                {['live', 'trade', 'eod', 'source'].map(t => (
                    <div key={t} className={`rt-tab ${currentRightTab === t ? (t === 'eod' ? 'active-purple' : t === 'source' ? 'active-cyan' : t === 'trade' ? 'active-green' : 'active') : ''}`} onClick={() => setCurrentRightTab(t)}>{t.toUpperCase()}</div>
                ))}
            </div>
            
            <div className="filter-bar" style={{flexWrap:'wrap'}}>
                {/* REFRESH & VIEW TOGGLE GROUP */}
                <div style={{display:'flex', gap:'5px', borderRight:'1px solid var(--border)', paddingRight:'10px', marginRight:'5px'}}>
                    <div className="filter-group" onClick={isLoading ? undefined : onRefresh} style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'36px', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'4px'}} title="Refresh Data">
                        <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`} style={{color:'var(--cyan)'}}></i>
                    </div>
                    {/* View Toggle */}
                    <div className={`filter-group ${viewMode === 'cards' ? 'active-view' : ''}`} onClick={() => setViewMode('cards')} style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'36px', background: viewMode==='cards'?'var(--accent)':'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'4px', color: viewMode==='cards'?'#fff':'var(--text-muted)'}} title="Card View">
                        <i className="fas fa-th-large"></i>
                    </div>
                    <div className={`filter-group ${viewMode === 'table' ? 'active-view' : ''}`} onClick={() => setViewMode('table')} style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'36px', background: viewMode==='table'?'var(--accent)':'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'4px', color: viewMode==='table'?'#fff':'var(--text-muted)'}} title="Grid/Table View">
                        <i className="fas fa-table"></i>
                    </div>
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
                <div className="filter-group" style={{ flex: 1, minWidth: '150px' }}>
                    <label>Search</label>
                    <input type="text" placeholder="Search..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                </div>
                
                {/* Maximize Toggle */}
                <div className="filter-group" onClick={() => setIsMaximized(!isMaximized)} style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'36px', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'4px', marginLeft:'auto'}} title={isMaximized ? "Minimize" : "Full Screen"}>
                    <i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'}`}></i>
                </div>
            </div>

            {/* LOADING OVERLAY */}
            {isLoading && (
                <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>
                    <i className="fas fa-circle-notch fa-spin"></i> Loading...
                </div>
            )}

            <div className="right-content-area" style={{opacity: isLoading ? 0.5 : 1}}>
                
                {/* --- TABLE VIEW --- */}
                {viewMode === 'table' ? (
                    <div style={{overflowX:'auto', background:'var(--card-bg)', borderRadius:'8px', border:'1px solid var(--border)'}}>
                        <table style={{width:'100%', borderCollapse:'collapse', minWidth:'800px'}}>
                            <thead style={{background:'rgba(255,255,255,0.05)', textAlign:'left', borderBottom:'2px solid var(--border)'}}>
                                <tr>
                                    <th style={{padding:'12px'}}>Date</th>
                                    <th style={{padding:'12px'}}>Asset</th>
                                    <th style={{padding:'12px'}}>Focus/Strat</th>
                                    <th style={{padding:'12px'}}>Trend</th>
                                    {currentRightTab === 'trade' ? (
                                        <>
                                            <th style={{padding:'12px'}}>Entry</th>
                                            <th style={{padding:'12px'}}>P&L</th>
                                            <th style={{padding:'12px'}}>R:R</th>
                                        </>
                                    ) : (
                                        <th style={{padding:'12px'}} colSpan={3}>Note Preview</th>
                                    )}
                                    <th style={{padding:'12px'}}>Media</th>
                                    <th style={{padding:'12px'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.length === 0 ? (
                                    <tr><td colSpan={9} style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No entries found matching filters.</td></tr>
                                ) : (
                                    filteredEntries.map((e, i) => renderTableRow(e, i))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* --- CARDS VIEW (Existing) --- */
                    <div className={`feed-grid layout-1`}>
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
                                                        <div className="live-badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{e.market_trend === 'Uptrend' ? '📈' : e.market_trend === 'Downtrend' ? '📉' : '🟡'}</div>
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
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{e.market_trend}</span>
                                                </div>
                                                <div className={`trade-pnl ${e.pnl >= 0 ? 'pnl-green' : 'pnl-red'}`}>{e.pnl}</div>
                                            </div>
                                            <div className="trade-body">
                                                <div className="trade-grid">
                                                    <div className="trade-stat"><span className="ts-lbl">Entry</span><span className="ts-val">{e.entry_price}</span></div>
                                                    <div className="trade-stat"><span className="ts-lbl">Exit</span><span className="ts-val">{e.exit_price}</span></div>
                                                    <div className="trade-stat"><span className="ts-lbl">R:R</span><span className="ts-val" style={{color:'var(--accent)'}}>{getRR(e)}</span></div>
                                                </div>
                                                <div className="trade-learning">{e.notes}</div>
                                                <div className="entry-gallery">
                                                    {e.images.map((img, i) => (<img key={i} src={img} className="entry-img" onClick={() => openGallery(imageBaseIndex + i)} />))}
                                                </div>
                                            </div>
                                            <div className="action-bar"><i className="fas fa-edit action-icon" onClick={() => handleEdit(e)}></i><i className="fas fa-trash action-icon del" onClick={() => deleteEntry(e.id)}></i></div>
                                        </div>
                                    )}

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
                )}
            </div>
            <GalleryModal isOpen={isGalleryOpen} initialIndex={galleryStartIndex} items={galleryItems} onClose={() => setIsGalleryOpen(false)} />
        </div>
    );
}