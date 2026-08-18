
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Send, 
  History, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Info, 
  MoreHorizontal,
  Search,
  Filter,
  X,
  Pencil,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  Coffee,
  Sparkles,
  LayoutDashboard,
  ThermometerSnowflake,
  Map as MapIcon,
  Video,
  Pin,
  Lock,
  Trash2
} from 'lucide-react';
import { 
  getShiftOccurrences, 
  addShiftOccurrence, 
  updateShiftOccurrence,
  finalizeShift, 
  normalizeEvaluatorName,
  deleteShiftOccurrence,
  loadShiftOccurrencesData
} from '../services/dataService';
import { ShiftOccurrence, OccurrenceType, UserRole } from '../types';

interface ShiftHandoverProps {
  userName: string;
  userRole?: UserRole;
}

const DEFAULT_BASES = [
  'Aguaí', 
  'Araraquara', 
  'Betim', 
  'Capão Bonito', 
  'Cubatão', 
  'Jales', 
  'Ourinhos', 
  'Paulínia', 
  'São Bernardo', 
  'São Paulo', 
  'Suprimentos', 
  'Geral'
];

const DEFAULT_BASE_COLORS: Record<string, string> = {
  'Aguaí': 'bg-blue-500',
  'Araraquara': 'bg-emerald-500',
  'Betim': 'bg-purple-500',
  'Capão Bonito': 'bg-orange-500',
  'Cubatão': 'bg-pink-500',
  'Jales': 'bg-cyan-500',
  'Ourinhos': 'bg-indigo-500',
  'Paulínia': 'bg-rose-500',
  'São Bernardo': 'bg-amber-500',
  'São Paulo': 'bg-violet-500',
  'Suprimentos': 'bg-teal-500',
  'Geral': 'bg-slate-500',
};

const DEFAULT_BASE_HEX_COLORS: Record<string, string> = {
  'Aguaí': '#3b82f6',
  'Araraquara': '#10b981',
  'Betim': '#a855f7',
  'Capão Bonito': '#f97316',
  'Cubatão': '#ec4899',
  'Jales': '#06b6d4',
  'Ourinhos': '#6366f1',
  'Paulínia': '#f43f5e',
  'São Bernardo': '#f59e0b',
  'São Paulo': '#8b5cf6',
  'Suprimentos': '#14b8a6',
  'Geral': '#64748b',
};

const FALLBACK_PALETTE_BG = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-lime-600', 'bg-sky-500'];
const FALLBACK_PALETTE_HEX = ['#3b82f6', '#10b981', '#a855f7', '#f97316', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e', '#f59e0b', '#14b8a6', '#8b5cf6', '#d946ef', '#65a30d', '#0284c7'];

export const getBaseColorClass = (baseName?: string) => {
  if (!baseName) return 'bg-slate-500';
  if (DEFAULT_BASE_COLORS[baseName]) return DEFAULT_BASE_COLORS[baseName];
  let hash = 0;
  for (let i = 0; i < baseName.length; i++) {
    hash = baseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTE_BG.length;
  return FALLBACK_PALETTE_BG[idx];
};

export const getBaseHexColor = (baseName?: string) => {
  if (!baseName) return '#64748b';
  if (DEFAULT_BASE_HEX_COLORS[baseName]) return DEFAULT_BASE_HEX_COLORS[baseName];
  let hash = 0;
  for (let i = 0; i < baseName.length; i++) {
    hash = baseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTE_HEX.length;
  return FALLBACK_PALETTE_HEX[idx];
};

const DEFAULT_TYPES: OccurrenceType[] = ['CFTV', 'Checklist do Setor', 'Monitoramento', 'Ocorrência', 'Orientação', 'Outros'];

export const getTodayDateTimeLocalStr = (hoursOffset = 12) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursOffset);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const getMinDateTimeLocalStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatRetentionLabel = (keep?: string) => {
  if (!keep) return '';
  const clean = String(keep).trim();
  if (!clean) return '';
  if (clean.toLowerCase() === 'indefinite' || clean.toLowerCase() === 'indeterminado') {
    return 'Indeterminado';
  }
  try {
    if (clean.includes('T')) {
      const [datePart, timePart] = clean.split('T');
      const [y, m, d] = datePart.split('-');
      const [hour, min] = timePart.split(':');
      if (d && m && y && hour && min) {
        return `${d}/${m}/${y} às ${hour}:${min}`;
      }
    } else if (clean.includes('-')) {
      const [y, m, d] = clean.split('-');
      if (d && m && y) {
        return `${d}/${m}/${y}`;
      }
    }
  } catch {}
  return clean;
};

const getActualDescription = (desc?: string) => {
  if (!desc || typeof desc !== 'string') return '';
  return desc.includes('|||AUDIT|||') ? desc.split('|||AUDIT|||')[0] : desc;
};

const getAuditLog = (desc?: string) => {
  if (!desc || typeof desc !== 'string') return '';
  return desc.includes('|||AUDIT|||') ? desc.split('|||AUDIT|||')[1] : '';
};

export const formatTimeSafe = (timeStr?: string) => {
  if (!timeStr) return '--:--';
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  } catch {}
  return '--:--';
};

export const formatDateTimeSafe = (timeStr?: string) => {
  if (!timeStr) return '--';
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('pt-BR');
    }
  } catch {}
  return String(timeStr || '--');
};

export const splitDescriptionLines = (desc?: string): string[] => {
  if (!desc || typeof desc !== 'string') return [];
  const rawLines = desc.split(/\r?\n/);
  const lines: string[] = [];

  for (let line of rawLines) {
    let trimmed = (line || '').trim();
    if (!trimmed) continue;
    // Strip leading bullet characters if present so we can standardize bullet topics
    trimmed = trimmed.replace(/^[-•*–—]\s*/, '');
    if (trimmed) {
      lines.push(trimmed);
    }
  }

  return lines;
};

const renderFormattedDescription = (descText?: string, isHistory = false) => {
  const lines = splitDescriptionLines(descText);
  if (lines.length === 0) return <span className="text-slate-400 italic">Sem informação</span>;
  
  if (lines.length === 1) {
    return (
      <div className={`text-slate-700 font-medium leading-relaxed ${isHistory ? 'text-[11px]' : 'text-sm'}`}>
        {lines[0]}
      </div>
    );
  }

  return (
    <ul className={`space-y-1.5 mt-1 text-slate-700 font-medium ${isHistory ? 'text-[11px]' : 'text-sm'}`}>
      {lines.map((line, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <span className="text-emerald-500 font-bold text-xs mt-0.5 select-none">•</span>
          <span className="flex-1 leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  );
};

export const encodeChecklist = (
  cafeteira: boolean, 
  limpeza: boolean, 
  organizacao: boolean, 
  arCondicionado: boolean,
  alertasRastreador: boolean,
  alertasCFTV: boolean,
  desc: string
) => {
  return `[CHECKLIST] Cafeteira limpa: ${cafeteira} | Limpeza e conservação da Sala: ${limpeza} | Organização das Mesas: ${organizacao} | Ar condicionado: ${arCondicionado} | Alertas Rastreador Tratados: ${alertasRastreador} | Alertas CFTV Tratados: ${alertasCFTV} | Descrição: ${desc || ''}`;
};

export const decodeChecklist = (desc?: string) => {
  if (!desc || typeof desc !== 'string' || !desc.startsWith('[CHECKLIST]')) {
    return null;
  }
  try {
    const parts = desc.replace('[CHECKLIST] ', '').split(' | ');
    if (parts.length >= 4) {
      const cafeteira = parts[0]?.split(': ')[1] === 'true';
      const limpeza = parts[1]?.split(': ')[1] === 'true';
      const organizacao = parts[2]?.split(': ')[1] === 'true';
      
      let arCondicionado = false;
      let alertasRastreador = false;
      let alertasCFTV = false;
      let description = '';

      if (parts.length >= 7) {
        arCondicionado = parts[3]?.split(': ')[1] === 'true';
        alertasRastreador = parts[4]?.split(': ')[1] === 'true';
        alertasCFTV = parts[5]?.split(': ')[1] === 'true';
        description = parts[6]?.split(': ')[1] || '';
      } else {
        description = parts[3]?.split(': ')[1] || '';
      }

      return { cafeteira, limpeza, organizacao, arCondicionado, alertasRastreador, alertasCFTV, description };
    }
  } catch (e) {
    console.error("Error decoding checklist:", e);
  }
  return null;
};

const ShiftHandover: React.FC<ShiftHandoverProps> = ({ userName, userRole }) => {
  const [activeView, setActiveView] = useState<'current' | 'history' | 'audit'>('current');
  const [occurrences, setOccurrences] = useState<ShiftOccurrence[]>([]);
  const [history, setHistory] = useState<ShiftOccurrence[]>([]);
  const [auditOccurrences, setAuditOccurrences] = useState<ShiftOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyMode, setHistoryMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDateOccs, setSelectedDateOccs] = useState<{date: string, occs: ShiftOccurrence[]} | null>(null);
  
  // Custom Bases and Types state (persisted locally and synced with data)
  const [customBases, setCustomBases] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('risel_shift_custom_bases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customTypes, setCustomTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('risel_shift_custom_types');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal state for adding custom Base and Type
  const [showAddBaseModal, setShowAddBaseModal] = useState(false);
  const [newBaseInput, setNewBaseInput] = useState('');
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  // Form state
  const [type, setType] = useState<OccurrenceType>('Monitoramento');
  const [base, setBase] = useState('Geral');
  const [description, setDescription] = useState('');
  const [keepUntilType, setKeepUntilType] = useState<'none' | 'date' | 'indefinite'>('none');
  const [keepUntilDate, setKeepUntilDate] = useState<string>('');

  // Retention Renewal Modal State
  const [renewOccModal, setRenewOccModal] = useState<ShiftOccurrence | null>(null);
  const [renewKeepType, setRenewKeepType] = useState<'none' | 'date' | 'indefinite'>('date');
  const [renewKeepDate, setRenewKeepDate] = useState<string>('');

  // Deny permission check
  const isDenyUser = userName?.toUpperCase().trim() === 'DENY' || userRole === 'admin';
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  // Dynamic available bases list (Defaults + Custom + Existing in data)
  const availableBases = useMemo(() => {
    const fromOccs = (occurrences || []).concat(history || []).concat(auditOccurrences || []).map(o => o?.base).filter(Boolean);
    const combined = Array.from(new Set([...DEFAULT_BASES, ...customBases, ...fromOccs]));
    return combined.sort((a, b) => {
      if (a === 'Geral') return 1;
      if (b === 'Geral') return -1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    });
  }, [customBases, occurrences, history, auditOccurrences]);

  // Dynamic available types list (Defaults + Custom + Existing in data)
  const availableTypes = useMemo(() => {
    const fromOccs = (occurrences || []).concat(history || []).concat(auditOccurrences || []).map(o => o?.type).filter(Boolean);
    const combined = Array.from(new Set([...DEFAULT_TYPES, ...customTypes, ...fromOccs]));
    return combined.sort((a, b) => {
      if (a === 'Checklist do Setor') return -1;
      if (b === 'Checklist do Setor') return 1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    });
  }, [customTypes, occurrences, history, auditOccurrences]);

  const handleAddNewBase = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newBaseInput.trim();
    if (!clean) return;
    
    // Capitalize properly
    const formatted = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    if (!customBases.includes(formatted) && !DEFAULT_BASES.includes(formatted)) {
      const updated = [...customBases, formatted];
      setCustomBases(updated);
      try {
        localStorage.setItem('risel_shift_custom_bases', JSON.stringify(updated));
      } catch {}
    }
    setBase(formatted);
    setNewBaseInput('');
    setShowAddBaseModal(false);
    showMessage(`Base "${formatted}" cadastrada com sucesso!`, 'success');
  };

  const handleAddNewType = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newTypeInput.trim();
    if (!clean) return;
    
    const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
    
    if (!customTypes.includes(formatted) && !DEFAULT_TYPES.includes(formatted)) {
      const updated = [...customTypes, formatted];
      setCustomTypes(updated);
      try {
        localStorage.setItem('risel_shift_custom_types', JSON.stringify(updated));
      } catch {}
    }
    setType(formatted as OccurrenceType);
    setNewTypeInput('');
    setShowAddTypeModal(false);
    showMessage(`Tipo "${formatted}" cadastrado com sucesso!`, 'success');
  };

  const getRetentionStatus = (occ?: ShiftOccurrence) => {
    if (!occ || !occ.keepUntil) return { isFixed: false, isExpiringToday: false, isExpired: false, isIndefinite: false, label: '' };
    const keep = String(occ.keepUntil || '').trim();
    if (!keep) return { isFixed: false, isExpiringToday: false, isExpired: false, isIndefinite: false, label: '' };
    if (keep.toLowerCase() === 'indefinite' || keep.toLowerCase() === 'indeterminado') {
      return { isFixed: true, isExpiringToday: false, isExpired: false, isIndefinite: true, label: 'Indeterminado' };
    }

    const now = new Date();
    const todayStr = getTodayDateStr();
    let targetTime = 0;
    let targetDateStr = '';

    if (keep.includes('T')) {
      const parsed = new Date(keep);
      targetTime = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      targetDateStr = keep.split('T')[0];
    } else if (keep.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsed = new Date(keep + 'T23:59:59');
      targetTime = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      targetDateStr = keep;
    }

    const isExpired = targetTime > 0 ? now.getTime() > targetTime : false;
    const isExpiringToday = (todayStr === targetDateStr) || isExpired;

    return {
      isFixed: true,
      isExpiringToday,
      isExpired,
      isIndefinite: false,
      targetDate: keep,
      label: formatRetentionLabel(keep)
    };
  };

  const canUserDelete = (occ?: ShiftOccurrence) => {
    if (!occ) return true;
    if (isDenyUser) return true;
    if (!occ.keepUntil) return true;
    const status = getRetentionStatus(occ);
    if (status.isIndefinite) return false;
    // Se hoje for a data limite ou já expirou, qualquer operador pode excluir
    if (status.isExpiringToday || status.isExpired) return true;
    // Antes da data limite, apenas o Deny pode excluir
    return false;
  };
  
  // Checklist state
  const [checklistCafeteira, setChecklistCafeteira] = useState(false);
  const [checklistLimpeza, setChecklistLimpeza] = useState(false);
  const [checklistOrganizacao, setChecklistOrganizacao] = useState(false);
  const [checklistArCondicionado, setChecklistArCondicionado] = useState(false);
  const [checklistAlertasRastreador, setChecklistAlertasRastreador] = useState(false);
  const [checklistAlertasCFTV, setChecklistAlertasCFTV] = useState(false);

  const getCurrentShiftInfo = () => {
    const now = new Date();
    const hours = now.getHours();
    
    let shiftDate = new Date(now);
    let shiftType: 'Diurno' | 'Noturno';

    if (hours >= 6 && hours < 18) {
        shiftType = 'Diurno';
    } else {
        shiftType = 'Noturno';
        if (hours < 6) {
            shiftDate.setDate(shiftDate.getDate() - 1);
        }
    }

    const year = shiftDate.getFullYear();
    const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
    const day = String(shiftDate.getDate()).padStart(2, '0');
    
    return {
        date: `${year}-${month}-${day}`,
        shift: shiftType
    };
  };

  const initialShiftInfo = getCurrentShiftInfo();
  const [shift, setShift] = useState<'Diurno' | 'Noturno'>(initialShiftInfo.shift);
  const [shiftDate, setShiftDate] = useState<string>(initialShiftInfo.date);
  
  // History filters
  const [filterDate, setFilterDate] = useState("");
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    loadCurrentOccurrences();

    const interval = setInterval(async () => {
      await loadShiftOccurrencesData();
      loadCurrentOccurrences();
      if (activeView === 'history') loadHistory();
      if (activeView === 'audit') loadAudit();
    }, 5000);

    return () => clearInterval(interval);
  }, [userName, shift, shiftDate, activeView]);

  // Auto-switch shift based on current time
  useEffect(() => {
    const checkShiftChange = () => {
      const currentInfo = getCurrentShiftInfo();
      // Only auto-switch if the user is currently on the "current" shift view
      // and the shift has actually changed in real-time
      if (activeView === 'current' && (shift !== currentInfo.shift || shiftDate !== currentInfo.date)) {
        const now = new Date();
        const hours = now.getHours();
        const mins = now.getMinutes();
        
        // Auto-switch at 06:00 and 18:00 (within the first 5 minutes of the hour)
        if ((hours === 6 || hours === 18) && mins < 5) {
          setShift(currentInfo.shift);
          setShiftDate(currentInfo.date);
          showMessage(`Turno alterado automaticamente para ${currentInfo.shift}.`, 'info');
        }
      }
    };

    const interval = setInterval(checkShiftChange, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [activeView, shift, shiftDate]);

  const loadCurrentOccurrences = () => {
    const allData = getShiftOccurrences() || [];
    // 1. Ocorrências registradas especificamente para este turno e data
    const currentShiftOccs = allData.filter(o => o && o.date === shiftDate && o.shift === shift && !o.finalized);
    
    // 2. Ocorrências fixas ativas (indeterminadas ou com data/hora limite vigente)
    const fixedOccs = allData.filter(o => {
      if (!o || !o.keepUntil) return false;
      if (o.type === 'Checklist do Setor') return false;
      
      const keep = String(o.keepUntil || '').trim();
      if (!keep) return false;
      if (keep.toLowerCase() === 'indefinite' || keep.toLowerCase() === 'indeterminado') return true;

      const status = getRetentionStatus(o);
      return !status.isExpired;
    });

    const mergedMap = new Map<string, ShiftOccurrence>();
    currentShiftOccs.forEach(o => {
      if (o && o.id) mergedMap.set(o.id, o);
    });
    fixedOccs.forEach(o => {
      if (o && o.id && !mergedMap.has(o.id)) {
        mergedMap.set(o.id, o);
      }
    });

    const list: ShiftOccurrence[] = (Array.from(mergedMap.values()) as ShiftOccurrence[]).sort((a: ShiftOccurrence, b: ShiftOccurrence) => {
      const aFixed = Boolean(a?.keepUntil);
      const bFixed = Boolean(b?.keepUntil);
      if (aFixed && !bFixed) return -1;
      if (!aFixed && bFixed) return 1;
      const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    setOccurrences(list);
  };

  const loadHistory = () => {
    const allData = getShiftOccurrences() || [];
    const currentInfo = getCurrentShiftInfo();
    
    // History should include explicitly finalized shifts, 
    // AND any shift that is from a past date or different shift period
    const historyData = allData.filter(o => {
      if (!o) return false;
      // Se foi finalizado, deve aparecer no histórico
      if (o.finalized) return true;
      
      // Se não foi finalizado, mas é de um dia anterior ou turno diferente, 
      // deve aparecer no histórico para não ficar "órfão"
      if (o.date < currentInfo.date || (o.date === currentInfo.date && o.shift !== currentInfo.shift)) {
        return true;
      }
      return false;
    });
    
    setHistory(historyData);
  };

  const loadAudit = () => {
    // Busca todas as ocorrências incluindo as excluídas
    const allData = getShiftOccurrences({ includeDeleted: true }) || [];
    // Filtra apenas as que possuem log de auditoria
    const auditData = allData.filter(o => o && typeof o.description === 'string' && o.description.includes('|||AUDIT|||'));
    setAuditOccurrences(auditData);
  };

  useEffect(() => {
    if (activeView === 'history') {
      loadHistory();
    } else if (activeView === 'audit') {
      loadAudit();
    }
  }, [activeView]);

  const handleAddOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For Checklist, description can be empty, but we encode the checklist state
    let finalDescToSave = description;
    let finalBaseToSave = base;
    
    if (type === 'Checklist do Setor') {
      finalDescToSave = encodeChecklist(checklistCafeteira, checklistLimpeza, checklistOrganizacao, checklistArCondicionado, checklistAlertasRastreador, checklistAlertasCFTV, description);
      finalBaseToSave = 'Geral'; // Checklist doesn't need a specific base
    } else if (!description.trim()) {
      return;
    }

    let finalKeepUntil = '';
    if (type !== 'Checklist do Setor') {
      if (keepUntilType === 'indefinite') {
        finalKeepUntil = 'indefinite';
      } else if (keepUntilType === 'date' && keepUntilDate) {
        finalKeepUntil = keepUntilDate;
      }
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const originalOcc = occurrences.find(o => o.id === editingId) || history.find(o => o.id === editingId) || auditOccurrences.find(o => o.id === editingId);
        const oldDesc = originalOcc ? getActualDescription(originalOcc.description) : '';
        const existingAudit = originalOcc ? getAuditLog(originalOcc.description) : '';
        
        const now = new Date().toLocaleString('pt-BR');
        let newAudit = existingAudit;
        
        if (oldDesc !== finalDescToSave || originalOcc?.type !== type || originalOcc?.base !== finalBaseToSave || originalOcc?.shift !== shift || (originalOcc?.keepUntil || '') !== finalKeepUntil) {
            newAudit += `\n[Editado por ${userName} em ${now}]`;
            if (oldDesc !== finalDescToSave) newAudit += `\n- Descrição alterada de: "${oldDesc}"`;
            if (originalOcc?.type !== type) newAudit += `\n- Tipo alterado de: ${originalOcc?.type}`;
            if (originalOcc?.base !== finalBaseToSave) newAudit += `\n- Base alterada de: ${originalOcc?.base}`;
            if ((originalOcc?.keepUntil || '') !== finalKeepUntil) {
              const keepLabel = finalKeepUntil === 'indefinite' ? 'Indeterminado' : (finalKeepUntil ? finalKeepUntil : 'Apenas no turno');
              newAudit += `\n- Retenção alterada para: ${keepLabel}`;
            }
        }
        
        const finalDescription = newAudit ? `${finalDescToSave}|||AUDIT|||${newAudit}` : finalDescToSave;

        await updateShiftOccurrence(editingId, {
          type,
          base: finalBaseToSave,
          description: finalDescription,
          shift,
          keepUntil: finalKeepUntil
        });
        setEditingId(null);
      } else {
        await addShiftOccurrence({
          date: shiftDate,
          shift,
          type,
          base: finalBaseToSave,
          description: finalDescToSave,
          operator: normalizeEvaluatorName(userName),
          keepUntil: finalKeepUntil
        });
      }
      setDescription('');
      setKeepUntilType('none');
      setKeepUntilDate('');
      setChecklistCafeteira(false);
      setChecklistLimpeza(false);
      setChecklistOrganizacao(false);
      setChecklistArCondicionado(false);
      setChecklistAlertasRastreador(false);
      setChecklistAlertasCFTV(false);
      loadCurrentOccurrences();
      if (activeView === 'history') loadHistory();
      if (activeView === 'audit') loadAudit();
    } catch (error) {
      console.error('Error saving occurrence:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (occ: ShiftOccurrence) => {
    setEditingId(occ.id);
    setType(occ.type);
    setBase(occ.base);
    
    if (occ.keepUntil === 'indefinite' || occ.keepUntil === 'Indeterminado') {
      setKeepUntilType('indefinite');
      setKeepUntilDate('');
    } else if (occ.keepUntil && occ.keepUntil.includes('-')) {
      setKeepUntilType('date');
      setKeepUntilDate(occ.keepUntil);
    } else {
      setKeepUntilType('none');
      setKeepUntilDate('');
    }

    const actualDesc = getActualDescription(occ.description);
    if (occ.type === 'Checklist do Setor') {
      const decoded = decodeChecklist(actualDesc);
      if (decoded) {
        setChecklistCafeteira(decoded.cafeteira);
        setChecklistLimpeza(decoded.limpeza);
        setChecklistOrganizacao(decoded.organizacao);
        setChecklistArCondicionado(decoded.arCondicionado);
        setChecklistAlertasRastreador(decoded.alertasRastreador);
        setChecklistAlertasCFTV(decoded.alertasCFTV);
        setDescription(decoded.description);
      } else {
        setDescription(actualDesc);
      }
    } else {
      setDescription(actualDesc);
    }
    
    setShift(occ.shift);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDescription('');
    setType('Monitoramento');
    setBase('Geral');
    setKeepUntilType('none');
    setKeepUntilDate('');
  };

  const handleFinalizeShift = async () => {
    if (occurrences.length === 0) {
      showMessage('Adicione pelo menos uma ocorrência antes de finalizar o turno.', 'error');
      return;
    }

    setShowFinalizeConfirm(true);
  };

  const confirmFinalizeShift = async () => {
    setShowFinalizeConfirm(false);
    setIsLoading(true);
    try {
      // Clear local state immediately for better UX
      setOccurrences([]);
      
      await finalizeShift(normalizeEvaluatorName(userName), shiftDate, shift);
      
      // Refresh data from server to be sure
      await loadShiftOccurrencesData();
      loadCurrentOccurrences();
      loadHistory();
      setActiveView('history');
      showMessage('Turno finalizado com sucesso!', 'success');
    } catch (error) {
      console.error('Error finalizing shift:', error);
      showMessage('Erro ao finalizar turno. Tente novamente.', 'error');
      // Reload to restore state if it failed
      loadCurrentOccurrences();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOccurrence = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteOccurrence = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    
    setIsLoading(true);
    try {
      const occ = occurrences.find(o => o.id === id) || history.find(o => o.id === id) || auditOccurrences.find(o => o.id === id);
      if (occ) {
          const now = new Date().toLocaleString('pt-BR');
          const existingAudit = getAuditLog(occ.description);
          const keepInfo = occ.keepUntil ? ` (Item fixo até: ${occ.keepUntil === 'indefinite' ? 'Indeterminado' : occ.keepUntil})` : '';
          const newAudit = existingAudit + `\n[EXCLUÍDO por ${userName} em ${now}${keepInfo}]`;
          const finalDescription = `${getActualDescription(occ.description)}|||AUDIT|||${newAudit}`;
          
          await updateShiftOccurrence(id, {
              description: finalDescription
          });
          showMessage('Ocorrência excluída com sucesso.', 'success');
      }
      loadCurrentOccurrences();
      if (activeView === 'history') loadHistory();
      if (activeView === 'audit') loadAudit();
    } catch (error) {
      console.error('Error deleting occurrence:', error);
      showMessage('Erro ao excluir ocorrência.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRenewModal = (occ: ShiftOccurrence) => {
    setRenewOccModal(occ);
    if (occ.keepUntil === 'indefinite' || occ.keepUntil === 'Indeterminado') {
      setRenewKeepType('indefinite');
      setRenewKeepDate('');
    } else if (occ.keepUntil && occ.keepUntil.includes('-')) {
      setRenewKeepType('date');
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setRenewKeepDate(d.toISOString().split('T')[0]);
    } else {
      setRenewKeepType('date');
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setRenewKeepDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSaveRenew = async () => {
    if (!renewOccModal) return;
    setIsSaving(true);
    try {
      let newKeep = '';
      if (renewKeepType === 'indefinite') newKeep = 'indefinite';
      else if (renewKeepType === 'date' && renewKeepDate) newKeep = renewKeepDate;

      const now = new Date().toLocaleString('pt-BR');
      const existingAudit = getAuditLog(renewOccModal.description);
      const keepText = newKeep === 'indefinite' ? 'Indeterminado' : (newKeep ? newKeep : 'Apenas hoje');
      const newAudit = existingAudit + `\n[Retenção atualizada por ${userName} em ${now} para: ${keepText}]`;
      const finalDescription = `${getActualDescription(renewOccModal.description)}|||AUDIT|||${newAudit}`;

      await updateShiftOccurrence(renewOccModal.id, {
        keepUntil: newKeep,
        description: finalDescription
      });

      setRenewOccModal(null);
      showMessage('Retenção da informação atualizada com sucesso!', 'success');
      loadCurrentOccurrences();
      if (activeView === 'history') loadHistory();
      if (activeView === 'audit') loadAudit();
    } catch (e) {
      console.error(e);
      showMessage('Erro ao atualizar retenção.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const generateEmailTemplate = (data: ShiftOccurrence[]) => {
    if (data.length === 0) return '';

    const groupedByBase: Record<string, ShiftOccurrence[]> = {};
    const orientations: ShiftOccurrence[] = [];
    const checklists: ShiftOccurrence[] = [];

    // Use the date and shift from the data if available
    const displayDate = data[0]?.date ? new Date(data[0].date + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    const displayShift = data[0]?.shift || shift;

    data.forEach(occ => {
      if (occ.type === 'Orientação') {
        orientations.push(occ);
      } else if (occ.type === 'Checklist do Setor') {
        checklists.push(occ);
      } else {
        const b = occ.base;
        if (!groupedByBase[b]) groupedByBase[b] = [];
        groupedByBase[b].push(occ);
      }
    });

    // Collect all bases present in the data + available bases
    const basesInData = Array.from(new Set(data.filter(o => o.type !== 'Orientação' && o.type !== 'Checklist do Setor').map(o => o.base)));
    const combinedBases = Array.from(new Set([...availableBases, ...basesInData]));

    // Sort bases alphabetically, but keep 'Geral' at the end if it exists
    const allBases = combinedBases.sort((a, b) => {
      if (a === 'Geral') return 1;
      if (b === 'Geral') return -1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    });

    let template = `*PASSAGEM DE PLANTÃO - ${displayShift.toUpperCase()} - ${displayDate}*\n\n`;

    allBases.forEach(b => {
      const baseOccs = groupedByBase[b] || [];
      template += `*BASE: ${b.toUpperCase()}*\n`;
      
      if (baseOccs.length === 0) {
        template += `- [Monitoramento] - Sem Alterações\n`;
      } else {
        // Sort occurrences by type for better organization
        const sortedOccs = [...baseOccs].sort((a, b) => a.type.localeCompare(b.type));
        sortedOccs.forEach(occ => {
          const rawDesc = getActualDescription(occ.description);
          const lines = splitDescriptionLines(rawDesc);
          const retStatus = getRetentionStatus(occ);
          const keepTag = occ.keepUntil ? ` [📌 ${retStatus.label}]` : '';

          if (lines.length <= 1) {
            const singleText = lines[0] || 'Sem Alterações';
            template += `- [${occ.type}]${keepTag} ${singleText}\n`;
          } else {
            template += `- [${occ.type}]${keepTag}\n`;
            lines.forEach(line => {
              template += `  • ${line}\n`;
            });
          }
        });
      }
      template += `\n`;
    });

    if (orientations.length > 0) {
      template += `*ORIENTAÇÕES GERAIS*\n`;
      orientations.forEach(occ => {
        const rawDesc = getActualDescription(occ.description);
        const lines = splitDescriptionLines(rawDesc);
        lines.forEach(line => {
          template += `• ${line}\n`;
        });
      });
      template += `\n`;
    }

    if (checklists.length > 0) {
      template += `*CHECKLIST DO SETOR*\n`;
      checklists.forEach(occ => {
        const decoded = decodeChecklist(getActualDescription(occ.description));
        if (decoded) {
          template += `- Cafeteira limpa: ${decoded.cafeteira ? 'Sim' : 'Não'}\n`;
          template += `- Limpeza e conservação da Sala: ${decoded.limpeza ? 'Sim' : 'Não'}\n`;
          template += `- Organização das Mesas: ${decoded.organizacao ? 'Sim' : 'Não'}\n`;
          template += `- Ar condicionado: ${decoded.arCondicionado ? 'Sim' : 'Não'}\n`;
          template += `- Alertas Rastreador Tratados: ${decoded.alertasRastreador ? 'Sim' : 'Não'}\n`;
          template += `- Alertas CFTV Tratados: ${decoded.alertasCFTV ? 'Sim' : 'Não'}\n`;
          if (decoded.description) {
            const obsLines = splitDescriptionLines(decoded.description);
            if (obsLines.length <= 1) {
              template += `- Observação: ${obsLines[0] || ''}\n`;
            } else {
              template += `- Observações:\n`;
              obsLines.forEach(l => {
                template += `  • ${l}\n`;
              });
            }
          }
        } else {
          const lines = splitDescriptionLines(getActualDescription(occ.description));
          lines.forEach(l => {
            template += `- ${l}\n`;
          });
        }
      });
    }

    return template;
  };

  const generateHTMLEmailTemplate = (data: ShiftOccurrence[]) => {
    if (data.length === 0) return '';

    const groupedByBase: Record<string, ShiftOccurrence[]> = {};
    const orientations: ShiftOccurrence[] = [];
    const checklists: ShiftOccurrence[] = [];

    const displayDate = data[0]?.date ? new Date(data[0].date + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    const displayShift = data[0]?.shift || shift;

    data.forEach(occ => {
      if (occ.type === 'Orientação') {
        orientations.push(occ);
      } else if (occ.type === 'Checklist do Setor') {
        checklists.push(occ);
      } else {
        const b = occ.base;
        if (!groupedByBase[b]) groupedByBase[b] = [];
        groupedByBase[b].push(occ);
      }
    });

    // Collect all bases present in the data + available bases
    const basesInData = Array.from(new Set(data.filter(o => o.type !== 'Orientação' && o.type !== 'Checklist do Setor').map(o => o.base)));
    const combinedBases = Array.from(new Set([...availableBases, ...basesInData]));

    // Sort bases alphabetically, but keep 'Geral' at the end if it exists
    const allBases = combinedBases.sort((a, b) => {
      if (a === 'Geral') return 1;
      if (b === 'Geral') return -1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    });

    let html = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border-collapse: collapse;">
        <tr>
          <td style="background-color: #10b981; color: #ffffff; padding: 15px; border-radius: 8px; font-family: Arial, sans-serif; font-weight: bold; text-align: center; font-size: 18px;">
            PASSAGEM DE PLANTÃO - ${displayShift.toUpperCase()} - ${displayDate}
          </td>
        </tr>
        <tr><td height="20" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
    `;

    allBases.forEach(b => {
      const baseOccs = groupedByBase[b] || [];
      const baseColor = getBaseHexColor(b);
      
      html += `
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
              <tr>
                <td style="background-color: ${baseColor}; color: #ffffff; padding: 6px 12px; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">
                  BASE: ${b}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; background-color: #ffffff;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
      `;
      
      if (baseOccs.length === 0) {
        html += `
          <tr>
            <td style="font-family: Arial, sans-serif; font-size: 13px; color: #64748b;">
              <span style="color: #059669; font-weight: bold; font-size: 11px; text-transform: uppercase;">[Monitoramento]</span> - Sem Alterações
            </td>
          </tr>
        `;
      } else {
        // Sort occurrences by type
        const sortedOccs = [...baseOccs].sort((a, b) => a.type.localeCompare(b.type));
        sortedOccs.forEach((occ, idx) => {
          const typeColor = occ.type === 'Ocorrência' ? '#dc2626' : 
                           occ.type === 'Orientação' ? '#2563eb' : 
                           occ.type === 'Monitoramento' ? '#059669' : '#475569';
          
          const rawDesc = getActualDescription(occ.description);
          const lines = splitDescriptionLines(rawDesc);

          let descHtml = '';
          if (lines.length === 0) {
            descHtml = '<div style="color: #64748b; font-size: 13px;">Sem Alterações</div>';
          } else if (lines.length === 1) {
            descHtml = `<div style="color: #334155; font-size: 13px; margin-top: 2px;">${lines[0]}</div>`;
          } else {
            descHtml = `
              <ul style="margin: 4px 0 0 0; padding-left: 18px; color: #334155; font-size: 13px; line-height: 1.5;">
                ${lines.map(line => `<li style="margin-bottom: 3px;">${line}</li>`).join('')}
              </ul>
            `;
          }

          const retStatus = getRetentionStatus(occ);
          const keepBadgeHtml = occ.keepUntil ? `
            <span style="color: #6b21a8; font-weight: bold; font-size: 9px; text-transform: uppercase; background-color: #f3e8ff; border: 1px solid #e9d5ff; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">
              📌 ${retStatus.label}
            </span>
          ` : '';

          html += `
            <tr ${idx > 0 ? 'style="border-top: 1px solid #f1f5f9;"' : ''}>
              <td style="font-family: Arial, sans-serif; padding: ${idx > 0 ? '8px 0' : '0 0 8px 0'}; font-size: 13px; line-height: 1.5; color: #334155;">
                <div style="margin-bottom: 4px; display: flex; align-items: center;">
                  <span style="color: ${typeColor}; font-weight: bold; font-size: 10px; text-transform: uppercase; background-color: ${typeColor}15; padding: 2px 6px; border-radius: 4px;">${occ.type}</span>
                  ${keepBadgeHtml}
                </div>
                ${descHtml}
              </td>
            </tr>
          `;
        });
      }
      
      html += `
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    });

    if (orientations.length > 0) {
      html += `
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 10px; background-color: #f8fafc;">
              <tr>
                <td style="background-color: #3b82f6; color: #ffffff; padding: 6px 12px; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">
                  ORIENTAÇÕES GERAIS
                </td>
              </tr>
              <tr>
                <td style="padding: 12px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
      `;
      
      orientations.forEach((occ, idx) => {
        const rawDesc = getActualDescription(occ.description);
        const lines = splitDescriptionLines(rawDesc);
        html += `
                    <tr ${idx > 0 ? 'style="border-top: 1px solid #e2e8f0;"' : ''}>
                      <td style="font-family: Arial, sans-serif; padding: ${idx > 0 ? '8px 0' : '0 0 8px 0'}; font-size: 13px; color: #334155; line-height: 1.5;">
                        <ul style="margin: 0; padding-left: 18px; color: #334155;">
                          ${lines.map(line => `<li style="margin-bottom: 3px;">${line}</li>`).join('')}
                        </ul>
                      </td>
                    </tr>
        `;
      });
      
      html += `
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    if (checklists.length > 0) {
      html += `
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 10px; background-color: #f8fafc;">
              <tr>
                <td style="background-color: #8b5cf6; color: #ffffff; padding: 6px 12px; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">
                  CHECKLIST DO SETOR
                </td>
              </tr>
              <tr>
                <td style="padding: 12px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
      `;
      
      checklists.forEach((occ, idx) => {
        const decoded = decodeChecklist(getActualDescription(occ.description));
        if (decoded) {
          const obsLines = decoded.description ? splitDescriptionLines(decoded.description) : [];
          html += `
                    <tr ${idx > 0 ? 'style="border-top: 1px solid #e2e8f0;"' : ''}>
                      <td style="font-family: Arial, sans-serif; padding: ${idx > 0 ? '8px 0' : '0 0 8px 0'}; font-size: 13px; color: #334155; line-height: 1.5;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <div>
                            <span style="color: ${decoded.cafeteira ? '#10b981' : '#ef4444'}; font-weight: bold;">${decoded.cafeteira ? '✓' : '✗'}</span> Cafeteira limpa
                          </div>
                          <div>
                            <span style="color: ${decoded.limpeza ? '#10b981' : '#ef4444'}; font-weight: bold;">${decoded.limpeza ? '✓' : '✗'}</span> Limpeza e conservação da Sala
                          </div>
                          <div>
                            <span style="color: ${decoded.organizacao ? '#10b981' : '#ef4444'}; font-weight: bold;">${decoded.organizacao ? '✓' : '✗'}</span> Organização das Mesas
                          </div>
                          <div>
                            <span style="color: ${decoded.arCondicionado ? '#10b981' : '#ef4444'}; font-weight: bold;">${decoded.arCondicionado ? '✓' : '✗'}</span> Ar condicionado
                          </div>
                          <div>
                            <span style="color: ${decoded.alertasRastreador ? '#10b981' : '#ef4444'}; font-weight: bold;">${decoded.alertasRastreador ? '✓' : '✗'}</span> Alertas Rastreador Tratados
                          </div>
                          <div>
                            <span style="color: ${decoded.alertasCFTV ? '#10b981' : '#ef4444'}; font-weight: bold;">${decoded.alertasCFTV ? '✓' : '✗'}</span> Alertas CFTV Tratados
                          </div>
                          ${obsLines.length > 0 ? `
                            <div style="margin-top: 6px; color: #475569; font-size: 12px;">
                              <strong>Observações:</strong>
                              ${obsLines.length === 1 ? obsLines[0] : `
                                <ul style="margin: 2px 0 0 0; padding-left: 16px;">
                                  ${obsLines.map(l => `<li style="margin-bottom: 2px;">${l}</li>`).join('')}
                                </ul>
                              `}
                            </div>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
          `;
        } else {
          const lines = splitDescriptionLines(getActualDescription(occ.description));
          html += `
                    <tr ${idx > 0 ? 'style="border-top: 1px solid #e2e8f0;"' : ''}>
                      <td style="font-family: Arial, sans-serif; padding: ${idx > 0 ? '8px 0' : '0 0 8px 0'}; font-size: 13px; color: #334155; line-height: 1.5;">
                        <ul style="margin: 0; padding-left: 18px; color: #334155;">
                          ${lines.map(line => `<li style="margin-bottom: 3px;">${line}</li>`).join('')}
                        </ul>
                      </td>
                    </tr>
          `;
        }
      });
      
      html += `
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    html += `</table>`;
    return html;
  };

  const handleCopyEmail = (data?: ShiftOccurrence[]) => {
    const actualData = Array.isArray(data) ? data : occurrences;
    const textTemplate = generateEmailTemplate(actualData);
    const htmlTemplate = generateHTMLEmailTemplate(actualData);
    
    if (!textTemplate) return;
    
    if (navigator.clipboard && navigator.clipboard.write) {
      const textBlob = new Blob([textTemplate], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlTemplate], { type: 'text/html' });
      
      const clipboardItem = new ClipboardItem({
        'text/plain': textBlob,
        'text/html': htmlBlob
      });

      navigator.clipboard.write([clipboardItem]).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }).catch(err => {
        console.error('Failed to copy rich text:', err);
        fallbackCopyTextToClipboard(textTemplate, htmlTemplate);
      });
    } else {
      fallbackCopyTextToClipboard(textTemplate, htmlTemplate);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, html?: string) => {
    if (html) {
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'fixed';
      container.style.pointerEvents = 'none';
      container.style.opacity = '0';
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNode(container);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        try {
          document.execCommand('copy');
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
          console.error('Fallback HTML copy failed:', err);
        }
        selection.removeAllRanges();
      }
      document.body.removeChild(container);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Fallback text copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const historyByDate = (history || []).reduce((acc, occ) => {
    if (!occ || !occ.date) return acc;
    const date = occ.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(occ);
    return acc;
  }, {} as Record<string, ShiftOccurrence[]>);

  const sortedHistoryDates = Object.keys(historyByDate).sort((a, b) => b.localeCompare(a));

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/50 border border-slate-100"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOccs = historyByDate[dateStr] || [];
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div 
          key={day} 
          onClick={() => dayOccs.length > 0 && setSelectedDateOccs({ date: dateStr, occs: dayOccs })}
          className={`h-24 md:h-32 border border-slate-100 p-2 transition-all relative group ${dayOccs.length > 0 ? 'cursor-pointer hover:bg-emerald-50/50 hover:shadow-inner' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>
              {day}
            </span>
            {dayOccs.length > 0 && (
              <span className="bg-emerald-100 text-emerald-600 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                {dayOccs.length}
              </span>
            )}
          </div>
          
          <div className="mt-2 space-y-1 overflow-hidden">
            {dayOccs.slice(0, 2).map((occ, idx) => (
              <div key={idx} className="text-[9px] truncate font-bold text-slate-500 bg-slate-100 px-1 rounded border-l-2 border-emerald-400">
                {occ.type}: {occ.type === 'Checklist do Setor' ? 'Preenchido' : getActualDescription(occ.description)}
              </div>
            ))}
            {dayOccs.length > 2 && (
              <div className="text-[8px] font-black text-emerald-500 text-center">
                + {dayOccs.length - 2} mais
              </div>
            )}
          </div>

          {dayOccs.length > 0 && (
            <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors pointer-events-none"></div>
          )}
        </div>
      );
    }

    return days;
  };

  const changeMonth = (offset: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1));
  };

  return (
    <div className="w-full px-4 space-y-6 animate-in fade-in duration-500">
      {message && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6">
              <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Ocorrência</h3>
              <p className="text-slate-600 text-sm font-medium">Tem certeza que deseja excluir esta ocorrência? Esta ação ficará registrada na auditoria.</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteOccurrence}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-sm transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6">
              <h3 className="text-xl font-black text-slate-800 mb-2">Finalizar Turno</h3>
              <p className="text-slate-600 text-sm font-medium">Deseja finalizar o turno e gerar o modelo de e-mail?</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowFinalizeConfirm(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmFinalizeShift}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm transition-all"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <ClipboardCheck className="text-emerald-500" size={28} />
            Passagem de Plantão
          </h2>
          <p className="text-slate-500 text-sm font-medium">Registre as ocorrências do seu turno em tempo real.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
          <button 
            onClick={() => setActiveView('current')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'current' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Clock size={16} /> Turno Atual
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'history' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <History size={16} /> Histórico
          </button>
          {userName?.toUpperCase() === 'DENY' && (
            <button 
              onClick={() => setActiveView('audit')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'audit' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Eye size={16} /> Verificar alterações
            </button>
          )}
        </div>
      </div>

      {activeView === 'current' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Plus size={18} className="text-emerald-500" />
                  {editingId ? 'Editar Ocorrência' : 'Nova Ocorrência'}
                </h3>
                <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-black uppercase">
                  <button 
                    onClick={() => setShift('Diurno')}
                    className={`px-2 py-1 rounded-md transition-all ${shift === 'Diurno' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Diurno
                  </button>
                  <button 
                    onClick={() => setShift('Noturno')}
                    className={`px-2 py-1 rounded-md transition-all ${shift === 'Noturno' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Noturno
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddOccurrence} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo</label>
                      <button
                        type="button"
                        onClick={() => { setNewTypeInput(''); setShowAddTypeModal(true); }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5"
                        title="Cadastrar novo tipo"
                      >
                        <Plus size={10} /> Novo
                      </button>
                    </div>
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value as OccurrenceType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    >
                      {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {type === 'Checklist do Setor' ? (
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Checklist</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                          <input type="checkbox" checked={checklistCafeteira} onChange={e => setChecklistCafeteira(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" />
                          <Coffee size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">Cafeteira limpa</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                          <input type="checkbox" checked={checklistLimpeza} onChange={e => setChecklistLimpeza(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" />
                          <Sparkles size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">Limpeza da Sala</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                          <input type="checkbox" checked={checklistOrganizacao} onChange={e => setChecklistOrganizacao(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" />
                          <LayoutDashboard size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">Organização das Mesas</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                          <input type="checkbox" checked={checklistArCondicionado} onChange={e => setChecklistArCondicionado(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" />
                          <ThermometerSnowflake size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">Ar condicionado</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                          <input type="checkbox" checked={checklistAlertasRastreador} onChange={e => setChecklistAlertasRastreador(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" />
                          <MapIcon size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">Alertas Rastreador Tratados</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                          <input type="checkbox" checked={checklistAlertasCFTV} onChange={e => setChecklistAlertasCFTV(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" />
                          <Video size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">Alertas CFTV Tratados</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Base</label>
                        <button
                          type="button"
                          onClick={() => { setNewBaseInput(''); setShowAddBaseModal(true); }}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5"
                          title="Cadastrar nova base"
                        >
                          <Plus size={10} /> Nova
                        </button>
                      </div>
                      <select 
                        value={base}
                        onChange={(e) => setBase(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      >
                        {availableBases.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {type !== 'Checklist do Setor' && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                        <Pin size={12} className="text-emerald-600" />
                        Manter informação até
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Fixar em plantões futuros</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setKeepUntilType('none'); setKeepUntilDate(''); }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border text-center flex items-center justify-center gap-1 ${
                          keepUntilType === 'none'
                            ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <span>Apenas turno</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setKeepUntilType('date');
                          if (!keepUntilDate) {
                            setKeepUntilDate(getTodayDateTimeLocalStr(12));
                          }
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border text-center flex items-center justify-center gap-1 ${
                          keepUntilType === 'date'
                            ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <CalendarIcon size={12} />
                        <span>Data / Hora limite</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setKeepUntilType('indefinite'); setKeepUntilDate(''); }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border text-center flex items-center justify-center gap-1 ${
                          keepUntilType === 'indefinite'
                            ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <span>Indeterminado</span>
                      </button>
                    </div>

                    {keepUntilType === 'date' && (
                      <div className="pt-1 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-600">Até o dia e horário:</label>
                        <input 
                          type="datetime-local" 
                          min={getMinDateTimeLocalStr()}
                          value={keepUntilDate}
                          onChange={(e) => setKeepUntilDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição / Tópicos</label>
                    <span className="text-[10px] text-slate-400 font-medium">Pressione Enter para criar tópicos</span>
                  </div>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que aconteceu. Você pode pular linhas ou dar Enter para separar em tópicos..."
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    type="submit"
                    disabled={isSaving || (type !== 'Checklist do Setor' && !description.trim())}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isSaving ? <MoreHorizontal className="animate-pulse" /> : <>{editingId ? <CheckCircle2 size={18} /> : <Plus size={18} />} {editingId ? 'Salvar' : 'Adicionar'}</>}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-emerald-700">
                <Info size={20} />
                <h4 className="font-bold text-sm">Estruturação em Tópicos</h4>
              </div>
              <p className="text-xs text-emerald-600 leading-relaxed font-medium">
                Insira as ocorrências do turno. Se houver múltiplas informações, aperte <strong>Enter</strong> para pular linha. O relatório de finalização gerará automaticamente tópicos organizados por base.
              </p>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <ClipboardCheck size={20} className="text-emerald-500" />
                Ocorrências do Turno ({occurrences.length})
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCopyEmail()}
                  disabled={occurrences.length === 0}
                  className="bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {copySuccess ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  Copiar E-mail
                </button>
                <button 
                  onClick={handleFinalizeShift}
                  disabled={isLoading || occurrences.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50"
                >
                  <Send size={14} /> Finalizar Turno
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {occurrences.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <ClipboardCheck size={24} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Nenhuma ocorrência registrada neste turno.</p>
                </div>
              ) : (
                occurrences.map((occ, idx) => {
                  const retStatus = getRetentionStatus(occ);
                  const canDelete = canUserDelete(occ);

                  return (
                    <div key={`${occ.id}-${idx}`} className={`bg-white rounded-2xl border ${retStatus.isExpiringToday ? 'border-amber-300 ring-2 ring-amber-100/70' : 'border-slate-200'} p-4 shadow-sm hover:shadow-md transition-all group`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
                              <MapPin size={10} /> {occ.base}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              occ.type === 'Ocorrência' ? 'bg-red-100 text-red-600' :
                              occ.type === 'Orientação' ? 'bg-blue-100 text-blue-600' :
                              occ.type === 'Monitoramento' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {occ.type}
                            </span>

                            {retStatus.isFixed && (
                              retStatus.isIndefinite ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 text-purple-700 flex items-center gap-1">
                                  <Pin size={10} /> Fixo Indeterminado
                                </span>
                              ) : retStatus.isExpiringToday ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-700 flex items-center gap-1">
                                  <Clock size={10} /> Vencimento hoje ({retStatus.label})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                  <Pin size={10} /> Fixo até {retStatus.label}
                                </span>
                              )
                            )}

                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Clock size={10} /> {formatTimeSafe(occ.createdAt)}
                            </span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase ml-auto">
                              {occ.operator}
                            </span>
                            <div className="flex items-center gap-1 ml-2">
                              <button 
                                onClick={() => handleEdit(occ)}
                                className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                                title="Editar Ocorrência"
                              >
                                <Pencil size={14} />
                              </button>
                              {canDelete ? (
                                <button 
                                  onClick={() => handleDeleteOccurrence(occ.id)}
                                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                  title="Excluir Ocorrência"
                                >
                                  <X size={14} />
                                </button>
                              ) : (
                                <span 
                                  className="p-1 text-slate-300 cursor-not-allowed opacity-60 flex items-center"
                                  title={`Item com retenção ativa até ${retStatus.label}. Exclusão permitida apenas ao usuário Deny.`}
                                >
                                  <Lock size={12} className="text-slate-400" />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-slate-700 font-medium leading-relaxed">
                            {occ.type === 'Checklist do Setor' ? (() => {
                              const decoded = decodeChecklist(getActualDescription(occ.description));
                              if (decoded) {
                                return (
                                  <div className="flex flex-col gap-1 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold ${decoded.cafeteira ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.cafeteira ? '✓' : '✗'}</span>
                                      <span>Cafeteira limpa</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold ${decoded.limpeza ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.limpeza ? '✓' : '✗'}</span>
                                      <span>Limpeza e conservação da Sala</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold ${decoded.organizacao ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.organizacao ? '✓' : '✗'}</span>
                                      <span>Organização das Mesas</span>
                                    </div>
                                    {decoded.description && (
                                      <div className="mt-2 text-xs text-slate-500 italic">
                                        Obs: {renderFormattedDescription(decoded.description)}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return renderFormattedDescription(getActualDescription(occ.description));
                            })() : renderFormattedDescription(getActualDescription(occ.description))}
                          </div>

                          {/* Sugestão visual e discreta no dia do término da retenção */}
                          {retStatus.isExpiringToday && (
                            <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                              <div className="flex items-center gap-2.5 text-amber-900 text-xs">
                                <div className="p-1 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                                  <Clock size={14} />
                                </div>
                                <div>
                                  <span className="font-bold">Prazo de retenção encerra hoje ({retStatus.label}).</span>
                                  <p className="text-[11px] text-amber-700 font-medium">Deseja excluir este item das passagens futuras ou mantê-lo?</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteOccurrence(occ.id)}
                                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                  title="Excluir ocorrência"
                                >
                                  <Trash2 size={12} />
                                  <span>Excluir</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleOpenRenewModal(occ)}
                                  className="px-3 py-1.5 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                  title="Prorrogar ou alterar retenção"
                                >
                                  <Pin size={12} />
                                  <span>Manter / Renovar</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : activeView === 'history' ? (
        <div className="space-y-6">
          {/* History View */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-700">Histórico de Plantões</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visualize registros passados</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                <button 
                  onClick={() => setHistoryMode('list')}
                  className={`p-2 rounded-lg transition-all ${historyMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Visão em Lista"
                >
                  <Filter size={18} />
                </button>
                <button 
                  onClick={() => setHistoryMode('calendar')}
                  className={`p-2 rounded-lg transition-all ${historyMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Visão em Calendário"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>

              {historyMode === 'list' && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date" 
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  </div>
                  {filterDate && (
                    <button 
                      onClick={() => setFilterDate("")}
                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-all"
                      title="Limpar filtro"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}

              {historyMode === 'calendar' && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                  <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-500 transition-all">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-black text-slate-700 min-w-[120px] text-center uppercase">
                    {calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-500 transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {historyMode === 'list' ? (
            <div className="space-y-4">
              {sortedHistoryDates.filter(d => !filterDate || d === filterDate).length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <History size={24} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Nenhum histórico encontrado.</p>
                </div>
              ) : (
                sortedHistoryDates.filter(d => !filterDate || d === filterDate).map(date => {
                  const dayOccs = historyByDate[date];
                  const isExpanded = expandedDates.includes(date);
                  
                  return (
                    <div key={date} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                      <button 
                        onClick={() => toggleDate(date)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-emerald-500 text-white w-10 h-10 rounded-xl flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black leading-none">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                            <span className="text-lg font-black leading-none">{new Date(date + 'T12:00:00').getDate()}</span>
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-700">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{dayOccs.length} Ocorrências registradas</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {Array.from(new Set(dayOccs.map(o => o?.operator || ''))).filter(Boolean).slice(0, 3).map((op, i) => (
                              <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500" title={op}>
                                {String(op).substring(0, 2).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopyEmail(dayOccs); }}
                            className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Copiar Modelo de E-mail"
                          >
                            <Copy size={16} />
                          </button>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {['Diurno', 'Noturno'].map(s => {
                              const shiftOccs = dayOccs.filter(o => o.shift === s);
                              
                              if (shiftOccs.length === 0) return (
                                <div key={s} className="space-y-3 opacity-30 hidden lg:block">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Turno {s} - Sem Ocorrências</h5>
                                  </div>
                                </div>
                              );

                              const groupedByBase = shiftOccs.reduce((acc, occ) => {
                                if (!acc[occ.base]) acc[occ.base] = [];
                                acc[occ.base].push(occ);
                                return acc;
                              }, {} as Record<string, typeof shiftOccs>);

                              const sortedBases = Object.keys(groupedByBase).sort((a, b) => {
                                if (a === 'Geral') return 1;
                                if (b === 'Geral') return -1;
                                return a.localeCompare(b, 'pt-BR');
                              });

                              return (
                                <div key={s} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Turno {s}</h5>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleCopyEmail(shiftOccs); }}
                                      className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 hover:text-emerald-600 hover:border-emerald-200 rounded-lg flex items-center gap-1 transition-all shadow-sm"
                                      title={`Copiar Modelo de E-mail - Turno ${s}`}
                                    >
                                      <Copy size={12} /> Copiar Turno
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 gap-4">
                                    {sortedBases.map(base => (
                                      <div key={base} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                        <div className={`${getBaseColorClass(base)} px-3 py-1 flex items-center justify-between`}>
                                          <span className="text-[9px] font-black text-white uppercase tracking-wider">{base}</span>
                                        </div>
                                        <div className="p-2 space-y-2">
                                          {groupedByBase[base].map((occ, idx) => (
                                            <div key={`${occ.id}-${idx}`} className={`space-y-1.5 ${idx > 0 ? 'pt-2 border-t border-slate-100' : ''}`}>
                                              <div className="flex items-center justify-between">
                                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                                  occ.type === 'Ocorrência' ? 'bg-red-100 text-red-600' :
                                                  occ.type === 'Orientação' ? 'bg-blue-100 text-blue-600' :
                                                  occ.type === 'Monitoramento' ? 'bg-emerald-100 text-emerald-600' :
                                                  occ.type === 'CFTV' ? 'bg-purple-100 text-purple-600' :
                                                  'bg-slate-100 text-slate-600'
                                                }`}>
                                                  {occ.type}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  {occ.keepUntil && (
                                                    <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded flex items-center gap-0.5">
                                                      <Pin size={8} /> {formatRetentionLabel(occ.keepUntil)}
                                                    </span>
                                                  )}
                                                  <span className="text-[7px] font-bold text-slate-300">{occ.operator} • {formatTimeSafe(occ.createdAt)}</span>
                                                  {canUserDelete(occ) ? (
                                                    <button 
                                                      onClick={() => handleDeleteOccurrence(occ.id)}
                                                      className="text-slate-300 hover:text-red-500 transition-colors"
                                                      title="Excluir Ocorrência"
                                                    >
                                                      <X size={10} />
                                                    </button>
                                                  ) : (
                                                    <span title="Item fixo com data futura (apenas Deny pode excluir)">
                                                      <Lock size={10} className="text-slate-300 opacity-60" />
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                                {occ.type === 'Checklist do Setor' ? (() => {
                                                  const decoded = decodeChecklist(getActualDescription(occ.description));
                                                  if (decoded) {
                                                    return (
                                                      <div className="flex flex-col gap-1 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-bold ${decoded.cafeteira ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.cafeteira ? '✓' : '✗'}</span>
                                                          <span>Cafeteira limpa</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-bold ${decoded.limpeza ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.limpeza ? '✓' : '✗'}</span>
                                                          <span>Limpeza e conservação da Sala</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-bold ${decoded.organizacao ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.organizacao ? '✓' : '✗'}</span>
                                                          <span>Organização das Mesas</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-bold ${decoded.arCondicionado ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.arCondicionado ? '✓' : '✗'}</span>
                                                          <span>Ar condicionado</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-bold ${decoded.alertasRastreador ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.alertasRastreador ? '✓' : '✗'}</span>
                                                          <span>Alertas Rastreador Tratados</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-bold ${decoded.alertasCFTV ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.alertasCFTV ? '✓' : '✗'}</span>
                                                          <span>Alertas CFTV Tratados</span>
                                                        </div>
                                                        {decoded.description && (
                                                          <div className="mt-1 text-[10px] text-slate-500 italic">
                                                            Obs: {renderFormattedDescription(decoded.description, true)}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  }
                                                  return renderFormattedDescription(getActualDescription(occ.description), true);
                                                })() : renderFormattedDescription(getActualDescription(occ.description), true)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {renderCalendar()}
              </div>
            </div>
          )}
        </div>
      ) : activeView === 'audit' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Eye className="text-amber-500" size={20} />
              Auditoria de Alterações e Exclusões
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : auditOccurrences.length === 0 ? (
              <div className="text-center p-12 text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma alteração ou exclusão registrada.
              </div>
            ) : (
              <div className="space-y-4">
                {auditOccurrences.map((occ, idx) => {
                  const actualDesc = getActualDescription(occ.description);
                  const auditLog = getAuditLog(occ.description);
                  const isDeleted = auditLog.includes('[EXCLUÍDO');
                  
                  return (
                    <div key={`${occ.id}-${idx}`} className={`p-4 rounded-xl border ${isDeleted ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase bg-white px-2 py-1 rounded-md shadow-sm text-slate-600">
                            {occ.base}
                          </span>
                          <span className="text-xs font-black uppercase bg-white px-2 py-1 rounded-md shadow-sm text-slate-600">
                            {occ.type}
                          </span>
                          {isDeleted && (
                            <span className="text-xs font-black uppercase bg-red-500 text-white px-2 py-1 rounded-md shadow-sm">
                              Excluído
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {formatDateTimeSafe(occ.createdAt)}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm font-medium text-slate-700">
                          {occ.type === 'Checklist do Setor' ? (() => {
                            const decoded = decodeChecklist(actualDesc);
                            if (decoded) {
                              return (
                                <div className="flex flex-col gap-1 mt-2 bg-white/50 p-3 rounded-xl border border-black/5">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${decoded.cafeteira ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.cafeteira ? '✓' : '✗'}</span>
                                    <span>Cafeteira limpa</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${decoded.limpeza ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.limpeza ? '✓' : '✗'}</span>
                                    <span>Limpeza e conservação da Sala</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${decoded.organizacao ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.organizacao ? '✓' : '✗'}</span>
                                    <span>Organização das Mesas</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${decoded.arCondicionado ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.arCondicionado ? '✓' : '✗'}</span>
                                    <span>Ar condicionado</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${decoded.alertasRastreador ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.alertasRastreador ? '✓' : '✗'}</span>
                                    <span>Alertas Rastreador Tratados</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${decoded.alertasCFTV ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.alertasCFTV ? '✓' : '✗'}</span>
                                    <span>Alertas CFTV Tratados</span>
                                  </div>
                                  {decoded.description && (
                                    <div className="mt-2 text-xs text-slate-500 italic">
                                      Obs: {renderFormattedDescription(decoded.description)}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return renderFormattedDescription(actualDesc);
                          })() : renderFormattedDescription(actualDesc)}
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-black/5">
                        <h4 className="text-xs font-black text-slate-500 uppercase mb-2">Histórico de Alterações:</h4>
                        <div className="space-y-1">
                          {auditLog.split('\n').filter(Boolean).map((log, i) => (
                            <div key={i} className="text-xs font-medium text-slate-600 flex items-start gap-2">
                              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs font-bold text-slate-400 text-right">
                        Operador Original: {occ.operator}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Premium Tooltip Modal */}
      {selectedDateOccs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-emerald-100">
            <div className="p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <CalendarIcon size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black leading-none">
                    {new Date(selectedDateOccs.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1">
                    {selectedDateOccs.occs.length} Ocorrências registradas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopyEmail(selectedDateOccs.occs)}
                  className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                >
                  <Copy size={18} /> Copiar E-mail
                </button>
                <button 
                  onClick={() => setSelectedDateOccs(null)}
                  className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {['Diurno', 'Noturno'].map(s => {
                  const shiftOccs = selectedDateOccs.occs.filter(o => o.shift === s);
                  
                  if (shiftOccs.length === 0) return (
                    <div key={s} className="space-y-4 opacity-30 hidden lg:block">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400">
                          <Clock size={20} />
                        </div>
                        <h4 className="text-lg font-black text-slate-400 uppercase tracking-tight">Turno {s} - Sem Ocorrências</h4>
                      </div>
                    </div>
                  );

                  const groupedByBase = shiftOccs.reduce((acc, occ) => {
                    if (!acc[occ.base]) acc[occ.base] = [];
                    acc[occ.base].push(occ);
                    return acc;
                  }, {} as Record<string, typeof shiftOccs>);

                  const sortedBases = Object.keys(groupedByBase).sort((a, b) => {
                    if (a === 'Geral') return 1;
                    if (b === 'Geral') return -1;
                    return a.localeCompare(b, 'pt-BR');
                  });

                  return (
                    <div key={s} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s === 'Diurno' ? 'bg-orange-100 text-orange-500' : 'bg-indigo-100 text-indigo-500'}`}>
                          <Clock size={20} />
                        </div>
                        <h4 className="text-lg font-black text-slate-700 uppercase tracking-tight">Turno {s}</h4>
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCopyEmail(shiftOccs); }}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:text-emerald-600 hover:border-emerald-200 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                          title={`Copiar Modelo de E-mail - Turno ${s}`}
                        >
                          <Copy size={14} /> Copiar Turno
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {sortedBases.map(base => (
                          <div key={base} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col">
                            <div className={`${getBaseColorClass(base)} px-4 py-2 flex items-center justify-between`}>
                              <span className="text-xs font-black text-white uppercase tracking-widest">{base}</span>
                            </div>
                            <div className="p-5 space-y-5">
                              {groupedByBase[base].map((occ, idx) => (
                                <div key={`${occ.id}-${idx}`} className={`space-y-3 ${idx > 0 ? 'pt-5 border-t border-slate-100' : ''}`}>
                                  <div className="flex items-center justify-between">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                      occ.type === 'Ocorrência' ? 'bg-red-100 text-red-600' :
                                      occ.type === 'Orientação' ? 'bg-blue-100 text-blue-600' :
                                      occ.type === 'Monitoramento' ? 'bg-emerald-100 text-emerald-600' :
                                      occ.type === 'CFTV' ? 'bg-purple-100 text-purple-600' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {occ.type}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {new Date(occ.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="text-sm text-slate-600 font-medium leading-relaxed">
                                    {occ.type === 'Checklist do Setor' ? (() => {
                                      const decoded = decodeChecklist(getActualDescription(occ.description));
                                      if (decoded) {
                                        return (
                                          <div className="flex flex-col gap-1 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2">
                                              <span className={`font-bold ${decoded.cafeteira ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.cafeteira ? '✓' : '✗'}</span>
                                              <span>Cafeteira limpa</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={`font-bold ${decoded.limpeza ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.limpeza ? '✓' : '✗'}</span>
                                              <span>Limpeza e conservação da Sala</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={`font-bold ${decoded.organizacao ? 'text-emerald-500' : 'text-red-500'}`}>{decoded.organizacao ? '✓' : '✗'}</span>
                                              <span>Organização das Mesas</span>
                                            </div>
                                            {decoded.description && (
                                              <div className="mt-2 text-xs text-slate-500 italic">
                                                Obs: {renderFormattedDescription(decoded.description)}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                      return renderFormattedDescription(getActualDescription(occ.description));
                                    })() : renderFormattedDescription(getActualDescription(occ.description))}
                                  </div>
                                  <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-emerald-600 uppercase">
                                        Operador: {occ.operator}
                                      </span>
                                      {occ.keepUntil && (
                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                          <Pin size={10} /> {formatRetentionLabel(occ.keepUntil)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => { handleEdit(occ); setSelectedDateOccs(null); }}
                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      {canUserDelete(occ) ? (
                                        <button 
                                          onClick={() => handleDeleteOccurrence(occ.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                          <X size={14} />
                                        </button>
                                      ) : (
                                        <span title="Item fixo com data futura (apenas Deny pode excluir)">
                                          <Lock size={12} className="text-slate-300 opacity-60" />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedDateOccs(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-all active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Manter / Renovar Retenção */}
      {renewOccModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Pin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">Manter / Renovar Informação</h3>
                  <p className="text-amber-100 text-xs font-medium">Defina a permanência nas passagens futuras</p>
                </div>
              </div>
              <button 
                onClick={() => setRenewOccModal(null)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase">Informação selecionada</span>
                <p className="text-xs font-semibold text-slate-700 line-clamp-2">
                  {getActualDescription(renewOccModal.description)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Opções de permanência</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRenewKeepType('none'); setRenewKeepDate(''); }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      renewKeepType === 'none'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Apenas hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenewKeepType('date');
                      if (!renewKeepDate) {
                        setRenewKeepDate(getTodayDateTimeLocalStr(12));
                      }
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      renewKeepType === 'date'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Nova Data/Hora
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRenewKeepType('indefinite'); setRenewKeepDate(''); }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      renewKeepType === 'indefinite'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Indeterminado
                  </button>
                </div>

                {renewKeepType === 'date' && (
                  <div className="pt-2 flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 shrink-0">Prorrogar até dia e horário:</label>
                    <input 
                      type="datetime-local"
                      min={getMinDateTimeLocalStr()}
                      value={renewKeepDate}
                      onChange={(e) => setRenewKeepDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button 
                type="button"
                onClick={() => setRenewOccModal(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl text-xs transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSaveRenew}
                disabled={isSaving || (renewKeepType === 'date' && !renewKeepDate)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? <MoreHorizontal size={14} className="animate-pulse" /> : <Pin size={14} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Nova Base */}
      {showAddBaseModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">Nova Base</h3>
                  <p className="text-emerald-100 text-xs font-medium">Cadastrar nova base no sistema</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddBaseModal(false)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewBase} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Nome da Base:</label>
                <input 
                  type="text"
                  autoFocus
                  placeholder="Ex: São Paulo, Campinas, Curitiba..."
                  value={newBaseInput}
                  onChange={(e) => setNewBaseInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  A base será adicionada em ordem alfabética e ficará disponível para os próximos registros.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setShowAddBaseModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newBaseInput.trim()}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Novo Tipo */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">Novo Tipo</h3>
                  <p className="text-emerald-100 text-xs font-medium">Cadastrar categoria de ocorrência</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddTypeModal(false)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewType} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Nome do Tipo:</label>
                <input 
                  type="text"
                  autoFocus
                  placeholder="Ex: Ronda, Portaria, Ronda Noturna..."
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  O tipo ficará salvo e disponível no menu de seleção de ocorrências.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newTypeInput.trim()}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftHandover;
