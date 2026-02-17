'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobal } from '../context/GlobalContext';
import ThemeModal from './ThemeModal';

export default function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, setShowCalculator } = useGlobal();
    const [showThemeModal, setShowThemeModal] = useState(false);

    const handleNav = (path: string) => {
        router.push(path);
        if (onCloseMobile) onCloseMobile();
    };

    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: 'fas fa-chart-pie' },
        { name: 'Journal Entries', path: '/journal', icon: 'fas fa-table' },
    ];

    return (
        <div className="h-full w-full flex flex-col bg-[var(--background)] border-r border-[var(--card-border)]">
            <ThemeModal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} />

            {/* Brand */}
            <div className="h-14 flex items-center px-5 border-b border-[var(--card-border)] shrink-0">
                <div className="font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2">
                    <div className="w-5 h-5 bg-[var(--foreground)] rounded-sm"></div>
                    TRADEX
                </div>
            </div>
            
            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Platform</div>
                {menuItems.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <button 
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--card-border)]' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'}`}
                        >
                            <i className={`${item.icon} w-5 text-center text-xs opacity-70`}></i>
                            {item.name}
                        </button>
                    );
                })}

                <div className="px-3 py-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mt-4">Utilities</div>
                <button 
                    onClick={() => { setShowCalculator(true); if (onCloseMobile) onCloseMobile(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-all"
                >
                    <i className="fas fa-calculator w-5 text-center text-xs opacity-70"></i>
                    Calculator
                </button>
                <button 
                    onClick={() => { setShowThemeModal(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-all"
                >
                    <i className="fas fa-palette w-5 text-center text-xs opacity-70"></i>
                    Theme
                </button>
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--card-border)] shrink-0">
                <button onClick={() => { logout(); router.push('/'); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--muted)] hover:text-red-400 transition-colors w-full">
                    <i className="fas fa-sign-out-alt w-5 text-center"></i> Sign Out
                </button>
            </div>
        </div>
    );
}