{
type: uploaded file
fileName: tradingjournalreactjs - Copy/app/types.ts
fullContent:
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
}

export type CalculatorEntry = {
    id: number;
    val: number;
    isPercentage: boolean;
    note: string;
};
}