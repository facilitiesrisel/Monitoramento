
import React, { useState, useEffect, useMemo } from 'react';
import { getDriverStats, addDriver, updateDriver, deleteDriver, loadData, getFleetData } from '../services/dataService';
import { DriverStats, DriverProfile, DriverJustification } from '../types';
import { Search, UserPlus, Pencil, Trash2, X, Save, User, Calendar, Filter, RefreshCw, AlertCircle, Video, VideoOff, Flag, CheckCircle2, XCircle, Briefcase, FileText, UserCog } from 'lucide-react';

const DriversList: React.FC = () => {
  const currentYear = new Date().getFullYear();
  // Filters State
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [driversStats, setDriversStats] = useState<DriverStats[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [customBases, setCustomBases] = useState<string[]>(() => {
    const stored = localStorage.getItem('risel_custom_bases');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (_) {}
    }
    return [];
  });

  const allBases = useMemo(() => {
    const defaultBases = ["ARA", "CBO", "MATRIZ", "OUTRA", "PLN"];
    const fleetBases = getFleetData().map(f => f.base.toUpperCase().trim());
    const driverBases = driversStats.map(d => d.base.toUpperCase().trim());
    
    const combined = new Set([
        ...defaultBases, 
        ...fleetBases, 
        ...driverBases, 
        ...customBases.map(b => b.toUpperCase().trim())
    ]);
    return Array.from(combined).filter(Boolean).sort();
  }, [driversStats, customBases]);

  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
      name: string; 
      base: string; 
      hasCamera: boolean;
      justifications: DriverJustification[];
      isActive: boolean;
      inactivationDate: string;
  }>({ name: '', base: '', hasCamera: true, justifications: [], isActive: true, inactivationDate: '' });

  // Justification Form State
  const [justificationForm, setJustificationForm] = useState<{
      year: number;
      month: number;
      reason: string;
      countTowardsGoal: boolean;
  }>({ year: currentYear, month: new Date().getMonth(), reason: '', countTowardsGoal: false });

  const reasonOptions = [
      "Câmeras Inoperantes",
      "Férias",
      "Funcionário Novo",
      "Não pertence mais ao quadro",
      "Outros",
      "Sem viagens",
      "Afastamento Médico",
      "Licença"
  ];

  const loadStats = async () => {
     const stats = getDriverStats({
       year: filterYear,
       month: filterMonth === '' ? null : Number(filterMonth),
       week: filterWeek
     });
     setDriversStats(stats);
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh interval (for stats updates)
    const interval = setInterval(() => setLastUpdate(new Date()), 5000);
    return () => clearInterval(interval);
  }, [filterYear, filterMonth, filterWeek, lastUpdate]);

  const filteredDrivers = useMemo(() => {
    return driversStats.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.base.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [driversStats, searchTerm]);

  // CRUD Handlers
  const handleSave = () => {
    if (!formData.name || !formData.base) {
        alert("Nome e Base são obrigatórios.");
        return;
    }

    if (formData.isActive === false && !formData.inactivationDate) {
        alert("A data de inativação é obrigatória quando o cadastro está inativo.");
        return;
    }

    // Auto-salvar nova base operacional se não existir na lista
    const cleanBase = formData.base.trim().toUpperCase();
    if (cleanBase && !allBases.includes(cleanBase)) {
      const updated = [...customBases, cleanBase];
      setCustomBases(updated);
      localStorage.setItem('risel_custom_bases', JSON.stringify(updated));
    }

    if (editingId) {
      updateDriver(editingId, formData);
    } else {
      addDriver(formData);
    }
    
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', base: '', hasCamera: true, justifications: [], isActive: true, inactivationDate: '' });
    // Trigger update
    setLastUpdate(new Date());
  };

  const handleEdit = (driver: DriverStats) => {
    setEditingId(driver.id);
    setFormData({ 
        name: driver.name, 
        base: driver.base, 
        hasCamera: driver.hasCamera,
        justifications: driver.justifications || [],
        isActive: driver.isActive !== false,
        inactivationDate: driver.inactivationDate || ''
    });
    // Reset Justification Form
    setJustificationForm({ year: currentYear, month: new Date().getMonth(), reason: '', countTowardsGoal: false });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este motorista?')) {
      deleteDriver(id);
      setLastUpdate(new Date());
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', base: '', hasCamera: true, justifications: [], isActive: true, inactivationDate: '' });
    // Reset Justification Form
    setJustificationForm({ year: currentYear, month: new Date().getMonth(), reason: '', countTowardsGoal: false });
    setIsModalOpen(true);
  };

  const handleAddJustification = () => {
      if (!justificationForm.reason) {
          alert("Selecione um motivo.");
          return;
      }
      
      const newJustification: DriverJustification = {
          id: Date.now().toString(),
          year: justificationForm.year,
          month: justificationForm.month,
          reason: justificationForm.reason,
          countTowardsGoal: justificationForm.countTowardsGoal,
          createdAt: new Date().toISOString()
      };

      setFormData(prev => ({
          ...prev,
          justifications: [...prev.justifications, newJustification]
      }));

      // Reset reason but keep dates for ease of use
      setJustificationForm(prev => ({...prev, reason: '', countTowardsGoal: false}));
  };

  const handleRemoveJustification = (jId: string) => {
      setFormData(prev => ({
          ...prev,
          justifications: prev.justifications.filter(j => j.id !== jId)
      }));
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [];
  for (let y = 2025; y <= currentYear + 1; y++) years.push(y);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col space-y-1">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Motoristas</h2>
            <p className="text-slate-500 text-sm">Cadastro e desempenho detalhado.</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar motorista..." 
                className="bg-white border border-slate-200 text-slate-800 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-[#ffa000] focus:ring-1 focus:ring-[#ffa000] w-full transition-all shadow-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openNewModal}
              className="flex items-center gap-2 bg-[#00ad74] hover:bg-[#008f61] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm whitespace-nowrap"
            >
              <UserPlus size={18} />
              <span className="hidden md:inline">Novo</span>
            </button>
          </div>
        </div>

        {/* Filter Bar - Always Visible */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
             {/* Year */}
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ano</label>
               <div className="relative">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <select
                   value={filterYear}
                   onChange={(e) => setFilterYear(Number(e.target.value))}
                   className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer"
                 >
                   {years.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
             </div>

             {/* Month */}
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mês</label>
               <div className="relative">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <select
                   value={filterMonth}
                   onChange={(e) => setFilterMonth(e.target.value === '' ? '' : Number(e.target.value))}
                   className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer"
                 >
                   <option value="">Todos</option>
                   {months.map((m, idx) => (
                     <option key={idx} value={idx}>{m}</option>
                   ))}
                 </select>
               </div>
             </div>

             {/* Week */}
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nº Semana</label>
               <div className="relative">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <select
                   value={filterWeek}
                   onChange={(e) => setFilterWeek(e.target.value)}
                   className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00ad74] cursor-pointer"
                 >
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
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="p-4">Motorista</th>
                <th className="p-4 text-center">Câm.</th>
                <th className="p-4 text-center">Semana</th>
                <th className="p-4 text-center">Mês</th>
                <th className="p-4 text-center">Ano</th>
                <th className="p-4 text-center">Nota Geral</th>
                <th className="p-4 text-right">Última Avaliação</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver, index) => (
                  <tr key={`${driver.id}-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-800 font-medium">
                       <div className="flex flex-col">
                         <div className="flex items-center gap-2 flex-wrap">
                            <User size={14} className={driver.isActive !== false ? "text-slate-400" : "text-rose-400"} />
                            <span className={driver.isActive !== false ? "" : "text-slate-400 line-through"}>{driver.name}</span>
                            {driver.isActive === false && (
                                <span className="text-[9px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                                    INATIVO DESDE {driver.inactivationDate ? new Date(driver.inactivationDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                                </span>
                            )}
                         </div>
                         <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-6 bg-slate-100 px-1.5 py-0.5 rounded w-fit border border-slate-200">
                           {driver.base}
                         </span>
                       </div>
                    </td>
                    <td className="p-4 text-center">
                       {driver.hasCamera ? (
                         <div className="flex items-center justify-center">
                            <Video size={16} className="text-[#00ad74]" />
                         </div>
                       ) : (
                         <div className="flex items-center justify-center">
                            <VideoOff size={16} className="text-slate-300" />
                         </div>
                       )}
                    </td>
                    <td className="p-4 text-center">
                       <span className={`font-bold ${driver.evalsWeek > 0 ? 'text-[#00ad74]' : 'text-slate-300'}`}>
                         {driver.evalsWeek}
                       </span>
                    </td>
                    <td className="p-4 text-center">
                       <span className={`font-bold ${driver.evalsMonth >= 4 ? 'text-[#00ad74]' : 'text-[#ffa000]'}`}>
                         {driver.evalsMonth}
                       </span>
                    </td>
                    <td className="p-4 text-center text-slate-500">
                       {driver.evalsYear}
                    </td>
                    <td className="p-4 text-center">
                       <span className={`px-2 py-1 rounded font-bold text-xs border ${driver.averageScore >= 90 ? 'bg-[#00ad74]/10 text-[#00ad74] border-[#00ad74]/20' : driver.averageScore >= 70 ? 'bg-[#ffa000]/10 text-[#ffa000] border-[#ffa000]/20' : 'bg-red-50 text-red-500 border-red-200'}`}>
                         {driver.totalEvaluations > 0 ? driver.averageScore.toFixed(0) + '%' : '-'}
                       </span>
                    </td>
                    <td className="p-4 text-right text-slate-500 text-xs">
                       {formatDate(driver.lastEvaluationDate)}
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-2">
                         <button 
                           onClick={() => handleEdit(driver)}
                           className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-[#00ad74] hover:border-[#00ad74] rounded transition-colors shadow-sm"
                           title="Editar Cadastro"
                         >
                           <Pencil size={14} />
                         </button>
                         <button 
                           onClick={() => handleDelete(driver.id)}
                           className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-500 rounded transition-colors shadow-sm"
                           title="Excluir Motorista"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={8} className="p-10 text-center text-slate-400 text-sm">
                     Nenhum motorista encontrado com os filtros selecionados.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Unified View (No Tabs) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-0 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <UserCog className="text-[#00ad74]"/> : <UserPlus className="text-[#00ad74]"/>}
                {editingId ? 'Editar Motorista' : 'Novo Motorista'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body - Stacked Sections */}
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
                
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <User size={16} className="text-[#00ad74]"/> Dados Cadastrais
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Nome Completo *</label>
                            <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:border-[#00ad74] focus:ring-1 focus:ring-[#00ad74] focus:outline-none transition-all text-sm font-bold"
                            placeholder="EX: JOÃO DA SILVA"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Base Operacional *</label>
                            <input 
                            list="baseOptions"
                            value={formData.base}
                            onChange={e => setFormData({...formData, base: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:border-[#00ad74] focus:ring-1 focus:ring-[#00ad74] focus:outline-none transition-all text-sm font-bold"
                            placeholder="Selecione ou digite..."
                            />
                            <datalist id="baseOptions">
                                {allBases.map(b => (
                                    <option key={b} value={b} />
                                ))}
                            </datalist>
                            {formData.base.trim() !== "" && !allBases.includes(formData.base.trim().toUpperCase()) && (
                                <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg animate-in fade-in duration-200">
                                    <span className="text-[11px] text-emerald-800 font-bold">Esta base é nova e não está cadastrada.</span>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const newBase = formData.base.trim().toUpperCase();
                                            if (newBase && !customBases.includes(newBase)) {
                                                const updated = [...customBases, newBase];
                                                setCustomBases(updated);
                                                localStorage.setItem('risel_custom_bases', JSON.stringify(updated));
                                                alert(`Base "${newBase}" cadastrada com sucesso! Ela agora ficará salva para futuros usos.`);
                                            }
                                        }}
                                        className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md font-black uppercase transition-all shadow-sm"
                                    >
                                        Cadastrar Base
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Frota com Câmera?</label>
                            <div className="relative">
                            <select 
                                value={formData.hasCamera ? 'true' : 'false'}
                                onChange={e => setFormData({...formData, hasCamera: e.target.value === 'true'})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:border-[#00ad74] focus:ring-1 focus:ring-[#00ad74] focus:outline-none transition-all appearance-none text-sm font-bold/50 font-bold"
                            >
                                <option value="true">Sim</option>
                                <option value="false">Não</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                {formData.hasCamera ? <Video size={16} /> : <VideoOff size={16} />}
                            </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Situação do Cadastro</label>
                            <div className="relative">
                            <select 
                                value={formData.isActive ? 'true' : 'false'}
                                onChange={e => {
                                    const val = e.target.value === 'true';
                                    setFormData({
                                        ...formData, 
                                        isActive: val,
                                        inactivationDate: val ? '' : (formData.inactivationDate || new Date().toISOString().split('T')[0])
                                    });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:border-[#00ad74] focus:ring-1 focus:ring-[#00ad74] focus:outline-none transition-all appearance-none text-sm font-bold"
                            >
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                            </select>
                            </div>
                        </div>

                        {formData.isActive === false && (
                            <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Data da Inativação *</label>
                                <input 
                                    type="date" 
                                    value={formData.inactivationDate}
                                    onChange={e => setFormData({...formData, inactivationDate: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:border-[#00ad74] focus:ring-1 focus:ring-[#00ad74] focus:outline-none transition-all text-sm font-bold"
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <p className="text-[10px] text-slate-400 mt-2 bg-blue-50 p-2 rounded border border-blue-100 flex items-center gap-2">
                                <AlertCircle size={12} className="text-blue-500"/>
                                Motoristas sem câmera não entram no cálculo das métricas de avaliação.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Justifications */}
                {editingId && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Briefcase size={16} className="text-[#ffa000]"/> Justificativas & Ausências (Férias, etc)
                        </h4>
                        <div className="bg-[#ffa000]/5 p-4 rounded-xl border border-[#ffa000]/20 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mês Ref.</label>
                                    <select 
                                        value={justificationForm.month}
                                        onChange={e => setJustificationForm({...justificationForm, month: Number(e.target.value)})}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#ffa000]"
                                    >
                                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ano Ref.</label>
                                    <select 
                                        value={justificationForm.year}
                                        onChange={e => setJustificationForm({...justificationForm, year: Number(e.target.value)})}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#ffa000]"
                                    >
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motivo / Ausência</label>
                                    <select 
                                        value={justificationForm.reason}
                                        onChange={e => setJustificationForm({...justificationForm, reason: e.target.value})}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#ffa000]"
                                    >
                                        <option value="">Selecione...</option>
                                        {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setJustificationForm({...justificationForm, countTowardsGoal: !justificationForm.countTowardsGoal})}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${justificationForm.countTowardsGoal ? 'bg-[#00ad74] border-[#00ad74]' : 'border-slate-300'}`}>
                                        {justificationForm.countTowardsGoal && <CheckCircle2 size={12} className="text-white"/>}
                                    </div>
                                    <label className="text-[10px] font-bold text-slate-600 cursor-pointer select-none">Contabilizar Meta como OK?</label>
                                </div>
                                <button 
                                    onClick={handleAddJustification}
                                    className="bg-[#ffa000] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-[#e69000] transition-colors shadow-sm"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>

                        {/* Lista de Justificativas */}
                        <div className="space-y-2 mt-2">
                            {formData.justifications.length > 0 ? (
                                formData.justifications.sort((a,b) => (b.year - a.year) || (b.month - a.month)).map((j) => (
                                    <div key={j.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                        <div className="flex flex-col">
                                            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                                <Calendar size={12} className="text-slate-400"/>
                                                {months[j.month]}/{j.year}
                                                <span className="text-slate-300 font-light">|</span>
                                                <span className="text-slate-800">{j.reason}</span>
                                            </div>
                                            <div className="mt-1 ml-5">
                                                {j.countTowardsGoal ? (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                                                        <CheckCircle2 size={10} /> Meta Abonada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                        <FileText size={10} /> Apenas Registro
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveJustification(j.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remover Justificativa"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-6 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    Nenhuma justificativa ou ausência registrada para este motorista.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm uppercase tracking-widest shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 bg-[#00ad74] hover:bg-[#008f61] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#00ad74]/20 text-sm uppercase tracking-widest"
              >
                <Save size={18} />
                Salvar Cadastro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversList;
