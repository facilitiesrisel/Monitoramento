import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Car, 
  Bike, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Phone, 
  MessageCircle, 
  Clock, 
  Building2, 
  Hash, 
  Palette, 
  X, 
  Sparkles, 
  ChevronRight,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Edit3,
  Trash2,
  Radio,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EmployeeVehicle, UserRole } from '../types';
import { 
  loadEmployeeVehicles, 
  getEmployeeVehicles, 
  saveEmployeeVehicle,
  deleteEmployeeVehicle,
  DEFAULT_FORM_URL_EMPLOYEE_VEHICLES,
  getGoogleSheetConfig 
} from '../services/dataService';
import { 
  MercosulPlateBadge, 
  ColorPill, 
  toTitleCase, 
  formatMercosulPlate 
} from './EmployeeVehicleHelpers';
import { VehicleEditModal } from './VehicleEditModal';

interface EmployeeVehiclesProps {
  userRole?: UserRole | null;
  userName?: string;
}

type SortField = 'employeeName' | 'type' | 'plate' | 'brand' | 'model' | 'color' | 'department' | 'entryTime' | 'timestamp';
type SortDirection = 'asc' | 'desc';

export const EmployeeVehicles: React.FC<EmployeeVehiclesProps> = ({ userRole, userName }) => {
  const [vehicles, setVehicles] = useState<EmployeeVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('employeeName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Modais de Visualização e Edição
  const [selectedVehicleModal, setSelectedVehicleModal] = useState<EmployeeVehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<EmployeeVehicle | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formUrl = getGoogleSheetConfig().formUrlEmployeeVehicles || DEFAULT_FORM_URL_EMPLOYEE_VEHICLES;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchVehicles = async (cacheBust = true, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await loadEmployeeVehicles(cacheBust);
      setVehicles(data);
      setLastSyncTime(new Date());
    } catch (e) {
      console.error('Erro ao carregar veículos:', e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregamento inicial
  useEffect(() => {
    fetchVehicles(true);
  }, []);

  // Polling em background para manter a lista sempre atualizada com a planilha
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      // Atualiza silenciosamente em background a cada 15 segundos
      fetchVehicles(true, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [autoSync]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles(true, false);
    showToast('Dados sincronizados com sucesso!');
  };

  // Tratamento de telefones e WhatsApp
  const parsePhoneNumbers = (phoneStr: string) => {
    if (!phoneStr) return [];
    const rawParts = phoneStr.split(/[/,;\n]| e /i).map(p => p.trim()).filter(Boolean);
    
    return rawParts.map(part => {
      const digits = part.replace(/\D/g, '');
      let fullNumber = digits;
      if (digits.length === 10 || digits.length === 11) {
        fullNumber = `55${digits}`;
      } else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        fullNumber = digits;
      }
      return {
        raw: part,
        digits: fullNumber,
        isValid: fullNumber.length >= 10
      };
    });
  };

  const getWhatsAppLink = (vehicle: EmployeeVehicle, targetPhone?: string) => {
    const phones = parsePhoneNumbers(targetPhone || vehicle.phone);
    if (phones.length === 0 || !phones[0].isValid) return null;
    
    const phoneNumber = phones[0].digits;
    const firstName = toTitleCase(vehicle.employeeName.split(' ')[0]) || 'Colaborador';
    const tipoTxt = vehicle.type === 'MOTO' ? 'sua moto' : 'seu carro';
    const marcaModelo = `${toTitleCase(vehicle.brand) ? toTitleCase(vehicle.brand) + ' ' : ''}${toTitleCase(vehicle.model)}`.trim();
    const placaTxt = vehicle.plate ? ` (Placa: ${formatMercosulPlate(vehicle.plate)})` : '';
    
    const text = `Olá ${firstName}, tudo bem? Sou da equipe Risel e estou entrando em contato sobre ${tipoTxt} ${marcaModelo}${placaTxt}.`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
  };

  // Opções únicas para filtros em Title Case
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v.department && v.department.trim()) {
        set.add(toTitleCase(v.department.trim()));
      }
    });
    return Array.from(set).sort();
  }, [vehicles]);

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v.brand && v.brand.trim()) {
        set.add(toTitleCase(v.brand.trim()));
      }
    });
    return Array.from(set).sort();
  }, [vehicles]);

  // Identificação de Placas Duplicadas
  const duplicatePlates = useMemo(() => {
    const counts: { [plate: string]: number } = {};
    vehicles.forEach(v => {
      const clean = (v.plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (clean) {
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });
    const dupes = new Set<string>();
    Object.entries(counts).forEach(([plate, count]) => {
      if (count > 1) {
        dupes.add(plate);
      }
    });
    return dupes;
  }, [vehicles]);

  // Filtragem e Ordenação
  const filteredVehicles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return vehicles.filter(v => {
      if (term) {
        const matchesName = (v.employeeName || '').toLowerCase().includes(term);
        const matchesPlate = (v.plate || '').toLowerCase().includes(term);
        const matchesModel = (v.model || '').toLowerCase().includes(term);
        const matchesBrand = (v.brand || '').toLowerCase().includes(term);
        const matchesColor = (v.color || '').toLowerCase().includes(term);
        const matchesDept = (v.department || '').toLowerCase().includes(term);
        const matchesExt = (v.extension || '').toLowerCase().includes(term);
        const matchesPhone = (v.phone || '').toLowerCase().includes(term);

        if (!matchesName && !matchesPlate && !matchesModel && !matchesBrand && !matchesColor && !matchesDept && !matchesExt && !matchesPhone) {
          return false;
        }
      }

      if (selectedType !== 'ALL') {
        if (selectedType === 'CARRO' && v.type !== 'CARRO') return false;
        if (selectedType === 'MOTO' && v.type !== 'MOTO') return false;
      }

      if (selectedDept !== 'ALL') {
        if (toTitleCase(v.department) !== selectedDept) return false;
      }

      if (selectedBrand !== 'ALL') {
        if (toTitleCase(v.brand) !== selectedBrand) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'timestamp') {
        valA = valA.toString();
        valB = valB.toString();
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [vehicles, searchTerm, selectedType, selectedDept, selectedBrand, sortField, sortDirection]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = vehicles.length;
    const carros = vehicles.filter(v => v.type === 'CARRO').length;
    const motos = vehicles.filter(v => v.type === 'MOTO').length;
    const setoresCount = new Set(vehicles.map(v => toTitleCase(v.department)).filter(Boolean)).size;

    return { total, carros, motos, setoresCount };
  }, [vehicles]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedDept('ALL');
    setSelectedBrand('ALL');
  };

  // Salvar Edição na Planilha e no Estado Local
  const handleSaveVehicle = async (updatedVehicle: EmployeeVehicle): Promise<boolean> => {
    const success = await saveEmployeeVehicle(updatedVehicle, false);
    if (success) {
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
      showToast(`Veículo de ${toTitleCase(updatedVehicle.employeeName)} salvo com sucesso na Planilha!`);
    } else {
      // Se falhar o backend, mantém na memória para feedback
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
      showToast('Dados salvos na memória local. Verifique sua conexão com o Apps Script.');
    }
    return true;
  };

  // Excluir Veículo
  const handleDeleteVehicle = async (veh: EmployeeVehicle): Promise<boolean> => {
    const success = await deleteEmployeeVehicle(veh);
    setVehicles(prev => prev.filter(v => v.id !== veh.id));
    if (success) {
      showToast(`Registro de ${toTitleCase(veh.employeeName)} removido da Planilha Google.`);
    }
    return true;
  };

  const handleExportXLSX = () => {
    const dataToExport = filteredVehicles.map(v => ({
      'Carimbo de Data/Hora': v.timestamp,
      'Nome Completo': toTitleCase(v.employeeName),
      'Telefone': v.phone,
      'Ramal': v.extension || 'N/A',
      'Setor': toTitleCase(v.department),
      'Horário Entrada': v.entryTime,
      'Horário Saída': v.exitTime,
      'Tipo de Veículo': v.type === 'MOTO' ? 'Moto' : 'Carro',
      'Marca': toTitleCase(v.brand),
      'Modelo': toTitleCase(v.model),
      'Cor': toTitleCase(v.color),
      'Placa': formatMercosulPlate(v.plate)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Veiculos_Funcionarios');
    XLSX.writeFile(workbook, `Veiculos_Funcionarios_Risel_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} className="opacity-40 group-hover:opacity-100 transition-opacity ml-1 inline shrink-0" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-white ml-1 inline font-black shrink-0" />
      : <ArrowDown size={14} className="text-white ml-1 inline font-black shrink-0" />;
  };

  const canEdit = userRole === 'admin' || userRole === 'operator' || userRole === 'quality' || userRole === 'monitor';
  const canDelete = userRole === 'admin';

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-8">
      {/* TOAST FLUTUANTE DE SUCESSO */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={20} className="text-[#00ad74] shrink-0" />
          <span className="text-xs md:text-sm font-bold tracking-tight">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ÁREA SUPERIOR FIXA / CONGELADA (STICKY TOP HEADER CONTAINER) */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-2 pb-3 space-y-4 shadow-xs">
        {/* CABEÇALHO DA PÁGINA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-[#00ad74] to-emerald-700 text-white rounded-2xl shadow-md shadow-[#00ad74]/20 shrink-0">
              <Car size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight font-aptos-narrow">
                  Veículos dos Funcionários
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {vehicles.length} cadastrados
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  <Radio size={12} className={autoSync ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
                  {autoSync ? 'Auto-Sincronizado' : 'Manual'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5 font-aptos-narrow">
                Identificação veicular Mercosul, controle e edição em tempo real com a Planilha Google
              </p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO DO TOPO */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              title="Atualizar dados diretamente da Planilha Google"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-[#00ad74]' : ''} />
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>

            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${
                autoSync 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Alternar sincronização automática a cada 15 segundos"
            >
              <Radio size={14} className={autoSync ? 'text-emerald-600' : 'text-slate-400'} />
              <span className="hidden sm:inline">Auto-Sync</span>
            </button>

            <button
              onClick={handleExportXLSX}
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm"
              title="Exportar para Excel (XLSX)"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm"
              title="Imprimir lista de veículos"
            >
              <Printer size={15} />
            </button>

            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-[#00ad74] to-[#008f61] hover:from-[#009b68] hover:to-[#007d54] text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-[#00ad74]/25 transition-all active:scale-95"
              title="Cadastrar novo veículo pelo formulário Google"
            >
              <span>Novo Cadastro</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* CARDS DE INDICADORES (KPIS) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
              <Layers size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Cadastrado</div>
              <div className="text-xl font-black text-slate-800">{stats.total}</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3 bg-gradient-to-br from-white to-emerald-50/50">
            <div className="p-2.5 bg-emerald-100 text-[#00ad74] rounded-xl">
              <Car size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Carros</div>
              <div className="text-xl font-black text-emerald-900">{stats.carros}</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3 bg-gradient-to-br from-white to-amber-50/50">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Bike size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Motos</div>
              <div className="text-xl font-black text-amber-900">{stats.motos}</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-teal-700">Setores / Áreas</div>
              <div className="text-xl font-black text-teal-900">{stats.setoresCount}</div>
            </div>
          </div>
        </div>

        {/* BARRA DE PESQUISA E FILTROS RÁPIDOS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            {/* Campo de Busca Geral */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Buscar colaborador, placa Mercosul, modelo, setor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none transition-all font-aptos-narrow"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtro por Tipo de Veículo */}
            <div className="lg:col-span-3">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 font-aptos-narrow">
                <button
                  onClick={() => setSelectedType('ALL')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                    selectedType === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todos ({vehicles.length})
                </button>
                <button
                  onClick={() => setSelectedType('CARRO')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    selectedType === 'CARRO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Car size={13} />
                  Carros ({stats.carros})
                </button>
                <button
                  onClick={() => setSelectedType('MOTO')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    selectedType === 'MOTO' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Bike size={13} />
                  Motos ({stats.motos})
                </button>
              </div>
            </div>

            {/* Filtro por Setor */}
            <div className="lg:col-span-3">
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-semibold text-slate-700 outline-none focus:border-[#00ad74] focus:bg-white font-aptos-narrow"
              >
                <option value="ALL">🏢 Todos os Setores</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Marca / Limpar */}
            <div className="lg:col-span-2 flex items-center gap-2">
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-semibold text-slate-700 outline-none focus:border-[#00ad74] focus:bg-white font-aptos-narrow"
              >
                <option value="ALL">🚘 Todas as Marcas</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>

              {(searchTerm || selectedType !== 'ALL' || selectedDept !== 'ALL' || selectedBrand !== 'ALL') && (
                <button
                  onClick={clearFilters}
                  className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all shrink-0"
                  title="Limpar todos os filtros"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Resumo de Registros */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1 font-aptos-narrow">
            <span>
              Exibindo <strong>{filteredVehicles.length}</strong> de <strong>{vehicles.length}</strong> veículos encontrados
            </span>
            <span className="text-[11px] text-slate-400">
              Última sincronização: {lastSyncTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* BANNER DE ALERTA DE PLACAS DUPLICADAS */}
      {duplicatePlates.size > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl font-bold shrink-0">
              ⚠️
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-black text-rose-900 tracking-tight font-aptos-narrow">
                Atenção: Placas Repetidas Detectadas ({duplicatePlates.size})
              </h4>
              <p className="text-xs text-rose-700 font-medium font-aptos-narrow">
                Foram encontradas placas cadastradas em duplicidade nas planilhas integradas (Google Sheets e SharePoint Excel). Verifique os registros destacados abaixo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TABELA DE VEÍCULOS COM CABEÇALHO CONGELADO / STICKY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-[#00ad74] rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-500 tracking-wide font-aptos-narrow">Carregando lista de veículos dos funcionários...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Car size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-700 font-aptos-narrow">Nenhum veículo encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-aptos-narrow">
              Não encontramos nenhum registro com os filtros atuais. Tente buscar por outros termos ou cadastre novos veículos.
            </p>
            <button
              onClick={clearFilters}
              className="mt-2 px-4 py-2 bg-emerald-50 text-[#00ad74] border border-emerald-200 rounded-xl text-xs font-bold hover:bg-[#00ad74] hover:text-white transition-all font-aptos-narrow"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-340px)] min-h-[400px]">
            <table className="w-full text-left border-collapse text-sm font-aptos-narrow">
              {/* CABEÇALHO VERDE GRADIENTE CONGELADO (STICKY HEADER) */}
              <thead className="sticky top-0 z-20 shadow-md">
                <tr className="bg-gradient-to-r from-emerald-800 via-[#00ad74] to-teal-800 text-white font-extrabold text-[11px] uppercase tracking-wider select-none">
                  <th 
                    onClick={() => handleSort('employeeName')} 
                    className="py-3 px-4 cursor-pointer hover:bg-white/10 transition-colors group sticky top-0 bg-emerald-800/95 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-1">
                      <span>Colaborador</span>
                      {renderSortIndicator('employeeName')}
                    </div>
                  </th>
                  
                  <th 
                    onClick={() => handleSort('type')} 
                    className="py-3 px-3 cursor-pointer hover:bg-white/10 transition-colors group text-center sticky top-0 bg-emerald-800/95 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Tipo</span>
                      {renderSortIndicator('type')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('plate')} 
                    className="py-3 px-3 cursor-pointer hover:bg-white/10 transition-colors group sticky top-0 bg-[#00ad74]/95 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-1">
                      <span>Placa Mercosul</span>
                      {renderSortIndicator('plate')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('brand')} 
                    className="py-3 px-4 cursor-pointer hover:bg-white/10 transition-colors group sticky top-0 bg-[#00ad74]/95 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-1">
                      <span>Marca / Modelo</span>
                      {renderSortIndicator('brand')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('color')} 
                    className="py-3 px-3 cursor-pointer hover:bg-white/10 transition-colors group sticky top-0 bg-[#00ad74]/95 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-1">
                      <span>Cor</span>
                      {renderSortIndicator('color')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('department')} 
                    className="py-3 px-3 cursor-pointer hover:bg-white/10 transition-colors group sticky top-0 bg-teal-800/95 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-1">
                      <span>Setor / Depto</span>
                      {renderSortIndicator('department')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('entryTime')} 
                    className="py-3 px-3 cursor-pointer hover:bg-white/10 transition-colors group text-center sticky top-0 bg-teal-800/95 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Horários (Entr/Saí)</span>
                      {renderSortIndicator('entryTime')}
                    </div>
                  </th>

                  <th className="py-3 px-4 text-center sticky top-0 bg-teal-800/95 backdrop-blur-md">
                    <span>WhatsApp</span>
                  </th>

                  <th className="py-3 px-3 text-center sticky top-0 bg-teal-800/95 backdrop-blur-md">
                    <span>Ações</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-aptos-narrow">
                {filteredVehicles.map((vehicle, idx) => {
                  const isCar = vehicle.type === 'CARRO';
                  const phones = parsePhoneNumbers(vehicle.phone);
                  const whatsAppLink = getWhatsAppLink(vehicle);
                  const formattedName = toTitleCase(vehicle.employeeName);
                  const formattedBrand = toTitleCase(vehicle.brand);
                  const formattedModel = toTitleCase(vehicle.model);
                  const formattedDept = toTitleCase(vehicle.department);

                  return (
                    <tr 
                      key={vehicle.id} 
                      className={`hover:bg-emerald-50/50 transition-colors duration-150 group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* NOME DO COLABORADOR (FORMATO TÍTULO) */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                            {formattedName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {formattedName}
                            </div>
                            {vehicle.extension && (
                              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                                <Hash size={11} /> Ramal: {vehicle.extension}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* TIPO DE VEÍCULO */}
                      <td className="py-3 px-3 text-center">
                        {isCar ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <Car size={14} className="text-[#00ad74]" />
                            <span>Carro</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                            <Bike size={14} className="text-amber-600" />
                            <span>Moto</span>
                          </span>
                        )}
                      </td>

                      {/* PLACA NO PADRÃO MERCOSUL PERSONALIZADO */}
                      <td className="py-3 px-3">
                        <MercosulPlateBadge plate={vehicle.plate} />
                        {duplicatePlates.has((vehicle.plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()) && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-black tracking-tighter border border-rose-300 animate-pulse shadow-2xs" title="Placa duplicada detectada no sistema!">
                              ⚠️ Placa Repetida
                            </span>
                          </div>
                        )}

                      </td>

                      {/* MARCA E MODELO (FORMATO TÍTULO) */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-sm">
                          {formattedModel || 'Modelo não inf.'}
                        </div>
                        <div className="text-xs text-slate-400 font-semibold">
                          {formattedBrand || 'Marca não inf.'}
                        </div>
                      </td>

                      {/* COR COM FUNDO GRADIENTE DA COR INFORMADA */}
                      <td className="py-3 px-3">
                        <ColorPill colorName={vehicle.color} />
                      </td>

                      {/* SETOR / DEPARTAMENTO (FORMATO TÍTULO) */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-emerald-50/80 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <Building2 size={12} className="text-[#00ad74] shrink-0" />
                          <span>{formattedDept || 'N/A'}</span>
                        </span>
                      </td>

                      {/* HORÁRIOS HABITUAIS */}
                      <td className="py-3 px-3 text-center font-mono text-xs text-slate-600">
                        {vehicle.entryTime || vehicle.exitTime ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-[11px] text-slate-700">
                            <Clock size={11} className="text-slate-400" />
                            <span>{vehicle.entryTime ? vehicle.entryTime.substring(0, 5) : '--:--'}</span>
                            <span className="text-slate-400">às</span>
                            <span>{vehicle.exitTime ? vehicle.exitTime.substring(0, 5) : '--:--'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* CONTATO WHATSAPP */}
                      <td className="py-3 px-4 text-center">
                        {phones.length > 0 && phones[0].isValid ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={whatsAppLink || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white px-3 py-1 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95"
                              title={`Enviar WhatsApp para ${formattedName} (${phones[0].raw})`}
                            >
                              <MessageCircle size={14} className="fill-white" />
                              <span className="hidden xl:inline">WhatsApp</span>
                            </a>

                            {phones.length > 1 && phones[1].isValid && (
                              <a
                                href={getWhatsAppLink(vehicle, phones[1].raw) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded-xl font-bold text-[11px] transition-all"
                                title={`WhatsApp (2º Número): ${phones[1].raw}`}
                              >
                                <span>2º</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem contato</span>
                        )}
                      </td>

                      {/* AÇÕES: VER E EDITAR */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedVehicleModal(vehicle)}
                            className="p-1.5 text-slate-400 hover:text-[#00ad74] hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-2xs"
                            title="Ver ficha completa"
                          >
                            <Eye size={16} />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => setEditingVehicle(vehicle)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-200 shadow-2xs"
                              title="Editar dados do veículo na planilha"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DO VEÍCULO / COLABORADOR */}
      {selectedVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-emerald-800 via-[#00ad74] to-teal-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
                  {selectedVehicleModal.type === 'MOTO' ? <Bike size={24} /> : <Car size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight font-aptos-narrow">Ficha do Veículo</h3>
                  <p className="text-xs text-emerald-100 font-aptos-narrow">Dados do colaborador e identificação veicular</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVehicleModal(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 font-aptos-narrow">
              {/* Placa Mercosul e Tipo */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <MercosulPlateBadge plate={selectedVehicleModal.plate} />
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    selectedVehicleModal.type === 'MOTO' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {selectedVehicleModal.type === 'MOTO' ? 'MOTO' : 'CARRO'}
                  </span>
                  <ColorPill colorName={selectedVehicleModal.color} />
                </div>
              </div>

              {/* Informações do Colaborador */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#00ad74]" /> Colaborador
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Nome Completo</div>
                    <div className="text-base font-black text-slate-800">{toTitleCase(selectedVehicleModal.employeeName)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Setor / Departamento</div>
                      <div className="text-sm font-bold text-emerald-800">{toTitleCase(selectedVehicleModal.department) || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Ramal Interno</div>
                      <div className="text-sm font-bold text-slate-700">{selectedVehicleModal.extension || 'Não possui'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações do Veículo */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Car size={14} className="text-[#00ad74]" /> Detalhes do Veículo
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Marca</div>
                    <div className="text-sm font-bold text-slate-800">{toTitleCase(selectedVehicleModal.brand) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Modelo</div>
                    <div className="text-sm font-bold text-slate-800">{toTitleCase(selectedVehicleModal.model) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Cor</div>
                    <div className="text-sm font-bold text-slate-800">{toTitleCase(selectedVehicleModal.color) || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Horários Habituais */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-[#00ad74]" /> Horários Habituais
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Entrada Habitual</div>
                    <div className="text-sm font-bold text-slate-800">{selectedVehicleModal.entryTime || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Saída Habitual</div>
                    <div className="text-sm font-bold text-slate-800">{selectedVehicleModal.exitTime || 'Não informado'}</div>
                  </div>
                </div>
              </div>

              {/* Contatos com Atalhos WhatsApp */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Phone size={14} className="text-[#00ad74]" /> Canais de Contato
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Telefone Cadastrado</div>
                      <div className="text-sm font-bold text-slate-800">{selectedVehicleModal.phone || 'Não informado'}</div>
                    </div>
                    {selectedVehicleModal.phone && (
                      <button
                        onClick={() => copyToClipboard(selectedVehicleModal.phone, 'phone')}
                        className="text-xs font-bold text-slate-500 hover:text-[#00ad74] px-2.5 py-1 bg-white border border-slate-200 rounded-lg transition-all"
                      >
                        {copiedId === 'phone' ? 'Copiado!' : 'Copiar'}
                      </button>
                    )}
                  </div>

                  {parsePhoneNumbers(selectedVehicleModal.phone).length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-2">
                      {parsePhoneNumbers(selectedVehicleModal.phone).map((p, idx) => (
                        <a
                          key={idx}
                          href={getWhatsAppLink(selectedVehicleModal, p.raw) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#25D366]/20 transition-all active:scale-98"
                        >
                          <MessageCircle size={17} className="fill-white" />
                          <span>Enviar Mensagem no WhatsApp ({p.raw})</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedVehicleModal.timestamp && (
                <div className="text-[11px] text-slate-400 text-center font-medium">
                  Cadastrado na planilha em: {selectedVehicleModal.timestamp}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              {canEdit && (
                <button
                  onClick={() => {
                    const v = selectedVehicleModal;
                    setSelectedVehicleModal(null);
                    setEditingVehicle(v);
                  }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all"
                >
                  <Edit3 size={15} />
                  <span>Editar Dados</span>
                </button>
              )}
              <button
                onClick={() => setSelectedVehicleModal(null)}
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-all ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DIRETA NO SISTEMA E NA PLANILHA */}
      {editingVehicle && (
        <VehicleEditModal
          vehicle={editingVehicle}
          isOpen={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSave={handleSaveVehicle}
          onDelete={handleDeleteVehicle}
          canDelete={canDelete}
        />
      )}
    </div>
  );
};

export default EmployeeVehicles;
