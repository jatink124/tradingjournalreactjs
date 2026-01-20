'use client';

import React, { useState, useEffect } from 'react';
import { GalleryItem } from '../types';

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

interface ChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChecklistModal({ isOpen, onClose }: ChecklistModalProps) {
    if (!isOpen) return null;
    return (
        <div className="modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '12px', width: '400px', border: '1px solid var(--border)' }}>
                <h3>Pre-Trade Checklist</h3>
                <div className="checklist-container">
                    <div className="checklist-item"><div className="checklist-checkbox"></div><span className="cl-text">Trend Alignment</span></div>
                    <div className="checklist-item"><div className="checklist-checkbox"></div><span className="cl-text">Stop Loss Defined</span></div>
                    <div className="checklist-item"><div className="checklist-checkbox"></div><span className="cl-text">Volume Confirmation</span></div>
                </div>
                <button onClick={onClose} style={{ width: '100%', marginTop: '10px', background: 'var(--danger)' }}>Close</button>
            </div>
        </div>
    );
}