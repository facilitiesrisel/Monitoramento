
import React, { useMemo, useState, useEffect } from 'react';
import { getPriorityDrivers, loadData } from '../services/dataService';
import { PriorityDriverStatus } from '../types';
import { AlertTriangle, User, Calendar, RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const PriorityList: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [showAll, setShowAll] = useState(false);
  const [drivers, setDrivers] = useState<PriorityDriverStatus[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // New Filters
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const years = [];
  for (let y = 2025; y <= currentYear + 1; y++) years.push(y);

  const refreshData = () => {
    setDrivers(getPriorityDrivers(viewMode, showAll, selectedYear, selectedMonth));
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
        refreshData();
    }, 5000); // Live update check
    return () => clearInterval(interval);
  }, [viewMode, lastUpdate, showAll, selectedYear, selectedMonth]);

  const getStatusColor = (urgency: string) => {
    if (urgency === 'critical') return '#ef4444'; // Red
    if (urgency === 'warning') return '#ffa000'; // Orange
    return '#00ad74'; // Green for Done
  };

  const getStatusClass = (urgency: string) => {
    if (urgency === 'critical') return 'bg-red-500'; 
    if (urgency === 'warning') return 'bg-[#ffa000]';
    return 'bg-[#00ad74]';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <AlertTriangle className={showAll ? "text-slate-800" : "text-[#ffa000]"} />
            Painel de Prioridades
          </h2>
          <p className="text-slate-500 text-sm">
            {showAll 
             ? `Visão geral de todos os motoristas e metas ${viewMode === 'week' ? 'semanais' : 'mensais'}.` 
             : `Motoristas que necessitam de avaliação urgente para cumprir a meta ${viewMode === 'week' ? 'semanal' : 'mensal'}.`
            }
          </p>
        </div>

        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#00ad74]">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#00ad74]">
                    {months.map((m, i) => {
                        if (selectedYear === 2025 && i < 9) return null;
                        return <option key={i} value={i}>{m}</option>
                    })}
                </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'week' 
                    ? 'bg-[#ffa000] text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                Semana
            </button>
            <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'month' 
                    ? 'bg-[#00ad74] text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                Mês
            </button>
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button 
                onClick={() => setShowAll(!showAll)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    showAll 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
                {showAll ? <EyeOff size={16} /> : <Eye size={16} />}
                <span className="hidden sm:inline">{showAll ? 'Pendentes' : 'Todos'}</span>
            </button>
            </div>
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {drivers.length > 0 ? (
          drivers.map((item, idx) => (
            <div 
              key={idx} 
              className={`relative group bg-white border rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${item.urgency === 'done' ? 'border-[#00ad74]/30' : 'border-slate-200'}`}
            >
              {/* Status Bar Top */}
              <div className={`h-1.5 w-full ${getStatusClass(item.urgency)}`}></div>

              <div className="p-5 relative z-10">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border shadow-sm ${item.urgency === 'done' ? 'bg-[#00ad74]/10 text-[#00ad74] border-[#00ad74]/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {item.driver.name.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-1" title={item.driver.name}>
                        {item.driver.name.split(' ')[0]} {item.driver.name.split(' ')[1]}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mt-1 inline-block">
                        {item.driver.base}
                      </span>
                    </div>
                  </div>
                  
                  {/* Tooltip Icon */}
                  <div className="relative group/tooltip">
                     {item.urgency === 'done' ? (
                        <CheckCircle className="text-[#00ad74]" size={20} />
                     ) : (
                        <AlertCircle 
                           className={`${item.urgency === 'critical' ? 'text-red-500 animate-pulse' : 'text-[#ffa000]'}`} 
                           size={20} 
                        />
                     )}
                     
                     {/* Custom Tooltip */}
                     <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                        {item.urgency === 'done' ? (
                             <p className="font-bold">Meta Atingida!</p>
                        ) : (
                             <>
                                <p className="font-bold mb-1">Ação Necessária</p>
                                Realizar {item.missing} avaliação(ões) para atingir a meta.
                             </>
                        )}
                     </div>
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Progresso</span>
                    <span style={{ color: getStatusColor(item.urgency) }} className="font-bold">
                      {item.evaluationsCount} / {item.target}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getStatusClass(item.urgency)}`}
                      style={{ width: `${Math.min((item.evaluationsCount / item.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-xs text-slate-400">
                   <div className="flex items-center gap-1">
                     <Calendar size={12} />
                     {viewMode === 'week' ? 'Semana' : 'Mês'} ({selectedMonth+1}/{selectedYear})
                   </div>
                   {item.urgency !== 'done' ? (
                       <div className="font-semibold text-slate-300">
                         Faltam: <span className="text-slate-600">{item.missing}</span>
                       </div>
                   ) : (
                       <div className="font-bold text-[#00ad74] text-[10px] uppercase">
                         Completo
                       </div>
                   )}
                </div>
              </div>

              {/* Decorative Background Icon */}
              <User className="absolute -right-4 -bottom-4 text-slate-50 transform rotate-12 scale-[2.5] z-0 opacity-50" />
            </div>
          ))
        ) : (
           <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white border border-dashed border-slate-300 rounded-xl text-center">
             <div className="w-16 h-16 bg-[#00ad74]/10 rounded-full flex items-center justify-center mb-4 text-[#00ad74]">
                <CheckCircle size={32} />
             </div>
             <h3 className="text-lg font-bold text-slate-700">Tudo em dia!</h3>
             <p className="text-slate-500 text-sm max-w-md mt-1">
               {showAll ? 'Nenhum motorista encontrado.' : `Todos os motoristas atingiram a meta de avaliações para ${viewMode === 'week' ? 'esta semana' : 'este mês'}.`}
             </p>
           </div>
        )}
      </div>
    </div>
  );
};

export default PriorityList;
