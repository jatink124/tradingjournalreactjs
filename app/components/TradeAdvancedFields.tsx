import { JournalForm } from '../types';

interface TradeAdvancedFieldsProps {
    formData: JournalForm;
    setFormData: (data: JournalForm | ((prev: JournalForm) => JournalForm)) => void;
}

export default function TradeAdvancedFields({ formData, setFormData }: TradeAdvancedFieldsProps) {
    const setupTypes = [
        'Breakout',
        'Reversal',
        'Pullback',
        'Support Bounce',
        'Resistance Break',
        'Trend Following',
        'Range Trading',
        'Pin Bar',
        'Engulfing',
        'EMA Crossover'
    ];

    const tradeDirections = ['Long', 'Short'];

    const tradeSessionOptions = [
        'Opening (09:15-10:00)',
        'Mid-Morning (10:00-11:30)',
        'Late Morning (11:30-12:30)',
        'Afternoon (12:30-14:30)',
        'Closing (14:30-15:30)'
    ];

    return (
        <div className="space-y-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <h3 className="text-sm font-bold text-blue-400">Trade Details</h3>

            {/* Setup Type */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Setup Type</label>
                <select
                    value={formData.setupType || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, setupType: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                    <option value="">Select Setup Type...</option>
                    {setupTypes.map(setup => (
                        <option key={setup} value={setup}>{setup}</option>
                    ))}
                </select>
            </div>

            {/* Trade Direction */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Direction</label>
                <div className="flex gap-2">
                    {tradeDirections.map(direction => (
                        <button
                            key={direction}
                            onClick={() => setFormData(prev => ({ ...prev, tradeDirection: direction }))}
                            className={`flex-1 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                                formData.tradeDirection === direction
                                    ? direction === 'Long'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-red-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                            }`}
                        >
                            {direction}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trading Session */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Trading Session</label>
                <select
                    value={formData.tradeSession || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, tradeSession: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                    <option value="">Select Session...</option>
                    {tradeSessionOptions.map(session => (
                        <option key={session} value={session}>{session}</option>
                    ))}
                </select>
            </div>

            {/* RR Ratio Display */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Risk-Reward Ratio</label>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded px-3 py-2 text-sm">
                    <RRRatioDisplay
                        entry={parseFloat(formData.tradeEntry) || 0}
                        sl={parseFloat(formData.tradeSL) || 0}
                        target={parseFloat(formData.tradeTarget) || 0}
                        lots={Number(formData.tradeLots) || 0}
                    />
                </div>
            </div>
        </div>
    );
}

function RRRatioDisplay({ entry, sl, target, lots }: { entry: number; sl: number; target: number; lots: number }) {
    if (!entry || !sl || !target) {
        return <span className="text-zinc-400">Enter price levels to calculate RR ratio</span>;
    }

    const risk = Math.abs(entry - sl) * lots * 75;
    const reward = Math.abs(target - entry) * lots * 75;
    const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : '0';

    return (
        <div className="flex justify-between items-center">
            <span>
                <span className="text-zinc-300">Risk: </span>
                <span className="text-red-400 font-mono">₹{risk.toFixed(0)}</span>
                <span className="text-zinc-500 mx-2">→</span>
                <span className="text-zinc-300">Reward: </span>
                <span className="text-emerald-400 font-mono">₹{reward.toFixed(0)}</span>
            </span>
            <span className={`font-bold ${parseFloat(rrRatio) > 1.5 ? 'text-emerald-500' : parseFloat(rrRatio) > 1 ? 'text-blue-400' : 'text-orange-500'}`}>
                1:{rrRatio}
            </span>
        </div>
    );
}
