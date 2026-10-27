import React from 'react';

const TONE_STYLES = {
    amber: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]',
    emerald: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
    blue: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
};

export default function KpiStatCard({ value, label, tone = 'amber', icon: Icon }) {
    const toneClass = TONE_STYLES[tone] || TONE_STYLES.amber;
    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${toneClass}`}>
                {Icon && <Icon className="w-6 h-6" />}
            </div>
            <div>
                <span className="text-xl font-black text-slate-900 block leading-tight">{value}</span>
                <span className="text-xs font-semibold text-slate-500">{label}</span>
            </div>
        </div>
    );
}
