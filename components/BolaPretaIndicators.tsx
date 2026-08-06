import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';
import { BolaPreta } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GripVertical, TrendingUp, Users, AlertTriangle, MapPin, 
  Calendar, RotateCcw, ChevronLeft, ArrowLeftRight 
} from 'lucide-react';

interface BolaPretaIndicatorsProps {
  records: BolaPreta[];
  filterMonth: number | string;
  filterYear: number;
  onBack: () => void;
}

export const BolaPretaIndicators: React.FC<BolaPretaIndicatorsProps> = ({ 
  records, 
  filterMonth, 
  filterYear, 
  onBack 
}) => {
  // Ordem de exibição dos gráficos (pode ser reordenada com drag-and-drop)
  const [cardOrder, setCardOrder] = useState<string[]>(['period', 'operator', 'base', 'alerts']);
  const [periodView, setPeriodView] = useState<'day' | 'month'>('day');

  const monthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Cores Risel e Variantes Estilizadas
  const COLORS = {
    green: ['#006633', '#00ad74', '#10b981', '#34d399', '#6ee7b7'],
    orange: ['#F99D1C', '#faaf40', '#fbbf24', '#fcd34d', '#fef08a'],
    blue: ['#4A86E8', '#6366f1', '#3b82f6', '#60a5fa', '#93c5fd'],
    alert: ['#ef4444', '#b91c1c', '#f87171', '#fca5a5'],
    neutral: ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0']
  };

  // Helper para verificar mês e ano de um registro
  const parseRecordDate = (dateStr: string) => {
    let rMonth = -1;
    let rYear = -1;
    let rDay = -1;

    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          rDay = parseInt(parts[0], 10);
          rMonth = parseInt(parts[1], 10) - 1;
          rYear = parseInt(parts[2], 10);
        }
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            rYear = parseInt(parts[0], 10);
            rMonth = parseInt(parts[1], 10) - 1;
            rDay = parseInt(parts[2], 10);
          } else {
            rDay = parseInt(parts[0], 10);
            rMonth = parseInt(parts[1], 10) - 1;
            rYear = parseInt(parts[2], 10);
          }
        }
      }
    } catch (e) {
      // fallback se der erro
    }

    if (rMonth === -1 || isNaN(rMonth)) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        rDay = d.getDate();
        rMonth = d.getMonth();
        rYear = d.getFullYear();
      }
    }

    return { day: rDay, month: rMonth, year: rYear };
  };

  // Filtra registros que entram no escopo do período do filtro selecionado
  const filteredData = useMemo(() => {
    return records.filter(r => {
      if (!r.date) return false;
      const { month, year } = parseRecordDate(r.date);
      
      // Se tiver ano diferente
      if (year !== filterYear) return false;
      
      // Se tiver mês específico selecionado
      if (filterMonth !== "" && month !== Number(filterMonth)) return false;
      
      return true;
    });
  }, [records, filterMonth, filterYear]);

  // --- CÁLCULO DOS DADOS PARA OS GRÁFICOS ---

  // 1. Quantidade de Verificações feitas por Operador
  const operatorData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(r => {
      const op = r.operator?.toUpperCase().trim() || 'SISTEMA';
      counts[op] = (counts[op] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // 2. Quantidade de Bola Preta realizada por Base
  const baseData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(r => {
      const base = r.base?.toUpperCase().trim() || 'NÃO ESPECIFICADA';
      counts[base] = (counts[base] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // 3. Qtde de Alertas vs OK (Divergentes vs OK)
  const alertData = useMemo(() => {
    let OK = 0;
    let Alertas = 0;

    filteredData.forEach(r => {
      // Considera com alerta se verificationStatus indicar Observações Inseridas, tiver observação de verificação descrita ou desvios em geral
      const hasObservacao = r.verificationStatus === 'Observações Inseridas' || (r.verificationStatusObs && r.verificationStatusObs.trim().length > 0);
      const hasDivergencia = r.verificationStatus === 'Divergência Encontrada' || hasObservacao;
      const hasUninformedStop = r.uninformedStops === 'Sim';
      const hasSuspicious = r.suspiciousActivity === 'Sim';
      const hasTelemetry = r.telemetryInfractions === 'Sim';
      const hasVideoTelemetry = r.videoTelemetryInfractions === 'Sim';
      
      if (hasDivergencia || hasUninformedStop || hasSuspicious || hasTelemetry || hasVideoTelemetry) {
        Alertas++;
      } else {
        OK++;
      }
    });

    return [
      { name: 'Verificação Sem Alerta (OK)', value: OK, color: '#10b981' }, 
      { name: 'Verificação com Alerta', value: Alertas, color: '#ef4444' }
    ];
  }, [filteredData]);

  // 4. Total Bola Preta realizado por período (Dia vs Mês)
  const periodData = useMemo(() => {
    if (periodView === 'day') {
      // Fluxo por Dia no mês e ano selecionados
      const daysCount: Record<number, number> = {};
      
      // Inicializar todos os dias do mês do filtro atual (se houver mês específico, senão usar dias de 1 a 31)
      const maxDays = (filterMonth !== "") ? new Date(filterYear, Number(filterMonth) + 1, 0).getDate() : 31;
      for (let i = 1; i <= maxDays; i++) {
        daysCount[i] = 0;
      }

      filteredData.forEach(r => {
        const { day } = parseRecordDate(r.date);
        if (day > 0 && day <= maxDays) {
          daysCount[day] = (daysCount[day] || 0) + 1;
        }
      });

      return Object.entries(daysCount).map(([day, val]) => ({
        label: `Dia ${day.padStart(2, '0')}`,
        quantidade: val
      }));
    } else {
      // Fluxo por Mês no ano selecionado
      const monthsCount: Record<number, number> = {};
      
      // Inicializar todos os 12 meses do ano
      for (let i = 0; i < 12; i++) {
        monthsCount[i] = 0;
      }

      // Se o filtro de mês estiver ativo, apenas conta pro ano todo (ajudando na visão ampla do ano)
      const yearlyRecords = records.filter(r => {
        if (!r.date) return false;
        const { year } = parseRecordDate(r.date);
        return year === filterYear;
      });

      yearlyRecords.forEach(r => {
        const { month } = parseRecordDate(r.date);
        if (month >= 0 && month < 12) {
          monthsCount[month] = (monthsCount[month] || 0) + 1;
        }
      });

      return Object.entries(monthsCount).map(([monthIdx, val]) => ({
        label: monthsList[Number(monthIdx)].substring(0, 3), // "Jan", "Fev" etc.
        quantidade: val
      }));
    }
  }, [filteredData, records, periodView, filterMonth, filterYear]);


  // --- DRAG AND DROP NATIVO PARA REORDENAÇÃO DOS GRÁFICOS ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId === targetId) return;

    const sourceIndex = cardOrder.indexOf(sourceId);
    const targetIndex = cardOrder.indexOf(targetId);

    const newOrder = [...cardOrder];
    newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, sourceId);
    setCardOrder(newOrder);
  };


  // --- RENDERIZADORES DE CADA CARD DE GRÁFICO ---

  const renderChart = (id: string) => {
    switch (id) {
      case 'period':
        return (
          <div key="period" className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[360px]"
               draggable onDragStart={(e) => handleDragStart(e, 'period')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'period')}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 cursor-grab active:cursor-grabbing pb-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-slate-300" />
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Histórico de Verificações</h3>
                  <p className="text-xs text-slate-400">Total acumulado ao longo do período</p>
                </div>
              </div>
              
              {/* Botões de Mudar Mês / Dia */}
              <div className="flex items-center gap-1.5 bg-slate-50 border p-1 rounded-xl self-start sm:self-auto">
                <button 
                  onClick={() => setPeriodView('day')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${periodView === 'day' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  VISÃO POR DIA
                </button>
                <button 
                  onClick={() => setPeriodView('month')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${periodView === 'month' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  VISÃO POR MÊS ({filterYear})
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[260px] w-full">
              {periodData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">Aguardando dados...</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={periodData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPeriod" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ad74" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#00ad74" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="quantidade" stroke="#00ad74" strokeWidth={3} fillOpacity={1} fill="url(#colorPeriod)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );

      case 'operator':
        return (
          <div key="operator" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[360px]"
               draggable onDragStart={(e) => handleDragStart(e, 'operator')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'operator')}>
            <div className="flex items-center gap-3 mb-4 cursor-grab active:cursor-grabbing pb-2 border-b border-slate-50">
              <GripVertical size={16} className="text-slate-300" />
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Verificações por Operador</h3>
                <p className="text-xs text-slate-400">Total realizado por usuário logado</p>
              </div>
            </div>

            <div className="flex-1 min-h-[260px] w-full">
              {operatorData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center py-10">Lançamentos não encontrados.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={operatorData} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }} />
                    <Bar dataKey="value" fill="#4A86E8" barSize={14} radius={[0, 4, 4, 0]}>
                      {operatorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.blue[index % COLORS.blue.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );

      case 'base':
        return (
          <div key="base" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[360px]"
               draggable onDragStart={(e) => handleDragStart(e, 'base')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'base')}>
            <div className="flex items-center gap-3 mb-4 cursor-grab active:cursor-grabbing pb-2 border-b border-slate-50">
              <GripVertical size={16} className="text-slate-300" />
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Verificações por Base</h3>
                <p className="text-xs text-slate-400">Distribuição Regional</p>
              </div>
            </div>

            <div className="flex-1 min-h-[260px] w-full flex flex-col justify-between">
              {baseData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs py-10">Lançamentos não encontrados.</div>
              ) : (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={baseData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {baseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.green[index % COLORS.green.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom Elegance Legends */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] uppercase font-black tracking-wide bg-slate-50 p-3 rounded-2xl">
                    {baseData.slice(0, 4).map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS.green[idx % COLORS.green.length] }} />
                        <span className="truncate">{entry.name}: <span className="text-slate-800 font-extrabold">{entry.value}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div key="alerts" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[360px]"
               draggable onDragStart={(e) => handleDragStart(e, 'alerts')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'alerts')}>
            <div className="flex items-center gap-3 mb-4 cursor-grab active:cursor-grabbing pb-2 border-b border-slate-50">
              <GripVertical size={16} className="text-slate-300" />
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Alertas Identificados</h3>
                <p className="text-xs text-slate-400 font-bold">Análises com observação tratadas como verificação com alerta</p>
              </div>
            </div>

            <div className="flex-1 min-h-[260px] w-full flex flex-col justify-between">
              {alertData.reduce((acc, curr) => acc + curr.value, 0) === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs py-10">Lançamentos não encontrados.</div>
              ) : (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={alertData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {alertData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex justify-around bg-slate-50 p-3 rounded-2xl text-[10px] uppercase font-black tracking-wide">
                    {alertData.map(entry => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-600">{entry.name}: <span className="text-slate-900 font-extrabold">{entry.value}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Metadados sobre a filtragem
  const activeMonthLabel = filterMonth !== "" ? monthsList[Number(filterMonth)] : 'Todos os Meses';

  return (
    <div className="space-y-6">
      {/* Botão de Retorno */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-4 py-2.5 rounded-2xl transition-all uppercase tracking-widest border border-emerald-100"
        >
          <ChevronLeft size={16} />
          VOLTAR PARA REGISTROS
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-xl font-bold">
          <Calendar size={14} className="text-slate-400" />
          FILTRO ATIVO: {activeMonthLabel} / {filterYear}
        </div>
      </div>

      {/* Informativo de Arrastar */}
      <div className="bg-blue-50 border border-blue-100 text-blue-800 px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
        <ArrowLeftRight size={16} className="text-blue-500" />
        <span>Instrução: Os gráficos abaixo são interativos! Você pode <strong>clicar no topo de qualquer card e arrastar</strong> para reorganizar a disposição visual da sua tela preferencial.</span>
      </div>

      {/* Bento Grid dos Gráficos com Reordenação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {cardOrder.map(id => renderChart(id))}
      </div>
    </div>
  );
};
