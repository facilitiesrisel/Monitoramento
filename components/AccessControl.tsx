
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAccessLogs, saveAccessLog, updateAccessLog, deleteAccessLog, normalizeText, loadData } from '../services/dataService';
import { AccessLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Search, PlusCircle, Save, X, Truck, User, Building, MapPin, 
    RefreshCw, Warehouse, Phone, Car, Loader2, Pencil, Trash2, Footprints, 
    AlertTriangle, Cloud, ArrowUpDown, ArrowUp, ArrowDown,
    TrendingUp, TrendingDown, Calendar, BarChart3, Clock, ChevronDown, ChevronUp 
} from 'lucide-react';

interface AccessControlProps {
    operatorName: string;
}

const AccessControl: React.FC<AccessControlProps> = ({ operatorName }) => {
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const syncIntervalRef = useRef<any>(null);
    
    const [sortConfig, setSortConfig] = useState<{ key: 'dateTime'; direction: 'asc' | 'desc' }>({ key: 'dateTime', direction: 'desc' });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedDates, setExpandedDates] = useState<string[]>([]);

    useEffect(() => {
        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        setExpandedDates([todayStr]);
    }, []);

    const toggleDate = (date: string) => {
        setExpandedDates(prev => 
            prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
        );
    };

    const [formData, setFormData] = useState({
        location: 'CANCELA' as 'CANCELA' | 'INTERFONE',
        visitorName: '',
        visitorCompany: '',
        personVisited: '',
        vehiclePlate: ''
    });

    const refreshList = async (showLoading = true) => {
        if (showLoading) setIsRefreshing(true);
        try {
            await loadData(true); 
            setLogs([...getAccessLogs()]); 
        } catch (error) {
            console.error("Erro ao sincronizar histórico:", error);
        } finally {
            if (showLoading) setIsRefreshing(false);
        }
    };

    useEffect(() => {
        refreshList(); 

        syncIntervalRef.current = setInterval(() => {
            refreshList(false);
        }, 20000);

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, []);

    const handleInputChange = (field: string, value: string) => {
        // Remove accents and convert to uppercase, but DO NOT trim so spaces can be typed
        let cleanValue = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        
        if (field === 'vehiclePlate') {
            cleanValue = cleanValue.replace(/\s/g, '');
            
            // Busca no histórico para completar automaticamente a empresa
            if (cleanValue.length >= 3 && !editingId) {
                const historyMatch = logs.find(l => normalizeText(l.vehiclePlate) === cleanValue);
                if (historyMatch && historyMatch.visitorCompany) {
                    setFormData(prev => ({ 
                        ...prev, 
                        vehiclePlate: cleanValue,
                        visitorCompany: historyMatch.visitorCompany.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
                    }));
                    return;
                }
            }
        }
        setFormData(prev => ({ ...prev, [field]: cleanValue }));
    };

    const handleSetPedestrian = () => {
        setFormData(prev => ({ ...prev, vehiclePlate: 'ENTROU A PE' }));
    };

    const handleOpenNew = () => {
        setEditingId(null);
        setFormData({
            location: 'CANCELA',
            visitorName: '',
            visitorCompany: '',
            personVisited: '',
            vehiclePlate: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (log: AccessLog) => {
        setEditingId(log.id);
        setFormData({
            location: log.location,
            visitorName: log.visitorName,
            visitorCompany: log.visitorCompany,
            personVisited: log.personVisited,
            vehiclePlate: log.vehiclePlate
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Deseja remover este registro permanentemente? Esta ação é permitida a todos os operadores.")) {
            setIsRefreshing(true);
            try {
                await deleteAccessLog(id);
                setTimeout(async () => {
                    await loadData(true);
                    setLogs([...getAccessLogs()]); 
                    setIsRefreshing(false);
                }, 1500);
            } catch (e) {
                alert("Erro ao excluir.");
                setIsRefreshing(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.visitorName || !formData.personVisited || !formData.vehiclePlate) {
            alert("Campos obrigatórios faltando.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateAccessLog(editingId, {
                    location: formData.location,
                    visitorName: formData.visitorName,
                    visitorCompany: formData.visitorCompany,
                    personVisited: formData.personVisited,
                    vehiclePlate: formData.vehiclePlate
                });
            } else {
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = now.getFullYear();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                
                const dateTimeStr = `${day}/${month}/${year} ${hours}:${minutes}`;
                
                await saveAccessLog({
                    operator: operatorName,
                    dateTime: dateTimeStr,
                    location: formData.location,
                    visitorName: formData.visitorName,
                    visitorCompany: formData.visitorCompany,
                    personVisited: formData.personVisited,
                    vehiclePlate: formData.vehiclePlate
                });
            }

            setLogs([...getAccessLogs()]); 
            setIsModalOpen(false);

            setTimeout(() => refreshList(false), 2500);

        } catch (error) {
            alert("Erro ao sincronizar dados com a planilha principal.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestSort = () => {
        setSortConfig(prev => ({
            key: 'dateTime',
            direction: prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const getSortValue = (dateTimeStr: string) => {
        try {
            const [datePart, timePart] = dateTimeStr.split(' ');
            const [d, m, y] = datePart.split('/');
            const [hh, mm] = (timePart || '00:00').split(':');
            return `${y}${m}${d}${hh}${mm}`;
        } catch (e) {
            return '000000000000';
        }
    };

    const filteredLogs = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        let items = logs.filter(l => 
            l.visitorName.toLowerCase().includes(lowerSearch) ||
            l.visitorCompany.toLowerCase().includes(lowerSearch) ||
            l.vehiclePlate.toLowerCase().includes(lowerSearch) ||
            l.personVisited.toLowerCase().includes(lowerSearch) ||
            l.operator.toLowerCase().includes(lowerSearch)
        );

        items.sort((a, b) => {
            const valA = getSortValue(a.dateTime);
            const valB = getSortValue(b.dateTime);
            
            if (sortConfig.direction === 'desc') {
                return valB.localeCompare(valA);
            } else {
                return valA.localeCompare(valB);
            }
        });

        return items;
    }, [logs, searchTerm, sortConfig]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${yesterday.getFullYear()}`;
        
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        const parseDate = (dStr: string) => {
            const [datePart] = dStr.split(' ');
            const [d, m, y] = datePart.split('/').map(Number);
            return new Date(y, m - 1, d);
        };

        let todayCount = 0;
        let yesterdayCount = 0;
        let thisMonthCount = 0;
        let lastMonthCount = 0;
        let thisYearCount = 0;
        let lastYearSamePeriodCount = 0;

        // Média de acessos por dia (úteis)
        let thisMonthWeekdayAccesses = 0;
        let lastMonthWeekdayAccesses = 0;

        logs.forEach(log => {
            const logDate = parseDate(log.dateTime);
            const logDateStr = log.dateTime.split(' ')[0];
            const isWeekend = logDate.getDay() === 0 || logDate.getDay() === 6;
            
            if (logDateStr === todayStr) todayCount++;
            if (logDateStr === yesterdayStr) yesterdayCount++;
            
            if (logDate.getMonth() === thisMonth && logDate.getFullYear() === thisYear) {
                thisMonthCount++;
                if (!isWeekend) thisMonthWeekdayAccesses++;
            }
            if (logDate.getMonth() === lastMonth && logDate.getFullYear() === lastMonthYear) {
                lastMonthCount++;
                if (!isWeekend) lastMonthWeekdayAccesses++;
            }
            
            if (logDate.getFullYear() === thisYear) thisYearCount++;
            
            if (logDate.getFullYear() === thisYear - 1) {
                if (logDate.getMonth() < thisMonth || (logDate.getMonth() === thisMonth && logDate.getDate() <= now.getDate())) {
                    lastYearSamePeriodCount++;
                }
            }
        });

        const getDiff = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        const getWeekdaysCount = (year: number, month: number, upToDay?: number) => {
            let count = 0;
            const lastDay = upToDay || new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= lastDay; d++) {
                const date = new Date(year, month, d);
                if (date.getDay() !== 0 && date.getDay() !== 6) count++;
            }
            return count;
        };

        const thisMonthWeekdays = getWeekdaysCount(thisYear, thisMonth, now.getDate());
        const lastMonthWeekdays = getWeekdaysCount(lastMonthYear, lastMonth);

        const thisMonthAvg = thisMonthWeekdays > 0 ? thisMonthWeekdayAccesses / thisMonthWeekdays : 0;
        const lastMonthAvg = lastMonthWeekdays > 0 ? lastMonthWeekdayAccesses / lastMonthWeekdays : 0;

        return {
            today: { count: todayCount, diff: getDiff(todayCount, yesterdayCount) },
            month: { count: thisMonthCount, diff: getDiff(thisMonthCount, lastMonthCount) },
            year: { count: thisYearCount, diff: getDiff(thisYearCount, lastYearSamePeriodCount) },
            average: { count: thisMonthAvg, diff: getDiff(thisMonthAvg, lastMonthAvg) }
        };
    }, [logs]);

    const groupedLogs = useMemo(() => {
        const groups: Record<string, AccessLog[]> = {};
        filteredLogs.forEach(log => {
            const date = log.dateTime.split(' ')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
        });
        return groups;
    }, [filteredLogs]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedLogs).sort((a, b) => {
            const [da, ma, ya] = a.split('/').map(Number);
            const [db, mb, yb] = b.split('/').map(Number);
            return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
        });
    }, [groupedLogs]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 w-full h-full flex flex-col">
            <div className="flex flex-col space-y-4 shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col space-y-1">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                             <Warehouse className="text-[#00ad74]" /> Controle de Acesso
                        </h2>
                        <p className="text-slate-500 text-sm flex items-center gap-2">
                            <Cloud size={14} className={isRefreshing ? 'animate-pulse text-[#00ad74]' : ''} /> 
                            Portaria - Sincronização automática ativa para todos os operadores.
                        </p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => refreshList(true)} 
                            disabled={isRefreshing}
                            className={`p-2 rounded-lg border border-emerald-100 text-slate-600 bg-white hover:text-[#00ad74] disabled:opacity-50 transition-all shadow-sm ${isRefreshing ? 'animate-spin text-[#00ad74]' : ''}`}
                            title="Forçar Sincronização Agora"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar no histórico..." 
                                className="bg-white border border-slate-200 text-slate-800 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00ad74] w-full text-sm shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleOpenNew}
                            className="flex items-center gap-2 bg-[#00ad74] hover:bg-[#008f61] text-white px-4 py-2 rounded-lg font-bold transition-all shadow-md text-sm whitespace-nowrap active:scale-95"
                        >
                            <PlusCircle size={18} /> Novo Registro
                        </button>
                    </div>
                </div>

                {/* BI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Acessos Hoje', value: stats.today.count, diff: stats.today.diff, icon: Clock, color: 'emerald', bgColor: 'bg-emerald-500/5', hoverBg: 'group-hover:bg-emerald-500/10', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
                        { label: 'Média Diária (Úteis)', value: stats.average.count.toFixed(1), diff: stats.average.diff, icon: TrendingUp, color: 'orange', bgColor: 'bg-orange-500/5', hoverBg: 'group-hover:bg-orange-500/10', iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
                        { label: 'Acessos no Mês', value: stats.month.count, diff: stats.month.diff, icon: Calendar, color: 'blue', bgColor: 'bg-blue-500/5', hoverBg: 'group-hover:bg-blue-500/10', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
                        { label: 'Acessos no Ano', value: stats.year.count, diff: stats.year.diff, icon: BarChart3, color: 'purple', bgColor: 'bg-purple-500/5', hoverBg: 'group-hover:bg-purple-500/10', iconBg: 'bg-purple-50', iconColor: 'text-purple-500' }
                    ].map((card, i) => (
                        <motion.div 
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 ${card.bgColor} rounded-full blur-2xl ${card.hoverBg} transition-colors`} />
                            
                            <div className="flex items-center justify-between relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="text-2xl font-black text-slate-800">{card.value}</h4>
                                        <div className={`flex items-center gap-0.5 text-[10px] font-bold ${card.diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {card.diff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {Math.abs(card.diff).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-3 ${card.iconBg} rounded-xl ${card.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                                    <card.icon size={20} />
                                </div>
                            </div>
                            <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                vs. período anterior
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative">
                {isRefreshing && logs.length === 0 && (
                    <div className="absolute inset-0 z-20 bg-white/80 flex items-center justify-center flex-col animate-in fade-in duration-300">
                        <Loader2 className="animate-spin text-[#00ad74] mb-2" size={32} />
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                )}
                
                <div className="overflow-auto flex-1 pr-2 custom-scrollbar">
                    <div className="space-y-4 pb-6">
                        {sortedDates.length > 0 ? (
                            sortedDates.map((date) => {
                                const dateLogs = groupedLogs[date];
                                const isExpanded = expandedDates.includes(date);
                                
                                return (
                                    <div key={date} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                                        <button 
                                            onClick={() => toggleDate(date)}
                                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#00ad74] text-white w-10 h-10 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20">
                                                    <span className="text-[10px] font-black leading-none uppercase">
                                                        {(() => {
                                                            const [d, m, y] = date.split('/').map(Number);
                                                            return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                                                        })()}
                                                    </span>
                                                    <span className="text-lg font-black leading-none">{date.split('/')[0]}</span>
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-bold text-slate-700">
                                                        {(() => {
                                                            const [d, m, y] = date.split('/').map(Number);
                                                            return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long' });
                                                        })()}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dateLogs.length} Acessos registrados</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {Array.from(new Set(dateLogs.map(o => o.operator))).slice(0, 3).map((op, i) => (
                                                        <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500" title={op as string}>
                                                            {(op as string).substring(0, 2).toUpperCase()}
                                                        </div>
                                                    ))}
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-4 pt-0 border-t border-slate-100">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="text-slate-400 text-[9px] uppercase tracking-widest font-black border-b border-slate-100">
                                                                        <th className="py-3 px-2">Hora</th>
                                                                        <th className="py-3 px-2">Operador</th>
                                                                        <th className="py-3 px-2">Visitante / Empresa</th>
                                                                        <th className="py-3 px-2">Destino</th>
                                                                        <th className="py-3 px-2">Placa</th>
                                                                        <th className="py-3 px-2">Local</th>
                                                                        <th className="py-3 px-2 text-right">Ações</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {dateLogs.map((log, index) => (
                                                                        <tr key={`${log.id}-${index}`} className="hover:bg-slate-50/50 transition-colors group">
                                                                            <td className="py-3 px-2 font-mono text-slate-500 text-[10px] font-bold">
                                                                                {log.dateTime.split(' ')[1]}
                                                                            </td>
                                                                            <td className="py-3 px-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-[8px] font-black text-[#00ad74]">
                                                                                        {log.operator.substring(0,2).toUpperCase()}
                                                                                    </div>
                                                                                    <span className="font-bold text-slate-600 text-[10px] uppercase">{log.operator}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-3 px-2">
                                                                                <div className="font-bold text-slate-800 text-[10px] uppercase truncate max-w-[150px]">{log.visitorName}</div>
                                                                                {log.visitorCompany && (
                                                                                    <div className="text-[9px] text-slate-400 flex items-center gap-1 font-bold uppercase">
                                                                                        <Building size={8} /> {log.visitorCompany}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 px-2 text-slate-600 font-bold text-[10px] uppercase truncate max-w-[120px]">
                                                                                {log.personVisited}
                                                                            </td>
                                                                            <td className="py-3 px-2">
                                                                                <span className={`font-mono px-1.5 py-0.5 rounded border font-black text-[10px] uppercase ${log.vehiclePlate === 'ENTROU A PE' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                                                    {log.vehiclePlate}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-3 px-2">
                                                                                <span className={`inline-flex items-center gap-1 font-black text-[8px] px-1.5 py-1 rounded-md border uppercase ${log.location === 'CANCELA' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                                                    {log.location === 'CANCELA' ? <Car size={8}/> : <Phone size={8}/>}
                                                                                    {log.location}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-3 px-2 text-right">
                                                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                                                    <button 
                                                                                        onClick={() => handleEdit(log)}
                                                                                        className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-[#00ad74] hover:border-[#00ad74] rounded-md transition-colors"
                                                                                    >
                                                                                        <Pencil size={12} />
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => handleDelete(log.id)}
                                                                                        className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 rounded-md transition-colors"
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center space-y-3">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <Warehouse size={24} />
                                </div>
                                <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Nenhum registro encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-emerald-50 flex flex-col max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                                {editingId ? <Pencil className="text-[#00ad74]" /> : <Warehouse className="text-[#00ad74]" />}
                                {editingId ? 'Editar Registro' : 'Registrar Portaria'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ponto de Acesso *</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, location: 'CANCELA'})}
                                        className={`flex-1 py-3.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 shadow-sm ${formData.location === 'CANCELA' ? 'bg-gradient-to-r from-orange-500 to-orange-400 border-orange-500 text-white shadow-orange-100' : 'bg-white border-slate-200 text-slate-400 hover:border-orange-200'}`}
                                    >
                                        <Car size={18}/> CANCELA
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, location: 'INTERFONE'})}
                                        className={`flex-1 py-3.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 shadow-sm ${formData.location === 'INTERFONE' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-600 text-white shadow-emerald-100' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200'}`}
                                    >
                                        <Phone size={18}/> INTERFONE
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operador Responsável</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00ad74]" size={16} />
                                        <input 
                                            type="text"
                                            readOnly
                                            value={operatorName}
                                            className="w-full pl-9 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-emerald-800 font-black uppercase text-xs cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Placa / Identificação *</label>
                                    <div className="relative group">
                                        <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00ad74] transition-colors" size={16} />
                                        <input 
                                            type="text"
                                            required
                                            value={formData.vehiclePlate}
                                            onChange={e => handleInputChange('vehiclePlate', e.target.value)}
                                            className="w-full pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] uppercase font-mono transition-all text-sm font-bold"
                                            placeholder="ABC1D23"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleSetPedestrian}
                                        className="text-[10px] font-black text-[#00ad74] hover:text-emerald-700 flex items-center gap-1.5 py-1.5 transition-colors uppercase tracking-tight"
                                    >
                                        <Footprints size={13}/> Marcar como Pedestre
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00ad74] transition-colors" size={16} />
                                        <input 
                                            type="text"
                                            required
                                            value={formData.visitorName}
                                            onChange={e => handleInputChange('visitorName', e.target.value)}
                                            className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] uppercase transition-all text-sm font-bold"
                                            placeholder="NOME DO VISITANTE"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Empresa / Transportadora *</label>
                                    <div className="relative group">
                                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00ad74] transition-colors" size={16} />
                                        <input 
                                            type="text"
                                            required
                                            value={formData.visitorCompany}
                                            onChange={e => handleInputChange('visitorCompany', e.target.value)}
                                            className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] uppercase transition-all text-sm font-bold"
                                            placeholder="EMPRESA"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Setor Destino *</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00ad74] transition-colors" size={16} />
                                    <input 
                                        type="text"
                                        required
                                        value={formData.personVisited}
                                        onChange={e => handleInputChange('personVisited', e.target.value)}
                                        className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] uppercase transition-all text-sm font-bold"
                                        placeholder="EX: LOGÍSTICA / RH"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm uppercase tracking-widest">
                                    Voltar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-[#00ad74] to-[#00d68f] text-white font-black rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 active:scale-95 text-sm uppercase tracking-widest"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" /> 
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} /> 
                                            {editingId ? 'Atualizar' : 'Registrar'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessControl;
