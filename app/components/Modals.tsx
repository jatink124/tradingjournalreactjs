'use client';

import React, { useState, useEffect } from 'react';
import { GalleryItem } from '../types';

// --- GALLERY MODAL (Unchanged) ---
interface GalleryModalProps {
    isOpen: boolean;
    initialIndex: number;
    items: GalleryItem[];
    onClose: () => void;
}

export function GalleryModal({ isOpen, initialIndex, items, onClose }: GalleryModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        if (isOpen) setCurrentIndex(initialIndex);
    }, [isOpen, initialIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') move(1);
            if (e.key === 'ArrowLeft') move(-1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex]);

    if (!isOpen || items.length === 0) return null;

    const move = (step: number) => {
        let newIndex = currentIndex + step;
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;
        setCurrentIndex(newIndex);
    };

    const currentItem = items[currentIndex];

    return (
        <div className="modal" style={{ display: 'flex' }} onClick={onClose}>
            <div className="close-modal-btn" onClick={onClose}>&times;</div>
            <div className="gallery-container" onClick={(e) => e.stopPropagation()}>
                <button className="modal-nav nav-prev" onClick={(e) => { e.stopPropagation(); move(-1); }}>&#10094;</button>
                <img src={currentItem.src} className="gallery-img-full" alt="Gallery" />
                <button className="modal-nav nav-next" onClick={(e) => { e.stopPropagation(); move(1); }}>&#10095;</button>
                <div className="modal-info">
                    <div className="modal-desc">{currentItem.desc}</div>
                    <div className="modal-counter">{currentIndex + 1} / {items.length}</div>
                </div>
            </div>
        </div>
    );
}

// --- CHECKLIST MODAL (With Edit Feature) ---
interface ChecklistRule {
    id: number;
    rule_text: string;
    is_checked: number;
}

interface ChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChecklistModal({ isOpen, onClose }: ChecklistModalProps) {
    const [rules, setRules] = useState<ChecklistRule[]>([]);
    const [newRule, setNewRule] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        if (isOpen) fetchRules();
    }, [isOpen]);

    const fetchRules = async () => {
        try {
            const res = await fetch('/api/checklist');
            const data = await res.json();
            if (Array.isArray(data)) setRules(data);
        } catch (err) { console.error("Failed to load rules", err); }
    };

    const handleAddRule = async () => {
        if (!newRule.trim()) return;
        setLoading(true);
        try {
            await fetch('/api/checklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rule_text: newRule })
            });
            setNewRule('');
            fetchRules();
        } catch (err) { alert('Failed to add rule'); }
        finally { setLoading(false); }
    };

    const handleDeleteRule = async (id: number) => {
        if (!confirm('Delete this rule?')) return;
        try {
            await fetch(`/api/checklist?id=${id}`, { method: 'DELETE' });
            fetchRules();
        } catch (err) { alert('Failed to delete rule'); }
    };

    const toggleRule = async (rule: ChecklistRule) => {
        if (editingId === rule.id) return; // Disable toggle while editing
        const updatedStatus = rule.is_checked ? 0 : 1;
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_checked: updatedStatus } : r));
        try {
            await fetch('/api/checklist', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: rule.id, is_checked: updatedStatus })
            });
        } catch (err) { fetchRules(); }
    };

    const startEditing = (rule: ChecklistRule) => {
        setEditingId(rule.id);
        setEditText(rule.rule_text);
    };

    const saveEdit = async () => {
        if (!editingId || !editText.trim()) return;
        try {
            await fetch('/api/checklist', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingId, rule_text: editText })
            });
            setEditingId(null);
            setEditText('');
            fetchRules();
        } catch (err) { alert("Failed to save edit"); }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    if (!isOpen) return null;

    return (
        <div className="modal" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '12px', width: '450px', border: '1px solid var(--border)', display:'flex', flexDirection:'column', gap:'15px' }}>
                <h3 style={{margin:0, borderBottom:'1px solid var(--border)', paddingBottom:'10px'}}>Pre-Trade Checklist</h3>
                
                <div className="checklist-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {rules.length === 0 ? (
                        <div style={{opacity:0.5, fontStyle:'italic', textAlign:'center', padding:'20px'}}>No rules defined.</div>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="checklist-item" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                {editingId === rule.id ? (
                                    // EDIT MODE
                                    <div style={{display:'flex', width:'100%', gap:'5px'}}>
                                        <input 
                                            type="text" 
                                            value={editText} 
                                            autoFocus
                                            onChange={(e) => setEditText(e.target.value)}
                                            style={{flex:1, padding:'5px'}}
                                        />
                                        <button onClick={saveEdit} style={{background:'var(--success)', padding:'0 10px'}}><i className="fas fa-check"></i></button>
                                        <button onClick={cancelEdit} style={{background:'var(--danger)', padding:'0 10px'}}><i className="fas fa-times"></i></button>
                                    </div>
                                ) : (
                                    // VIEW MODE
                                    <>
                                        <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1, cursor:'pointer'}} onClick={() => toggleRule(rule)}>
                                            <div className={`checklist-checkbox ${rule.is_checked ? 'checked' : ''}`} style={{
                                                width:'18px', height:'18px', border:'2px solid var(--cyan)', borderRadius:'4px',
                                                background: rule.is_checked ? 'var(--cyan)' : 'transparent',
                                                display:'flex', alignItems:'center', justifyContent:'center'
                                            }}>
                                                {rule.is_checked && <i className="fas fa-check" style={{fontSize:'0.7rem', color:'#000'}}></i>}
                                            </div>
                                            <span className="cl-text" style={{ textDecoration: rule.is_checked ? 'line-through' : 'none', opacity: rule.is_checked ? 0.5 : 1 }}>
                                                {rule.rule_text}
                                            </span>
                                        </div>
                                        <div style={{display:'flex', gap:'5px'}}>
                                            <button onClick={() => startEditing(rule)} style={{background:'transparent', color:'var(--cyan)', padding:'5px'}} title="Edit Rule">
                                                <i className="fas fa-pen"></i>
                                            </button>
                                            <button onClick={() => handleDeleteRule(rule.id)} style={{background:'transparent', color:'var(--danger)', padding:'5px'}} title="Delete Rule">
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Add New Rule Input */}
                <div style={{ display: 'flex', gap: '10px', borderTop:'1px solid var(--border)', paddingTop:'15px' }}>
                    <input 
                        type="text" 
                        placeholder="Add new rule..." 
                        value={newRule} 
                        onChange={(e) => setNewRule(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                        style={{flex:1}}
                    />
                    <button onClick={handleAddRule} disabled={loading} style={{background:'var(--success)', width:'40px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-plus"></i>}
                    </button>
                </div>

                <button onClick={onClose} style={{ width: '100%', background: 'var(--border)', color:'var(--text-main)' }}>Close</button>
            </div>
        </div>
    );
}