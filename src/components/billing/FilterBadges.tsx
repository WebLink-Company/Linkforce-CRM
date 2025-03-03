import React from 'react';

interface FilterBadgesProps {
  activeFilter: string;
  onFilter: (filter: string) => void;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  setDateRange: (range: { startDate: string; endDate: string }) => void;
}

export default function FilterBadges({
  activeFilter,
  onFilter,
  dateRange,
  setDateRange
}: FilterBadgesProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <button
        onClick={() => onFilter('month')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeFilter === 'month'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-gray-800/50 text-gray-300 border border-white/10 hover:bg-gray-700/50'
        }`}
      >
        Este Mes
      </button>
      <button
        onClick={() => {
          const now = new Date();
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          setDateRange({
            startDate: lastMonth.toISOString().split('T')[0],
            endDate: lastMonthEnd.toISOString().split('T')[0]
          });
        }}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          dateRange.startDate && dateRange.endDate
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-gray-800/50 text-gray-300 border border-white/10 hover:bg-gray-700/50'
        }`}
      >
        Mes Anterior
      </button>
      <button
        onClick={() => {
          const now = new Date();
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          setDateRange({
            startDate: threeMonthsAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
          });
        }}
        className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-800/50 text-gray-300 border border-white/10 hover:bg-gray-700/50 transition-colors"
      >
        Últimos 3 Meses
      </button>
      <button
        onClick={() => onFilter('history')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeFilter === 'history'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-gray-800/50 text-gray-300 border border-white/10 hover:bg-gray-700/50'
        }`}
      >
        Historial Completo
      </button>
    </div>
  );
}