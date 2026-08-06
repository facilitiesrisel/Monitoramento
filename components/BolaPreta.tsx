
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getBolaPretaRecords, getManagedDrivers, deleteBolaPretaRecord, updateBolaPretaRecord, uploadMacrosAndSync, getFleetData, loadData, resendBolaPretaEmail } from '../services/dataService';
import { BolaPreta, UserRole } from '../types';
import { 
    Search, AlertCircle, CheckCircle, Filter, ChevronUp, ChevronDown, 
    AlertTriangle, PlusCircle, 
    Truck, Pencil, Trash2, Eye, FileText,
    CheckSquare, Clock, ShieldAlert, Upload, Mail, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import BolaPretaForm from './BolaPretaForm';
import FleetStatusModal from './FleetStatusModal';
import { BolaPretaIndicators } from './BolaPretaIndicators';
import { TravelReportView } from './TravelReportView';
import { BolaPretaTutorial } from './BolaPretaTutorial';

interface BolaPretaProps {
  userRole?: UserRole;
  userName?: string;
}

const BolaPretaComponent: React.FC<BolaPretaProps> = ({ userRole, userName }) => {
  const [records, setRecords] = useState<BolaPreta[]>([]);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BolaPreta | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportRecord, setReportRecord] = useState<BolaPreta | null>(null);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [preFilledFleet, setPreFilledFleet] = useState<{ vehicle: string, plate: string, base: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showIndicators, setShowIndicators] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [isResendingId, setIsResendingId] = useState<string | null>(null);

  const handleResendEmail = async (r: BolaPreta) => {
    const customEmail = prompt(`Reenviar e-mail de Análise de Viagem de ${r.driver}?\n\nInforme o e-mail de destino (ou deixe em branco para enviar aos destinatários padrão):`, "deny.goncalves@risel.com.br");
    if (customEmail === null) return;

    setIsResendingId(r.id);
    try {
        await resendBolaPretaEmail(r, customEmail.trim() || undefined);
        alert("E-mail de Análise de Viagem reenviado com sucesso!");
    } catch (e: any) {
        alert("Erro ao reenviar e-mail: " + (e?.message || e));
    } finally {
        setIsResendingId(null);
    }
  };
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterMonth, setFilterMonth] = useState<number | string>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setRecords(getBolaPretaRecords());
  }, [lastUpdate]);

  useEffect(() => {
    let active = true;

    const refreshData = async () => {
      try {
        await loadData(true);
        if (active) {
          setRecords(getBolaPretaRecords());
        }
      } catch (e) {
        console.error("Erro ao sincronizar dados do Bola Preta:", e);
      }
    };

    // Primeiro disparo silencioso em background
    refreshData();

    const interval = setInterval(refreshData, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        let json: any[][] = [];
        
        if (file.name.toLowerCase().endsWith('.csv')) {
            const text = await file.text();
            const lines = text.split(/\r?\n/);
            const firstLine = lines.find(l => l.trim().length > 0) || '';
            const delimiter = firstLine.includes(';') ? ';' : ',';
            
            json = lines.map(line => {
                if (!line.includes('"')) {
                    return line.split(delimiter).map(s => s.trim());
                }
                const row = [];
                let inQuotes = false;
                let currentWord = '';
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === delimiter && !inQuotes) {
                        row.push(currentWord.trim());
                        currentWord = '';
                    } else {
                        currentWord += char;
                    }
                }
                row.push(currentWord.trim());
                return row;
            });
        } else {
            const data = await file.arrayBuffer();
            // Não usar cellDates: true para evitar que CSVs se percam no meio da conversão (American x Brazilian locale)
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        }
        
        let headerIndex = -1;
        let headerRow: string[] = [];
        for (let i = 0; i < json.length; i++) {
           if (json[i].length > 5 && json[i].join('').length > 15) {
               headerIndex = i;
               headerRow = json[i].map(h => String(h || '').toUpperCase().trim());
               break;
           }
        }
        
        if (headerIndex === -1) {
            alert('Não foi possível encontrar o cabeçalho na planilha anexada.');
            setIsUploading(false);
            return;
        }

        const colMap = {
            login: headerRow.findIndex(h => h === 'LOGIN'),
            nome: headerRow.findIndex(h => h.includes('NOME') || h.includes('MOTORISTA')),
            dataInicio: headerRow.findIndex(h => h.includes('INICIO') || h.includes('INÍCIO')),
            horaInicio: headerRow.findIndex(h => h === 'HORA INICIO' || h === 'HORA INÍCIO' || h.includes('HORA I')),
            dataFim: headerRow.findIndex(h => h.includes('FIM') && !h.includes('HORA')),
            horaFim: headerRow.findIndex(h => h === 'HORA FIM' || h.includes('HORA F')),
            placa: headerRow.findIndex(h => h.includes('PLACA') || h.includes('VEICULO') || h.includes('VEÍCULO')),
            nomeMacro: headerRow.findIndex(h => h.includes('NOMEMACRO') || h.includes('NOME MACRO') || h.includes('MACRO') || h.includes('MENSAGEM')),
            tipoMacro: headerRow.findIndex(h => h.includes('TIPOMACRO') || h.includes('TIPO MACRO') || h === 'TIPO'),
            referencia: headerRow.findIndex(h => h.includes('REFERÊNCIA') || h.includes('REFERENCIA') || h.includes('LOCAL') || h.includes('PONTO')),
            duracao: headerRow.findIndex(h => h.includes('DURAÇÃO') || h.includes('DURACAO') || h.includes('TEMPO')),
            km: headerRow.findIndex(h => h === 'KM' || h === 'QUILOMETRAGEM' || h.includes('DIST'))
        };
        
        const rawRows = json.slice(headerIndex + 1).filter(r => r.length > 5 && r.join('').trim().length > 0);
        
        // Função auxiliar para forçar data/hora do excel a virar o formato visual brasileiro
        const parseExcelDate = (val: any): { d: string, t: string } => {
            if (!val) return { d: '', t: '' };
            if (val instanceof Date) {
               const dd = val.getUTCDate().toString().padStart(2, '0');
               const mm = (val.getUTCMonth() + 1).toString().padStart(2, '0');
               const yyyy = val.getUTCFullYear();
               const H = val.getUTCHours().toString().padStart(2, '0');
               const M = val.getUTCMinutes().toString().padStart(2, '0');
               const S = val.getUTCSeconds().toString().padStart(2, '0');
               
               // Quando a string vem sem hora preenchida (00:00:00), consideramos só a data (porém duracao também usa Date as vezes)
               return {
                  d: `${dd}/${mm}/${yyyy}`,
                  t: (H === '00' && M === '00' && S === '00') ? '' : `${H}:${M}:${S}`
               };
            }
            if (typeof val === 'number') {
                if (val >= 1) {
                    const totalDays = Math.floor(val);
                    const frac = val - totalDays;
                    const d = new Date(Math.round((totalDays - 25569) * 86400 * 1000));
                    const dd = d.getUTCDate().toString().padStart(2, '0');
                    const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
                    const yyyy = d.getUTCFullYear();
                    let t = '';
                    if (frac > 0) {
                        const tSecs = Math.round(frac * 86400);
                        const H = Math.floor(tSecs / 3600).toString().padStart(2, '0');
                        const M = Math.floor((tSecs % 3600) / 60).toString().padStart(2, '0');
                        const S = (tSecs % 60).toString().padStart(2, '0');
                        t = `${H}:${M}:${S}`;
                    }
                    return { d: `${dd}/${mm}/${yyyy}`, t };
                } else if (val > 0) {
                    const tSecs = Math.round(val * 86400);
                    const H = Math.floor(tSecs / 3600).toString().padStart(2, '0');
                    const M = Math.floor((tSecs % 3600) / 60).toString().padStart(2, '0');
                    const S = (tSecs % 60).toString().padStart(2, '0');
                    return { d: '', t: `${H}:${M}:${S}` };
                }
            }
            // Se for string, tentaremos arrumar e repartir
            const str = String(val).trim();
            const p = str.split(/\s+/);
            let d = p[0];
            let t = p.slice(1).join(' ');
            if (d && d.includes('/')) {
                const parts = d.split('/');
                if (parts[0].length === 4) d = `${parts[2].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[0]}`;
                // avoid US format
                if (parts[0].length <= 2 && parts[1].length <= 2) {
                    // if part[0] is month and part[1] is day? In Brazil part[0] is day. Keep as is.
                }
            }
            return { d, t };
        };

        const dataRows = rawRows.map(row => {
            const getStr = (idx: number) => idx >= 0 ? String(row[idx] || '').trim() : '';
            const getRaw = (idx: number) => idx >= 0 ? row[idx] : null;
            
            const rawIn = getRaw(colMap.dataInicio);
            const parsedIn = parseExcelDate(rawIn);
            let dataInc = parsedIn.d;
            let horaInc = parsedIn.t || getStr(colMap.horaInicio);
            
            // Tratamento especial para duração que possa vir formatada como float no excel
            let dur = getStr(colMap.duracao);
            if (typeof getRaw(colMap.duracao) === 'number' && getRaw(colMap.duracao) < 1) {
                // Number represents fraction of a day
                const t = Math.round(getRaw(colMap.duracao) * 86400); 
                const h = Math.floor(t / 3600).toString().padStart(2, '0');
                const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
                const s = (t % 60).toString().padStart(2, '0');
                dur = `${h}:${m}:${s}`;
            }

            const rawFim = getRaw(colMap.dataFim);
            const parsedFim = parseExcelDate(rawFim);
            let dataF = parsedFim.d;
            let horaF = parsedFim.t || getStr(colMap.horaFim);
            
            let placa = getStr(colMap.placa).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            
            return [
                getStr(colMap.login),      // A: Login
                getStr(colMap.nome),       // B: Nome
                dataInc,                   // C: Data Inicio
                horaInc,                   // D: Hora Inicio
                dataF,                     // E: Data Fim
                horaF,                     // F: Hora Fim
                placa,                     // G: Placa
                getStr(colMap.nomeMacro),  // H: NomeMacro
                getStr(colMap.tipoMacro),  // I: TipoMacro
                getStr(colMap.referencia), // J: PontoReferencia
                dur,                       // K: Duracao
                getStr(colMap.km)          // L: KM
            ];
        });
        
        if (dataRows.length > 0) {
            await uploadMacrosAndSync(dataRows as string[][]);
            alert(`✅ ${dataRows.length} macros sincronizadas com sucesso da planilha! Elas estão salvas na nuvem e disponíveis para preenchimento!`);
            setLastUpdate(new Date()); // Force view reload
        } else {
            alert('Não foram encontrados dados válidos na planilha anexada.');
        }

    } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo Excel: ' + (err as Error).message);
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredRecords = useMemo(() => {
    let result = records;
    
    // Filtro de Mês/Ano
    if (filterYear) {
      result = result.filter(r => {
        if (!r.date) return false;
        // Se r.date estiver no formato YYYY-MM-DD
        const parts = r.date.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          return parseInt(parts[0], 10) === filterYear;
        }
        // Se estiver no formato DD/MM/YYYY
        const partsSlash = r.date.split('/');
        if (partsSlash.length === 3 && partsSlash[2].length === 4) {
          return parseInt(partsSlash[2], 10) === filterYear;
        }
        // Fallback robusto evitando fuso UTC direto
        const d = new Date(r.date + 'T12:00:00');
        return d.getFullYear() === filterYear;
      });
    }
    if (filterMonth !== '') {
      result = result.filter(r => {
        if (!r.date) return false;
        // Se r.date estiver no formato YYYY-MM-DD
        const parts = r.date.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          return (parseInt(parts[1], 10) - 1) === Number(filterMonth);
        }
        // Se estiver no formato DD/MM/YYYY
        const partsSlash = r.date.split('/');
        if (partsSlash.length === 3 && partsSlash[2].length === 4) {
          return (parseInt(partsSlash[1], 10) - 1) === Number(filterMonth);
        }
        // Fallback robusto evitando fuso UTC direto
        const d = new Date(r.date + 'T12:00:00');
        return d.getMonth() === Number(filterMonth);
      });
    }

    if (filterSearch) {
        const s = filterSearch.toLowerCase();
        result = result.filter(r => 
            r.driver.toLowerCase().includes(s) || 
            r.vehicle.toLowerCase().includes(s) || 
            (r.plate && r.plate.toLowerCase().includes(s)) ||
            (r.base && r.base.toLowerCase().includes(s))
        );
    }
    return result;
  }, [records, filterSearch, filterMonth, filterYear]);

  const stats = useMemo(() => {
    const totalInPeriod = filteredRecords.length;
    const alertCount = filteredRecords.filter(r => r.suspiciousActivity === 'Sim' || r.uninformedStops === 'Sim').length;
    const noAlertCount = totalInPeriod - alertCount;
    
    const alertPercent = totalInPeriod > 0 ? (alertCount / totalInPeriod * 100).toFixed(1) : '0';
    const noAlertPercent = totalInPeriod > 0 ? (noAlertCount / totalInPeriod * 100).toFixed(1) : '0';

    const fleetList = getFleetData();
    const fleetSize = fleetList.length || 50; 
    const uniquePlatesVerified = new Set(
        filteredRecords
            .map(r => String(r.plate || '').replace(/[^A-Z0-9]/gi, "").toUpperCase())
            .filter(Boolean)
    ).size;
    const coveragePercent = fleetSize > 0 ? (uniquePlatesVerified / fleetSize * 100).toFixed(1) : '0';

    return { total: totalInPeriod, alertCount, alertPercent, noAlertCount, noAlertPercent, coveragePercent };
  }, [filteredRecords]);

  const handleStatusToggle = (record: BolaPreta) => {
    const newStatus = record.status === 'Aberto' ? 'Tratado' : 'Aberto';
    setConfirmModal({
      isOpen: true,
      title: "Alterar Status",
      message: `Deseja alterar o status para ${newStatus}?`,
      onConfirm: async () => {
        await updateBolaPretaRecord(record.id, { status: newStatus as any });
        setLastUpdate(new Date());
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Registro",
      message: "Excluir este registro permanentemente?",
      onConfirm: async () => {
        setRecords(prev => prev.filter(r => r.id !== id));
        try {
          await deleteBolaPretaRecord(id);
        } catch (error) {
          console.error("Erro na exclusão remota", error);
        } finally {
          setLastUpdate(new Date());
        }
      }
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // Se a data já estiver no formato YYYY-MM-DD, vamos quebrar para não usar o fuso do JS e acabar subtraindo 1 dia
    const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // Tratamento genérico para outras datas
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    
    // Ajuste seguro local
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const dateV = new Date(d.getTime() + userTimezoneOffset);
    
    return `${dateV.getDate().toString().padStart(2, '0')}/${(dateV.getMonth() + 1).toString().padStart(2, '0')}/${dateV.getFullYear()}`;
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = [2024, 2025, 2026];

  if (showIndicators) {
    return (
      <BolaPretaIndicators 
        records={records}
        filterMonth={filterMonth}
        filterYear={filterYear}
        onBack={() => setShowIndicators(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
      {/* Header Premium & Main Actions */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-8 rounded-[2rem] shadow-xl shadow-emerald-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            <ShieldAlert size={300} />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white">
                        <ShieldAlert size={32} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black text-white tracking-tight leading-none">ANÁLISE DE VIAGEM</h2>
                        <button 
                            onClick={() => setShowTutorial(!showTutorial)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-black rounded text-emerald-100/90 tracking-wide transition-all active:scale-95"
                            title="Manual de uso das Análises de Viagem"
                        >
                            {showTutorial ? 'OCULTAR MANUAL' : 'MANUAL DE USO'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1 gap-1">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".xlsx, .xls, .csv" 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-white font-black text-xs transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                        title="Fazer Upload do Excel de Macros"
                    >
                        {isUploading ? <span className="animate-spin">⌛</span> : <Upload size={14} />}
                        IMPORTAR MACROS
                    </button>
                    <div className="w-[1px] bg-white/20 my-1 mx-1"></div>
                    <button 
                        onClick={() => setIsFleetModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-white font-black text-xs hover:bg-white/10 transition-colors"
                        title="Verificar Frotas Pendentes"
                    >
                        <Truck size={14} />
                        STATUS FROTAS
                    </button>
                    <div className="w-[1px] bg-white/20 my-1 mx-1"></div>
                    <select 
                        value={filterMonth} 
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="bg-transparent text-white font-bold text-xs px-3 py-1.5 outline-none rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <option value="" className="text-slate-800">Mês</option>
                        {months.map((m, i) => (
                            <option key={m} value={i} className="text-slate-800">{m}</option>
                        ))}
                    </select>
                    <select 
                        value={filterYear} 
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="bg-transparent text-white font-bold text-xs px-3 py-1.5 outline-none rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        {years.map(y => (
                            <option key={y} value={y} className="text-slate-800">{y}</option>
                        ))}
                    </select>
                </div>

                {userName?.toUpperCase().trim() === 'DENY' && (
                    <button 
                        onClick={() => setShowIndicators(true)}
                        className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-[#00ad74] hover:text-white font-black text-sm shadow-xl hover:bg-slate-800 hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-widest mr-2"
                    >
                        📊 INDICADORES
                    </button>
                )}

                <button 
                    onClick={() => { setSelectedRecord(null); setIsReadOnly(false); setIsFormOpen(true); }}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-emerald-600 font-black text-sm shadow-xl hover:bg-emerald-50 hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-widest"
                >
                    <PlusCircle size={20} />
                    REGISTRAR ANÁLISE DE VIAGEM
                </button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {showTutorial && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden print:mb-0 print:height-auto print:opacity-100"
          >
            <BolaPretaTutorial onClose={() => setShowTutorial(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden relative group">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Verificações Realizadas</p>
                <div className="flex items-end gap-3">
                    <h3 className="text-5xl font-black text-slate-800">{stats.total}</h3>
                    <div className="mb-1 flex flex-col">
                        <span className="text-emerald-500 font-bold text-xs">{stats.coveragePercent}%</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Da Frota Total</span>
                    </div>
                </div>
            </div>
            <div className="absolute right-6 top-6 p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:scale-110 transition-transform">
                <FileText size={24} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden relative group">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-red-500">Verificações com Alerta</p>
                <div className="flex items-end gap-3">
                    <h3 className="text-5xl font-black text-red-600">{stats.alertCount}</h3>
                    <div className="mb-1 flex flex-col">
                        <span className="text-red-500 font-bold text-xs">{stats.alertPercent}%</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Das Verificações</span>
                    </div>
                </div>
            </div>
            <div className="absolute right-6 top-6 p-4 bg-red-50 rounded-2xl text-red-600 group-hover:scale-110 transition-transform">
                <AlertTriangle size={24} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden relative group">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-emerald-500">Verificações sem Alerta</p>
                <div className="flex items-end gap-3">
                    <h3 className="text-5xl font-black text-emerald-600">{stats.noAlertCount}</h3>
                    <div className="mb-1 flex flex-col">
                        <span className="text-emerald-500 font-bold text-xs">{stats.noAlertPercent}%</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Das Verificações</span>
                    </div>
                </div>
            </div>
            <div className="absolute right-6 top-6 p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                <CheckSquare size={24} />
            </div>
          </motion.div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
              <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                      type="text" 
                      value={filterSearch} 
                      onChange={(e) => setFilterSearch(e.target.value)}
                      placeholder="Pesquisar por motorista, frota, placa ou base..."
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm"
                  />
              </div>
          </div>

          <div className="overflow-x-auto w-full flex-1">
              <table className="w-full min-w-[900px] text-left border-collapse table-auto">
                  <thead>
                      <tr className="bg-emerald-600 text-[10px] uppercase font-black text-white tracking-[0.2em]">
                          <th className="p-5">Data Verif.</th>
                          <th className="p-5">Motorista / Frota</th>
                          <th className="p-5">Jornada</th>
                          <th className="p-5">Verificação</th>
                          <th className="p-5 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                      {filteredRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="p-5 whitespace-nowrap text-slate-700 font-bold">
                                  {formatDate(r.date)} <br/>
                                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{r.base}</span> <br/>
                                  <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black tracking-wide uppercase">Op: {r.operator || 'SISTEMA'}</span>
                              </td>
                              <td className="p-5">
                                  <span className="font-black text-slate-800 text-base">{r.driver}</span> <br/>
                                  <span className="text-xs text-slate-500 font-mono font-bold flex items-center gap-1.5 mt-0.5">
                                      <Truck size={12} className="text-slate-300" /> {r.vehicle} {r.plate ? `(${r.plate})` : ''}
                                  </span>
                              </td>
                              <td className="p-5">
                                  <span className="text-sm font-black text-slate-700">{r.startTime || '--:--'} às {r.endTime || '--:--'}</span> <br/>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{r.kmDriven ? `${r.kmDriven} KM Percorridos` : ''}</span>
                              </td>
                              <td className="p-5">
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm border ${
                                      r.verificationStatus === 'OK' 
                                          ? 'bg-emerald-500 text-white border-emerald-600' 
                                          : 'bg-orange-500 text-white border-orange-600'
                                  }`}>
                                      {r.verificationStatus === 'OK' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                      {r.verificationStatus || 'OK'}
                                  </div>
                              </td>
                              <td className="p-5 text-right whitespace-nowrap">
                                  <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-all">
                                      <button 
                                          onClick={() => handleResendEmail(r)} 
                                          disabled={isResendingId === r.id} 
                                          className="p-2 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-600 rounded-xl bg-white shadow-sm transition-colors disabled:opacity-50" 
                                          title="Reenviar E-mail de Análise de Viagem"
                                      >
                                          {isResendingId === r.id ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Mail size={18} />}
                                      </button>
                                      <button onClick={() => { setReportRecord(r); setIsReportOpen(true); }} className="p-2 border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-600 rounded-xl bg-white shadow-sm transition-colors" title="Visualizar"><Eye size={18} /></button>
                                      <button onClick={() => { setSelectedRecord(r); setIsReadOnly(false); setIsFormOpen(true); }} className="p-2 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-600 rounded-xl bg-white shadow-sm transition-colors" title="Editar"><Pencil size={18} /></button>
                                      <button onClick={() => handleDelete(r.id)} className="p-2 border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-600 rounded-xl bg-white shadow-sm transition-colors" title="Excluir"><Trash2 size={18} /></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
      </div>

      <AnimatePresence>
          {isFleetModalOpen && (
              <FleetStatusModal 
                onClose={() => setIsFleetModalOpen(false)}
                month={Number(filterMonth || new Date().getMonth())}
                year={filterYear}
                onStartVerification={(vehicle, plate, base) => {
                    setPreFilledFleet({ vehicle, plate, base });
                    setIsFleetModalOpen(false);
                    setSelectedRecord(null);
                    setIsReadOnly(false);
                    setIsFormOpen(true);
                }}
              />
          )}

          {isFormOpen && (
              <BolaPretaForm 
                onClose={() => {
                    setIsFormOpen(false);
                    setPreFilledFleet(null);
                }}
                onSave={(saved) => {
                    setLastUpdate(new Date());
                    if (saved) {
                        setReportRecord(saved);
                        setIsReportOpen(true);
                    }
                }}
                editRecord={selectedRecord || undefined}
                operatorName={userName}
                preFilledFleet={preFilledFleet || undefined}
                readOnly={isReadOnly}
              />
          )}

          {isReportOpen && reportRecord && (
              <TravelReportView 
                record={reportRecord}
                onClose={() => {
                    setIsReportOpen(false);
                    setReportRecord(null);
                }}
              />
          )}

          {confirmModal && confirmModal.isOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4">
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{confirmModal.title}</h3>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{confirmModal.message}</p>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setConfirmModal(null)}
                              className="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-black text-xs hover:bg-slate-200 transition-all uppercase"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={() => {
                                  confirmModal.onConfirm();
                                  setConfirmModal(null);
                              }}
                              className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-black text-xs shadow-md shadow-red-600/20 hover:scale-[1.01] active:scale-95 transition-all uppercase"
                          >
                              Confirmar
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default BolaPretaComponent;
