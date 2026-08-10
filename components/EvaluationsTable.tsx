
import React, { useMemo, useState, useEffect } from 'react';
import { getRawEvaluations, getManagedDrivers, getPriorityDrivers, getDashboardMetrics, getEvaluatorStats, getDriverStats, normalizeEvaluatorName, getWeeksInMonth, getActiveOperatorCount, sendTestEmail, loadData, deleteEvaluation, downloadEvaluationsCSV, resendEvaluationEmail } from '../services/dataService';
import { DriverProfile, Evaluation, UserRole, PriorityDriverStatus } from '../types';
import { EvaluationReportView } from './EvaluationReportView';
import { 
    Search, AlertCircle, CheckCircle, Filter, ChevronUp, ChevronDown, Calendar, User, 
    RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, UserCheck, AlertTriangle, X, PlusCircle, 
    ArrowRight, LayoutDashboard, Target, Activity, Trophy, PlayCircle, HelpCircle, CalendarDays, BarChart2,
    TrendingUp, List, Zap, Loader2, Mail, Truck, Cloud, Star, Pencil, Trash2, LayoutGrid, Eye, Download, Users, FileText
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';

interface EvaluationsTableProps {
  userRole?: UserRole;
  userName?: string;
  onCreateNew?: () => void;
  onEvaluateDriver?: (driverId: string) => void;
  onEditEvaluation?: (evalId: string) => void;
}

interface ExtendedPriorityData {
    driver: DriverProfile;
    weekCount: number;
    weekTarget: number;
    monthCount: number;
    monthTarget: number;
    yearCount: number;
    yearTarget: number;
    isMonthDone: boolean;
    isWeekDone: boolean;
    weeksBreakdown: { week: number, target: number, realized: number }[];
}

interface DriverViewStats {
    driver: DriverProfile;
    yearTarget: number;
    yearRealized: number;
    monthTarget: number;
    monthRealized: number;
}

const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const EvaluationsTable: React.FC<EvaluationsTableProps> = ({ userRole, userName, onCreateNew, onEvaluateDriver, onEditEvaluation }) => {
  const currentYear = new Date().getFullYear();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Default to current year, but enforce min 2025
  const [filterYear, setFilterYear] = useState<number>(Math.max(2025, currentYear));
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [filterDriver, setFilterDriver] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  // Inicializa com os anos fixos solicitados
  const [availableYears, setAvailableYears] = useState<number[]>([2025, 2026, 2027]);
  
  // States do Modal de Pendências
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingDrivers, setPendingDrivers] = useState<ExtendedPriorityData[]>([]);
  const [pendingFilterMonth, setPendingFilterMonth] = useState<number>(new Date().getMonth());
  const [pendingFilterWeek, setPendingFilterWeek] = useState<number | ''>('');
  const [pendingViewMode, setPendingViewMode] = useState<'cards' | 'list'>('cards');
  // Ordenação da tabela de pendências
  const [pendingSortConfig, setPendingSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  // States do Modal Dashboard (Operador)
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [dashboardMonth, setDashboardMonth] = useState<number>(new Date().getMonth());
  const [dashboardYear, setDashboardYear] = useState<number>(currentYear);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);

  // States para Visualizar Motoristas (Qualidade)
  const [isDriverViewOpen, setIsDriverViewOpen] = useState(false);
  const [driverViewMonth, setDriverViewMonth] = useState<number>(new Date().getMonth());
  const [driverViewYear, setDriverViewYear] = useState<number>(currentYear);
  const [driverViewData, setDriverViewData] = useState<DriverViewStats[]>([]);

  // States para CSV Export
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvStartDate, setCsvStartDate] = useState('');
  const [csvEndDate, setCsvEndDate] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: keyof Evaluation; direction: 'asc' | 'desc' } | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<DriverProfile[]>([]);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [selectedReportEvalId, setSelectedReportEvalId] = useState<string | null>(null);

  const handleResendEmail = async (ev: Evaluation) => {
      const customEmail = prompt(`Reenviar e-mail da Avaliação de ${ev.driver}?\n\nInforme um e-mail específico se desejar (ou deixe em branco para enviar aos destinatários padrão):`, "");
      if (customEmail === null) return;

      setIsResending(ev.id);
      try {
          await resendEvaluationEmail(ev.id, customEmail.trim() || undefined);
          alert("E-mail de avaliação reenviado com sucesso!");
      } catch (e: any) {
          alert("Erro ao reenviar e-mail: " + (e?.message || e));
      } finally {
          setIsResending(null);
      }
  };

  const handleDelete = async (id: string) => {
      if (userRole === 'quality') return; // Segurança extra
      if (!confirm("Deseja realmente excluir esta avaliação permanentemente?")) return;
      setIsDeleting(id);
      try {
          await deleteEvaluation(id);
          alert("Avaliação excluída com sucesso.");
          setLastUpdate(new Date());
      } catch (err) {
          alert("Erro ao excluir avaliação.");
      } finally {
          setIsDeleting(null);
      }
  };

  useEffect(() => {
    setAvailableDrivers(getManagedDrivers());
    const allEvals = getRawEvaluations({});
    
    // Find unique years from data
    const dataYears = Array.from(new Set(allEvals.map(e => new Date(e.timestamp).getFullYear())));
    
    // Base years that must always appear
    const requiredYears = [2025, 2026, 2027];
    
    // Combine and filter: must be >= 2025
    const combinedYears = Array.from(new Set([...dataYears, ...requiredYears]))
        .filter(y => y >= 2025)
        .sort((a, b) => b - a); // Descending order
    
    setAvailableYears(combinedYears);

    // Ensure current selection is valid
    if (!combinedYears.includes(filterYear)) {
        setFilterYear(combinedYears[0] || 2025);
    }

    const interval = setInterval(() => {
        setLastUpdate(new Date());
    }, 10000); 

    return () => clearInterval(interval);
  }, []);

  const evaluations = useMemo(() => {
    return getRawEvaluations({
      year: filterYear,
      month: filterMonth === '' ? null : Number(filterMonth),
      week: filterWeek,
      driverName: filterDriver
    });
  }, [filterYear, filterMonth, filterWeek, filterDriver, lastUpdate]);

  // Efeito para calcular dados da visualização de motoristas (Qualidade)
  useEffect(() => {
      if (!isDriverViewOpen) return;
      const allDrivers = getManagedDrivers().filter(d => d.hasCamera === true);
      const allEvals = getRawEvaluations({});
      
      const stats: DriverViewStats[] = allDrivers.map(drv => {
          // Filtragem Ano (Se 2025, considera a partir de Outubro)
          const targetYearFilter = driverViewYear === 2025 ? 9 : 0; // Mês 9 = Outubro
          
          let yearTarget = 0;
          for (let m = targetYearFilter; m < 12; m++) {
              yearTarget += getWeeksInMonth(driverViewYear, m);
          }

          const evalsYear = allEvals.filter(ev => {
              const d = new Date(ev.timestamp);
              return ev.driver === drv.name && d.getFullYear() === driverViewYear && d.getMonth() >= targetYearFilter;
          }).length;

          // Filtragem Mês Selecionado
          const monthTarget = getWeeksInMonth(driverViewYear, driverViewMonth);
          const evalsMonth = allEvals.filter(ev => {
              const d = new Date(ev.timestamp);
              return ev.driver === drv.name && d.getFullYear() === driverViewYear && d.getMonth() === driverViewMonth;
          }).length;

          return {
              driver: drv,
              yearTarget,
              yearRealized: evalsYear,
              monthTarget,
              monthRealized: evalsMonth
          };
      }).sort((a,b) => a.driver.name.localeCompare(b.driver.name));

      setDriverViewData(stats);
  }, [isDriverViewOpen, driverViewMonth, driverViewYear, lastUpdate]);

  // Efeito para Pendências (Dashboard Operador)
  useEffect(() => {
      if (!isPendingModalOpen) return;
      const allDrivers = getManagedDrivers();
      const allEvals = getRawEvaluations({});
      const now = new Date();
      
      const driversWithCam = allDrivers.filter(d => d.hasCamera === true);
      const weeksInSelectedMonth = getWeeksInMonth(currentYear, pendingFilterMonth);

      const calculatedData: ExtendedPriorityData[] = driversWithCam.map(driver => {
          const driverEvals = allEvals.filter(ev => ev.driver.trim().toUpperCase() === driver.name.trim().toUpperCase());
          
          // Count specific selected week if filter is active
          const weekCount = driverEvals.filter(ev => {
              const d = new Date(ev.timestamp);
              if (pendingFilterWeek !== '') {
                  const weekNum = Math.ceil(d.getDate() / 7);
                  return d.getFullYear() === currentYear && d.getMonth() === pendingFilterMonth && weekNum === Number(pendingFilterWeek);
              }
              const d1 = new Date(d); d1.setHours(0,0,0,0);
              const d2 = new Date(now); d2.setHours(0,0,0,0);
              d1.setDate(d1.getDate() - d1.getDay());
              d2.setDate(d2.getDate() - d2.getDay());
              return d1.getTime() === d2.getTime() && d.getFullYear() === currentYear;
          }).length;
          
          const monthCount = driverEvals.filter(ev => {
              const d = new Date(ev.timestamp);
              return d.getFullYear() === currentYear && d.getMonth() === pendingFilterMonth;
          }).length;

          // Year Calculation Logic (Matches Dashboard)
          const yearCount = driverEvals.filter(e => new Date(e.timestamp).getFullYear() === currentYear).length;
          let yearTarget = 0;
          for(let m=0; m<12; m++) {
              if (currentYear === 2025 && m < 9) continue;
              yearTarget += getWeeksInMonth(currentYear, m);
          }
          
          const adjustedMonthTarget = weeksInSelectedMonth;
          const adjustedWeekTarget = 1;

          // Breakdown per week 1-5 for the Table View
          const weeksBreakdown = [];
          for (let w=1; w<=5; w++) {
              const targetForW = (w <= weeksInSelectedMonth) ? 1 : 0;
              const realizedForW = driverEvals.filter(e => {
                  const d = new Date(e.timestamp);
                  if (d.getFullYear() !== currentYear || d.getMonth() !== pendingFilterMonth) return false;
                  const weekNum = Math.ceil(d.getDate() / 7);
                  return Math.min(weekNum, 5) === w;
              }).length;
              weeksBreakdown.push({ week: w, target: targetForW, realized: realizedForW });
          }

          return {
              driver,
              weekCount,
              weekTarget: adjustedWeekTarget,
              monthCount,
              monthTarget: adjustedMonthTarget,
              yearCount,
              yearTarget,
              isMonthDone: monthCount >= adjustedMonthTarget && adjustedMonthTarget > 0,
              isWeekDone: weekCount >= adjustedWeekTarget && adjustedWeekTarget > 0,
              weeksBreakdown
          };
      });

      calculatedData.sort((a, b) => {
          // Sort logic for list view
          if (pendingViewMode === 'list') {
              let valA: any = 0, valB: any = 0;
              switch(pendingSortConfig.key) {
                  case 'name': valA = a.driver.name; valB = b.driver.name; break;
                  case 'year-target': valA = a.yearTarget; valB = b.yearTarget; break;
                  case 'year-realized': valA = a.yearCount; valB = b.yearCount; break;
                  case 'month-target': valA = a.monthTarget; valB = b.monthTarget; break;
                  case 'month-realized': valA = a.monthCount; valB = b.monthCount; break;
                  default:
                      if (pendingSortConfig.key.startsWith('week-')) {
                          const weekIdx = parseInt(pendingSortConfig.key.split('-')[1]) - 1;
                          valA = a.weeksBreakdown[weekIdx]?.realized || 0;
                          valB = b.weeksBreakdown[weekIdx]?.realized || 0;
                      }
                      break;
              }
              if (typeof valA === 'string') {
                  return pendingSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return pendingSortConfig.direction === 'asc' ? valA - valB : valB - valA;
          }

          // Default sort for cards (by percentage completion)
          if (pendingFilterWeek !== '') {
              const pctA = a.weekTarget > 0 ? a.weekCount / a.weekTarget : 1;
              const pctB = b.weekTarget > 0 ? b.weekCount / b.weekTarget : 1;
              return pctA - pctB;
          }
          const pctA = a.monthTarget > 0 ? a.monthCount / a.monthTarget : 1;
          const pctB = b.monthTarget > 0 ? b.monthCount / b.monthTarget : 1;
          return pctA - pctB;
      });

      setPendingDrivers(calculatedData);
  }, [isPendingModalOpen, pendingFilterMonth, pendingFilterWeek, lastUpdate, currentYear, pendingViewMode, pendingSortConfig]);

  const handleOpenPending = () => setIsPendingModalOpen(true);

  const requestPendingSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (pendingSortConfig.key === key && pendingSortConfig.direction === 'asc') direction = 'desc';
      setPendingSortConfig({ key, direction });
  };

  const getPendingSortIcon = (key: string) => {
      if (pendingSortConfig.key !== key) return <ArrowUpDown size={10} className="opacity-30 ml-1" />;
      return pendingSortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-[#00ad74] ml-1" /> : <ArrowDown size={10} className="text-[#00ad74] ml-1" />;
  };

  const handleOpenDashboard = async () => {
      setIsRefreshingDashboard(true);
      await loadData(true); 
      const allData = getRawEvaluations({});
      let targetDate = new Date();

      if (userName && allData.length > 0) {
          const myNormalizedName = normalizeEvaluatorName(userName);
          const myLatestEval = allData.find(e => normalizeEvaluatorName(e.evaluator) === myNormalizedName);
          if (myLatestEval) targetDate = new Date(myLatestEval.timestamp);
          else targetDate = new Date(allData[0].timestamp);
      } else if (allData.length > 0) {
          targetDate = new Date(allData[0].timestamp);
      }

      setDashboardYear(targetDate.getFullYear());
      setDashboardMonth(Math.max(9, targetDate.getMonth())); // Força inicialização em Outubro ou depois se for 2025
      setIsDashboardModalOpen(true);
      setIsRefreshingDashboard(false);
  };

  const handleDownloadCSV = () => {
      if (!csvStartDate || !csvEndDate) {
          alert("Selecione a data de início e fim.");
          return;
      }
      downloadEvaluationsCSV(csvStartDate, csvEndDate);
      setIsCsvModalOpen(false);
  };

  const operatorStats = useMemo(() => {
     if (!userName || !isDashboardModalOpen) return null;

     try {
         const allDrivers = getManagedDrivers();
         const driversWithCam = allDrivers.filter(d => d.hasCamera === true);
         const driversWithCameraCount = driversWithCam.length || 1;
         
         const activeOperatorsCount = getActiveOperatorCount();
         const weeksInSelectedMonth = getWeeksInMonth(dashboardYear, dashboardMonth);
         
         const fleetTargetMonth = driversWithCameraCount * weeksInSelectedMonth;
         let targetMonth = Math.ceil(fleetTargetMonth / activeOperatorsCount);
         
         let targetYear = 0;
         if (dashboardYear === 2025) {
             let totalWeeksYear = 0;
             // CONTABILIZA APENAS DE OUTUBRO PARA FRENTE EM 2025
             for(let m=9; m<12; m++) totalWeeksYear += getWeeksInMonth(dashboardYear, m);
             targetYear = Math.ceil((driversWithCameraCount * totalWeeksYear) / activeOperatorsCount);
         } else {
             let totalWeeksYear = 0;
             for(let m=0; m<12; m++) totalWeeksYear += getWeeksInMonth(dashboardYear, m);
             targetYear = Math.ceil((driversWithCameraCount * totalWeeksYear) / activeOperatorsCount);
         }

         const targetWeek = Math.ceil(targetMonth / weeksInSelectedMonth) || 0;

         const operatorMetricsMonth = getDashboardMetrics(dashboardYear, dashboardMonth, { evaluatorName: userName });
         const operatorMetricsYear = getDashboardMetrics(dashboardYear, null, { evaluatorName: userName });

         const realizedMonth = operatorMetricsMonth.totalEvaluations || 0;
         const realizedYear = operatorMetricsYear.totalEvaluations || 0;
         
         const percentMonth = targetMonth > 0 ? (realizedMonth / targetMonth) * 100 : 0;
         const percentYear = targetYear > 0 ? (realizedYear / targetYear) * 100 : 0;

         const allStats = getEvaluatorStats({ year: dashboardYear });
         const myStats = allStats.find(s => normalizeEvaluatorName(s.name) === normalizeEvaluatorName(userName)) 
            || { averageGivenScore: 0, participationIndex: 0 };

         // FILTRA MESES JANEIRO A SETEMBRO EM 2025 NO GRÁFICO
         const chartData = operatorMetricsYear.evaluationsPerMonth
            .filter((_, idx) => dashboardYear !== 2025 || idx >= 9)
            .map((m) => {
                const monthIdx = months.indexOf(months.find(name => name.startsWith(m.month)) || '');
                const weeksInThatMonth = getWeeksInMonth(dashboardYear, monthIdx);
                const indTargetThatMonth = Math.ceil((driversWithCameraCount * weeksInThatMonth) / activeOperatorsCount);
                return { ...m, goalTarget: indTargetThatMonth };
            });

         const tableData = [
             { label: `Ano ${dashboardYear} (Ref. Out-Dez)`, target: targetYear, realized: realizedYear, percent: percentYear, type: 'year' },
             { label: months[dashboardMonth], target: targetMonth, realized: realizedMonth, percent: percentMonth, type: 'month' },
         ];

         for (let i = 1; i <= weeksInSelectedMonth; i++) {
             const weekLabel = `Semana ${i}`;
             const found = operatorMetricsMonth.evaluationsPerWeek?.find(w => w.week === weekLabel);
             const count = found ? found.count : 0;
             tableData.push({
                 label: weekLabel,
                 target: targetWeek,
                 realized: count,
                 percent: targetWeek > 0 ? (count / targetWeek) * 100 : 0,
                 type: 'week'
             });
         }

         return { chartData, myStats, targets: { month: targetMonth, year: targetYear }, progress: { month: percentMonth, year: percentYear, monthVal: realizedMonth, yearVal: realizedYear }, tableData };
     } catch (e) {
         console.error("Erro no dashboard do operador", e);
         return null;
     }
  }, [userName, isDashboardModalOpen, lastUpdate, dashboardMonth, dashboardYear]);

  const sortedEvaluations = useMemo(() => {
    let sortableItems = [...evaluations];
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
  }, [evaluations, sortConfig]);

  const requestSort = (key: keyof Evaluation) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: keyof Evaluation) => {
    if (!sortConfig || sortConfig.key !== name) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ... (Existing code for header) */}
      <div className="flex flex-col space-y-4">
        {/* ... */}
        {/* Same as before */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">Avaliações Realizadas <Cloud className="text-slate-300" size={18}/></h2>
            <p className="text-slate-500 text-sm">Dados sincronizados em tempo real com a planilha global.</p>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            {/* ... Buttons ... */}
            {(userRole === 'operator' || userRole === 'monitor') && (
                <>
                    <button 
                        onClick={handleOpenDashboard}
                        disabled={isRefreshingDashboard}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-sm active:scale-95 border border-slate-800 whitespace-nowrap"
                    >
                        {isRefreshingDashboard ? <Loader2 size={16} className="animate-spin" /> : <LayoutDashboard size={16} />}
                        <span className="text-sm font-bold">Meu Dashboard</span>
                    </button>
                    <button 
                        onClick={handleOpenPending}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ffa000] text-white hover:bg-[#e69000] transition-all shadow-sm active:scale-95 border border-[#ffa000] whitespace-nowrap"
                    >
                        <List size={16} />
                        <span className="text-sm font-bold">Pendências</span>
                    </button>
                </>
            )}

            {(userRole === 'admin' || userRole === 'quality') && (
                <>
                    <button
                        onClick={() => setIsDriverViewOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-sm active:scale-95 border border-blue-600 whitespace-nowrap"
                    >
                        <Users size={16} />
                        <span className="text-sm font-bold">Status Motoristas</span>
                    </button>
                    <button
                        onClick={() => setIsCsvModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 transition-all shadow-sm active:scale-95 border border-emerald-700 whitespace-nowrap"
                    >
                        <FileText size={16} />
                        <span className="text-sm font-bold">Relatório CSV</span>
                    </button>
                </>
            )}

            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all shadow-sm
                ${isFilterOpen ? 'bg-[#00ad74] text-white border-[#00ad74]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#00ad74] hover:text-[#00ad74]'}`}
            >
                <Filter size={16} />
                Filtros
                {isFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {userRole !== 'quality' && (
                <button 
                    onClick={onCreateNew}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00ad74] to-[#00d68f] text-white font-bold text-sm shadow-md shadow-[#00ad74]/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 ml-2 border border-transparent whitespace-nowrap"
                >
                    <PlusCircle size={18} />
                    NOVA AVALIAÇÃO
                </button>
            )}
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ano</label>
               <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 focus:ring-1 focus:ring-[#00ad74]">
                 {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mês</label>
               <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 focus:ring-1 focus:ring-[#00ad74]">
                 <option value="">Todos</option>
                 {months.map((m, idx) => {
                    if (filterYear === 2025 && idx < 9) return null;
                    return <option key={idx} value={idx}>{m}</option>
                 })}
               </select>
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nº Semana</label>
               <select value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 focus:ring-1 focus:ring-[#00ad74]">
                 <option value="">Todas</option>
                 {[1,2,3,4,5].map(w => <option key={w} value={`Semana ${w}`}>Semana {w}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Motorista</label>
               <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 focus:ring-1 focus:ring-[#00ad74]">
                 <option value="">Todos</option>
                 {availableDrivers.map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}
               </select>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 max-h-[70vh]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm border-b border-slate-200">
              <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('timestamp')}>Data {getSortIcon('timestamp')}</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('driver')}>Motorista {getSortIcon('driver')}</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('vehicle')}>Frota {getSortIcon('vehicle')}</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('base')}>Base {getSortIcon('base')}</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('evaluator')}>Avaliador {getSortIcon('evaluator')}</th>
                <th className="p-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => requestSort('score')}>Nota {getSortIcon('score')}</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedEvaluations.length > 0 ? (
                sortedEvaluations.map((ev, index) => (
                  <tr key={`${ev.id}-${index}`} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 text-slate-600 font-medium">{formatDateTime(ev.timestamp)}</td>
                    <td className="p-4 font-bold text-slate-700">{ev.driver}</td>
                    <td className="p-4 text-slate-600 flex items-center gap-2"><Truck size={14}/> {ev.vehicle}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">{ev.base}</span></td>
                    <td className="p-4 text-slate-600">{ev.evaluator}</td>
                    <td className="p-4 text-right">
                       <span className={`px-2 py-1 rounded font-bold text-sm border ${ev.score >= 90 ? 'bg-[#00ad74]/10 text-[#00ad74] border-[#00ad74]/20' : ev.score >= 70 ? 'bg-[#ffa000]/10 text-[#ffa000] border-[#ffa000]/20' : 'bg-red-50 text-red-500 border-red-200'}`}>
                         {ev.score.toFixed(0)}%
                       </span>
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                            {/* Botão Olhinho: Visualizar Relatório em PDF/Web */}
                            <button 
                                onClick={() => setSelectedReportEvalId(ev.id)}
                                className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-[#006633] hover:border-[#006633] rounded transition-all shadow-sm"
                                title="Visualizar Relatório Completo da Avaliação"
                            >
                                <Eye size={14} />
                            </button>
                            <button 
                                onClick={() => handleResendEmail(ev)}
                                disabled={isResending === ev.id}
                                className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-500 rounded transition-all shadow-sm disabled:opacity-50"
                                title="Reenviar E-mail com Relatório e Anexos"
                            >
                                {isResending === ev.id ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <Mail size={14} />}
                            </button>
                            {userRole === 'admin' && (
                                <button 
                                    onClick={() => onEditEvaluation && onEditEvaluation(ev.id)}
                                    className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-[#00ad74] hover:border-[#00ad74] rounded transition-all shadow-sm"
                                    title="Editar Avaliação"
                                >
                                    <Pencil size={14} />
                                </button>
                            )}
                            {userRole === 'admin' && (
                                <button 
                                    onClick={() => handleDelete(ev.id)}
                                    disabled={isDeleting === ev.id}
                                    className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 rounded transition-all shadow-sm disabled:opacity-50"
                                    title="Excluir Avaliação"
                                >
                                    {isDeleting === ev.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                            )}
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="p-12 text-center text-slate-400">Nenhuma avaliação encontrada com estes filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Visualizar Motoristas (Status Qualidade) */}
      {isDriverViewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-5xl p-0 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600" /> Status de Motoristas</h3>
                          <p className="text-sm text-slate-500">Visualização exclusiva de motoristas com Câmera. Meta anual contabilizada a partir de Out/2025.</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtro Ano</label>
                              <select value={driverViewYear} onChange={(e) => setDriverViewYear(Number(e.target.value))} className="bg-white border rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-600">
                                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtro Mês</label>
                              <select value={driverViewMonth} onChange={(e) => setDriverViewMonth(Number(e.target.value))} className="bg-white border rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-600">
                                  {months.map((m, i) => {
                                      if (driverViewYear === 2025 && i < 9) return null;
                                      return <option key={i} value={i}>{m}</option>
                                  })}
                              </select>
                          </div>
                          <button onClick={() => setIsDriverViewOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
                      </div>
                  </div>
                  
                  <div className="overflow-auto flex-1 p-0">
                      <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-20 bg-white shadow-sm border-b border-slate-200">
                              <tr className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                                  <th className="p-4 bg-slate-50">Motorista</th>
                                  <th className="p-4 bg-slate-50">Base</th>
                                  <th className="p-4 bg-blue-50 text-blue-700 text-center border-l border-blue-100" colSpan={2}>Acumulado Ano ({driverViewYear})</th>
                                  <th className="p-4 bg-emerald-50 text-emerald-700 text-center border-l border-emerald-100" colSpan={2}>Referência Mês: {months[driverViewMonth]}</th>
                              </tr>
                              <tr className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50/50">
                                  <th className="p-2 bg-slate-50 border-b border-slate-200"></th>
                                  <th className="p-2 bg-slate-50 border-b border-slate-200"></th>
                                  <th className="p-2 text-center border-l border-blue-100 border-b border-blue-100 bg-blue-50/30">Previsto</th>
                                  <th className="p-2 text-center border-b border-blue-100 bg-blue-50/30">Realizado</th>
                                  <th className="p-2 text-center border-l border-emerald-100 border-b border-emerald-100 bg-emerald-50/30">Previsto</th>
                                  <th className="p-2 text-center border-b border-emerald-100 bg-emerald-50/30">Realizado</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                              {driverViewData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-4 font-bold text-slate-700 border-r border-transparent">
                                          {row.driver.name}
                                      </td>
                                      <td className="p-4 text-slate-500 border-r border-slate-100">
                                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold text-[10px]">{row.driver.base}</span>
                                      </td>
                                      
                                      {/* ANO */}
                                      <td className="p-4 text-center font-bold text-slate-400 border-l border-slate-100 bg-blue-50/10">
                                          {row.yearTarget}
                                      </td>
                                      <td className="p-4 text-center font-black bg-blue-50/10">
                                          <span className={`${row.yearRealized >= row.yearTarget ? 'text-blue-600' : 'text-orange-500'}`}>
                                              {row.yearRealized}
                                          </span>
                                      </td>

                                      {/* MÊS */}
                                      <td className="p-4 text-center font-bold text-slate-400 border-l border-slate-100 bg-emerald-50/10">
                                          {row.monthTarget}
                                      </td>
                                      <td className="p-4 text-center font-black bg-emerald-50/10">
                                          <span className={`px-2 py-1 rounded ${row.monthRealized >= row.monthTarget ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                              {row.monthRealized}
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                              {driverViewData.length === 0 && (
                                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum motorista com câmera encontrado.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Existing modals CSV and Pending) */}
      {/* ... */}
      {isCsvModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="text-emerald-700"/> Exportar Relatório</h3>
                      <button onClick={() => setIsCsvModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  
                  <div className="space-y-4">
                      <p className="text-sm text-slate-500">Selecione o período para gerar o arquivo CSV formatado para Excel.</p>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Início</label>
                          <input type="date" value={csvStartDate} onChange={(e) => setCsvStartDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-600 outline-none" />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Fim</label>
                          <input type="date" value={csvEndDate} onChange={(e) => setCsvEndDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-600 outline-none" />
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                      <button onClick={() => setIsCsvModalOpen(false)} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600 font-bold hover:bg-slate-200">Cancelar</button>
                      <button onClick={handleDownloadCSV} className="flex-1 py-2 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 flex items-center justify-center gap-2 shadow-md">
                          <Download size={16} /> Baixar CSV
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isPendingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-6xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-100 pb-4 gap-4">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="text-[#ffa000]" /> Pendências de Avaliação</h3>
                          <p className="text-sm text-slate-500">Cálculo baseado apenas em motoristas com Câmera SIM.</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                          {/* Botões de Alternância de Visão */}
                          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                               <button 
                                 onClick={() => setPendingViewMode('cards')}
                                 className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${pendingViewMode === 'cards' ? 'bg-white text-[#00ad74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                               >
                                 <LayoutGrid size={14} /> Cards
                               </button>
                               <button 
                                 onClick={() => setPendingViewMode('list')}
                                 className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${pendingViewMode === 'list' ? 'bg-white text-[#00ad74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                               >
                                 <List size={14} /> Visão em Lista
                               </button>
                          </div>

                          <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

                          <div className="flex flex-col">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Mês</label>
                              <select value={pendingFilterMonth} onChange={(e) => setPendingFilterMonth(Number(e.target.value))} className="bg-slate-50 border rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#00ad74]">
                                  {months.map((m, i) => {
                                      if (currentYear === 2025 && i < 9) return null;
                                      return <option key={i} value={i}>{m}</option>
                                  })}
                              </select>
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Semana</label>
                              <select value={pendingFilterWeek} onChange={(e) => setPendingFilterWeek(e.target.value === '' ? '' : Number(e.target.value))} className="bg-slate-50 border rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#00ad74]">
                                  <option value="">Todas</option>
                                  {[1,2,3,4,5].map(w => <option key={w} value={w}>Semana {w}</option>)}
                              </select>
                          </div>
                          <button onClick={() => setIsPendingModalOpen(false)} className="mt-4 p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
                      </div>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-1 rounded-lg">
                      {pendingViewMode === 'cards' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {pendingDrivers.filter(d => pendingFilterWeek !== '' ? !d.isWeekDone : !d.isMonthDone).map((item, idx) => (
                                  <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="font-bold text-slate-800 text-sm mb-1">{item.driver.name}</div>
                                      <div className="text-[10px] text-slate-500 font-bold mb-3 uppercase">{item.driver.base}</div>
                                      <div className="space-y-2">
                                          {pendingFilterWeek !== '' ? (
                                              <>
                                                  <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>Semana Selecionada</span><span>{item.weekCount} / {item.weekTarget}</span></div>
                                                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                      <div className={`h-full ${item.weekCount === 0 ? 'bg-red-500' : 'bg-[#00ad74]'}`} style={{width: `${item.weekTarget > 0 ? (item.weekCount / item.weekTarget) * 100 : 100}%`}}></div>
                                                  </div>
                                              </>
                                          ) : (
                                              <>
                                                  <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>Mês Selecionado</span><span>{item.monthCount} / {item.monthTarget}</span></div>
                                                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                      <div className={`h-full ${item.monthCount === 0 ? 'bg-red-500' : 'bg-[#ffa000]'}`} style={{width: `${item.monthTarget > 0 ? (item.monthCount / item.monthTarget) * 100 : 100}%`}}></div>
                                                  </div>
                                              </>
                                          )}
                                      </div>
                                      <button onClick={() => { setIsPendingModalOpen(false); onEvaluateDriver && onEvaluateDriver(item.driver.id); }} className="w-full mt-4 bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-700 transition-colors">Avaliar Agora</button>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="overflow-auto max-h-full rounded-lg border border-slate-200">
                              <table className="w-full text-left border-collapse">
                                  <thead className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-200">
                                      <tr className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                                          <th 
                                            className="p-4 min-w-[200px] bg-white text-left sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => requestPendingSort('name')}
                                          >
                                            <div className="flex items-center gap-2">
                                              Motorista (Com Câmera) {getPendingSortIcon('name')}
                                            </div>
                                          </th>
                                          
                                          <th className="p-2 text-center bg-slate-50 border-l border-slate-200" colSpan={2}>Acumulado Ano</th>
                                          <th className="p-2 text-center bg-slate-100 border-l border-slate-200" colSpan={2}>Mês: {months[pendingFilterMonth]}</th>
                                          
                                          {[1,2,3,4,5].map(w => (
                                              <th 
                                                key={w} 
                                                className="p-2 text-center border-l border-slate-100 min-w-[80px] cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => requestPendingSort(`week-${w}`)}
                                              >
                                                <div className="flex items-center justify-center gap-1">
                                                  Sem {w} {getPendingSortIcon(`week-${w}`)}
                                                </div>
                                              </th>
                                          ))}
                                          <th className="p-2 text-center border-l border-slate-200 bg-slate-50">Ação</th>
                                      </tr>
                                      <tr className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50/95 backdrop-blur-sm sticky top-[48px] z-20">
                                          <th className="bg-slate-50 sticky left-0 z-40 border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
                                          
                                          <th className="p-2 text-center border-l border-slate-200 border-b cursor-pointer hover:bg-slate-100" onClick={() => requestPendingSort('year-target')}>
                                              <div className="flex items-center justify-center">Prev {getPendingSortIcon('year-target')}</div>
                                          </th>
                                          <th className="p-2 text-center border-b cursor-pointer hover:bg-slate-100" onClick={() => requestPendingSort('year-realized')}>
                                              <div className="flex items-center justify-center">Real {getPendingSortIcon('year-realized')}</div>
                                          </th>
                                          
                                          <th className="p-2 text-center border-l border-slate-200 bg-slate-100 border-b cursor-pointer hover:bg-slate-200" onClick={() => requestPendingSort('month-target')}>
                                              <div className="flex items-center justify-center">Prev {getPendingSortIcon('month-target')}</div>
                                          </th>
                                          <th className="p-2 text-center border-b bg-slate-100 cursor-pointer hover:bg-slate-200" onClick={() => requestPendingSort('month-realized')}>
                                              <div className="flex items-center justify-center">Real {getPendingSortIcon('month-realized')}</div>
                                          </th>
                                          
                                          {[1,2,3,4,5].map(w => (
                                              <th key={w} className="p-2 text-center border-l border-slate-100 border-b">Real / Meta</th>
                                          ))}
                                          <th className="border-l border-slate-200 border-b bg-slate-50"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="text-xs divide-y divide-slate-100">
                                      {pendingDrivers.map((row, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                              <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-transparent">
                                                  <div className="flex flex-col">
                                                      <span>{row.driver.name}</span>
                                                      <span className="text-[9px] text-slate-400 uppercase">{row.driver.base}</span>
                                                  </div>
                                              </td>

                                              <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100">{row.yearTarget}</td>
                                              <td className="p-2 text-center font-bold">
                                                  <span className={`${row.yearCount >= row.yearTarget ? 'text-[#00ad74]' : 'text-[#ffa000]'}`}>{row.yearCount}</span>
                                              </td>

                                              <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100 bg-slate-50/50">{row.monthTarget}</td>
                                              <td className="p-2 text-center font-bold bg-slate-50/50">
                                                  <span className={`${row.monthCount >= row.monthTarget ? 'text-[#00ad74]' : 'text-red-500'}`}>{row.monthCount}</span>
                                              </td>

                                              {row.weeksBreakdown.map((w, wIdx) => (
                                                  <td key={wIdx} className="p-2 text-center border-l border-slate-100">
                                                      {w.target > 0 ? (
                                                          <div className={`inline-flex flex-col items-center justify-center w-full rounded py-1 ${w.realized >= w.target ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                                              <span className="font-black">{w.realized} <span className="opacity-40 text-[9px]">/ {w.target}</span></span>
                                                          </div>
                                                      ) : (
                                                          <span className="text-slate-300">-</span>
                                                      )}
                                                  </td>
                                              ))}
                                              <td className="p-2 text-center border-l border-slate-200">
                                                  <button onClick={() => { setIsPendingModalOpen(false); onEvaluateDriver && onEvaluateDriver(row.driver.id); }} className="p-1.5 bg-[#00ad74] text-white rounded-lg hover:bg-[#008f61] transition-colors" title="Avaliar">
                                                      <PlusCircle size={14} />
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isDashboardModalOpen && operatorStats && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
               <div className="bg-white rounded-2xl w-full max-w-5xl p-0 shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] overflow-hidden">
                   <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                       <div>
                           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><LayoutDashboard className="text-[#00ad74]" /> Dashboard do Operador</h3>
                           <p className="text-sm text-slate-500">Acompanhamento individual vs Meta (Apenas motoristas com Câmera SIM).</p>
                       </div>
                       <button onClick={() => setIsDashboardModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
                   </div>
                   <div className="p-6 overflow-y-auto bg-slate-50/30 flex-1 space-y-6">
                       <div className="flex gap-4 bg-white p-3 rounded-xl border shadow-sm">
                           <div className="flex flex-col">
                               <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ano</label>
                               <select value={dashboardYear} onChange={(e) => setDashboardYear(Number(e.target.value))} className="bg-slate-50 border p-2 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#00ad74]">
                                   <option value={2025}>2025</option><option value={2026}>2026</option>
                               </select>
                           </div>
                           <div className="flex flex-col">
                               <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mês</label>
                               <select value={dashboardMonth} onChange={(e) => setDashboardMonth(Number(e.target.value))} className="bg-slate-50 border p-2 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#00ad74]">
                                   {months.map((m, i) => {
                                       if (dashboardYear === 2025 && i < 9) return null;
                                       return <option key={i} value={i}>{m}</option>
                                   })}
                               </select>
                           </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <div className="relative bg-gradient-to-br from-[#00ad74] to-[#00d68f] p-4 rounded-xl shadow-lg shadow-[#00ad74]/20 text-white overflow-hidden group">
                               <div className="relative z-10">
                                   <div className="text-xs font-bold uppercase opacity-80 mb-1">Avaliações (Mês)</div>
                                   <div className="text-3xl font-black">{operatorStats.progress.monthVal} <span className="text-sm font-medium opacity-60">/ {operatorStats.targets.month}</span></div>
                                   <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded text-[11px] font-black uppercase backdrop-blur-sm">
                                       <span className="text-white">
                                           {operatorStats.progress.month.toFixed(0)}% da Meta
                                       </span>
                                   </div>
                               </div>
                               <Target size={60} className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                           </div>
                           
                           <div className="relative bg-gradient-to-br from-slate-700 to-slate-900 p-4 rounded-xl shadow-lg text-white overflow-hidden group">
                               <div className="relative z-10">
                                   <div className="text-xs font-bold uppercase opacity-80 mb-1">Acumulado (Ano)</div>
                                   <div className="text-3xl font-black">{operatorStats.progress.yearVal} <span className="text-sm font-medium opacity-60">/ {operatorStats.targets.year}</span></div>
                                   <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded text-[11px] font-black uppercase backdrop-blur-sm">
                                       <span className="text-white">
                                           {operatorStats.progress.year.toFixed(0)}% do Ano
                                       </span>
                                   </div>
                               </div>
                               <CalendarDays size={60} className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                           </div>

                           <div className="relative bg-gradient-to-br from-[#ffa000] to-[#ffb700] p-4 rounded-xl shadow-lg shadow-[#ffa000]/20 text-white overflow-hidden group">
                               <div className="relative z-10">
                                   <div className="text-xs font-bold uppercase opacity-80 mb-1">Sua Média Dada</div>
                                   <div className="text-3xl font-black">{operatorStats.myStats.averageGivenScore.toFixed(1)}%</div>
                                   <div className="mt-2 text-[10px] font-bold uppercase opacity-60">Score Médio do Operador</div>
                               </div>
                               <Star size={60} className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                           </div>

                           <div className="relative bg-gradient-to-br from-[#a855f7] to-[#c084fc] p-4 rounded-xl shadow-lg shadow-[#a855f7]/20 text-white overflow-hidden group">
                               <div className="relative z-10">
                                   <div className="text-xs font-bold uppercase opacity-80 mb-1">Participação na Frota</div>
                                   <div className="text-3xl font-black">{operatorStats.myStats.participationIndex.toFixed(1)}%</div>
                                   <div className="mt-2 text-[10px] font-bold uppercase opacity-60">Percentual de Contribuição</div>
                               </div>
                               <TrendingUp size={60} className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                           </div>
                       </div>

                       <div className="flex flex-col gap-6">
                           <div className="bg-white border rounded-xl p-5 shadow-sm">
                               <div className="flex items-center justify-between mb-4">
                                   <h4 className="font-bold text-slate-700 flex items-center gap-2"><BarChart2 size={18} className="text-[#00ad74]" /> Evolução Mensal vs Meta Individual</h4>
                                   <div className="flex items-center gap-4">
                                       <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#00ad74] rounded-sm"></div><span className="text-[10px] font-bold uppercase text-slate-500">Realizado</span></div>
                                       <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#ffa000] rounded-full"></div><span className="text-[10px] font-bold uppercase text-slate-500">Meta</span></div>
                                   </div>
                               </div>
                               <div className="h-72 w-full">
                                   <ResponsiveContainer>
                                       <ComposedChart data={operatorStats.chartData}>
                                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                           <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                           <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                           <Tooltip 
                                               contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                                               cursor={{fill: '#f8fafc'}}
                                           />
                                           <Bar dataKey="count" name="Avaliações" fill="#00ad74" barSize={35} radius={[6, 6, 0, 0]} />
                                           <Line type="monotone" dataKey="goalTarget" name="Meta Individual" stroke="#ffa000" strokeWidth={3} dot={{r: 4, fill: '#ffa000', strokeWidth: 0}} />
                                       </ComposedChart>
                                   </ResponsiveContainer>
                               </div>
                           </div>

                           <div className="bg-white border rounded-xl p-0 shadow-sm overflow-hidden flex flex-col">
                               <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                                   <h4 className="font-bold text-slate-700 flex items-center gap-2"><List size={18} className="text-[#00ad74]" /> Progresso Detalhado</h4>
                                   <span className="text-[10px] font-black uppercase text-slate-400">Dados do Operador</span>
                               </div>
                               <div className="overflow-x-auto">
                                   <table className="w-full text-left text-sm divide-y divide-slate-100">
                                       <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500">
                                           <tr>
                                               <th className="p-4">Período de Referência</th>
                                               <th className="p-4 text-center">Meta do Período (Previsto)</th>
                                               <th className="p-4 text-center">Realizado (Checklists)</th>
                                               <th className="p-4 text-right">Status de Conclusão</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                           {operatorStats.tableData.map((row, idx) => (
                                               <tr key={idx} className={row.type === 'month' ? 'bg-[#00ad74]/5' : 'hover:bg-slate-50 transition-colors'}>
                                                   <td className="p-4">
                                                       <div className="flex items-center gap-2">
                                                            {row.type === 'year' ? <Calendar className="text-slate-400" size={14}/> : row.type === 'month' ? <CalendarDays className="text-[#00ad74]" size={14}/> : <Activity className="text-slate-400" size={14}/>}
                                                            <span className={`font-bold ${row.type === 'month' ? 'text-[#00ad74]' : 'text-slate-700'}`}>{row.label}</span>
                                                       </div>
                                                   </td>
                                                   <td className="p-4 text-center text-slate-500 font-medium">
                                                       {row.target}
                                                   </td>
                                                   <td className="p-4 text-center">
                                                       <span className="font-black text-slate-800 text-lg">{row.realized}</span>
                                                   </td>
                                                   <td className="p-4 text-right">
                                                       <div className="flex flex-col items-end">
                                                            <span className={`text-xs font-black px-3 py-1 rounded-full border ${row.percent >= 100 ? 'bg-green-100 text-green-600 border-green-200' : 'bg-orange-100 text-orange-600 border-orange-200'}`}>
                                                                {row.percent.toFixed(0)}%
                                                            </span>
                                                            <div className="w-24 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                                <div className={`h-full ${row.percent >= 100 ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${Math.min(row.percent, 100)}%`}}></div>
                                                            </div>
                                                       </div>
                                                   </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
      )}
       {/* MODAL DE VISUALIZAÇÃO DE RELATÓRIO DE AVALIAÇÃO (OLHINHO) */}
       {selectedReportEvalId && (
           <EvaluationReportView 
               evaluationId={selectedReportEvalId} 
               onClose={() => setSelectedReportEvalId(null)} 
           />
       )}
    </div>
  );
};

export default EvaluationsTable;
