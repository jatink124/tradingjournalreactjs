// app/types.ts

export type Entry = {
    id: number;
    entry_type: string;
    asset: string;
    timestamp_str: string;
    focus_area: string;
    notes: string;
    mistakes: string[];
    neg_notes: string;
    plan_bias: string;
    key_level: string;
    plan_notes: string;
    images: string[];
    entry_price: number;
    exit_price: number;
    stop_loss: number;
    target_price: number;
    lots: number;
    pnl: number;
    market_trend: string;
    setup_type?: string;
    trade_direction?: string;
    trade_session?: string;
};

export type MistakeItem = {
    id: number;
    name: string;
};

export type Category = {
    id: number;
    name: string;
};

// NEW: Asset Type for dynamic multipliers
export type AssetItem = {
    id: number;
    name: string;
    multiplier: number;
};

export type GalleryItem = {
    src: string;
    desc: string;
};

export interface JournalForm {
    entryTime: string;
    assetType: string;
    stockName: string;
    focusArea: string;
    liveNotes: string;
    
    // Trade Mode
    tradeEntry: string;
    tradeExit: string;
    tradeSL: string;        
    tradeTarget: string;    
    tradeRisk: string;      
    tradeLots: number | string;
    tradeLearning: string;
    
    negNotes: string;
    planBias: string;
    keyLevel: string;
    planNotes: string;
    mistakes: string[];
    marketTrend: string;
    resourceRows: { k: string; v: string }[];
    
    // Advanced Features
    setupType?: string;
    tradeDirection?: string;
    tradeSession?: string;
}

export type CalculatorEntry = {
    id: number;
    val: number;
    isPercentage: boolean;
    note: string;
};

// Advanced Analytics Types
export type TradeAnalysis = {
    totalTrades: number;
    winTrades: number;
    lossTrades: number;
    winRate: number;
    netPnL: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
    rrRatio: number;
    drawdown: number;
    streakWin: number;
    streakLose: number;
};

export type RRAnalysis = {
    ratio: string;
    count: number;
    winRate: number;
    avgPnL: number;
    profitFactor: number;
};

export type TimingAnalysis = {
    session: string;
    trades: number;
    winRate: number;
    avgPnL: number;
    bestHour: number;
};

export type SetupAnalysis = {
    setupType: string;
    trades: number;
    winRate: number;
    avgPnL: number;
    profitFactor: number;
};