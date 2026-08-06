
import React, { useMemo, useState, useEffect } from 'react';
import { getEvaluatorStats, getUniqueEvaluators, loadData, getEvaluationsByEvaluator, getManagedDrivers, getActiveOperatorCount, getWeeksInMonth } from '../services/dataService';
import { EvaluatorStats, Evaluation } from '../types';
import { 
  Filter, Calendar, UserCheck, RefreshCw, 
  ArrowUpDown, ArrowUp, ArrowDown, History, ArrowLeft, Target, LayoutGrid
} from 'lucide-react';

const EvaluatorPerformance: React.FC = () => {
  // State
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const [filterYear, setFilterYear] = useState<number>(2025);
  const [filterMonth, setFilterMonth] = useState<number | ''>(currentMonthIdx); // Default to current month
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [filterEvaluator, setFilterEvaluator] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // History Mode State
  const [selectedEvaluator, setSelectedEvaluator] = useState<string | null>(null);
  const [lastViewedEvaluator, setLastViewedEvaluator] = useState<string | null>(null); // New state for highlighting
  const [evaluatorHistory, setEvaluatorHistory] = useState<Evaluation[]>([]);
  const [historyFilterMonth, setHistoryFilterMonth] = useState<number | ''>('');

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: keyof EvaluatorStats; direction: 'asc' | 'desc' } | null>({ key: 'totalEvaluations', direction: 'desc' });

  const [availableEvaluators, setAvailableEvaluators] = useState<string[]>([]);
  
  // Targets Data
  const [targets, setTargets] = useState({ week: 0, month: 0, year: 0 });

  useEffect(() => {
    setAvailableEvaluators(getUniqueEvaluators());
    
    // Calculate Targets based on Fleet and Operators
    const drivers = getManagedDrivers().filter(d => d.hasCamera === true);
    const activeOps = getActiveOperatorCount() || 1;
    const driversCount = drivers.length || 1;
    
    // Weekly target per operator (1 eval per driver per week / operators)
    const baseWeeklyTarget = Math.ceil(driversCount / activeOps);
    
    const now = new Date();
    // Se tiver filtro de mês, usa o mês selecionado, senão usa o atual
    const targetMonthIdx = (filterMonth !== '' && filterMonth !== null) ? Number(filterMonth) : now.getMonth();
    
    const weeksInTargetMonth = getWeeksInMonth(filterYear, targetMonthIdx);
    const baseMonthlyTarget = baseWeeklyTarget * weeksInTargetMonth;
    
    // Yearly Target Calculation
    // ESTÁTICO: Sempre calcula com base no ano, ignorando o mês selecionado no filtro
    let baseYearlyTarget = 0;
    if (filterYear === 2025) {
        // For 2025, calculate only Oct, Nov, Dec (Months 9, 10, 11)
        for(let m=9; m<12; m++) {
            baseYearlyTarget += (baseWeeklyTarget * getWeeksInMonth(filterYear, m));
        }
    } else {
        // Full year
        for(let m=0; m<12; m++) {
            baseYearlyTarget += (baseWeeklyTarget * getWeeksInMonth(filterYear, m));
        }
    }

    setTargets({
        week: baseWeeklyTarget,
        month: baseMonthlyTarget,
        year: baseYearlyTarget
    });

    const interval = setInterval(() => setLastUpdate(new Date()), 5000);
    return () => clearInterval(interval);
  }, [currentYear, lastUpdate, filterYear, filterMonth]); // Adicionado dependência de filtro

  const stats = useMemo(() => {
    return getEvaluatorStats({
      year: filterYear,
      month: filterMonth === '' ? null : Number(filterMonth),
      week: filterWeek,
      evaluatorName: filterEvaluator
    });
  }, [filterYear, filterMonth, filterWeek, filterEvaluator, lastUpdate]);

  // Filtered History Logic
  const filteredHistory = useMemo(() => {
    if (historyFilterMonth === '') return evaluatorHistory;
    return evaluatorHistory.filter(ev => {
      const d = new Date(ev.timestamp);
      return d.getMonth() === Number(historyFilterMonth);
    });
  }, [evaluatorHistory, historyFilterMonth]);

  // Sorting Logic
  const sortedStats = useMemo(() => {
    let sortableItems = [...stats];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stats, sortConfig]);

  const requestSort = (key: keyof EvaluatorStats) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: keyof EvaluatorStats) => {
    if (!sortConfig || sortConfig.key !== name) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const handleViewHistory = (evaluatorName: string) => {
    const history = getEvaluationsByEvaluator(evaluatorName);
    setEvaluatorHistory(history);
    setSelectedEvaluator(evaluatorName);
    setLastViewedEvaluator(evaluatorName); // Set highlight when entering history
    setHistoryFilterMonth(''); // Reset history filter when opening new evaluator
  };

  const renderProgressCell = (value: number, target: number, label: string) => {
      const pct = target > 0 ? (value / target) * 100 : 0;
      const cappedPct = Math.min(pct, 100);
      
      let colorClass = 'bg-red-500'; // Critical
      let textClass = 'text-red-700';
      let borderClass = 'border-red-200';
      
      if (pct >= 100) { 
          colorClass = 'bg-[#00ad74]'; // Done
          textClass = 'text-[#005c3e]';
          borderClass = 'border-emerald-200';
      }
      else if (pct >= 75) { 
          colorClass = 'bg-[#ffa000]'; // Warning
          textClass = 'text-[#996000]';
          borderClass = 'border-orange-200';
      }

      return (
          <div className={`relative w-full h-16 bg-white rounded-xl overflow-hidden border ${borderClass} group shadow-sm flex flex-col justify-center`}>
              {/* Background Progress Bar */}
              <div 
                  className={`absolute top-0 left-0 h-full ${colorClass} opacity-10 transition-all duration-500 ease-out`} 
                  style={{ width: `${cappedPct}%` }} 
              />
              {/* Bottom Line Progress */}
              <div 
                  className={`absolute bottom-0 left-0 h-1 ${colorClass} transition-all duration-500 ease-out`} 
                  style={{ width: `${cappedPct}%` }} 
              />
              
              {/* Text Content */}
              <div className="relative z-10 px-4 flex justify-between items-center w-full">
                  <div className="flex flex-col items-start">
                      <span className={`font-black text-2xl leading-none ${textClass}`}>
                          {value}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mt-0.5">REALIZADO</span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-500">/ {target}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Meta {label.replace('Meta ', '')}</span>
                  </div>
              </div>
          </div>
      );
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [];
  for (let y = 2025; y <= currentYear + 1; y++) years.push(y);

  // Detail View Component
  if (selectedEvaluator) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setSelectedEvaluator(null)}
               className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
             >
               <ArrowLeft size={24} />
             </button>
             <div>
               <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                 <UserCheck className="text-[#00ad74]" />
                 {selectedEvaluator}
               </h2>
               <p className="text-slate-500 text-sm">Histórico completo de avaliações realizadas.</p>
             </div>
           </div>

           {/* History Filter */}
           <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase px-2">Filtrar Mês:</label>
              <select 
                value={historyFilterMonth} 
                onChange={(e) => setHistoryFilterMonth(e.target.value === '' ? '' : Number(e.target.value))} 
                className="bg-slate-50 border border-slate-200 rounded-md text-sm py-1 pl-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#00ad74]"
              >
                <option value="">Todos os Meses</option>
                {months.map((m, idx) => (<option key={idx} value={idx}>{m}</option>))}
              </select>
           </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
           <div className="overflow-x-auto max-h-[70vh]">
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 sticky top-0 z-10">
                 <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                   <th className="p-4">Data e Horário</th>
                   <th className="p-4">Motorista Avaliado</th>
                   <th className="p-4">Frota (Veículo)</th>
                   <th className="p-4">Base</th>
                   <th className="p-4 text-right">Nota Dada</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-sm">
                 {filteredHistory.length > 0 ? (
                   filteredHistory.map((ev, idx) => (
                     <tr key={idx} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                         {new Date(ev.timestamp).toLocaleDateString('pt-BR')} <span className="text-slate-400 font-normal ml-1">{new Date(ev.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                       </td>
                       <td className="p-4 font-bold text-slate-700">{ev.driver}</td>
                       <td className="p-4 text-slate-600">{ev.vehicle}</td>
                       <td className="p-4">
                         <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-[10px] font-bold text-[#ffa000]">{ev.base}</span>
                       </td>
                       <td className="p-4 text-right">
                         <span className={`font-bold ${ev.score >= 90 ? 'text-[#00ad74]' : ev.score >= 70 ? 'text-[#ffa000]' : 'text-red-500'}`}>
                           {ev.score.toFixed(0)}%
                         </span>
                       </td>
                     </tr>
                   ))
                 ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Nenhuma avaliação encontrada neste mês.
                      </td>
                    </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  }

  // Define dynamic labels
  const monthLabel = (filterMonth !== '' && filterMonth !== null) ? months[Number(filterMonth)] : 'Mês Atual';
  const weekLabel = filterWeek ? filterWeek : 'Semana Atual';

  // Main Table View
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header and Filter Controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Desempenho por Operador</h2>
            <p className="text-slate-500 text-sm">Análise de produtividade e qualidade dos avaliadores.</p>
          </div>
        </div>

        {/* Always Visible Filter Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Year */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ano</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            {/* Month */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mês</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value === '' ? '' : Number(e.target.value))} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                  <option value="">Todos</option>
                  {months.map((m, idx) => (<option key={idx} value={idx}>{m}</option>))}
                </select>
              </div>
            </div>
            {/* Week */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nº Semana</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                  <option value="">Todas</option>
                  <option value="Semana 1">Semana 1</option>
                  <option value="Semana 2">Semana 2</option>
                  <option value="Semana 3">Semana 3</option>
                  <option value="Semana 4">Semana 4</option>
                  <option value="Semana 5">Semana 5</option>
                </select>
              </div>
            </div>
            {/* Evaluator */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Avaliador</label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={filterEvaluator} onChange={(e) => setFilterEvaluator(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                  <option value="">Todos</option>
                  {availableEvaluators.map((ev, i) => (<option key={i} value={ev}>{ev}</option>))}
                </select>
              </div>
            </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#ffa000]/10 backdrop-blur-md shadow-sm">
              <tr className="text-slate-600 text-[11px] uppercase tracking-wider font-bold border-b border-[#ffa000]/20">
                <th className="p-4 cursor-pointer hover:bg-[#ffa000]/10" onClick={() => requestSort('name')}>
                  <div className="flex items-center gap-2">Avaliador {getSortIcon('name')}</div>
                </th>
                
                {/* ESTÁTICO: Meta Ano */}
                <th className="p-4 text-center cursor-pointer w-[120px] bg-slate-50/50" title="Meta Prevista para o Ano (Estático)">
                   <div className="flex flex-col items-center justify-center gap-1">
                      <Target size={18} className="text-[#ffa000]" /> 
                      <span className="text-[10px]">Meta {filterYear}</span>
                   </div>
                </th>

                {/* ESTÁTICO: Total Ano */}
                <th className="p-4 text-center cursor-pointer hover:bg-[#ffa000]/10 w-[200px] bg-slate-50/50" onClick={() => requestSort('evalsYear')}>
                   <div className="flex items-center justify-center gap-2">Total {filterYear} {getSortIcon('evalsYear')}</div>
                </th>

                {/* DINÂMICO: Semana */}
                <th className="p-4 text-center cursor-pointer w-[200px]" title="Atividade na Semana Atual/Selecionada">
                  {weekLabel}
                </th>

                {/* DINÂMICO: Mês */}
                <th className="p-4 text-center cursor-pointer w-[200px]" title="Atividade no Mês Atual/Selecionado">
                  {monthLabel}
                </th>
                
                <th className="p-4 text-center cursor-pointer hover:bg-[#ffa000]/10" onClick={() => requestSort('participationIndex')}>
                  <div className="flex items-center justify-center gap-2">Performance {getSortIcon('participationIndex')}</div>
                </th>
                <th className="p-4 text-right cursor-pointer hover:bg-[#ffa000]/10" onClick={() => requestSort('averageGivenScore')}>
                   <div className="flex items-center justify-end gap-2">Média Concedida {getSortIcon('averageGivenScore')}</div>
                </th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedStats.length > 0 ? (
                sortedStats.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`transition-all duration-300 group ${
                        lastViewedEvaluator === row.name 
                        ? 'bg-[#ffa000]/10 border-l-4 border-[#ffa000]' 
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <td className="p-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                          <UserCheck size={16} />
                        </div>
                        {row.name}
                      </div>
                    </td>
                    
                    {/* Meta Ano (Estático) */}
                    <td className="p-4 text-center font-black text-2xl text-slate-300 bg-slate-50/50">
                        {targets.year}
                    </td>

                    {/* Total Ano (Estático - Com Gradiente) */}
                    <td className="p-4 text-center bg-slate-50/50">
                      {renderProgressCell(row.evalsYear, targets.year, 'Anual')}
                    </td>

                    {/* Semana (Dinâmico) */}
                    <td className="p-4 text-center">
                       {renderProgressCell(row.evalsWeek, targets.week, 'Semanal')}
                    </td>

                    {/* Mês (Dinâmico) */}
                    <td className="p-4 text-center">
                       {renderProgressCell(row.evalsMonth, targets.month, 'Mensal')}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                         <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-[#ffa000]" style={{ width: `${row.participationIndex}%` }}></div>
                         </div>
                         <span className="text-xs font-bold text-slate-600 w-10 text-right">{row.participationIndex.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                       <span className={`font-bold ${row.averageGivenScore < 80 ? 'text-[#00ad74]' : 'text-slate-600'}`}>
                         {row.averageGivenScore.toFixed(1)}%
                       </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleViewHistory(row.name)}
                        className="p-2 bg-slate-100 hover:bg-[#00ad74] hover:text-white text-slate-500 rounded-lg transition-colors group/btn"
                        title="Ver Histórico Completo"
                      >
                        <History size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EvaluatorPerformance;
