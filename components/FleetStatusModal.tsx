
import React, { useMemo } from 'react';
import { getFleetStatus } from '../services/dataService';
import { X, CheckCircle2, AlertCircle, Truck, Search, PlusCircle, Calendar, Filter, MapPin, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FleetStatusModalProps {
    onClose: () => void;
    month: number;
    year: number;
    onStartVerification: (vehicle: string, plate: string, base: string) => void;
}

const FleetStatusModal: React.FC<FleetStatusModalProps> = ({ onClose, month, year, onStartVerification }) => {
    const [search, setSearch] = React.useState('');
    const fleetStatus = useMemo(() => getFleetStatus(month, year), [month, year]);
    
    const filtered = fleetStatus.filter(f => 
        f.frota.toLowerCase().includes(search.toLowerCase()) || 
        f.placa.toLowerCase().includes(search.toLowerCase()) ||
        f.base.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: fleetStatus.length,
        checked: fleetStatus.filter(f => f.checked).length,
        pending: fleetStatus.filter(f => !f.checked).length,
        coverage: fleetStatus.length > 0 ? Math.round((fleetStatus.filter(f => f.checked).length / fleetStatus.length) * 100) : 0
    };

    const monthName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header Premium */}
                <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 flex justify-between items-start shrink-0 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                        <Truck size={240} />
                    </div>
                    <div className="flex gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl border border-white/30">
                            <Truck size={36} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black tracking-tight leading-tight uppercase">
                                Auditoria de Frota
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white rounded-xl text-[11px] font-black tracking-widest uppercase border border-white/20">
                                    <Calendar size={12} /> {monthName} {year}
                                </span>
                                <span className="text-xs text-emerald-100 font-bold uppercase tracking-widest opacity-90">Controle Operacional Avançado</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/70 hover:text-white active:scale-95 backdrop-blur-sm border border-white/10">
                        <X size={24} />
                    </button>
                </div>

                {/* Stats Summary Bento Box Style */}
                <div className="grid grid-cols-4 gap-4 p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativos</div>
                            <Truck size={14} className="text-slate-300" />
                        </div>
                        <div className="text-3xl font-black text-slate-800">{stats.total}</div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-emerald-500">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verificados</div>
                            <CheckCircle2 size={14} className="text-emerald-400" />
                        </div>
                        <div className="text-3xl font-black text-emerald-700">{stats.checked}</div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-amber-500">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pendentes</div>
                            <AlertCircle size={14} className="text-amber-400" />
                        </div>
                        <div className="text-3xl font-black text-amber-700">{stats.pending}</div>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-3xl shadow-xl shadow-slate-900/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</div>
                            <PlusCircle size={14} className="text-slate-500" />
                        </div>
                        <div className="flex items-end gap-1">
                            <div className="text-3xl font-black text-white">{stats.coverage}%</div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.coverage}%` }}
                                className="h-full bg-red-600"
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b border-slate-100 flex gap-4 shrink-0 bg-white">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Filtrar por Placa, Frota ou Base..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold tracking-tight"
                        />
                    </div>
                    <button className="px-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                        <Filter size={14} /> Filtros
                    </button>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/20">
                    <AnimatePresence>
                        {filtered.map((f, i) => (
                            <motion.div 
                                key={f.frota}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`group flex items-center justify-between p-4 rounded-3xl border transition-all duration-300 ${
                                    f.checked 
                                        ? 'bg-white/60 border-slate-100 grayscale-[0.8] opacity-60' 
                                        : 'bg-white border-white shadow-sm hover:shadow-xl hover:shadow-red-600/5 hover:-translate-y-0.5'
                                }`}
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                        f.checked ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                                    }`}>
                                        <Truck size={24} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded-md">
                                                <Hash size={10} /> {f.frota}
                                            </span>
                                            <span className="text-sm font-black text-slate-800 tracking-tight">{f.placa}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><MapPin size={10} className="text-slate-400" /> {f.base}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    {f.checked ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                            <CheckCircle2 size={14} /> Verificado
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                                <AlertCircle size={14} /> Aguardando
                                            </div>
                                            <button 
                                                onClick={() => onStartVerification(f.frota, f.placa, f.base)}
                                                className="h-10 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 group/btn"
                                            >
                                                <PlusCircle size={18} className="transition-transform group-hover/btn:rotate-90" />
                                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Iniciar</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                                <Search size={40} />
                            </div>
                            <h4 className="text-lg font-black text-slate-800">Nenhum veículo encontrado</h4>
                            <p className="text-sm font-bold text-slate-400 max-w-xs mt-2 italic">Tente buscar por outra placa ou verifique se os filtros estão corretos.</p>
                        </div>
                    )}
                </div>

                {/* Footer Premium */}
                <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dados sincronizados em tempo real</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                        RISEL COMBUSTÍVEIS • OPERACIONAL 2026
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default FleetStatusModal;
