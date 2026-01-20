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
    lots: number;
    pnl: number;
    market_trend: string;
};
export type Category = {
    id: number;
    name: string;
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
    tradeEntry: string;
    tradeExit: string;
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