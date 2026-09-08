
import React, { useEffect, useState, useRef } from 'react';
import { 
  LayoutDashboard, Users, AlertTriangle, Menu, Settings, ClipboardList, 
  LogOut, Shield, Bot, X, ChevronLeft, ChevronRight, Warehouse, Truck, 
  Ticket, ClipboardCheck, ShieldAlert, Car, Grid, MoreHorizontal, Check, User
} from 'lucide-react';
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

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  onOpenSettings, 
  userRole, 
  onLogout, 
  userName, 
  notificationCounts 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const bottomNavScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsCollapsed(false);
      } else {
        setIsSidebarOpen(true);
        setIsBottomSheetOpen(false);
      }
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', desc: 'Indicadores gerais e metas da frota', icon: LayoutDashboard, roles: ['admin', 'quality'] },
    { id: 'evaluations', label: 'Avaliações', shortLabel: 'Avaliações', desc: 'Acompanhamento e registro de avaliações', icon: Truck, roles: ['admin', 'operator', 'quality', 'monitor'] },
    { id: 'evaluator-perf', label: 'Desempenho Op.', shortLabel: 'Desempenho', desc: 'Performance individual dos operadores', icon: ClipboardList, roles: ['admin'] },
    { id: 'priority', label: 'Prioridade', shortLabel: 'Prioridade', desc: 'Acompanhamento prioritário', icon: AlertTriangle, roles: [] }, 
    { id: 'drivers', label: 'Motoristas', shortLabel: 'Motoristas', desc: 'Cadastro e gestão de motoristas', icon: Users, roles: ['admin'] },
    { id: 'operators', label: 'Acessos (Ops)', shortLabel: 'Operadores', desc: 'Gerenciamento de acessos e permissões', icon: Shield, roles: ['admin'] },
    { id: 'access-control', label: 'Controle de Acesso', shortLabel: 'Portaria', desc: 'Controle de portaria e fluxo de veículos', icon: Warehouse, roles: ['admin', 'operator'] },
    { id: 'shift-handover', label: 'Passagem de Plantão', shortLabel: 'Plantão', desc: 'Registro de passagem de turno operacional', icon: ClipboardCheck, roles: ['admin', 'operator'] },
    { id: 'bola-preta', label: 'Análise de Viagem', shortLabel: 'Viagens', desc: 'Auditoria e monitoramento de viagens', icon: ShieldAlert, roles: ['admin', 'operator', 'quality', 'monitor'] },
    { id: 'employee-vehicles', label: 'Veículos Funcionários', shortLabel: 'Veículos', desc: 'Controle de veículos dos colaboradores', icon: Car, roles: ['admin', 'operator', 'quality', 'monitor'] },
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
          return opMenus.includes(item.id);
        }
      }
    } catch (e) {
      console.error("Erro ao ler permissões de menus:", e);
    }

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

  const currentActiveItem = visibleNavItems.find(item => item.id === activeTab) || visibleNavItems[0];
  const ActiveIcon = currentActiveItem?.icon || LayoutDashboard;

  // Auto-scroll do menu ativo na barra inferior
  useEffect(() => {
    if (bottomNavScrollRef.current) {
      const activeEl = bottomNavScrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Desktop / Tablet Sidebar (Hidden on Mobile) */}
      <aside 
        className={`print:hidden hidden lg:flex
          relative z-30 h-full bg-gradient-to-b from-emerald-50 via-white to-white border-r border-emerald-100
          transition-all duration-300 ease-in-out flex-col shrink-0
          ${isCollapsed ? 'w-20' : 'w-64'}
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
           <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-emerald-200 rounded-full p-1 text-emerald-400 hover:text-[#00ad74] shadow-sm hover:scale-110 transition-all z-50">
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
           </button>
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
          {visibleNavItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : ''}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-[#00ad74] text-white shadow-lg shadow-[#00ad74]/25 scale-[1.02]' 
                    : 'text-slate-600 hover:bg-emerald-50/70 hover:text-[#00ad74] hover:shadow-sm'}
                `}
              >
                <div className="relative shrink-0">
                    <item.icon size={19} className={isActive ? 'animate-pulse' : 'opacity-70 group-hover:opacity-100'} />
                    {item.id === 'tickets' && userRole === 'admin' && notificationCounts && notificationCounts.tickets > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-sm">
                            {notificationCounts.tickets}
                        </span>
                    )}
                </div>
                
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1.5 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                      {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-100 space-y-1">
           {userRole === 'admin' && (
             <button onClick={onOpenSettings} title={isCollapsed ? "Configurações" : ""} className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-white hover:text-[#00ad74] transition-all`}>
                <Settings size={18} /> {!isCollapsed && "Configurações"}
             </button>
           )}
           <button onClick={onLogout} title={isCollapsed ? "Sair" : ""} className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all`}>
              <LogOut size={18} /> {!isCollapsed && "Sair"}
           </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-slate-50">
        
        {/* Mobile Top App Bar (Header estilo aplicativo) */}
        <header className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 py-2.5 flex items-center justify-between shrink-0 z-30 shadow-xs print:hidden">
           <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-gradient-to-br from-emerald-50 to-white rounded-lg text-[#00ad74] shadow-xs border border-emerald-200/80 shrink-0">
                 <Bot size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                 <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-800 text-xs tracking-tight uppercase">Risel</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">App</span>
                 </div>
                 {/* Nome da tela ativa no topo */}
                 <div className="flex items-center gap-1 text-[11px] font-bold text-[#00ad74] truncate">
                    <ActiveIcon size={12} className="shrink-0" />
                    <span className="truncate">{currentActiveItem?.label || 'Início'}</span>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-1.5">
              {/* Botão de Todos os Menus / Grid */}
              <button 
                onClick={() => setIsBottomSheetOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200/80 transition-transform active:scale-95"
                title="Ver todos os menus"
              >
                <Grid size={14} className="text-[#00ad74]" />
                <span className="text-[11px]">Menus</span>
              </button>

              {/* Avatar do Usuário */}
              <button 
                onClick={() => setIsBottomSheetOpen(true)}
                className="w-8 h-8 bg-gradient-to-br from-[#00ad74] to-[#008f61] active:opacity-90 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs border border-white transition-transform active:scale-95"
                title={`${userName} (${getRoleLabel(userRole)})`}
              >
                {userName?.substring(0, 2).toUpperCase() || 'US'}
              </button>
           </div>
        </header>

        {/* Content Area with responsive bottom padding for the mobile navigation bar */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28 lg:pb-4 relative scroll-smooth flex flex-col">
           <div className="w-full h-full flex flex-col">
             {children}
           </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Barra Inferior Estilo Aplicativo de Celular) */}
        {/* ========================================================================= */}
        <nav 
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-safe print:hidden"
        >
          <div 
            ref={bottomNavScrollRef}
            className="flex items-center justify-around sm:justify-center sm:gap-2 px-1 py-1.5 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {visibleNavItems.slice(0, visibleNavItems.length > 5 ? 4 : 5).map(item => {
              const isActive = activeTab === item.id;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  data-active={isActive ? 'true' : 'false'}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center min-w-[62px] sm:min-w-[74px] py-1 px-1 rounded-xl transition-all duration-200 relative group active:scale-95
                    ${isActive ? 'text-[#00ad74]' : 'text-slate-500 hover:text-slate-800'}
                  `}
                >
                  {/* Indicador luminoso superior no item ativo */}
                  {isActive && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#00ad74] rounded-full shadow-sm shadow-[#00ad74]/50 animate-in fade-in duration-200" />
                  )}

                  {/* Cápsula do Ícone */}
                  <div className={`p-1.5 rounded-xl transition-all duration-200 relative
                    ${isActive 
                      ? 'bg-[#00ad74] text-white shadow-md shadow-[#00ad74]/30 scale-105' 
                      : 'text-slate-500 group-active:bg-slate-100'}
                  `}>
                    <IconComponent size={20} className={isActive ? 'animate-in zoom-in-50 duration-200' : ''} />
                    {item.id === 'tickets' && userRole === 'admin' && notificationCounts && notificationCounts.tickets > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white shadow-xs">
                        {notificationCounts.tickets}
                      </span>
                    )}
                  </div>

                  {/* Rótulo / Label */}
                  <span className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap transition-all duration-200
                    ${isActive ? 'font-extrabold text-[#00ad74]' : 'font-semibold text-slate-500'}
                  `}>
                    {item.shortLabel || item.label}
                  </span>
                </button>
              );
            })}

            {/* Botão "Mais" se houver mais de 5 itens */}
            {visibleNavItems.length > 5 && (() => {
              const isMoreActive = visibleNavItems.slice(4).some(i => i.id === activeTab);
              return (
                <button
                  data-active={isMoreActive ? 'true' : 'false'}
                  onClick={() => setIsBottomSheetOpen(true)}
                  className={`flex flex-col items-center justify-center min-w-[62px] sm:min-w-[74px] py-1 px-1 rounded-xl transition-all duration-200 relative group active:scale-95
                    ${isMoreActive ? 'text-[#00ad74]' : 'text-slate-500 hover:text-slate-800'}
                  `}
                >
                  {isMoreActive && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#00ad74] rounded-full shadow-sm shadow-[#00ad74]/50 animate-in fade-in duration-200" />
                  )}

                  <div className={`p-1.5 rounded-xl transition-all duration-200 relative
                    ${isMoreActive 
                      ? 'bg-[#00ad74] text-white shadow-md shadow-[#00ad74]/30 scale-105' 
                      : 'text-slate-500 group-active:bg-slate-100'}
                  `}>
                    <MoreHorizontal size={20} />
                    {isMoreActive && (
                      <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white rounded-full w-2 h-2 border border-white" />
                    )}
                  </div>

                  <span className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap transition-all duration-200
                    ${isMoreActive ? 'font-extrabold text-[#00ad74]' : 'font-semibold text-slate-500'}
                  `}>
                    {isMoreActive ? (currentActiveItem?.shortLabel || 'Mais') : 'Mais'}
                  </span>
                </button>
              );
            })()}
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* BOTTOM SHEET / GAVETA INFERIOR MOBILE COM TODOS OS MENUS E DETALHES      */}
        {/* ========================================================================= */}
        {isBottomSheetOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop com desfoque */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsBottomSheetOpen(false)}
            />

            {/* Painel da folha inferior deslizando */}
            <div className="relative z-10 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 pb-safe">
              
              {/* Barra de puxar estilo iOS/Android */}
              <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setIsBottomSheetOpen(false)}>
                <div className="w-12 h-1.5 bg-slate-300 rounded-full hover:bg-slate-400 transition-colors" />
              </div>

              {/* Cabeçalho do Menu Mobile com Perfil */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#00ad74] to-[#008f61] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {userName?.substring(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>{userName || 'Usuário'}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                        {getRoleLabel(userRole)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Navegue pelas funções do sistema</div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsBottomSheetOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Lista completa de menus em grade touch-friendly */}
              <div className="overflow-y-auto p-4 space-y-2 max-h-[55vh]">
                <div className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider px-1 mb-1">
                  Módulos e Menus Disponíveis
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {visibleNavItems.map(item => {
                    const isActive = activeTab === item.id;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsBottomSheetOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98]
                          ${isActive 
                            ? 'bg-emerald-50/90 border-[#00ad74] shadow-sm' 
                            : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50/80'}
                        `}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`p-2.5 rounded-xl shrink-0 transition-colors
                            ${isActive ? 'bg-[#00ad74] text-white shadow-sm shadow-[#00ad74]/30' : 'bg-slate-100 text-slate-600'}
                          `}>
                            <IconComp size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold truncate ${isActive ? 'text-emerald-900 font-extrabold' : 'text-slate-800'}`}>
                                {item.label}
                              </span>
                              {isActive && (
                                <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.desc || 'Acessar módulo'}
                            </p>
                          </div>
                        </div>

                        {isActive && (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 ml-2">
                            <Check size={14} className="stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé com Ações de Configurações e Logout */}
              <div className="p-4 bg-slate-50 border-t border-slate-200/80 grid grid-cols-2 gap-2">
                {userRole === 'admin' ? (
                  <button 
                    onClick={() => {
                      onOpenSettings();
                      setIsBottomSheetOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 active:bg-slate-100 transition-colors shadow-2xs"
                  >
                    <Settings size={16} className="text-slate-500" />
                    <span>Configurações</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-xs text-slate-400 font-medium">
                    <User size={14} />
                    <span>Acesso Autorizado</span>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setIsBottomSheetOpen(false);
                    onLogout();
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs active:scale-95 transition-all"
                >
                  <LogOut size={16} />
                  <span>Sair da Conta</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Layout;

