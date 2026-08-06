
import React, { useMemo, useState, useEffect, useDeferredValue } from 'react';
import { getDashboardMetrics, getManagedDrivers, getUniqueEvaluators, getDriverStats, getRawEvaluations, getWeeksInMonth } from '../services/dataService';
import { DriverProfile, UserRole } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar, 
  ComposedChart, ScatterChart, Scatter, Treemap, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, FunnelChart, Funnel, LabelList
} from 'recharts';
import { 
  Target, Users, ClipboardCheck, TrendingUp, Calendar, Filter, 
  BarChart3, Activity, Settings, UserCheck, ChevronDown, ChevronUp, GripVertical, User, Loader2, Trophy, CalendarDays, Crown, Star, HelpCircle, List, LayoutTemplate,
  ArrowUpDown, ArrowUp, ArrowDown, Info, CheckCircle2, AlertTriangle
} from 'lucide-react';

interface ChartLayoutItem {
  id: string;
  title: string;
  icon: React.ElementType;
  iconColor: string;
}

interface DashboardProps {
    userRole?: UserRole;
    onNavigate?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole, onNavigate }) => {
  const currentYear = new Date().getFullYear();
  const [viewMode, setViewMode] = useState<'executive' | 'operational'>('executive');

  const [selectedYear, setSelectedYear] = useState(Math.max(2025, currentYear)); 
  const initialMonth = (selectedYear === 2025) ? Math.max(9, new Date().getMonth()) : new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(initialMonth);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDriver, setFilterDriver] = useState('');
  const [filterEvaluator, setFilterEvaluator] = useState('');
  const [filterWeek, setFilterWeek] = useState('');

  const [opFilterMonth, setOpFilterMonth] = useState<number>(new Date().getMonth());
  const [opSortConfig, setOpSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const [rankingMode, setRankingMode] = useState<'top' | 'bottom'>('top');

  const [availableDrivers, setAvailableDrivers] = useState<DriverProfile[]>([]);
  const [availableEvaluators, setAvailableEvaluators] = useState<string[]>([]);

  const deferredYear = useDeferredValue(selectedYear);
  const deferredMonth = useDeferredValue(selectedMonth);
  const deferredDriver = useDeferredValue(filterDriver);
  const deferredEvaluator = useDeferredValue(filterEvaluator);
  const deferredWeek = useDeferredValue(filterWeek);

  const isRecalculating = 
    deferredYear !== selectedYear || 
    deferredMonth !== selectedMonth || 
    deferredDriver !== filterDriver || 
    deferredEvaluator !== filterEvaluator || 
    deferredWeek !== filterWeek;

  useEffect(() => {
    setAvailableDrivers(getManagedDrivers());
    setAvailableEvaluators(getUniqueEvaluators());
  }, []);

  const [chartOrder, setChartOrder] = useState<ChartLayoutItem[]>([
    { id: 'monthly', title: 'Avaliações por Mês (vs Meta)', icon: CalendarDays, iconColor: '#00ad74' },
    { id: 'ranking', title: 'Ranking de Motoristas', icon: Trophy, iconColor: '#ffa000' }, 
    { id: 'opRanking', title: 'Ranking de Operadores', icon: Crown, iconColor: '#00ad74' },
    { id: 'evaluators', title: 'Performance por Avaliador', icon: Filter, iconColor: '#ffa000' },
    { id: 'goal', title: 'Meta Mensal', icon: Target, iconColor: '#ef4444' },
    { id: 'weekly', title: 'Evolução Semanal', icon: Activity, iconColor: '#a855f7' },
    { id: 'daily', title: 'Atividade Diária', icon: BarChart3, iconColor: '#00ad74' },
  ]);

  const visibleCharts = useMemo(() => {
      if (userRole === 'quality') {
          return chartOrder.filter(c => ['monthly', 'ranking', 'goal'].includes(c.id));
      }
      return chartOrder;
  }, [chartOrder, userRole]);

  const [chartTypes, setChartTypes] = useState<Record<string, string>>(() => {
    try {
        const saved = localStorage.getItem('risel_dash_chart_types');
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error("Erro ao carregar preferências de gráfico", e); }
    
    return {
        monthly: 'composed',
        ranking: 'podium',
        opRanking: 'podium',
        evaluators: 'bar-horizontal',
        goal: 'pie-donut',
        weekly: 'area-gradient',
        daily: 'bar-vertical'
    };
  });

  const metrics = useMemo(() => getDashboardMetrics(deferredYear, deferredMonth, {
    driverName: deferredDriver,
    evaluatorName: deferredEvaluator,
    week: deferredWeek
  }), [deferredYear, deferredMonth, deferredDriver, deferredEvaluator, deferredWeek]);

  const operationalData = useMemo(() => {
      if (viewMode !== 'operational') return [];

      const driversObj = getManagedDrivers().filter(d => d.hasCamera);
      // Filtrar motoristas cujo período selecionado seja posterior à data de inativação
      const drivers = driversObj.filter(d => {
          if (d.isActive !== false) return true;
          if (!d.inactivationDate) return false;
          const inactDate = new Date(d.inactivationDate + 'T12:00:00');
          if (isNaN(inactDate.getTime())) return false;
          
          const inactYear = inactDate.getFullYear();
          const inactMonth = inactDate.getMonth();
          
          if (deferredYear > inactYear) return false;
          if (deferredYear === inactYear && opFilterMonth > inactMonth) return false;
          return true;
      });

      const allEvals = getRawEvaluations({});
      
      const filteredDrivers = filterDriver 
        ? drivers.filter(d => d.name === filterDriver) 
        : drivers;

      const weeksInSelectedMonth = getWeeksInMonth(deferredYear, opFilterMonth);

      const calculatedData = filteredDrivers.map(driver => {
          const driverEvals = allEvals.filter(e => e.driver === driver.name);
          
          const evalsYear = driverEvals.filter(e => new Date(e.timestamp).getFullYear() === deferredYear).length;
          let targetYear = 0;
          for(let m=0; m<12; m++) {
              if (deferredYear === 2025 && m < 9) continue;
              // se o motorista estiver inativo naquele mês específico, target vira o realizado correspondente ou 0
              let monthTarget = getWeeksInMonth(deferredYear, m);
              if (driver.isActive === false && driver.inactivationDate) {
                  const inactDate = new Date(driver.inactivationDate + 'T12:00:00');
                  if (!isNaN(inactDate.getTime())) {
                      const inactYear = inactDate.getFullYear();
                      const inactMonth = inactDate.getMonth();
                      if (deferredYear === inactYear && m === inactMonth) {
                          monthTarget = driverEvals.filter(e => {
                              const d = new Date(e.timestamp);
                              return d.getFullYear() === deferredYear && d.getMonth() === m;
                          }).length;
                      } else if (deferredYear > inactYear || (deferredYear === inactYear && m > inactMonth)) {
                          monthTarget = 0;
                      }
                  }
              }
              targetYear += monthTarget;
          }

          const evalsMonth = driverEvals.filter(e => {
              const d = new Date(e.timestamp);
              return d.getFullYear() === deferredYear && d.getMonth() === opFilterMonth;
          }).length;
          
          let targetMonth = weeksInSelectedMonth;
          let isMonthOfInactivation = false;
          if (driver.isActive === false && driver.inactivationDate) {
              const inactDate = new Date(driver.inactivationDate + 'T12:00:00');
              if (!isNaN(inactDate.getTime())) {
                  const inactYear = inactDate.getFullYear();
                  const inactMonth = inactDate.getMonth();
                  if (deferredYear === inactYear && opFilterMonth === inactMonth) {
                      targetMonth = evalsMonth;
                      isMonthOfInactivation = true;
                  } else if (deferredYear > inactYear || (deferredYear === inactYear && opFilterMonth > inactMonth)) {
                      targetMonth = 0;
                  }
              }
          }

          const weeklyData = [];
          for (let w=1; w<=5; w++) {
              let targetWeek = (w <= weeksInSelectedMonth) ? 1 : 0;
              const evalsWeek = driverEvals.filter(e => {
                  const d = new Date(e.timestamp);
                  if (d.getFullYear() !== deferredYear || d.getMonth() !== opFilterMonth) return false;
                  const weekNum = Math.ceil(d.getDate() / 7);
                  return Math.min(weekNum, 5) === w;
              }).length;
              
              if (isMonthOfInactivation) {
                  // No mês de inativação, se as semanas têm metas cumpridas, o targetWeek vira evalsWeek para ficar OK
                  targetWeek = evalsWeek;
              } else if (targetMonth === 0) {
                  targetWeek = 0;
              }
              
              weeklyData.push({ week: w, target: targetWeek, realized: evalsWeek });
          }

          // Justification Logic
          const justification = driver.justifications?.find(j => j.year === deferredYear && j.month === opFilterMonth);

          return {
              driver,
              year: { target: targetYear, realized: evalsYear },
              month: { 
                  target: targetMonth, 
                  realized: evalsMonth, 
                  justification: justification 
              },
              weeks: weeklyData
          };
      });

      return calculatedData.sort((a, b) => {
          let valA: any = 0, valB: any = 0;

          switch(opSortConfig.key) {
              case 'name': valA = a.driver.name; valB = b.driver.name; break;
              case 'year-target': valA = a.year.target; valB = b.year.target; break;
              case 'year-realized': valA = a.year.realized; valB = b.year.realized; break;
              case 'month-target': valA = a.month.target; valB = b.month.target; break;
              case 'month-realized': valA = a.month.realized; valB = b.month.realized; break;
              default:
                  if (opSortConfig.key.startsWith('week-')) {
                      const weekIdx = parseInt(opSortConfig.key.split('-')[1]) - 1;
                      valA = a.weeks[weekIdx]?.realized || 0;
                      valB = b.weeks[weekIdx]?.realized || 0;
                  }
                  break;
          }

          if (typeof valA === 'string') {
              return opSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return opSortConfig.direction === 'asc' ? valA - valB : valB - valA;
      });

  }, [viewMode, filterDriver, opFilterMonth, deferredYear, opSortConfig]);

  const requestOpSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (opSortConfig.key === key && opSortConfig.direction === 'asc') direction = 'desc';
      setOpSortConfig({ key, direction });
  };

  const getOpSortIcon = (key: string) => {
      if (opSortConfig.key !== key) return <ArrowUpDown size={10} className="opacity-30 ml-1" />;
      return opSortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-[#00ad74] ml-1" /> : <ArrowDown size={10} className="text-[#00ad74] ml-1" />;
  };

  const rankingData = useMemo(() => {
    const stats = getDriverStats({
      year: deferredYear,
      month: deferredMonth,
      week: deferredWeek,
      driverName: deferredDriver, 
    });

    const activeDrivers = stats.filter(d => d.totalEvaluations > 0);

    let result = [];
    if (rankingMode === 'top') {
      result = activeDrivers.sort((a, b) => {
          if (b.averageScore === a.averageScore) {
              return b.totalEvaluations - a.totalEvaluations;
          }
          return b.averageScore - a.averageScore;
      }).slice(0, 5); 
    } else {
      result = activeDrivers.sort((a, b) => {
          if (a.averageScore === b.averageScore) {
              return a.totalEvaluations - b.totalEvaluations;
          }
          return a.averageScore - b.averageScore;
      }).slice(0, 5);
    }

    return result.map((d, index) => ({
      name: d.name.split(' ')[0] + ' ' + (d.name.split(' ')[1] || ''), 
      fullName: d.name,
      score: Number(d.averageScore.toFixed(1)), 
      count: d.totalEvaluations,
      fill: rankingMode === 'top' 
        ? (index === 0 ? '#00ad74' : index === 1 ? '#4dbd93' : '#ffa000') 
        : (index === 0 ? '#ea580c' : index === 1 ? '#f97316' : '#fb923c')
    }));
  }, [deferredYear, deferredMonth, deferredWeek, deferredDriver, rankingMode]);

  const opRankingData = useMemo(() => {
    return metrics.evaluationsPerEvaluator.slice(0, 5).map((op, index) => ({
      name: op.name,
      fullName: op.name,
      score: op.count, 
      count: op.count,
      isCountBased: true,
      fill: index === 0 ? '#00ad74' : index === 1 ? '#4dbd93' : '#ffa000'
    }));
  }, [metrics.evaluationsPerEvaluator]);

  const handleChartTypeChange = (chartId: string, type: string) => {
    const newTypes = { ...chartTypes, [chartId]: type };
    setChartTypes(newTypes);
    localStorage.setItem('risel_dash_chart_types', JSON.stringify(newTypes));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('text/plain');
    if (dragIndexStr === '') return;
    const dragIndex = parseInt(dragIndexStr, 10);
    if (dragIndex === dropIndex) return;
    const newOrder = [...chartOrder];
    const [reorderedItem] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, reorderedItem);
    setChartOrder(newOrder);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [];
  for (let y = 2025; y <= currentYear + 1; y++) years.push(y);

  const kpiCards = [
    {
      label: 'Total de Motoristas',
      value: metrics.totalRegisteredDrivers,
      icon: Users,
      gradient: 'from-slate-700 to-slate-900',
      textColor: 'text-white',
      subtext: 'Base Cadastrada',
      description: 'Número total de condutores ativos registrados na base de dados da frota.'
    },
    {
      label: filterWeek ? 'Avaliações (Semana)' : (selectedMonth === null ? 'Avaliações (Ano)' : 'Avaliações (Mês)'),
      value: `${metrics.totalEvaluations} / ${metrics.monthlyGoalTarget}`,
      icon: ClipboardCheck,
      gradient: 'from-[#ffa000] to-[#ffb700]',
      textColor: 'text-white',
      subtext: `${metrics.monthlyGoalCompletion.toFixed(0)}% da Meta`,
      description: 'Volume realizado versus a meta prevista para a frota ativa no período.'
    },
    {
      label: 'Nota Geral Média',
      value: metrics.globalAverageScore.toFixed(1) + '%',
      icon: TrendingUp,
      gradient: 'from-[#a855f7] to-[#c084fc]',
      textColor: 'text-white',
      subtext: 'Resultado do Período',
      description: 'Média aritmética ponderada de todas as notas obtidas nas avaliações filtradas.'
    }
  ];

  const COLORS = ['#00ad74', '#ffa000', '#1e293b', '#64748b', '#00d68f', '#ffb700'];
  const chartOptions = [
    { value: 'podium', label: '1. Pódio (Ranking)' },
    { value: 'bar-vertical', label: '2. Barras Verticais' },
    { value: 'bar-horizontal', label: '3. Barras Horizontais' },
    { value: 'bar-stacked', label: '4. Barras Empilhadas' },
    { value: 'bar-grouped', label: '5. Barras Agrupadas' }, 
    { value: 'line-monotone', label: '6. Linha Suave' },
    { value: 'line-linear', label: '7. Linha Linear' },
    { value: 'line-step', label: '8. Linha Degrau' },
    { value: 'area-gradient', label: '9. Área Gradiente' },
    { value: 'area-simple', label: '10. Área Simples' },
    { value: 'area-stacked', label: '11. Área Empilhada' }, 
    { value: 'pie-donut', label: '12. Pizza Rosca' },
    { value: 'pie-simple', label: '13. Pizza Simples' },
    { value: 'pie-custom', label: '14. Pizza Customizada' }, 
    { value: 'radial', label: '15. Radial' },
    { value: 'scatter', label: '16. Dispersão' },
    { value: 'composed', label: '17. Composto (Bar+Line)' },
    { value: 'treemap', label: '18. Mapa de Árvore' },
    { value: 'radar', label: '19. Radar' },
    { value: 'funnel', label: '20. Funil' },
    { value: 'radial-bar', label: '21. Barra Radial' },
  ];

  const getGoalColor = (percentage: number) => {
    if (percentage < 50) return '#ef4444'; 
    if (percentage < 85) return '#ffa000'; 
    return '#00ad74'; 
  };

  const renderPodium = (data: any[]) => {
      if (data.length === 0) return <div className="flex items-center justify-center h-full text-slate-400">Sem dados para ranking</div>;
      const first = data[0]; const second = data[1]; const third = data[2];
      const getBgColor = (idx: number, item: any) => {
          if (item?.isCountBased) {
              if (idx === 0) return 'bg-gradient-to-b from-[#00ad74] to-[#008f61]';
              if (idx === 1) return 'bg-[#4dbd93]';
              if (idx === 2) return 'bg-[#ffa000]';
          }
          if (rankingMode === 'top') {
              if (idx === 0) return 'bg-gradient-to-b from-[#00ad74] to-[#008f61]';
              if (idx === 1) return 'bg-[#ffa000]';
              if (idx === 2) return 'bg-slate-300';
          } else {
              if (idx === 0) return 'bg-gradient-to-b from-[#ea580c] to-[#c2410c]'; 
              if (idx === 1) return 'bg-[#f97316]'; 
              if (idx === 2) return 'bg-[#fb923c]'; 
          }
          return 'bg-slate-300';
      }
      const PodiumTooltip = ({ item }: { item: any }) => (
         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 scale-95 group-hover:scale-100 origin-bottom">
            <div className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-50 pb-1 truncate">{item.fullName}</div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider font-semibold"><ClipboardCheck size={10}/> Avaliações</span>
                <span className="text-xs font-bold text-slate-700">{item.count}</span>
            </div>
            {!item.isCountBased && (
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider font-semibold"><Star size={10}/> Nota Média</span>
                    <span className={`text-xs font-bold ${rankingMode === 'top' ? 'text-[#00ad74]' : 'text-[#ea580c]'}`}>{item.score.toFixed(1)}%</span>
                </div>
            )}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white transform rotate-45 border-r border-b border-slate-100"></div>
         </div>
      );
      return (
          <div className="flex items-end justify-center gap-4 h-full w-full pb-2 px-4">
             {second && (
                 <div className="flex flex-col items-center w-1/3 h-full justify-end group relative cursor-help">
                     <PodiumTooltip item={second} />
                     <div className="text-center mb-2 transition-transform group-hover:-translate-y-1">
                         <Crown size={20} className="text-slate-400 mb-1 mx-auto drop-shadow-sm" fill="#e2e8f0" />
                         <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-bold text-slate-500 text-xs mb-1 mx-auto shadow-sm">{second.name.substring(0,2)}</div>
                         <div className="text-xs font-bold text-slate-700 truncate max-w-[80px]">{second.name.split(' ')[0]}</div>
                         <div className="text-[10px] font-bold text-slate-500">{second.isCountBased ? second.count + ' evals' : second.score.toFixed(1) + '%'}</div>
                     </div>
                     <div className={`w-full ${getBgColor(1, second)} rounded-t-lg shadow-sm relative h-[55%] group-hover:brightness-110 transition-all`}><div className="absolute bottom-2 w-full text-center text-white/50 font-bold text-2xl">2</div></div>
                 </div>
             )}
             {first && (
                 <div className="flex flex-col items-center w-1/3 h-full justify-end group z-10 relative cursor-help">
                     <PodiumTooltip item={first} />
                     <div className="text-center mb-2 transition-transform group-hover:-translate-y-1">
                        <Crown size={28} className="text-[#ffa000] mb-1 mx-auto drop-shadow-sm animate-bounce" fill="#ffa000" />
                         <div className={`w-12 h-12 rounded-full bg-white border-2 ${rankingMode === 'top' || first.isCountBased ? 'border-[#ffa000]' : 'border-[#ea580c]'} flex items-center justify-center font-bold text-slate-800 text-sm mb-1 mx-auto shadow-md`}>{first.name.substring(0,2)}</div>
                         <div className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{first.name.split(' ')[0]}</div>
                         <div className={`text-xs font-bold ${rankingMode === 'top' || first.isCountBased ? 'text-[#00ad74]' : 'text-[#ea580c]'}`}>{first.isCountBased ? first.count + ' evals' : first.score.toFixed(1) + '%'}</div>
                     </div>
                     <div className={`w-full ${getBgColor(0, first)} rounded-t-lg shadow-lg relative h-[75%] group-hover:brightness-110 transition-all`}><div className="absolute bottom-2 w-full text-center text-white/50 font-bold text-4xl">1</div></div>
                 </div>
             )}
             {third && (
                 <div className="flex flex-col items-center w-1/3 h-full justify-end group relative cursor-help">
                     <PodiumTooltip item={third} />
                     <div className="text-center mb-2 transition-transform group-hover:-translate-y-1">
                         <Crown size={18} className="text-[#b45309] mb-1 mx-auto drop-shadow-sm" fill="#d97706" />
                         <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-bold text-slate-500 text-xs mb-1 mx-auto shadow-sm">{third.name.substring(0,2)}</div>
                         <div className="text-xs font-bold text-slate-700 truncate max-w-[80px]">{third.name.split(' ')[0]}</div>
                         <div className="text-[10px] font-bold text-slate-500">{third.isCountBased ? third.count + ' evals' : third.score.toFixed(1) + '%'}</div>
                     </div>
                     <div className={`w-full ${getBgColor(2, third)} rounded-t-lg shadow-sm relative h-[35%] group-hover:brightness-110 transition-all`}><div className="absolute bottom-2 w-full text-center text-white/50 font-bold text-xl">3</div></div>
                 </div>
             )}
          </div>
      );
  };

  const renderChartContent = (id: string, type: string) => {
    if (id === 'monthly' && type === 'composed') {
        const filteredMonthlyData = metrics.evaluationsPerMonth.filter((_, idx) => deferredYear !== 2025 || idx >= 9);
        const maxDataVal = Math.max(...filteredMonthlyData.map(d => d.count), 0);
        const safeMaxDataVal = isFinite(maxDataVal) ? maxDataVal : 0;
        const yAxisMaxLeft = Math.max(safeMaxDataVal, 1) * 1.2; 
        const yAxisMaxRight = 120; 
        return (
          <ComposedChart data={filteredMonthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, yAxisMaxLeft]} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, yAxisMaxRight]} />
            <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}} cursor={{fill: '#f1f5f9'}} formatter={(value: any, name: any) => { if (name === '% Meta') return [`${Number(value).toFixed(1)}%`, name]; return [value, name]; }} />
            <Bar yAxisId="left" dataKey="count" name="Avaliações" fill="#00ad74" radius={[4, 4, 0, 0]} barSize={40} />
            <Line yAxisId="right" type="monotone" dataKey="goalPercent" name="% Meta" stroke="#ffa000" strokeWidth={3} dot={{r: 4, fill: '#ffa000'}} />
          </ComposedChart>
        );
    }
    if ((id === 'ranking' || id === 'opRanking') && type === 'podium') return renderPodium(id === 'ranking' ? rankingData : opRankingData);
    
    let data: any[] = []; let nameKey = 'name'; let dataKey = 'count'; let mainColor = '#00ad74';
    switch (id) {
        case 'monthly': data = metrics.evaluationsPerMonth.filter((_, idx) => deferredYear !== 2025 || idx >= 9); nameKey = 'month'; mainColor = '#00ad74'; break; 
        case 'ranking': data = rankingData; dataKey = 'score'; mainColor = '#ffa000'; break;
        case 'opRanking': data = opRankingData; dataKey = 'count'; mainColor = '#00ad74'; break;
        case 'evaluators': data = metrics.evaluationsPerEvaluator.slice(0, 15); mainColor = '#ffa000'; break;
        case 'goal': 
            data = [{ name: 'Concluído', value: metrics.monthlyGoalCompletion, fill: getGoalColor(metrics.monthlyGoalCompletion) }, { name: 'Restante', value: Math.max(0, 100 - metrics.monthlyGoalCompletion), fill: '#f1f5f9' }];
            dataKey = 'value'; break;
        case 'weekly': data = metrics.evaluationsPerWeek; nameKey = 'week'; mainColor = '#a855f7'; break;
        case 'daily': data = metrics.evaluationsPerDay; nameKey = 'day'; mainColor = '#00ad74'; break;
    }
    switch (type) {
         case 'bar-vertical': return (<BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey={nameKey} tick={{fontSize: 10}} axisLine={false} tickLine={false} /><YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} /><Tooltip contentStyle={{borderRadius: '8px'}} cursor={{fill: '#f8fafc'}} /><Bar dataKey={dataKey} fill={mainColor} radius={[4, 4, 0, 0]} /></BarChart>);
         case 'bar-horizontal': return (<BarChart data={data} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" /><XAxis type="number" hide /><YAxis dataKey={nameKey} type="category" width={90} tick={{fontSize: 10}} axisLine={false} /><Tooltip contentStyle={{borderRadius: '8px'}} /><Bar dataKey={dataKey} fill={mainColor} radius={[0, 4, 4, 0]} barSize={20} /></BarChart>);
         case 'pie-donut': return (<PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey={dataKey}>{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />))}</Pie><Tooltip contentStyle={{borderRadius: '8px'}} />{id === 'goal' && (<text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-slate-700">{metrics.monthlyGoalCompletion.toFixed(0)}%</text>)}<Legend iconSize={8} wrapperStyle={{fontSize: '10px'}} /></PieChart>);
         case 'pie-simple': return (<PieChart><Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey={dataKey} label>{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />))}</Pie><Tooltip /></PieChart>);
         case 'area-gradient': return (<AreaChart data={data}><defs><linearGradient id={`color-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={mainColor} stopOpacity={0.8}/><stop offset="95%" stopColor={mainColor} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey={nameKey} tick={{fontSize: 10}} axisLine={false} /><YAxis hide /><Tooltip contentStyle={{borderRadius: '8px'}} /><Area type="monotone" dataKey={dataKey} stroke={mainColor} fillOpacity={1} fill={`url(#color-${id})`} /></AreaChart>);
         case 'line-monotone': return (<LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey={nameKey} tick={{fontSize: 10}} axisLine={false} /><YAxis hide /><Tooltip contentStyle={{borderRadius: '8px'}} /><Line type="monotone" dataKey={dataKey} stroke={mainColor} strokeWidth={3} dot={{r: 3}} /></LineChart>);
         case 'radar': return (<RadarChart cx="50%" cy="50%" outerRadius={80} data={data}><PolarGrid /><PolarAngleAxis dataKey={nameKey} tick={{fontSize: 10}} /><PolarRadiusAxis /><Radar name="Dados" dataKey={dataKey} stroke={mainColor} fill={mainColor} fillOpacity={0.6} /><Tooltip /></RadarChart>);
         default: return (<BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={nameKey} tick={{fontSize: 10}} /><YAxis tick={{fontSize: 10}} /><Tooltip /><Bar dataKey={dataKey} fill={mainColor} /></BarChart>);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 w-full h-full flex flex-col">
      
      <div className="flex flex-col space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard de Gestão</h2>
            {userRole !== 'quality' && (
                <div className="flex bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
                   <button 
                     onClick={() => setViewMode('executive')}
                     className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'executive' ? 'bg-white text-[#00ad74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <LayoutTemplate size={14} /> Executivo
                   </button>
                   <button 
                     onClick={() => setViewMode('operational')}
                     className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'operational' ? 'bg-white text-[#00ad74] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <List size={14} /> Operacional
                   </button>
                </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {userRole === 'admin' && onNavigate && (
                <button 
                    onClick={() => onNavigate('priority')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffa000] text-white hover:bg-[#e69000] transition-all shadow-sm active:scale-95 border border-[#ffa000] whitespace-nowrap"
                >
                    <AlertTriangle size={16} />
                    Painel Prioridades
                </button>
            )}
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all shadow-sm
                active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#00ad74] focus:ring-opacity-50
                ${isFilterOpen ? 'bg-[#00ad74] text-white border-[#00ad74]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#00ad74] hover:text-[#00ad74]'}`}
            >
                <Filter size={16} />
                Filtros
                {isFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {viewMode === 'executive' && (
            <>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ano</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select value={selectedYear} onChange={(e) => {
                            const val = Number(e.target.value);
                            setSelectedYear(val);
                            if (val === 2025 && (selectedMonth === null || selectedMonth < 9)) {
                                setSelectedMonth(9);
                            }
                        }} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    </div>
                    <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mês</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select value={selectedMonth === null ? '' : selectedMonth} onChange={(e) => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                        <option value="">Todos</option>
                        {months.map((m, idx) => {
                            if (selectedYear === 2025 && idx < 9) return null;
                            return <option key={idx} value={idx}>{m}</option>
                        })}
                        </select>
                    </div>
                    </div>
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
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Motorista</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                        <option value="">Todos</option>
                        {availableDrivers.map(d => (<option key={d.id} value={d.name}>{d.name}</option>))}
                        </select>
                    </div>
                    </div>
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
            </>
        )}

        {viewMode === 'operational' && (
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ano</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mês de Referência</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select value={opFilterMonth} onChange={(e) => setOpFilterMonth(Number(e.target.value))} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                                {months.map((m, idx) => {
                                    if (selectedYear === 2025 && idx < 9) return null;
                                    return <option key={idx} value={idx}>{m}</option>
                                })}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Motorista</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer">
                                <option value="">Todos</option>
                                {availableDrivers.filter(d => d.hasCamera).map(d => (<option key={d.id} value={d.name}>{d.name}</option>))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {viewMode === 'executive' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {kpiCards.map((kpi, idx) => (
                <div key={idx} className={`relative rounded-xl bg-gradient-to-br ${kpi.gradient} p-6 shadow-lg text-white group hover:scale-[1.01] transition-transform duration-300`}>
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                            <kpi.icon className="absolute right-[-20px] bottom-[-20px] opacity-10 transform rotate-12 scale-[3]" size={100} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <kpi.icon size={24} className="text-white" />
                            </div>
                            {isRecalculating ? (
                                <Loader2 className="animate-spin text-white/50" size={16} />
                            ) : (
                                <div className="cursor-help opacity-60 hover:opacity-100 transition-opacity">
                                    <HelpCircle size={16} />
                                </div>
                            )}
                        </div>
                        <div className="text-3xl font-black mb-1 tracking-tight">{kpi.value}</div>
                        <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{kpi.label}</div>
                        <div className="text-[10px] bg-white/20 inline-block px-2 py-1 rounded font-medium backdrop-blur-sm">
                            {kpi.subtext}
                        </div>
                    </div>
                    
                    <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                        <div className="font-bold mb-1 border-b border-white/10 pb-1 text-[#00ad74]">{kpi.label}</div>
                        <p className="font-light leading-relaxed opacity-90">{kpi.description}</p>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-800"></div>
                    </div>
                </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {visibleCharts.map((item, index) => {
                    const isFullWidth = item.id === 'monthly';
                    return (
                    <div 
                        key={item.id} 
                        className={`bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col ${isFullWidth ? 'lg:col-span-2 xl:col-span-3' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 cursor-move hover:bg-slate-100/50 transition-colors">
                            <div className="flex items-center gap-2">
                            <GripVertical size={16} className="text-slate-400" />
                            <item.icon size={18} style={{ color: item.iconColor }} />
                            <h3 className="font-bold text-slate-700 text-sm">{item.title}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.id === 'ranking' && (
                                    <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                                        <button onClick={() => setRankingMode('top')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${rankingMode === 'top' ? 'bg-white shadow text-[#00ad74]' : 'text-slate-400'}`}>Melhores</button>
                                        <button onClick={() => setRankingMode('bottom')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${rankingMode === 'bottom' ? 'bg-white shadow text-[#ea580c]' : 'text-slate-400'}`}>Piores</button>
                                    </div>
                                )}
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 hover:bg-slate-100 transition-colors">
                                    <Settings size={14} className="text-slate-400 mr-2" />
                                    <select 
                                        value={chartTypes[item.id]}
                                        onChange={(e) => handleChartTypeChange(item.id, e.target.value)}
                                        className="bg-transparent text-xs text-slate-600 font-medium py-1.5 focus:outline-none cursor-pointer w-32"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        {chartOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 flex-1 min-h-[300px]" style={{ minHeight: '300px' }}>
                            {chartTypes[item.id] === 'podium' ? (
                                renderChartContent(item.id, chartTypes[item.id])
                            ) : (
                                <div style={{ width: '100%', height: '300px', minWidth: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        {renderChartContent(item.id, chartTypes[item.id]) as React.ReactElement}
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>
          </div>
      ) : (
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative flex flex-col">
              <div className="overflow-auto flex-1 w-full">
                  <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-200">
                          <tr className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                              <th className="p-4 min-w-[220px] bg-white text-left sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => requestOpSort('name')}>
                                  <div className="flex items-center gap-2">
                                      Motorista {getOpSortIcon('name')}
                                  </div>
                              </th>
                              
                              <th className="p-2 text-center bg-slate-50 border-l border-slate-200" colSpan={2}>Acumulado Ano ({deferredYear})</th>
                              <th className="p-2 text-center bg-slate-100 border-l border-slate-200" colSpan={2}>Mês: {months[opFilterMonth]}</th>
                              
                              {[1,2,3,4,5].map(w => (
                                  <th key={w} className="p-2 text-center border-l border-slate-100 min-w-[100px] cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => requestOpSort(`week-${w}`)}>
                                      <div className="flex items-center justify-center gap-1">
                                          Semana {w} {getOpSortIcon(`week-${w}`)}
                                      </div>
                                  </th>
                              ))}
                          </tr>
                          <tr className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50/95 backdrop-blur-sm sticky top-[48px] z-20">
                              <th className="bg-slate-50 sticky left-0 z-30 border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
                              
                              <th className="p-2 text-center border-l border-slate-200 border-b cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestOpSort('year-target')}>
                                  <div className="flex items-center justify-center">Previsto {getOpSortIcon('year-target')}</div>
                              </th>
                              <th className="p-2 text-center border-b cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestOpSort('year-realized')}>
                                  <div className="flex items-center justify-center">Realizado {getOpSortIcon('year-realized')}</div>
                              </th>
                              
                              <th className="p-2 text-center border-l border-slate-200 bg-slate-100 border-b cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => requestOpSort('month-target')}>
                                  <div className="flex items-center justify-center">Previsto {getOpSortIcon('month-target')}</div>
                              </th>
                              <th className="p-2 text-center border-b bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => requestOpSort('month-realized')}>
                                  <div className="flex items-center justify-center">Realizado {getOpSortIcon('month-realized')}</div>
                              </th>
                              
                              {[1,2,3,4,5].map(w => (
                                  <th key={w} className="p-2 text-center border-l border-slate-100 border-b">Real / Meta</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-100">
                          {operationalData.length > 0 ? (
                              operationalData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                      <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-transparent">
                                          <div className="flex flex-col">
                                              <span>{row.driver.name}</span>
                                              <span className="text-[9px] text-slate-400 uppercase">{row.driver.base}</span>
                                          </div>
                                      </td>

                                      <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100">{row.year.target}</td>
                                      <td className="p-2 text-center font-bold">
                                          <span className={`${row.year.realized >= row.year.target ? 'text-[#00ad74]' : 'text-[#ffa000]'}`}>{row.year.realized}</span>
                                      </td>

                                      <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100 bg-slate-50/50">{row.month.target}</td>
                                      
                                      <td className="p-2 text-center font-bold bg-slate-50/50 relative group/cell">
                                          <div className="flex items-center justify-center gap-1">
                                              <span className={`${
                                                  (row.month.realized >= row.month.target) || (row.month.justification?.countTowardsGoal) 
                                                  ? 'text-[#00ad74]' 
                                                  : 'text-red-500'
                                              }`}>
                                                  {row.month.realized}
                                              </span>
                                              
                                              {row.month.justification && (
                                                  <div className="relative group/tooltip ml-1">
                                                      {row.month.justification.countTowardsGoal ? (
                                                          <CheckCircle2 size={12} className="text-[#00ad74] cursor-help" />
                                                      ) : (
                                                          <Info size={12} className="text-[#ffa000] cursor-help" />
                                                      )}
                                                      
                                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl text-left">
                                                          <div className="font-bold text-[#ffa000] mb-1 uppercase flex items-center gap-1">
                                                              {row.month.justification.countTowardsGoal ? 'Meta Abonada' : 'Justificativa'}
                                                          </div>
                                                          <p>{row.month.justification.reason}</p>
                                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      </td>

                                      {row.weeks.map((w, wIdx) => (
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
                                  </tr>
                              ))
                          ) : (
                              <tr>
                                  <td colSpan={10} className="p-10 text-center text-slate-400">
                                      Nenhum motorista com câmera encontrado para os filtros selecionados.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
