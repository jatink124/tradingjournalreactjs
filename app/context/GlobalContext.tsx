'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CalculatorEntry } from '../types';

interface GlobalContextType {
    showCalculator: boolean;
    setShowCalculator: (show: boolean) => void;
    calcEntries: CalculatorEntry[];
    setCalcEntries: React.Dispatch<React.SetStateAction<CalculatorEntry[]>>;
    addToCalculator: (amount: number, note: string) => void;
    isAuthenticated: boolean;
    login: (pin: string) => boolean;
    logout: () => void;
    theme: string;
    setTheme: (theme: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcEntries, setCalcEntries] = useState<CalculatorEntry[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [theme, setThemeState] = useState('default');

    useEffect(() => {
        // Load Data
        const savedCalc = localStorage.getItem('calc_entries');
        if (savedCalc) try { setCalcEntries(JSON.parse(savedCalc)); } catch (e) {}
        
        const auth = localStorage.getItem('is_authenticated');
        if (auth === 'true') setIsAuthenticated(true);

        const savedTheme = localStorage.getItem('app_theme');
        if (savedTheme) setThemeState(savedTheme);
    }, []);

    useEffect(() => {
        localStorage.setItem('calc_entries', JSON.stringify(calcEntries));
    }, [calcEntries]);

    const setTheme = (newTheme: string) => {
        setThemeState(newTheme);
        localStorage.setItem('app_theme', newTheme);
    };

    const addToCalculator = (amount: number, note: string) => {
        const newEntry: CalculatorEntry = {
            id: Date.now(),
            val: amount,
            isPercentage: false,
            note: note || 'Trade Import'
        };
        setCalcEntries(prev => [...prev, newEntry]);
        setShowCalculator(true);
    };

    const login = (pin: string) => {
        if (pin === '1234') {
            setIsAuthenticated(true);
            localStorage.setItem('is_authenticated', 'true');
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('is_authenticated');
    };

    return (
        <GlobalContext.Provider value={{ showCalculator, setShowCalculator, calcEntries, setCalcEntries, addToCalculator, isAuthenticated, login, logout, theme, setTheme }}>
            {children}
        </GlobalContext.Provider>
    );
}

export function useGlobal() {
    const context = useContext(GlobalContext);
    if (context === undefined) throw new Error('useGlobal must be used within a GlobalProvider');
    return context;
}