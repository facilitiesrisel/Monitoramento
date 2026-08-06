
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, AlertTriangle, Menu, Settings, ClipboardList, LogOut, Shield, Bot, X, ChevronLeft, ChevronRight, Warehouse, Truck, Ticket, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
  userRole: UserRole | null;
  onLogout: () => void;
  userName?: string;
  notificationCounts?: {
      tickets?: number;
  };
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onOpenSettings, userRole, onLogout, userName, notificationCounts }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsCollapsed(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'quality'] },
    { id: 'evaluations', label: 'Avaliações', icon: Truck, roles: ['admin', 'operator', 'quality', 'monitor'] },
    { id: 'evaluator-perf', label: 'Desempenho Op.', icon: ClipboardList, roles: ['admin'] },
    // Removed Priority from standard nav for admin as it moved to Dashboard button
    { id: 'priority', label: 'Prioridade', icon: AlertTriangle, roles: [] }, 
    { id: 'drivers', label: 'Motoristas', icon: Users, roles: ['admin'] },
    { id: 'operators', label: 'Acessos (Ops)', icon: Shield, roles: ['admin'] },
    { id: 'access-control', label: 'Controle de Acesso', icon: Warehouse, roles: ['admin', 'operator'] },
    { id: 'shift-handover', label: 'Passagem de Plantão', icon: ClipboardCheck, roles: ['admin', 'operator'] },
    { id: 'bola-preta', label: 'Análise de Viagem', icon: ShieldAlert, roles: ['admin', 'operator', 'quality', 'monitor'] },
  ];

  const visibleNavItems = allNavItems.filter(item => {
    const uName = userName?.toUpperCase().trim() || '';
    const defaultBolaPretaAllowed = ['DENY', 'DANIELE', 'IVA', 'MARCIA', 'NILMARY', 'SUELI', 'THIAGO'];
    
    try {
      const storedPermissions = localStorage.getItem('risel_operators_menus');
      if (storedPermissions) {
        const permissionsMap = JSON.parse(storedPermissions);
        const opMenus = permissionsMap[uName];
        if (opMenus && Array.isArray(opMenus)) {
          if (item.id === 'bola-preta' && defaultBolaPretaAllowed.includes(uName)) {
            return true;
          }
          // Se o administrador configurou menus específicos para este operador, as permissões mandam!
          return opMenus.includes(item.id);
        }
      }
    } catch (e) {
      console.error("Erro ao ler permissões de menus:", e);
    }

    // Regra da análise de viagem (bola-preta)
    if (item.id === 'bola-preta' && !defaultBolaPretaAllowed.includes(uName)) {
      return false;
    }

    return userRole && item.roles.includes(userRole);
  });

  const getRoleLabel = (role?: UserRole | null) => {
      if (role === 'admin') return 'Administrador';
      if (role === 'quality') return 'Qualidade';
      if (role === 'monitor') return 'Monitoramento';
      return 'Operador';
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-30 backdrop-blur-sm transition-opacity print:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside 
        className={`print:hidden
          fixed lg:relative z-40 h-full bg-gradient-to-b from-emerald-50 via-white to-white border-r border-emerald-100 shadow-xl lg:shadow-none
          transition-all duration-300 ease-in-out flex flex-col shrink-0
          ${isMobile ? (isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64') : (isCollapsed ? 'w-20' : 'w-64')}
          ${isMobile ? 'top-0 left-0' : ''}
        `}
      >
        <div className={`p-4 border-b border-emerald-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 relative`}>
           {!isCollapsed ? (
               <div className="flex items-center gap-3 animate-in fade-in duration-300">
                  <div className="p-1.5 bg-white rounded-lg text-[#00ad74] shadow-sm border border-emerald-200">
                     <Bot size={24} />
                  </div>
                  <div className="overflow-hidden whitespace-nowrap">
                     <h1 className="font-black text-slate-800 leading-none tracking-tight text-xs">SISTEMA <br/><span className="text-[#00ad74] text-sm">MONITORAMENTO</span></h1>
                  </div>
               </div>
           ) : (
               <div className="p-2 bg-white rounded-lg text-[#00ad74] shadow-sm border border-emerald-200 animate-in zoom-in duration-300">
                   <Bot size={24} />
               </div>
           )}
           {!isMobile && (
             <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-emerald-200 rounded-full p-1 text-emerald-400 hover:text-[#00ad74] shadow-sm hover:scale-110 transition-all z-50">
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
             </button>
           )}
           {isMobile && (
             <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-[#00ad74] p-1 transition-colors">
               <X size={20} />
             </button>
           )}
        </div>

        <div className={`py-4 bg-emerald-50 border-b border-emerald-100 transition-all ${isCollapsed ? 'px-2 text-center' : 'px-4'}`}>
            {!isCollapsed ? (
                <>
                    <div className="text-[10px] font-bold text-emerald-600/70 uppercase mb-1">Logado como</div>
                    <div className="font-bold text-slate-700 truncate text-sm">{userName || 'Usuário'}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {getRoleLabel(userRole)}
                    </div>
                </>
            ) : (
                <div className="w-8 h-8 mx-auto bg-[#00ad74]/10 text-[#00ad74] rounded-full flex items-center justify-center font-bold text-xs" title={userName}>
                    {userName?.substring(0, 2).toUpperCase()}
                </div>
            )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {visibleNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group relative
                ${activeTab === item.id 
                  ? 'bg-[#00ad74] text-white shadow-lg shadow-[#00ad74]/20' 
                  : 'text-slate-500 hover:bg-white hover:text-[#00ad74] hover:shadow-sm'}
              `}
            >
              <div className="relative">
                  <item.icon size={18} className={activeTab === item.id ? 'animate-pulse' : 'opacity-70 group-hover:opacity-100'} />
                  {/* Badge Notification for Tickets (Admin Only) */}
                  {item.id === 'tickets' && userRole === 'admin' && notificationCounts && notificationCounts.tickets > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-sm">
                          {notificationCounts.tickets}
                      </span>
                  )}
              </div>
              
              {!isCollapsed && <span>{item.label}</span>}
              
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                    {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-100 space-y-1">
           {userRole === 'admin' && (
             <button onClick={() => { onOpenSettings(); if(isMobile) setIsSidebarOpen(false); }} title={isCollapsed ? "Configurações" : ""} className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-white hover:text-[#00ad74] transition-all`}>
                <Settings size={18} /> {!isCollapsed && "Configurações"}
             </button>
           )}
           <button onClick={onLogout} title={isCollapsed ? "Sair" : ""} className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 transition-all`}>
              <LogOut size={18} /> {!isCollapsed && "Sair"}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-slate-50/50">
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-20 shadow-sm print:hidden">
           <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg active:scale-95 transition-transform">
                <Menu size={24} />
              </button>
              <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                 <Bot size={18} className="text-[#00ad74]" />
                 Monitoramento Risel
              </span>
           </div>
           <div className="w-8 h-8 bg-gradient-to-br from-[#00ad74] to-[#008f61] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {userName?.substring(0, 2).toUpperCase()}
           </div>
        </header>
        {/* Adjusted padding for full width usage */}
        <div className="flex-1 overflow-y-auto p-4 relative scroll-smooth flex flex-col">
           <div className="w-full h-full flex flex-col">
             {children}
           </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
