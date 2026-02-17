'use client';

import { useGlobal } from '../context/GlobalContext';

interface ThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
    const { theme, setTheme } = useGlobal();

    if (!isOpen) return null;

    const themes = [
        { id: 'default', name: 'Zinc (Default)', color: '#18181b' },
        { id: 'terminal', name: 'Terminal', color: '#000000', border: '#fbbf24' },
        { id: 'fintech', name: 'Fintech Blue', color: '#0f172a', border: '#38bdf8' },
        { id: 'nord', name: 'Nordic', color: '#2e3440', border: '#88c0d0' },
        { id: 'obsidian', name: 'Obsidian', color: '#0b0a14', border: '#a855f7' },
        { id: 'emerald', name: 'Emerald', color: '#020617', border: '#10b981' },
        { id: 'paper', name: 'Paper (Light)', color: '#ffffff', border: '#000000' },
        { id: 'cyberpunk', name: 'Cyberpunk', color: '#050505', border: '#ff00ff' },
        { id: 'luxury', name: 'Luxury', color: '#0c0a09', border: '#d4af37' },
        { id: 'monochrome', name: 'Monochrome', color: '#000000', border: '#ffffff' },
        { id: 'solarized', name: 'Solarized', color: '#002b36', border: '#2aa198' },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-[var(--foreground)]">Select Interface Theme</h2>
                    <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-xl">&times;</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {themes.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all hover:scale-105 ${theme === t.id ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--card-border)] hover:border-[var(--muted)]'}`}
                            style={{ backgroundColor: t.color }}
                        >
                            <div className="w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: t.color, border: `2px solid ${t.border || '#555'}` }}></div>
                            <span className={`text-xs font-medium ${t.id === 'paper' ? 'text-black' : 'text-white'}`}>{t.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}