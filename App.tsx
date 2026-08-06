
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EvaluationsTable from './components/EvaluationsTable';
import DriversList from './components/DriversList';
import PriorityList from './components/PriorityList';
import EvaluatorPerformance from './components/EvaluatorPerformance';
import OperatorsList from './components/OperatorsList'; 
import AccessControl from './components/AccessControl';
import InternalTickets from './components/InternalTickets';
import ShiftHandover from './components/ShiftHandover';
import BolaPreta from './components/BolaPreta';
import EvaluationForm from './components/EvaluationForm'; 
import Login from './components/Login'; 
import { loadData, isSystemOnline, getGoogleSheetConfig, saveGoogleSheetConfig, getGoogleScriptUrl, saveGoogleScriptUrl, sendTestEmail, getInternalTickets, resetGoogleSheetConfig } from './services/dataService';
import { Loader2, AlertCircle, Database, CheckCircle, Save, X, Cloud, FileSpreadsheet, Link2, Mail, Info, RotateCcw } from 'lucide-react';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('evaluations'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  
  const [sheetConfig, setSheetConfig] = useState({ 
      sheetId: '', 
      gid: '', 
      gidDrivers: '', 
      gidOperators: '',
      gidAccess: '',
      gidTickets: '',
      gidShiftHandover: '',
      gidBolaPreta: '',
      gidMacros: '',
      gidFleet: ''
  });
  const [scriptUrl, setScriptUrl] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>(undefined);
  const [editEvaluationId, setEditEvaluationId] = useState<string | undefined>(undefined);
  
  // Estado para notificação de chamados
  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('risel_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    setSheetConfig(getGoogleSheetConfig());
    setScriptUrl(getGoogleScriptUrl());

    loadData()
      .then(() => {
        setLoading(false);
        updateNotificationCounts();
      })
      .catch((err) => {
        console.error(err);
        setError("Não foi possível carregar os dados da Planilha. Detalhes: " + (err instanceof Error ? err.message : String(err)));
        setLoading(false);
      });
      
    // Polling para atualizar notificações periodicamente
    const interval = setInterval(() => {
        updateNotificationCounts();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const updateNotificationCounts = () => {
      const tickets = getInternalTickets();
      const open = tickets.filter(t => t.status === 'Em Aberto').length;
      setOpenTicketsCount(open);
  };

  const getAllowedTabs = (userObj: any) => {
    if (!userObj) return [];
    const role = userObj.role;
    const uName = userObj.name?.toUpperCase().trim() || '';
    
    const allNavItems = [
      { id: 'dashboard', roles: ['admin', 'quality'] },
      { id: 'evaluations', roles: ['admin', 'operator', 'quality', 'monitor'] },
      { id: 'evaluator-perf', roles: ['admin'] },
      { id: 'priority', roles: [] }, 
      { id: 'drivers', roles: ['admin'] },
      { id: 'operators', roles: ['admin'] },
      { id: 'access-control', roles: ['admin', 'operator'] },
      { id: 'shift-handover', roles: ['admin', 'operator'] },
      { id: 'bola-preta', roles: ['admin', 'operator', 'quality', 'monitor'] },
    ];

    return allNavItems.filter(item => {
      try {
        const storedPermissions = localStorage.getItem('risel_operators_menus');
        if (storedPermissions) {
          const permissionsMap = JSON.parse(storedPermissions);
          const opMenus = permissionsMap[uName];
          if (opMenus && Array.isArray(opMenus)) {
            if (item.id === 'bola-preta' && ['DENY', 'DANIELE', 'IVA', 'MARCIA', 'NILMARY', 'SUELI', 'THIAGO'].includes(uName)) {
              return true;
            }
            return opMenus.includes(item.id);
          }
        }
      } catch (e) {
        console.error(e);
      }

      const defaultBolaPretaAllowed = ['DENY', 'DANIELE', 'IVA', 'MARCIA', 'NILMARY', 'SUELI', 'THIAGO'];
      if (item.id === 'bola-preta' && !defaultBolaPretaAllowed.includes(uName)) {
         return false;
      }
      
      return role && item.roles.includes(role);
    }).map(i => i.id);
  };

  useEffect(() => {
      if (user) {
          const allowed = getAllowedTabs(user);
          if (allowed.length > 0) {
              const defaultTab = (user.role === 'admin' || user.role === 'quality') ? 'dashboard' : 'evaluations';
              if (allowed.includes(defaultTab)) {
                  setActiveTab(defaultTab);
              } else {
                  setActiveTab(allowed[0]);
              }
          } else {
              setActiveTab('evaluations');
          }
      }
  }, [user]);

  const handleLogin = (newUser: User) => {
      setUser(newUser);
      localStorage.setItem('risel_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('risel_user');
      setActiveTab('evaluations');
  };

  const handleSaveSheetConfig = () => {
      if (!sheetConfig.sheetId || !sheetConfig.gid) {
          alert("ID da Planilha e GID Principal são obrigatórios.");
          return;
      }
      saveGoogleScriptUrl(scriptUrl);
      saveGoogleSheetConfig(sheetConfig);
  };
  
  const handleStartEvaluation = (driverId?: string) => {
      setSelectedDriverId(driverId);
      setEditEvaluationId(undefined);
      setActiveTab('new-evaluation');
  };

  const handleEditEvaluation = (evalId: string) => {
      setEditEvaluationId(evalId);
      setSelectedDriverId(undefined);
      setActiveTab('new-evaluation');
  };

  const handleTestEmail = async () => {
    const emailToUse = prompt('E-mail para teste:', 'deny.goncalves@risel.com.br');
    if (!emailToUse) return;
    setIsTestingEmail(true);
    try {
        await sendTestEmail(emailToUse);
        alert(`Teste enviado para: ${emailToUse}`);
    } catch (e) {
        alert('Falha ao enviar teste.');
    } finally {
        setIsTestingEmail(false);
    }
  };

  const renderContent = () => {
    if (!user) return null;
    
    switch (activeTab) {
      case 'dashboard': return <Dashboard userRole={user.role} onNavigate={setActiveTab} />;
      case 'new-evaluation': return <EvaluationForm evaluatorName={user.name} initialDriverId={selectedDriverId} editEvaluationId={editEvaluationId} onCancel={() => { setSelectedDriverId(undefined); setEditEvaluationId(undefined); setActiveTab('evaluations'); }} readOnly={user.role === 'quality'} />;
      case 'evaluations': return <EvaluationsTable userRole={user.role} userName={user.name} onCreateNew={() => handleStartEvaluation()} onEvaluateDriver={handleStartEvaluation} onEditEvaluation={handleEditEvaluation} />;
      case 'evaluator-perf': return <EvaluatorPerformance />;
      case 'drivers': return <DriversList />;
      case 'priority': return <PriorityList />;
      case 'operators': return <OperatorsList currentUser={user} />;
      case 'access-control': return <AccessControl operatorName={user.name} />;
      case 'tickets': return <InternalTickets operatorName={user.name} userRole={user.role} />;
      case 'shift-handover': return <ShiftHandover userName={user.name} userRole={user.role} />;
      case 'bola-preta': {
        const uName = user.name?.toUpperCase().trim() || '';
        const defaultBolaPretaAllowed = ['DENY', 'DANIELE', 'IVA', 'MARCIA', 'NILMARY', 'SUELI', 'THIAGO'];
        let isAuthorized = defaultBolaPretaAllowed.includes(uName);
        if (!isAuthorized) {
          try {
            const storedPermissions = localStorage.getItem('risel_operators_menus');
            if (storedPermissions) {
              const permissionsMap = JSON.parse(storedPermissions);
              const opMenus = permissionsMap[uName];
              if (opMenus && Array.isArray(opMenus) && opMenus.includes('bola-preta')) {
                isAuthorized = true;
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
        
        if (isAuthorized) {
          return <BolaPreta userName={user.name} userRole={user.role} />;
        }
        return <div className="p-8 text-center text-red-500 font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-3xl max-w-md mx-auto mt-20">Acesso não autorizado para esta aba.</div>;
      }
      default: return (user.role === 'admin' || user.role === 'quality') ? <Dashboard userRole={user.role} onNavigate={setActiveTab} /> : <EvaluationsTable userRole={user.role} userName={user.name} />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-slate-50 space-y-4">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <h2 className="text-xl font-light tracking-widest text-slate-400">CARREGANDO...</h2>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        userRole={user.role}
        onLogout={handleLogout}
        userName={user.name}
        notificationCounts={{ tickets: openTicketsCount }}
      >
        {error && (
           <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
               <AlertCircle className="shrink-0" />
               <div>
                 <p className="font-bold">Erro de Conexão</p>
                 <p className="text-sm">{error}</p>
               </div>
             </div>
             {user && user.role === 'admin' && (
               <button 
                 onClick={async () => {
                   if (confirm("Deseja restaurar as configurações padrão de IDs e GIDs da Planilha?")) {
                     await resetGoogleSheetConfig();
                   }
                 }}
                 className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:shadow-sm shrink-0 self-start sm:self-auto"
               >
                 <RotateCcw size={16} />
                 <span>Restaurar Padrão</span>
               </button>
             )}
           </div>
        )}
        {renderContent()}
      </Layout>

      {isSettingsOpen && user.role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-0 shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-secondary/10 text-secondary rounded-lg"><Database size={24} /></div>
                 <div><h3 className="text-lg font-bold text-slate-800">Configuração</h3><p className="text-sm text-slate-500">Mapeamento da Planilha Google</p></div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
               <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet size={18} className="text-primary" /> IDs da Planilha</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sheet ID</label>
                            <input type="text" value={sheetConfig.sheetId} onChange={e => setSheetConfig({...sheetConfig, sheetId: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Avaliações</label>
                            <input type="text" value={sheetConfig.gid} onChange={e => setSheetConfig({...sheetConfig, gid: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Motoristas</label>
                            <input type="text" value={sheetConfig.gidDrivers} onChange={e => setSheetConfig({...sheetConfig, gidDrivers: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Operadores</label>
                            <input type="text" value={sheetConfig.gidOperators} onChange={e => setSheetConfig({...sheetConfig, gidOperators: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Portaria (Acesso)</label>
                            <input type="text" value={sheetConfig.gidAccess || ''} onChange={e => setSheetConfig({...sheetConfig, gidAccess: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Chamados Internos</label>
                            <input type="text" value={sheetConfig.gidTickets || ''} onChange={e => setSheetConfig({...sheetConfig, gidTickets: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="ID da Aba Chamados" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Passagem de Plantão</label>
                            <input type="text" value={sheetConfig.gidShiftHandover || ''} onChange={e => setSheetConfig({...sheetConfig, gidShiftHandover: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="ID da Aba Passagem de Plantão" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Análise de Viagem</label>
                            <input type="text" value={sheetConfig.gidBolaPreta || ''} onChange={e => setSheetConfig({...sheetConfig, gidBolaPreta: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="ID da Aba Análise de Viagem" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Macros</label>
                            <input type="text" value={sheetConfig.gidMacros || ''} onChange={e => setSheetConfig({...sheetConfig, gidMacros: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="ID da Aba Macros" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GID: Frota</label>
                            <input type="text" value={sheetConfig.gidFleet || ''} onChange={e => setSheetConfig({...sheetConfig, gidFleet: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="ID da Aba Frota" />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                             <button onClick={handleSaveSheetConfig} className="px-4 py-2 border border-primary text-primary rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-primary hover:text-white transition-all"><Save size={14} /> Atualizar Mapeamento</button>
                         </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Link2 size={18} className="text-secondary" /> Script de Integração</h4>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Web App (Apps Script)</label>
                              <input type="text" value={scriptUrl} onChange={e => setScriptUrl(e.target.value)} className="w-full border rounded-lg p-2 text-sm font-mono" placeholder="https://script.google.com/..." />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-end">
                           <button onClick={handleTestEmail} disabled={isTestingEmail} className="px-4 py-2 bg-secondary/10 border border-secondary/30 text-secondary rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-secondary hover:text-white transition-all">
                              {isTestingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Testar E-mail
                           </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end"><button onClick={() => setIsSettingsOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium">Fechar</button></div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
