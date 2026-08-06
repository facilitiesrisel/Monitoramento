
import React, { useState, useEffect } from 'react';
import { getManagedOperators, addOperator, deleteOperator, updateOperator, loadData } from '../services/dataService';
import { OperatorProfile } from '../types';
import { Search, UserPlus, Trash2, Shield, Lock, Save, X, RefreshCw, Pencil, CheckSquare, Square, ShieldCheck, CheckSquare as CheckedIcon, Square as UncheckedIcon } from 'lucide-react';

interface OperatorsListProps {
  currentUser?: { name: string; role: string } | null;
}

const AVAILABLE_MENUS = [
  { id: 'dashboard', label: '📊 Dashboard', desc: 'Painéis e gráficos gerenciais do sistema' },
  { id: 'evaluations', label: '🚛 Avaliações', desc: 'Registro e acompanhamento das avaliações de motoristas' },
  { id: 'evaluator-perf', label: '📈 Desempenho Op.', desc: 'Estatísticas de desempenho operacional dos operadores' },
  { id: 'drivers', label: '👥 Motoristas', desc: 'Gestão de motoristas ativos no sistema' },
  { id: 'operators', label: '🛡️ Acessos (Ops)', desc: 'Gerenciamento de operados, acessos e permissões' },
  { id: 'access-control', label: '🏢 Controle de Acesso', desc: 'Registro de entrada/saída de veículos e portaria' },
  { id: 'shift-handover', label: '📝 Passagem de Plantão', desc: 'Ocorrências e transferência de turnos de trabalho' },
  { id: 'bola-preta', label: '🚨 Análise de Viagem', desc: 'Mapeamento de comportamentos e conformidades' }
];

const OperatorsList: React.FC<OperatorsListProps> = ({ currentUser }) => {
  const [operators, setOperators] = useState<OperatorProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Custom permissions state
  const isDenyUser = currentUser?.name?.toUpperCase().trim() === 'DENY';
  const [selectedOpForMenus, setSelectedOpForMenus] = useState<OperatorProfile | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [tempSelectedMenus, setTempSelectedMenus] = useState<string[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');

  const refreshList = async () => {
      setIsRefreshing(true);
      await loadData();
      setOperators(getManagedOperators());
      setIsRefreshing(false);
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleEdit = (op: OperatorProfile) => {
      setEditingId(op.id);
      setNewName(op.name);
      setNewPass(op.password);
      setIsModalOpen(true);
  };

  const handleOpenMenus = (op: OperatorProfile) => {
      setSelectedOpForMenus(op);
      
      let currentAllowed: string[] = [];
      try {
          const storedPermissions = localStorage.getItem('risel_operators_menus');
          if (storedPermissions) {
              const permissionsMap = JSON.parse(storedPermissions);
              currentAllowed = permissionsMap[op.name.toUpperCase().trim()] || [];
          }
      } catch (e) {
          console.error(e);
      }
      
      if (currentAllowed.length === 0) {
          const role = op.role || 'operator';
          currentAllowed = AVAILABLE_MENUS.filter(m => {
              const allowedUsers = ['DENY', 'DANIELE', 'IVA', 'MARCIA', 'NILMARY', 'SUELI', 'THIAGO'];
              if (m.id === 'bola-preta') return allowedUsers.includes(op.name.toUpperCase().trim());
              if (m.id === 'operators') return role === 'admin';
              if (m.id === 'evaluator-perf') return role === 'admin';
              if (m.id === 'drivers') return role === 'admin';
              if (m.id === 'dashboard') return ['admin', 'quality'].includes(role);
              if (m.id === 'evaluations') return ['admin', 'operator', 'quality', 'monitor'].includes(role);
              if (m.id === 'access-control') return ['admin', 'operator'].includes(role);
              if (m.id === 'shift-handover') return ['admin', 'operator'].includes(role);
              return true;
          }).map(m => m.id);
      }
      
      setTempSelectedMenus(currentAllowed);
      setIsMenuModalOpen(true);
  };

  const handleToggleMenuSelection = (menuId: string) => {
      setTempSelectedMenus(prev => 
          prev.includes(menuId) 
              ? prev.filter(id => id !== menuId) 
              : [...prev, menuId]
      );
  };

  const handleSelectAllMenus = () => {
      setTempSelectedMenus(AVAILABLE_MENUS.map(m => m.id));
  };

  const handleClearAllMenus = () => {
      setTempSelectedMenus([]);
  };

  const handleSaveMenus = async () => {
      if (!selectedOpForMenus) return;
      const opNameKey = selectedOpForMenus.name.toUpperCase().trim();
      
      try {
          const storedPermissions = localStorage.getItem('risel_operators_menus');
          let permissionsMap = storedPermissions ? JSON.parse(storedPermissions) : {};
          
          permissionsMap[opNameKey] = tempSelectedMenus;
          
          localStorage.setItem('risel_operators_menus', JSON.stringify(permissionsMap));
          
          // Persist to Google Sheets / Cloud
          await updateOperator(selectedOpForMenus.id, {
              ...selectedOpForMenus,
              menus: tempSelectedMenus
          });

          setIsMenuModalOpen(false);
          setSelectedOpForMenus(null);
          alert(`Permissões de acessos para ${opNameKey} atualizadas com sucesso e sincronizadas na nuvem!`);
          refreshList();
      } catch (e) {
          console.error(e);
          alert('Erro ao salvar permissões de menu.');
      }
  };

  const handleOpenNew = () => {
      setEditingId(null);
      setNewName('');
      setNewPass('');
      setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!newName || !newPass) return;
    
    if (editingId) {
        await updateOperator(editingId, {
            name: newName,
            password: newPass
        });
    } else {
        await addOperator({
            name: newName,
            password: newPass
        });
    }
    
    setIsModalOpen(false);
    setEditingId(null);
    setNewName('');
    setNewPass('');
    refreshList();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover acesso deste operador?')) {
        await deleteOperator(id);
        refreshList();
    }
  };

  const filteredOps = operators.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full h-full flex flex-col">
       <div className="flex flex-col space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col space-y-1">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Shield className="text-[#00ad74]" /> Gestão de Acessos
            </h2>
            <p className="text-slate-500 text-sm">Cadastro de login e senha para operadores do sistema.</p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <button onClick={refreshList} className={`p-2 rounded-lg border border-slate-200 text-slate-600 bg-white hover:text-[#00ad74] ${isRefreshing ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} />
             </button>
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar operador..." 
                  className="bg-white border border-slate-200 text-slate-800 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00ad74] w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button 
                onClick={handleOpenNew}
                className="flex items-center gap-2 bg-[#00ad74] hover:bg-[#008f61] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm whitespace-nowrap"
             >
                <UserPlus size={18} /> Novo Operador
             </button>
          </div>
        </div>
       </div>

       <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
         <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                    <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="p-4">Nome do Operador (Login)</th>
                        <th className="p-4">Senha Cadastrada</th>
                        {isDenyUser && <th className="p-4 text-center">Permissões de Menus</th>}
                        <th className="p-4 text-right">Data Criação</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredOps.length > 0 ? (
                        filteredOps.map((op, index) => (
                            <tr key={`${op.id}-${index}`} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-800">{op.name}</td>
                                <td className="p-4 text-slate-500 font-mono tracking-widest">••••••</td>
                                {isDenyUser && (
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleOpenMenus(op)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-[#00ad74] hover:text-white border border-emerald-250 rounded-full text-xs font-black transition-all shadow-sm active:scale-95"
                                            title="Escolher menus que este operador terá acesso"
                                        >
                                            <ShieldCheck size={14} />
                                            Configurar Acessos
                                        </button>
                                    </td>
                                )}
                                <td className="p-4 text-right text-slate-500 text-xs">{new Date(op.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleEdit(op)}
                                            className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-[#00ad74] hover:border-[#00ad74] rounded transition-colors"
                                            title="Editar Senha"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(op.id)}
                                            className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 rounded transition-colors"
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={isDenyUser ? 5 : 4} className="p-10 text-center text-slate-400">Nenhum operador cadastrado.</td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
       </div>

       {/* Modal */}
       {isModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Operador' : 'Novo Operador'}</h3>
                       <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                   </div>
                   
                   <div className="space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome (Login)</label>
                           <input 
                              type="text" 
                              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#00ad74] outline-none"
                              placeholder="Ex: JOAO"
                              value={newName}
                              onChange={e => setNewName(e.target.value.toUpperCase())}
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
                           <input 
                              type="text" 
                              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#00ad74] outline-none"
                              placeholder="Senha de acesso"
                              value={newPass}
                              onChange={e => setNewPass(e.target.value)}
                           />
                       </div>
                   </div>

                   <div className="flex gap-3 mt-6">
                       <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600 font-medium">Cancelar</button>
                       <button onClick={handleSave} className="flex-1 py-2 bg-[#00ad74] rounded-lg text-white font-bold hover:bg-[#008f61]">Salvar</button>
                   </div>
               </div>
           </div>
       )}

       {/* Modal para Seleção de Menus */}
       {isMenuModalOpen && selectedOpForMenus && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] flex flex-col">
                   <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-slate-100">
                       <div className="flex items-center gap-2">
                           <Shield className="text-[#00ad74]" size={20} />
                           <div>
                               <h3 className="text-base font-black text-slate-800 leading-none">Acessos de Menus</h3>
                               <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Configuração para: <span className="text-[#00ad74] font-black">{selectedOpForMenus.name}</span></p>
                           </div>
                       </div>
                       <button onClick={() => { setIsMenuModalOpen(false); setSelectedOpForMenus(null); }}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                   </div>

                   {/* Controles Rápidos */}
                   <div className="flex justify-between gap-2 mb-4 shrink-0 px-1">
                       <span className="text-xs text-slate-500 font-medium self-center">Marque os menus visíveis na barra lateral:</span>
                       <div className="flex gap-2">
                           <button 
                               onClick={handleSelectAllMenus} 
                               className="px-2.5 py-1 text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors"
                           >
                               Marcar Todos
                           </button>
                           <button 
                               onClick={handleClearAllMenus} 
                               className="px-2.5 py-1 text-[10px] uppercase font-black text-rose-600 bg-rose-50 rounded hover:bg-rose-100 transition-colors"
                           >
                               Limpar Todos
                           </button>
                       </div>
                   </div>

                   {/* Lista com Seleção de Menus */}
                   <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                       {AVAILABLE_MENUS.map(menu => {
                           const isChecked = tempSelectedMenus.includes(menu.id);
                           return (
                               <div 
                                   key={menu.id} 
                                   onClick={() => handleToggleMenuSelection(menu.id)}
                                   className={`flex items-start gap-4 p-3 rounded-xl border cursor-pointer select-none transition-all duration-200
                                       ${isChecked 
                                           ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 shadow-sm' 
                                           : 'border-slate-100 hover:bg-slate-50'}`}
                               >
                                   <div className="mt-0.5 shrink-0">
                                       {isChecked ? (
                                           <CheckedIcon size={18} className="text-[#00ad74]" />
                                       ) : (
                                           <UncheckedIcon size={18} className="text-slate-300" />
                                       )}
                                   </div>
                                   <div className="flex-1">
                                       <p className={`text-sm font-bold ${isChecked ? 'text-emerald-900' : 'text-slate-700'}`}>{menu.label}</p>
                                       <p className="text-xs text-slate-400 leading-tight mt-0.5">{menu.desc}</p>
                                   </div>
                                </div>
                            );
                        })}
                   </div>

                   <div className="flex gap-3 mt-6 shrink-0 pt-3 border-t border-slate-100">
                       <button 
                           onClick={() => { setIsMenuModalOpen(false); setSelectedOpForMenus(null); }} 
                           className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold transition-all text-sm"
                       >
                           Cancelar
                       </button>
                       <button 
                           onClick={handleSaveMenus} 
                           className="flex-1 py-2.5 bg-[#00ad74] hover:bg-[#008f61] rounded-lg text-white font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
                       >
                           <Save size={16} /> Salvar Acessos
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default OperatorsList;
