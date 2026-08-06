
import { Evaluation, DriverStats, VehicleStats, DashboardMetrics, DriverProfile, DashboardFilters, EvaluatorStats, OperatorProfile, PriorityDriverStatus, AccessLog, UserRole, InternalTicket, DriverJustification, ShiftOccurrence, BolaPreta } from '../types';

// --- CONSTANTES E CONFIGURAÇÕES PADRÃO ---
export const DEFAULT_SHEET_ID = "1SGVD01AwpwVTbkQRVF1vfLbKzRmgJs-GBPKQd1pOfLU";
export const DEFAULT_GID_EVALS = "1322723738";     // Aba: Avaliação Direção
export const DEFAULT_GID_DRIVERS = "1049209889";   // Aba: Motoristas
export const DEFAULT_GID_OPERATORS = "508594093";  // Aba: Operadores
export const DEFAULT_GID_ACCESS = "0";             // Aba: Portaria
export const DEFAULT_GID_TICKETS = "1296469863";   // Aba: Chamados Internos
export const DEFAULT_GID_SHIFT_HANDOVER = "1195850538"; // Aba: Passagem de Plantão
export const DEFAULT_GID_BOLA_PRETA = "1795892818";     // Aba: Bola Preta
export const DEFAULT_GID_MACROS = "1523982576";                 // Aba: Macros
export const DEFAULT_GID_FLEET = "896980151";                  // Aba: Frota (Novo)

// ATENÇÃO: Atualize esta URL se você criar uma NOVA implantação.
// Se usar "Gerenciar Implantações > Nova Versão", a URL mantém-se a mesma.
export const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw1DlbXw6AKdnksiiIBpwOSYcj-kfGb3HPEhiwSJhH_n90FhmNR05eqf7PTPpzpvnShvQ/exec";

export const DEFAULT_DRIVE_FOLDER_ID = "1QjcgNaMbyQECI5u_g1UAPW5ZySJ9dkJv"; 

export interface FullEvaluation extends Evaluation {
    rawRow?: string[]; 
}

let rawData: FullEvaluation[] = [];
let managedDrivers: DriverProfile[] = [];
let managedOperators: OperatorProfile[] = []; 
let accessLogs: AccessLog[] = [];
let internalTickets: InternalTicket[] = [];
let shiftOccurrences: ShiftOccurrence[] = [];
let bolaPretaRecords: BolaPreta[] = [];
let macroData: any[] = [];
let fleetData: any[] = [];
let pendingOperations = 0;
let lastOperationTime = 0;
let driverOverrides: Record<string, { hasCamera?: boolean }> = {};

let globalSheetConfig = {
    sheetId: DEFAULT_SHEET_ID,
    gid: DEFAULT_GID_EVALS,
    gidDrivers: DEFAULT_GID_DRIVERS,
    gidOperators: DEFAULT_GID_OPERATORS,
    gidAccess: DEFAULT_GID_ACCESS,
    gidTickets: DEFAULT_GID_TICKETS,
    gidShiftHandover: DEFAULT_GID_SHIFT_HANDOVER,
    gidBolaPreta: DEFAULT_GID_BOLA_PRETA,
    gidMacros: DEFAULT_GID_MACROS,
    gidFleet: DEFAULT_GID_FLEET
};
let globalScriptUrl = DEFAULT_SCRIPT_URL;

const safeLocalStorageSetItem = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.warn(`LocalStorage setItem falhou para a chave "${key}". Tentando liberar espaço limpando caches de imagem.`, e);
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('bp_img_cache_')) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(k => {
                try {
                    localStorage.removeItem(k);
                } catch (_) {}
            });
            
            localStorage.setItem(key, value);
            console.log(`Salvo com sucesso a chave "${key}" após limpar cache de imagem.`);
            return true;
        } catch (retryError) {
            console.error(`LocalStorage continua cheio após limpar cache. Chave "${key}" não foi salva.`, retryError);
            return false;
        }
    }
};

const syncLocalState = () => {
  try {
    const storedSheetConfig = localStorage.getItem('risel_sheet_config');
    if (storedSheetConfig) {
        try {
            const parsed = JSON.parse(storedSheetConfig);
            if (parsed && typeof parsed === 'object' && parsed.sheetId) {
                // Garantir que todos os GIDs obrigatórios estejam presentes se não existirem
                if (!parsed.gidMacros || parsed.gidMacros === "0") parsed.gidMacros = DEFAULT_GID_MACROS;
                if (!parsed.gidFleet || parsed.gidFleet === "0" || parsed.gidFleet === "1806306509") parsed.gidFleet = DEFAULT_GID_FLEET;
                if (!parsed.gidBolaPreta || parsed.gidBolaPreta === "0") parsed.gidBolaPreta = DEFAULT_GID_BOLA_PRETA;
                globalSheetConfig = { ...globalSheetConfig, ...parsed };
                // Salva de volta para garantir que a atualização fique persistente
                safeLocalStorageSetItem('risel_sheet_config', JSON.stringify(globalSheetConfig));
            }
        } catch (e) {
            console.warn("Error parsing sheet config:", e);
        }
    }
    
    const storedScriptUrl = localStorage.getItem('risel_script_url');
    if (storedScriptUrl) {
        if (!storedScriptUrl || storedScriptUrl !== DEFAULT_SCRIPT_URL) {
            globalScriptUrl = DEFAULT_SCRIPT_URL;
            safeLocalStorageSetItem('risel_script_url', DEFAULT_SCRIPT_URL);
        } else {
            globalScriptUrl = storedScriptUrl;
        }
    } else {
        globalScriptUrl = DEFAULT_SCRIPT_URL;
    }
    
    const storedOverrides = localStorage.getItem('risel_driver_overrides');
    if (storedOverrides) {
        try {
            const parsed = JSON.parse(storedOverrides);
            if (parsed && typeof parsed === 'object') {
                driverOverrides = parsed;
            } else {
                driverOverrides = {};
            }
        } catch (e) {
            driverOverrides = {};
        }
    }

    const pendingEvals = localStorage.getItem('risel_pending_evals');
    if (pendingEvals) {
        try {
            const parsed = JSON.parse(pendingEvals);
            if (Array.isArray(parsed)) {
                rawData = parsed;
            } else {
                rawData = [];
            }
        } catch (e) {
            rawData = [];
        }
    }
  } catch (e) {
      console.warn("Error syncing local state:", e);
  }
};

syncLocalState();

// Normaliza texto removendo acentos e convertendo para maiúsculas
export const normalizeText = (text: string): string => {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
};

export const normalizeEvaluatorName = (name: string): string => {
    if (!name) return "SISTEMA";
    return normalizeText(name).split(' ')[0];
};

const callAppsScript = async (payload: any, maxRetries = 3) => {
    const scriptUrl = getGoogleScriptUrl();
    const sheetId = getGoogleSheetConfig().sheetId;
    if (!scriptUrl) throw new Error("URL do Script não configurada.");

    const body = JSON.stringify({ 
        ...payload, 
        sheetId,
        driveFolderId: DEFAULT_DRIVE_FOLDER_ID 
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                body: body
            });
            return; 
        } catch (e) {
            if (attempt === maxRetries) throw e;
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
    }
};

export const getGoogleSheetConfig = () => globalSheetConfig;
export const saveGoogleSheetConfig = async (config: any) => {
  globalSheetConfig = { ...globalSheetConfig, ...config };
  safeLocalStorageSetItem('risel_sheet_config', JSON.stringify(globalSheetConfig));
  window.location.reload();
};

export const resetGoogleSheetConfig = async () => {
  const defaults = {
    sheetId: DEFAULT_SHEET_ID,
    gid: DEFAULT_GID_EVALS,
    gidDrivers: DEFAULT_GID_DRIVERS,
    gidOperators: DEFAULT_GID_OPERATORS,
    gidAccess: DEFAULT_GID_ACCESS,
    gidTickets: DEFAULT_GID_TICKETS,
    gidShiftHandover: DEFAULT_GID_SHIFT_HANDOVER,
    gidBolaPreta: DEFAULT_GID_BOLA_PRETA,
    gidMacros: DEFAULT_GID_MACROS,
    gidFleet: DEFAULT_GID_FLEET
  };
  globalSheetConfig = defaults;
  safeLocalStorageSetItem('risel_sheet_config', JSON.stringify(defaults));
  safeLocalStorageSetItem('risel_script_url', DEFAULT_SCRIPT_URL);
  window.location.reload();
};

export const getGoogleScriptUrl = () => globalScriptUrl;
export const saveGoogleScriptUrl = (url: string) => {
    globalScriptUrl = url;
    safeLocalStorageSetItem('risel_script_url', url);
};

// Normaliza data para o formato YYYY-MM-DD
export const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const dateOnly = dateStr.trim().split(' ')[0];
    const cleanDate = dateOnly.replace(/\./g, '-').replace(/\//g, '-');
    const parts = cleanDate.split('-');
    
    if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
            let day = parts[0].padStart(2, '0');
            let month = parts[1].padStart(2, '0');
            let year = parts[2];
            
            // Format fallback (dd/mm/yy to dd/mm/yyyy)
            if (year.length === 2) {
               year = "20" + year; 
            }
            
            // Check if M/D/YYYY (American locale excel fallback from 'raw: false' output without strict rules)
            // If the "month" field is bigger than 12, then it must be the day, they are swapped!
            if (parseInt(month, 10) > 12) {
                 const tmp = day;
                 day = month;
                 month = tmp;
            }

            return `${year}-${month}-${day}`;
        }
    }
    return dateStr;
};

const parseDateTimeToISO = (dateStr: string, timeStr: string): string | null => {
  if (!dateStr) return null;
  const cleanDate = dateStr.trim().replace(/\./g, '-').replace(/\//g, '-');
  const cleanTime = (timeStr || '00:00').trim();
  
  let day, month, year;
  const parts = cleanDate.split('-');
  
  if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
      } else { // DD-MM-YYYY
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
      }
  } else {
      const d = new Date(dateStr + ' ' + cleanTime);
      return isNaN(d.getTime()) ? null : d.toISOString();
  }
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 100) year += 2000;
  
  let hours = 0, minutes = 0;
  const timeParts = cleanTime.replace(/[^\d:]/g, '').split(':');
  if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
  }
  
  const d = new Date(year, month, day, hours, minutes, 0);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const parseCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuote && text[i + 1] === '"') { current += '"'; i++; } else inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      row.push(current); current = '';
    } else if ((char === '\r' || char === '\n') && !inQuote) {
      if (row.length > 0 || current) { row.push(current); result.push(row); }
      row = []; current = '';
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else current += char;
  }
  if (row.length > 0 || current) { row.push(current); result.push(row); }
  return result;
};

export const loadShiftOccurrencesData = async (cacheBust = true): Promise<void> => {
  const { sheetId, gidShiftHandover } = globalSheetConfig;
  if (!gidShiftHandover) return;
  
  // Don't overwrite local state while sync is pending or recently finished
  if (pendingOperations > 0 || (Date.now() - lastOperationTime < 10000)) return; 
  
  try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidShiftHandover}${cacheBust ? '&t='+Date.now() : ''}`;
      const res = await fetch(url);
      if (res.ok) {
          const shiftData = await res.text();
          if (shiftData && !shiftData.startsWith('<!D')) {
              const rows = parseCSV(shiftData);
              shiftOccurrences = rows.slice(1).map(r => ({
                  id: r[0],
                  date: normalizeDate(r[1]),
                  shift: r[2] as any,
                  type: r[3] as any,
                  base: r[4],
                  description: r[5],
                  operator: r[6],
                  finalized: String(r[7]).trim().toUpperCase() === 'TRUE',
                  createdAt: r[8]
              }));
          }
      }
  } catch (e) {
      console.error("Error loading shift occurrences:", e);
  }
};

export const loadData = async (cacheBust = true): Promise<void> => {
  const { sheetId, gidAccess, gidDrivers, gidOperators, gid, gidTickets, gidShiftHandover } = globalSheetConfig;
  const fetchCSV = async (gidParam: string) => {
      try {
          const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidParam}${cacheBust ? '&t='+Date.now() : ''}`;
          const res = await fetch(url);
          if (res.ok) return await res.text();
      } catch (e) {}
      return null;
  };

  const drvData = await fetchCSV(gidDrivers);
  if (drvData && !drvData.startsWith('<!D')) {
      const rows = parseCSV(drvData);
      managedDrivers = rows.slice(1).map((r, i) => {
          const name = (r[1] || '').trim().toUpperCase();
          const camVal = (r[3] || '').trim().toUpperCase();
          let hasCamera = true;
          if (camVal === 'NÃO' || camVal === 'NAO' || camVal === 'FALSE') hasCamera = false;
          if (driverOverrides && driverOverrides[name] && driverOverrides[name].hasCamera !== undefined) {
              hasCamera = driverOverrides[name].hasCamera!;
          }
          
          let justifications: DriverJustification[] = [];
          if (r[5] && r[5].trim()) {
              try {
                  justifications = JSON.parse(r[5]);
              } catch (e) { }
          }
          
          const activeVal = (r[6] || '').trim().toUpperCase();
          let isActive = true;
          if (activeVal === 'NÃO' || activeVal === 'NAO' || activeVal === 'FALSE' || activeVal === 'INATIVO') isActive = false;
          const inactivationDate = r[7] || '';

          return { 
              id: r[0] || `d-${i}`, 
              name, 
              base: r[2] || 'N/A', 
              hasCamera, 
              lastModified: r[4] || new Date().toISOString(),
              justifications,
              isActive,
              inactivationDate
          };
      }).filter(d => d.name);
  }

  const opData = await fetchCSV(gidOperators);
  if (opData && !opData.startsWith('<!D')) {
      const rows = parseCSV(opData);
      managedOperators = rows.slice(1).map((r, i) => {
          const rawRole = (r[2] || '').trim().toUpperCase();
          const name = (r[1] || '').trim().toUpperCase();
          let role: UserRole = 'operator';
          
          // Role Detection
          if (name === 'CARLOS' || rawRole.includes('MONITOR')) role = 'monitor';
          else if (rawRole.includes('ADMIN')) role = 'admin';
          else if (rawRole.includes('QUALIDADE')) role = 'quality';

          // menus
          let menus: string[] = [];
          const rawMenus = r[5];
          if (rawMenus && rawMenus.trim()) {
              try {
                  menus = JSON.parse(rawMenus);
              } catch (e) {
                  // Fallback para lista separada por vírgula se não for JSON válido
                  menus = rawMenus.split(',').map(m => m.trim()).filter(Boolean);
              }
          }

          return {
              id: r[0] || `op-${i}`, 
              name: name, 
              password: (r[3] || '').trim(), 
              role: role, 
              createdAt: r[4] || '',
              menus: menus
          };
      }).filter(o => o.name);

      // Sincronizar as permissões no localStorage a partir da nuvem
      try {
          const storedPermissions = localStorage.getItem('risel_operators_menus');
          let permissionsMap = {};
          if (storedPermissions) {
              try {
                  const parsed = JSON.parse(storedPermissions);
                  if (parsed && typeof parsed === 'object') {
                      permissionsMap = parsed;
                  }
              } catch (e) {}
          }
          let updated = false;

          managedOperators.forEach(op => {
              const opNameKey = op.name.toUpperCase().trim();
              if (op.menus && op.menus.length > 0) {
                  permissionsMap[opNameKey] = op.menus;
                  updated = true;
              }
          });

          if (updated) {
              safeLocalStorageSetItem('risel_operators_menus', JSON.stringify(permissionsMap));
          }
      } catch (e) {
          console.error("Erro ao sincronizar permissões de menus para o localStorage:", e);
      }
  }

  const evalData = await fetchCSV(gid);
  if (evalData && !evalData.startsWith('<!D')) {
      const rows = parseCSV(evalData);
      const newRawData = rows.slice(1).map((r, i) => {
          const isoDate = parseDateTimeToISO(r[6], r[7]);
          if (!isoDate) return null;
          let score = parseFloat((r[48] || '0').replace('%', '').replace(',', '.'));
          if (isNaN(score)) score = 0;
          if (score <= 1 && score > 0) score *= 100;
          return {
              id: r[0] || `ev-${i}`, driver: (r[1] || '').trim().toUpperCase(), evaluator: (r[2] || '').trim().toUpperCase(),
              vehicle: (r[4] || '').trim().toUpperCase(), base: (r[5] || '').trim().toUpperCase(),
              timestamp: isoDate, score: score, rawRow: r 
          } as FullEvaluation;
      }).filter((e): e is FullEvaluation => e !== null);
      
      const currentPending = rawData.filter(local => local.id.startsWith('web-'));
      const stillPending = currentPending.filter(local => !newRawData.find(rem => rem.id === local.id));
      rawData = [...stillPending, ...newRawData].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
      safeLocalStorageSetItem('risel_pending_evals', JSON.stringify(rawData.filter(e => e.id.startsWith('web-'))));
  }

  const accData = await fetchCSV(gidAccess);
  if (accData && !accData.startsWith('<!D')) {
      const rows = parseCSV(accData);
      const newLogs = rows.slice(1).map((r, i) => ({
          id: r[0] || `acc-${i}`, operator: r[1] || '', location: (r[2] as any) || 'CANCELA', dateTime: r[3] || '', visitorName: r[4] || '', visitorCompany: r[5] || '', personVisited: r[6] || '', vehiclePlate: r[7] || ''
      })).filter(a => a.id);
      const currentPendingAcc = accessLogs.filter(l => l.id.startsWith('ACC-'));
      const stillPendingAcc = currentPendingAcc.filter(local => !newLogs.find(rem => rem.id === local.id));
      accessLogs = [...stillPendingAcc, ...newLogs].sort((a,b) => b.dateTime.localeCompare(a.dateTime));
  }

  if (gidTickets) {
      const ticketData = await fetchCSV(gidTickets);
      if (ticketData && !ticketData.startsWith('<!D')) {
          const rows = parseCSV(ticketData);
          const newTickets = rows.slice(1).map((r, i) => ({
              id: r[0] || `tkt-${i}`,
              status: (r[1] as any) || 'Em Aberto',
              operator: r[2] || '',
              date: r[3] || '',
              fleetTicket: r[4] || '', 
              base: r[5] || '', 
              requestType: r[6] || '', 
              description: r[7] || '',
              ticketNumber: r[8] || '', 
              scheduledDate: r[9] || '', 
              isDone: r[10] === 'SIM',
              attachmentName: r[11] || '',
          })).filter(t => t.id);
          const currentPendingTickets = internalTickets.filter(t => t.id.startsWith('TKT-'));
          const stillPendingTickets = currentPendingTickets.filter(local => !newTickets.find(rem => rem.id === local.id));
          internalTickets = [...stillPendingTickets, ...newTickets].sort((a,b) => b.id.localeCompare(a.id));
      }
  }

  if (gidShiftHandover) {
      const shiftData = await fetchCSV(gidShiftHandover);
      if (shiftData && !shiftData.startsWith('<!D')) {
          const rows = parseCSV(shiftData);
          shiftOccurrences = rows.slice(1).map(r => ({
              id: r[0],
              date: normalizeDate(r[1]),
              shift: r[2] as any,
              type: r[3] as any,
              base: r[4],
              description: r[5],
              operator: r[6],
              finalized: String(r[7]).trim().toUpperCase() === 'TRUE',
              createdAt: r[8]
          }));
      }
  }

  if (globalSheetConfig.gidBolaPreta) {
      const bpData = await fetchCSV(globalSheetConfig.gidBolaPreta);
      if (bpData && !bpData.startsWith('<!D')) {
          const rows = parseCSV(bpData);
          bolaPretaRecords = rows.slice(1).map(r => ({
              id: r[0],
              operator: r[1],
              status: (r[2] as any) || 'Aberto',
              date: normalizeDate(r[3]),
              vehicle: r[4],
              plate: r[5],
              base: r[6],
              driver: r[7],
              startTime: r[8],
              departureTime: r[9],
              macroClients: r[10],
              macroClientsObs: r[11],
              timeAtClient: r[12],
              avgTimeClients: r[13],
              informedStopsCount: r[14],
              totalStopsTime: r[15],
              arrivalBaseTime: r[16],
              endTime: r[17],
              kmDriven: r[18],
              uninformedStops: r[19] ? String(r[19]).split(' - ')[0] : 'Não',
              uninformedStopsObs: r[19] && String(r[19]).includes(' - ') ? String(r[19]).split(' - ')[1] : '',
              suspiciousActivity: r[20] ? String(r[20]).split(' - ')[0] : 'Não',
              suspiciousActivityObs: r[20] && String(r[20]).includes(' - ') ? String(r[20]).split(' - ')[1] : '',
              createdAt: r[21],
              printImage1: r[22] || '',
              printImage2: r[23] || '',
              printImage3: r[24] || '',
              mapImage: r[25] || '',
              verificationStatus: r[26] ? (String(r[26]).split(' - ')[0] as any) : 'OK',
              verificationStatusObs: r[26] && String(r[26]).includes(' - ') ? String(r[26]).split(' - ')[1] : '',
              telemetryInfractions: r[27] || 'Não',
              telemetryOptions: r[28] ? String(r[28]).split(',').filter(Boolean) : [],
              videoTelemetryInfractions: r[29] || 'Não',
              videoTelemetryOptions: r[30] ? String(r[30]).split(',').filter(Boolean) : [],
              celularImage: r[31] || '',
              fumandoImage: r[32] || '',
              cintoImage: r[33] || '',
              printImage1Desc: r[34] || '',
              printImage2Desc: r[35] || '',
              printImage3Desc: r[36] || '',
              celularImageDesc: r[37] || '',
              fumandoImageDesc: r[38] || '',
              cintoImageDesc: r[39] || ''
          }));
      }
  }

  if (globalSheetConfig.gidMacros) {
      const macroRaw = await fetchCSV(globalSheetConfig.gidMacros);
      if (macroRaw && !macroRaw.startsWith('<!D')) {
          const rows = parseCSV(macroRaw);
          macroData = rows.slice(1); // Store raw rows for complex processing
      }
  }

  if (globalSheetConfig.gidFleet) {
      const fleetRaw = await fetchCSV(globalSheetConfig.gidFleet);
      if (fleetRaw && !fleetRaw.startsWith('<!D')) {
          const rows = parseCSV(fleetRaw);
          fleetData = rows.slice(1).map(r => ({
              frota: r[0],
              placa: (r[1] || '').toUpperCase().trim(),
              base: r[2]
          }));
      }
  }
};

export const saveEvaluation = async (data: any, existingId?: string) => {
    const docId = existingId || `web-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const row = new Array(55).fill(""); 
    row[0] = docId; 
    row[1] = data.header.driverName; 
    row[2] = data.header.evaluator; 
    row[3] = data.header.transportadora; 
    row[4] = data.header.frota; 
    row[5] = data.header.base; 
    row[6] = data.header.date; 
    row[7] = data.header.time; 
    row[8] = data.header.local; 
    
    const colMap: Record<string, number> = {
        'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
        'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25, 'AA': 26, 'AB': 27, 'AC': 28,
        'AD': 29, 'AE': 30, 'AF': 31, 'AG': 32, 'AH': 33, 'AI': 34, 'AJ': 35, 'AK': 36, 'AL': 37, 'AM': 38
    };
    Object.keys(data.checklist).forEach(key => { if (colMap[key]) row[colMap[key]] = data.checklist[key]; });
    
    const filesToUpload: any[] = [];
    data.images.forEach((img: any) => {
        if (img.base64) {
            const imgFileName = `${docId}.${img.col}.png`;
            filesToUpload.push({ name: imgFileName, base64: img.base64, mimeType: 'image/png' });
            const imgMap: Record<string, number> = { 'AN': 39, 'AO': 40, 'AP': 41, 'AQ': 42 };
            if (imgMap[img.col]) row[imgMap[img.col]] = imgFileName;
        } else if (img.fileName) {
            const imgMap: Record<string, number> = { 'AN': 39, 'AO': 40, 'AP': 41, 'AQ': 42 };
            if (imgMap[img.col]) row[imgMap[img.col]] = img.fileName;
        }
    });

    const footerMap: Record<string, number> = {
        'AR': 43, 'AS': 44, 'AT': 45, 'AU': 46, 'AV': 47, 'AW': 48, 
        'AX': 49, 'AY': 50, 'AZ': 51, 'BA': 52, 'BB': 53
    };
    Object.keys(data.footer).forEach(key => { if (footerMap[key]) row[footerMap[key]] = data.footer[key]; });

    const isoDate = parseDateTimeToISO(data.header.date, data.header.time) || new Date().toISOString();
    const newEval: FullEvaluation = {
        id: docId, driver: data.header.driverName, evaluator: data.header.evaluator,
        vehicle: data.header.frota, base: data.header.base,
        timestamp: isoDate, score: parseFloat(String(data.footer['AW']).replace('%', '')) || 0,
        rawRow: row
    };
    
    const idx = rawData.findIndex(e => e.id === docId);
    if (idx !== -1) rawData[idx] = newEval;
    else rawData.unshift(newEval);
    
    safeLocalStorageSetItem('risel_pending_evals', JSON.stringify(rawData.filter(e => e.id.startsWith('web-'))));

    try {
        await callAppsScript({ 
            type: existingId ? 'updateEvaluation' : 'evaluation', 
            id: docId, row: row, files: filesToUpload
        });
    } catch (err) {
        console.warn("Falha na sincronização imediata, ficará pendente localmente.", err);
        throw err;
    }
};

export const deleteEvaluation = async (id: string) => {
    rawData = rawData.filter(e => e.id !== id);
    safeLocalStorageSetItem('risel_pending_evals', JSON.stringify(rawData.filter(e => e.id.startsWith('web-'))));
    await callAppsScript({ type: 'deleteEvaluation', id });
};

export const saveAccessLog = async (logData: Omit<AccessLog, 'id'>) => {
    const id = `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const row = [id, logData.operator, logData.location, logData.dateTime, logData.visitorName, logData.visitorCompany, logData.personVisited, logData.vehiclePlate];
    accessLogs.unshift({ id, ...logData });
    await callAppsScript({ type: 'addAccessLog', row, gid: globalSheetConfig.gidAccess });
};

export const updateAccessLog = async (id: string, logData: Partial<AccessLog>) => {
    const idx = accessLogs.findIndex(l => l.id === id);
    if (idx !== -1) { 
        accessLogs[idx] = { ...accessLogs[idx], ...logData }; 
        const updatedLog = accessLogs[idx];
        const row = [
            updatedLog.id, 
            updatedLog.operator, 
            updatedLog.location, 
            updatedLog.dateTime, 
            updatedLog.visitorName, 
            updatedLog.visitorCompany, 
            updatedLog.personVisited, 
            updatedLog.vehiclePlate
        ];
        await callAppsScript({ type: 'updateAccessLog', id, row, gid: globalSheetConfig.gidAccess });
    }
};

export const deleteAccessLog = async (id: string) => {
    accessLogs = accessLogs.filter(l => l.id !== id);
    await callAppsScript({ type: 'deleteAccessLog', id, gid: globalSheetConfig.gidAccess });
};

export const saveInternalTicket = async (ticketData: Omit<InternalTicket, 'id'>, fileBase64?: string, mimeType?: string) => {
    const id = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const finalAttachmentName = fileBase64 ? `${id}_ANEXO.${mimeType?.split('/')[1] || 'png'}` : ticketData.attachmentName;
    
    const cleanFleet = normalizeText(ticketData.fleetTicket);
    const cleanBase = normalizeText(ticketData.base);
    const cleanDesc = normalizeText(ticketData.description);
    const cleanReq = normalizeText(ticketData.requestType);
    const cleanTicketNum = normalizeText(ticketData.ticketNumber);

    const row = [
        id, 
        ticketData.status,
        ticketData.operator, 
        ticketData.date, 
        cleanFleet, 
        cleanBase,  
        cleanReq, 
        cleanDesc,
        cleanTicketNum, 
        ticketData.scheduledDate, 
        ticketData.isDone ? 'SIM' : 'NÃO',
        finalAttachmentName
    ];
    
    internalTickets.unshift({ 
        id, 
        ...ticketData, 
        fleetTicket: cleanFleet,
        base: cleanBase,
        description: cleanDesc, 
        requestType: cleanReq,
        ticketNumber: cleanTicketNum,
        attachmentName: finalAttachmentName 
    });
    
    const files = [];
    if (fileBase64) {
        files.push({ name: finalAttachmentName, base64: fileBase64, mimeType: mimeType || 'image/png' });
    }

    await callAppsScript({ 
        type: 'ticket', 
        row, 
        gid: globalSheetConfig.gidTickets,
        files: files
    });
};

export const updateInternalTicket = async (id: string, ticketData: Partial<InternalTicket>, fileBase64?: string, mimeType?: string) => {
    const idx = internalTickets.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    const currentTicket = internalTickets[idx];
    const finalAttachmentName = fileBase64 ? `${id}_ANEXO.${mimeType?.split('/')[1] || 'png'}` : (ticketData.attachmentName || currentTicket.attachmentName);
    
    const cleanFleet = ticketData.fleetTicket !== undefined ? normalizeText(ticketData.fleetTicket) : currentTicket.fleetTicket;
    const cleanBase = ticketData.base !== undefined ? normalizeText(ticketData.base) : currentTicket.base;
    const cleanDesc = ticketData.description !== undefined ? normalizeText(ticketData.description) : currentTicket.description;
    const cleanReq = ticketData.requestType !== undefined ? normalizeText(ticketData.requestType) : currentTicket.requestType;
    const cleanTicketNum = ticketData.ticketNumber !== undefined ? normalizeText(ticketData.ticketNumber) : currentTicket.ticketNumber;

    const updatedTicket = { 
        ...currentTicket, 
        ...ticketData, 
        fleetTicket: cleanFleet,
        base: cleanBase,
        description: cleanDesc,
        requestType: cleanReq,
        ticketNumber: cleanTicketNum,
        attachmentName: finalAttachmentName 
    };
    internalTickets[idx] = updatedTicket;

    const row = [
        id, 
        updatedTicket.status,
        updatedTicket.operator, 
        updatedTicket.date, 
        updatedTicket.fleetTicket, 
        updatedTicket.base,        
        updatedTicket.requestType, 
        updatedTicket.description,
        updatedTicket.ticketNumber,
        updatedTicket.scheduledDate,
        updatedTicket.isDone ? 'SIM' : 'NÃO',
        finalAttachmentName
    ];

    const files = [];
    if (fileBase64) {
        files.push({ name: finalAttachmentName, base64: fileBase64, mimeType: mimeType || 'image/png' });
    }

    await callAppsScript({ 
        type: 'updateTicket', 
        id,
        row, 
        gid: globalSheetConfig.gidTickets,
        files: files
    });
};

export const deleteInternalTicket = async (id: string) => {
    internalTickets = internalTickets.filter(t => t.id !== id);
    await callAppsScript({ type: 'deleteTicket', id, gid: globalSheetConfig.gidTickets });
};

export const getAccessLogs = () => accessLogs;
export const getInternalTickets = () => internalTickets;
export const getManagedOperators = () => managedOperators;
export const getManagedDrivers = () => managedDrivers;

export const getUniqueEvaluators = () => {
    const names = rawData.map(e => normalizeEvaluatorName(e.evaluator));
    return Array.from(new Set(names.filter(n => n && n !== "SISTEMA"))).sort();
};

export const getRawEvaluations = (f: DashboardFilters = {}, strictMode = false) => {
    return rawData.filter(ev => {
        const d = new Date(ev.timestamp);
        if (strictMode) {
            if (d.getFullYear() < 2025) return false;
            if (d.getFullYear() === 2025 && d.getMonth() < 9) return false;
            const driver = managedDrivers.find(drv => normalizeText(drv.name) === normalizeText(ev.driver));
            if (!driver || !driver.hasCamera) return false;
        }
        if (f.year && d.getFullYear() !== f.year) return false;
        if (f.month !== null && f.month !== undefined && d.getMonth() !== f.month) return false;
        if (f.driverName && !normalizeText(ev.driver).includes(normalizeText(f.driverName))) return false;
        if (f.evaluatorName && normalizeEvaluatorName(ev.evaluator) !== normalizeEvaluatorName(f.evaluatorName)) return false;
        return true;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const downloadEvaluationsCSV = (startDateStr: string, endDateStr: string) => {
    const start = startDateStr ? new Date(startDateStr) : new Date(0);
    const end = endDateStr ? new Date(endDateStr) : new Date(2100, 0, 1);
    end.setHours(23, 59, 59, 999);

    const filtered = rawData.filter(e => {
        const d = new Date(e.timestamp);
        return d >= start && d <= end;
    });

    const header = ["ID;Data;Hora;Motorista;Base;Frota;Avaliador;Score (%);Transportadora;Local"];
    
    const rows = filtered.map(e => {
        const d = new Date(e.timestamp);
        const dateStr = d.toLocaleDateString('pt-BR');
        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        let local = "";
        let transportadora = "";
        
        if (e.rawRow && e.rawRow.length > 8) {
            transportadora = e.rawRow[3] || "";
            local = e.rawRow[8] || "";
        }

        const scoreFormatted = e.score.toFixed(2).replace('.', ',') + '%';

        const sanitize = (val: string) => {
            if (!val) return "";
            const v = String(val).replace(/"/g, '""'); 
            if (v.includes(';') || v.includes('\n')) return `"${v}"`;
            return v;
        };

        return [
            sanitize(e.id),
            sanitize(dateStr),
            sanitize(timeStr),
            sanitize(e.driver),
            sanitize(e.base),
            sanitize(e.vehicle),
            sanitize(e.evaluator),
            sanitize(scoreFormatted),
            sanitize(transportadora),
            sanitize(local)
        ].join(';');
    });

    const csvContent = "\uFEFF" + [header, ...rows].join('\n'); 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Relatorio_Avaliacoes_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const getFullEvaluationById = (id: string): FullEvaluation | undefined => {
    return rawData.find(e => e.id === id);
};

export const getEvaluationsByEvaluator = (name: string) => {
    const norm = normalizeEvaluatorName(name);
    return rawData.filter(e => normalizeEvaluatorName(e.evaluator) === norm).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
};

export const getDriverTargetForPeriod = (drv: DriverProfile, y: number, m: number): number => {
    if (!drv.hasCamera) return 0;
    
    if (drv.isActive !== false) {
        return getWeeksInMonth(y, m);
    }
    
    if (!drv.inactivationDate) {
        return 0; // se inativo sem data, assume-se que está inativo sempre
    }
    
    const inactDate = new Date(drv.inactivationDate + 'T12:00:00');
    if (isNaN(inactDate.getTime())) {
        return 0;
    }
    
    const inactYear = inactDate.getFullYear();
    const inactMonth = inactDate.getMonth();
    
    if (y < inactYear || (y === inactYear && m < inactMonth)) {
        return getWeeksInMonth(y, m);
    } else if (y === inactYear && m === inactMonth) {
        // quantidade realizada no mês para que fique OK (meta = realizada)
        const driverRealized = getRawEvaluations({ year: y, month: m, driverName: drv.name }, true).length;
        return driverRealized;
    } else {
        // próximo mês ou subsequente, target = 0
        return 0;
    }
};

export const getDashboardMetrics = (y: number, m: number | null, f: DashboardFilters): DashboardMetrics & { monthlyGoalTarget: number } => {
    const filtered = getRawEvaluations({...f, year: y, month: m}, true);
    const driversWithCam = managedDrivers.filter(d => d.hasCamera === true);
    const targetBase = driversWithCam.length || 0;
    
    let target = 0;
    if (m !== null) {
        driversWithCam.forEach(drv => {
            target += getDriverTargetForPeriod(drv, y, m);
        });
    } else {
        const startMonth = (y === 2025) ? 9 : 0;
        for(let i = startMonth; i < 12; i++) {
            driversWithCam.forEach(drv => {
                target += getDriverTargetForPeriod(drv, y, i);
            });
        }
    }
    
    const scoreSum = filtered.reduce((acc, e) => acc + e.score, 0);
    const evalsPerEvaluator: Record<string, number> = {};
    const evalsPerDriver: Record<string, number> = {};
    const dayCount: Record<string, number> = {};
    const weekCount: Record<string, number> = {};

    filtered.forEach(e => {
        const evName = normalizeEvaluatorName(e.evaluator);
        evalsPerEvaluator[evName] = (evalsPerEvaluator[evName] || 0) + 1;
        evalsPerDriver[e.driver] = (evalsPerDriver[e.driver] || 0) + 1;
        
        const d = new Date(e.timestamp);
        const dKey = d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
        dayCount[dKey] = (dayCount[dKey] || 0) + 1;
        
        const weekNum = Math.ceil(d.getDate() / 7);
        const wKey = `Semana ${Math.min(weekNum, 5)}`;
        weekCount[wKey] = (weekCount[wKey] || 0) + 1;
    });

    // Cálculo de Bonus por Justificativa (Para Meta Geral)
    let justificationBonus = 0;
    
    // Só aplica bônus se estivermos olhando um mês específico ou o ano todo
    if (target > 0) {
        driversWithCam.forEach(drv => {
            if (m !== null) {
                // Lógica Mensal
                const just = drv.justifications?.find(j => j.year === y && j.month === m && j.countTowardsGoal);
                if (just) {
                    const driverRealized = evalsPerDriver[drv.name] || 0;
                    const driverTarget = getDriverTargetForPeriod(drv, y, m);
                    if (driverRealized < driverTarget) {
                        justificationBonus += (driverTarget - driverRealized);
                    }
                }
            } else {
                // Lógica Anual (Soma dos gaps justificados de cada mês)
                const startM = (y === 2025) ? 9 : 0;
                for(let i = startM; i < 12; i++) {
                    const just = drv.justifications?.find(j => j.year === y && j.month === i && j.countTowardsGoal);
                    if (just) {
                        const evalsInMonth = getRawEvaluations({ year: y, month: i, driverName: drv.name }, true).length;
                        const targetInMonth = getDriverTargetForPeriod(drv, y, i);
                        if (evalsInMonth < targetInMonth) {
                            justificationBonus += (targetInMonth - evalsInMonth);
                        }
                    }
                }
            }
        });
    }

    const monthsNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthsData = monthsNames.map((name, idx) => {
        const count = getRawEvaluations({ year: y, month: idx }, true).length;
        
        let mTarget = 0;
        driversWithCam.forEach(drv => {
            mTarget += getDriverTargetForPeriod(drv, y, idx);
        });
        
        // Adiciona lógica de justificativa também para o gráfico mensal
        let mBonus = 0;
        driversWithCam.forEach(drv => {
             const just = drv.justifications?.find(j => j.year === y && j.month === idx && j.countTowardsGoal);
             if (just) {
                 const drvCount = getRawEvaluations({ year: y, month: idx, driverName: drv.name }, true).length;
                 const drvTarget = getDriverTargetForPeriod(drv, y, idx);
                 if (drvCount < drvTarget) mBonus += (drvTarget - drvCount);
             }
        });

        return { month: name, count, goalPercent: mTarget > 0 ? ((count + mBonus)/mTarget)*100 : 0 };
    });

    const sortedDays = Object.entries(dayCount).map(([day, count]) => ({day, count})).sort((a,b) => {
        const [da, ma] = a.day.split('/');
        const [db, mb] = b.day.split('/');
        return (parseInt(ma) - parseInt(mb)) || (parseInt(da) - parseInt(db));
    });

    const sortedWeeks = Object.entries(weekCount).map(([week, count]) => ({week, count})).sort((a,b) => {
        return a.week.localeCompare(b.week);
    });

    // Total efetivo para cálculo da % (Realizado + Justificado)
    const effectiveTotal = filtered.length + justificationBonus;

    // Filtra quantidade de motoristas ativos no período selecionado
    // Se selecionou um mês, conta apenas quem estava ativo (não inativado antes desse mês) com câmera
    const activeDriversCountInPeriod = driversWithCam.filter(drv => {
        if (drv.isActive !== false) return true;
        if (!drv.inactivationDate) return false;
        const inactDate = new Date(drv.inactivationDate + 'T12:00:00');
        if (isNaN(inactDate.getTime())) return false;
        if (m !== null) {
            return y < inactDate.getFullYear() || (y === inactDate.getFullYear() && m <= inactDate.getMonth());
        }
        return y <= inactDate.getFullYear();
    }).length;

    return {
        totalEvaluations: filtered.length,
        totalRegisteredDrivers: activeDriversCountInPeriod,
        uniqueDriversEvaluated: new Set(filtered.map(e => e.driver)).size,
        globalAverageScore: filtered.length > 0 ? scoreSum / filtered.length : 0,
        evaluationsPerMonth: monthsData,
        evaluationsPerWeek: sortedWeeks,
        evaluationsPerDay: sortedDays,
        evaluationsOverTime: [],
        evaluationsPerEvaluator: Object.entries(evalsPerEvaluator).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count),
        evaluationsPerDriver: Object.entries(evalsPerDriver).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count),
        monthlyGoalCompletion: target > 0 ? (effectiveTotal / target) * 100 : 0,
        monthlyGoalTarget: target
    };
};

export const getDriverStats = (f: DashboardFilters): DriverStats[] => {
    return managedDrivers.map(d => {
        const evals = getRawEvaluations({ driverName: d.name }, true);
        const filtered = evals.filter(e => {
            const date = new Date(e.timestamp);
            if (f.year && date.getFullYear() !== f.year) return false;
            if (f.month !== null && f.month !== undefined && date.getMonth() !== f.month) return false;
            return true;
        });
        const scoreSum = filtered.reduce((acc, e) => acc + e.score, 0);
        return {
            id: d.id, name: d.name, base: d.base, hasCamera: d.hasCamera,
            totalEvaluations: evals.length, evalsWeek: 0, evalsMonth: 0, 
            evalsYear: evals.filter(e => new Date(e.timestamp).getFullYear() === new Date().getFullYear()).length,
            averageScore: filtered.length > 0 ? scoreSum / filtered.length : 0,
            lastEvaluationDate: evals.length > 0 ? evals[0].timestamp : '',
            justifications: d.justifications,
            isActive: d.isActive !== undefined ? d.isActive : true,
            inactivationDate: d.inactivationDate || ''
        };
    });
};

export const getEvaluatorStats = (f: DashboardFilters): EvaluatorStats[] => {
    let evaluators = getUniqueEvaluators();
    if (f.evaluatorName) {
        const normFilter = normalizeEvaluatorName(f.evaluatorName);
        evaluators = evaluators.filter(name => normalizeEvaluatorName(name) === normFilter);
    }

    const now = new Date();
    const targetYear = f.year || now.getFullYear();
    const targetMonth = (f.month !== null && f.month !== undefined) ? f.month : now.getMonth();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);

    return evaluators.map(name => {
        const allEvals = getRawEvaluations({ evaluatorName: name }, true);
        
        let evalsWeek = 0;
        if (f.week) {
             evalsWeek = getRawEvaluations({ evaluatorName: name, year: targetYear, month: targetMonth, week: f.week }, true).length;
        } else {
             evalsWeek = allEvals.filter(e => {
                const d = new Date(e.timestamp);
                return d >= startOfWeek && d.getFullYear() === now.getFullYear();
             }).length;
        }

        const evalsMonth = allEvals.filter(e => {
            const d = new Date(e.timestamp);
            return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        }).length;

        const evalsYear = allEvals.filter(e => {
            const d = new Date(e.timestamp);
            return d.getFullYear() === targetYear;
        }).length;

        const filtered = allEvals.filter(e => {
            const d = new Date(e.timestamp);
            if (f.year && d.getFullYear() !== f.year) return false;
            if (f.month !== null && f.month !== undefined && d.getMonth() !== f.month) return false;
            if (f.week) {
                 const weekNum = Math.ceil(d.getDate() / 7);
                 const wKey = `Semana ${Math.min(weekNum, 5)}`;
                 if (wKey !== f.week) return false;
            }
            return true;
        });
        
        const scoreSum = filtered.reduce((acc, e) => acc + e.score, 0);
        const totalRawStrict = getRawEvaluations(f, true).length;

        return {
            name, 
            totalEvaluations: filtered.length, 
            evalsWeek, 
            evalsMonth, 
            evalsYear,
            averageGivenScore: filtered.length > 0 ? scoreSum / filtered.length : 0,
            participationIndex: totalRawStrict > 0 ? (filtered.length / totalRawStrict) * 100 : 0,
            lastActiveDate: filtered.length > 0 ? filtered[0].timestamp : ''
        };
    });
};

export const getPriorityDrivers = (mode: 'week' | 'month', showAll: boolean, year?: number, month?: number | null): PriorityDriverStatus[] => {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = (month !== undefined && month !== null) ? month : now.getMonth();

    return managedDrivers.filter(d => d.hasCamera === true).map(d => {
        const evals = getRawEvaluations({ driverName: d.name }, true);
        let count = 0, target = 1;
        
        const justification = d.justifications?.find(j => j.month === targetMonth && j.year === targetYear && j.countTowardsGoal);
        const hasValidJustification = !!justification;

        if (mode === 'month') {
            count = evals.filter(e => {
                const date = new Date(e.timestamp);
                return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
            }).length;
            target = getWeeksInMonth(targetYear, targetMonth);
        } else {
            if (year && month !== undefined) {
                 count = evals.filter(e => {
                    const date = new Date(e.timestamp);
                    return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
                }).length;
                 target = 1;
            } else {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0,0,0,0);
                count = evals.filter(e => new Date(e.timestamp) >= startOfWeek).length;
                target = 1;
            }
        }
        
        let missing = Math.max(0, target - count);
        if (hasValidJustification) missing = 0;

        let urgency: 'critical' | 'warning' | 'done' = 'done';
        if (missing > 0) urgency = count === 0 ? 'critical' : 'warning';
        return { driver: d, evaluationsCount: count, target, missing, urgency };
    }).filter(p => showAll || p.urgency !== 'done').sort((a,b) => a.driver.name.localeCompare(b.driver.name));
};

export const getVehicleStats = (): VehicleStats[] => {
    const vMap: Record<string, { sum: number, count: number, base: string }> = {};
    const filtered = getRawEvaluations({}, true);
    filtered.forEach(e => {
        if (!vMap[e.vehicle]) vMap[e.vehicle] = { sum: 0, count: 0, base: e.base };
        vMap[e.vehicle].sum += e.score;
        vMap[e.vehicle].count++;
    });
    return Object.entries(vMap).map(([id, s]) => ({ id, base: s.base, totalEvaluations: s.count, averageScore: s.sum / s.count }));
};

export const getWeeksInMonth = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate();
    let mondays = 0;
    for (let i = 1; i <= last; i++) if (new Date(y, m, i).getDay() === 1) mondays++;
    return Math.max(4, mondays);
};

export const getChecklistQuestions = () => [
    { id: 'J', question: '1) Está descansado/ tranquilo? (Sinais de fadiga, sonolência e cansaço)' },
    { id: 'K', question: '2) Realiza a verificação diária do CT e a volta olímpica?' },
    { id: 'L', question: '3) Respeita a regra "Motor ligado, celular desligado"?' },
    { id: 'M', question: '4) Respeita a orientação de não se alimentar ou fumar enquanto o veículo está em movimento?' },
    { id: 'N', question: '5) Respeita a orientação de não dar carona?' },
    { id: 'O', question: '6) Utiliza o cinto de segurança corretamente?' },
    { id: 'P', question: '7) Utiliza o uniforme?' },
    { id: 'Q', question: '8) Motorista está atento e evitando distrações?' },
    { id: 'R', question: '9) Motorista evita a interação com objetos?' },
    { id: 'S', question: '10) Mantém a cabine livre de objetos soltos (pranchetas, garrafas, celular, toalhas etc.)?' },
    { id: 'T', question: '11) Dirige com as duas mãos no volante?' },
    { id: 'U', question: '12) Mantém cortina da cabine aberta quando o veículo está em movimento?' },
    { id: 'V', question: '13) Trafega em velocidade compatível, respeitando os limites da via e o máximo permitido pela empresa?' },
    { id: 'W', question: '14) Verifica com frequência os espelhos retrovisores' },
    { id: 'X', question: '15) Em rodovias, trafega pela faixa de rolamento correta (em pista dupla, deverá trafegar pela faixa da direita)?' },
    { id: 'Y', question: '16) Mantém a correta distância de seguimento?' },
    { id: 'Z', question: '17) Ultrapassa de forma segura?' },
    { id: 'AA', question: '18) Facilita a ultrapassagem de terceiros?' },
    { id: 'AB', question: '19) Sinaliza antecipadamente todas as suas intenções?' },
    { id: 'AC', question: '20) Freia antecipadamente/ suavemente evitando uma situação de risco?' },
    { id: 'AD', question: '21) Reduz velocidade ao passar por cruzamentos?' },
    { id: 'AE', question: '22) Solicita auxílio para manobra?' },
    { id: 'AF', question: '23) Respeita o semáforo (sem aproveitar-se "do amarelo" e do "verde velho")?' },
    { id: 'AG', question: '24) Aciona o freio de mão/calça o CT ao estacionar?' },
    { id: 'AH', question: '25) Estaciona de forma adequada e em local apropriado?' },
    { id: 'AI', question: '26) Segue orientação de não parar em acostamento e/ou locais não autorizados?' },
    { id: 'AJ', question: '27) Realiza cruzamento de pista apenas em locais autorizados e após verificação 180º da pista que será cruzada?' },
    { id: 'AK', question: '28) É cortês com os demais motoristas / usuários vulneráveis?' },
    { id: 'AL', question: '29) Respeita funcionamento das câmeras, não encobrindo as mesmas durante o tempo observado?' },
    { id: 'AM', question: '30) As câmeras estão corretamente posicionadas e sem qualquer obstrução, permitindo a avaliação da conduta do motorista?' }
];

export const isSystemOnline = () => navigator.onLine;
export const getActiveOperatorCount = () => managedOperators.filter(o => o.role !== 'admin').length || 1;
export const authenticateOperator = async (n: string, p: string) => {
    const u = n.trim().toUpperCase();
    if ((u === 'ADMIN' || u === 'DENY') && p === 'admin') return { name: u === 'ADMIN' ? 'Admin' : 'DENY', role: 'admin' as const };
    const found = managedOperators.find(o => o.name === u && o.password === p);
    
    if (found) {
        // Force assignment of 'admin' role for 'DENY' and 'monitor' for 'CARLOS'
        let role = found.role || 'operator';
        if (found.name === 'DENY') role = 'admin';
        else if (found.name === 'CARLOS' || found.role === 'monitor') role = 'monitor';
        
        return { name: found.name, role: role as UserRole };
    }
    
    return null;
};
export const addDriver = async (d: any) => {
    const justifications = d.justifications || [];
    const newId = `d-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const isActive = d.isActive !== undefined ? d.isActive : true;
    const inactivationDate = d.inactivationDate || '';
    const driverObj = { 
        id: newId, 
        name: d.name.toUpperCase(), 
        base: d.base.toUpperCase(), 
        hasCamera: d.hasCamera, 
        lastModified: new Date().toISOString(),
        justifications,
        isActive,
        inactivationDate
    };
    managedDrivers.push(driverObj);
    safeLocalStorageSetItem('risel_driver_overrides', JSON.stringify({...driverOverrides, [d.name.toUpperCase()]: {hasCamera: d.hasCamera}}));
    
    // Construct full row to ensure data integrity
    const row = [
        newId,
        d.name.toUpperCase(),
        d.base.toUpperCase(),
        d.hasCamera ? 'SIM' : 'NÃO',
        new Date().toISOString(),
        JSON.stringify(justifications),
        isActive ? 'SIM' : 'NÃO',
        inactivationDate
    ];

    await callAppsScript({ 
        type: 'addDriver', 
        gid: globalSheetConfig.gidDrivers,
        row: row,
        data: {  // Keep legacy payload just in case, but rely on 'row' in updated script
            name: d.name, 
            base: d.base, 
            hasCamera: d.hasCamera ? 'SIM' : 'NÃO',
            justifications: JSON.stringify(justifications),
            isActive: isActive ? 'SIM' : 'NÃO',
            inactivationDate: inactivationDate
        } 
    });
};
export const updateDriver = async (id: string, d: any) => {
    const drv = managedDrivers.find(x => x.id === id);
    if (!drv) return;
    const oldName = drv.name;
    const justifications = d.justifications || drv.justifications || [];
    const isActive = d.isActive !== undefined ? d.isActive : drv.isActive !== undefined ? drv.isActive : true;
    const inactivationDate = d.inactivationDate !== undefined ? d.inactivationDate : drv.inactivationDate || '';
    
    Object.assign(drv, { ...d, justifications, isActive, inactivationDate });
    safeLocalStorageSetItem('risel_driver_overrides', JSON.stringify({...driverOverrides, [d.name.toUpperCase()]: {hasCamera: d.hasCamera}}));
    
    // Construct full row for update
    const row = [
        id,
        d.name.toUpperCase(),
        d.base.toUpperCase(),
        d.hasCamera ? 'SIM' : 'NÃO',
        new Date().toISOString(),
        JSON.stringify(justifications),
        isActive ? 'SIM' : 'NÃO',
        inactivationDate
    ];

    await callAppsScript({ 
        type: 'updateDriver', 
        id: id,
        gid: globalSheetConfig.gidDrivers,
        row: row,
        originalName: oldName, // Fallback for script matching
        updates: { 
            name: d.name, 
            base: d.base, 
            hasCamera: d.hasCamera ? 'SIM' : 'NÃO',
            justifications: JSON.stringify(justifications),
            isActive: isActive ? 'SIM' : 'NÃO',
            inactivationDate: inactivationDate
        } 
    });
};
export const deleteDriver = async (id: string) => {
    const drv = managedDrivers.find(x => x.id === id);
    if (!drv) return;
    managedDrivers = managedDrivers.filter(x => x.id !== id);
    await callAppsScript({ type: 'deleteDriver', id: id, name: drv.name, gid: globalSheetConfig.gidDrivers });
};
export const addOperator = async (o: any) => {
    const newOp = { 
        id: `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 
        name: o.name.toUpperCase().trim(), 
        password: o.password, 
        role: o.role || 'operator', 
        createdAt: new Date().toISOString(),
        menus: o.menus || []
    };
    managedOperators.push(newOp);
    
    const row = [
        newOp.id,
        newOp.name,
        newOp.role,
        newOp.password,
        newOp.createdAt,
        JSON.stringify(newOp.menus)
    ];
    await callAppsScript({ 
        type: 'addOperator', 
        gid: globalSheetConfig.gidOperators, 
        row 
    });
};
export const updateOperator = async (id: string, o: any) => {
    const op = managedOperators.find(x => x.id === id);
    if (!op) return;
    const oldName = op.name;
    Object.assign(op, o);
    op.name = op.name.toUpperCase().trim();
    
    const row = [
        op.id,
        op.name,
        op.role || 'operator',
        op.password,
        op.createdAt || new Date().toISOString(),
        JSON.stringify(op.menus || [])
    ];
    await callAppsScript({ 
        type: 'updateOperator', 
        id: op.id,
        name: op.name,
        originalName: oldName,
        gid: globalSheetConfig.gidOperators,
        row 
    });
};
export const deleteOperator = async (id: string) => {
    const op = managedOperators.find(x => x.id === id);
    if (!op) return;
    managedOperators = managedOperators.filter(x => x.id !== id);
    await callAppsScript({ 
        type: 'deleteOperator', 
        id: op.id,
        name: op.name,
        gid: globalSheetConfig.gidOperators 
    });
};

// --- SHIFT HANDOVER FUNCTIONS ---
export const getShiftOccurrences = (filters?: { date?: string; operator?: string; finalized?: boolean; includeDeleted?: boolean; shift?: 'Diurno' | 'Noturno' }) => {
    let filtered = [...shiftOccurrences];
    if (filters?.date) filtered = filtered.filter(o => o.date === filters.date);
    if (filters?.operator) filtered = filtered.filter(o => o.operator === filters.operator);
    if (filters?.finalized !== undefined) filtered = filtered.filter(o => o.finalized === filters.finalized);
    if (filters?.shift) filtered = filtered.filter(o => o.shift === filters.shift);
    
    // Filtra itens excluídos por padrão
    if (!filters?.includeDeleted) {
        filtered = filtered.filter(o => !o.description.includes('[EXCLUÍDO'));
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addShiftOccurrence = async (occ: Omit<ShiftOccurrence, 'id' | 'createdAt' | 'finalized'>) => {
    const newOcc: ShiftOccurrence = {
        ...occ,
        id: `occ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        finalized: false
    };
    shiftOccurrences.push(newOcc);
    pendingOperations++;
    lastOperationTime = Date.now();
    
    try {
        await callAppsScript({
            type: 'addShiftOccurrence',
            gid: globalSheetConfig.gidShiftHandover,
            row: [
                newOcc.id,
                newOcc.date,
                newOcc.shift,
                newOcc.type,
                newOcc.base,
                newOcc.description,
                newOcc.operator,
                'FALSE',
                newOcc.createdAt
            ]
        });
    } finally {
        pendingOperations--;
    }
};

export const updateShiftOccurrence = async (id: string, updates: Partial<ShiftOccurrence>) => {
    const occ = shiftOccurrences.find(o => o.id === id);
    if (!occ) return;
    Object.assign(occ, updates);
    pendingOperations++;
    lastOperationTime = Date.now();
    
    try {
        await callAppsScript({
            type: 'updateShiftOccurrence',
            gid: globalSheetConfig.gidShiftHandover,
            id: id,
            row: [
                occ.id,
                occ.date,
                occ.shift,
                occ.type,
                occ.base,
                occ.description,
                occ.operator,
                occ.finalized ? 'TRUE' : 'FALSE',
                occ.createdAt
            ]
        });
    } finally {
        pendingOperations--;
    }
};

export const finalizeShift = async (operator: string, date: string, shift: 'Diurno' | 'Noturno') => {
    const toFinalize = shiftOccurrences.filter(o => o.date === date && o.shift === shift && !o.finalized);
    
    if (toFinalize.length === 0) return;

    // Update local state immediately for better UX
    toFinalize.forEach(occ => {
        occ.finalized = true;
    });
    
    pendingOperations++;
    lastOperationTime = Date.now();
    
    try {
        await callAppsScript({
            type: 'finalizeShift',
            gid: globalSheetConfig.gidShiftHandover,
            date: date,
            shift: shift
        });
    } finally {
        pendingOperations--;
    }
    
    // Force a local update of the array reference to trigger React re-renders if needed
    shiftOccurrences = [...shiftOccurrences];
};

export const deleteShiftOccurrence = async (id: string) => {
    const occ = shiftOccurrences.find(o => o.id === id);
    if (!occ) return;
    shiftOccurrences = shiftOccurrences.filter(o => o.id !== id);
    pendingOperations++;
    lastOperationTime = Date.now();
    
    try {
        await callAppsScript({ 
            type: 'deleteShiftOccurrence',
            id: id, 
            gid: globalSheetConfig.gidShiftHandover 
        });
    } finally {
        pendingOperations--;
    }
};

export const sendTestEmail = async (email: string) => {
    await callAppsScript({ type: 'testEmail', email });
};

// --- BOLA PRETA FUNCTIONS ---
export const getBolaPretaRecords = () => {
    return [...bolaPretaRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getMacroData = () => {
    return macroData;
};

export const getFleetData = () => {
    return fleetData;
};

export const parseRobustDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    let day = -1, month = -1, year = -1;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
        }
    } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                year = parseInt(parts[0]);
                month = parseInt(parts[1]) - 1;
                day = parseInt(parts[2]);
            } else {
                day = parseInt(parts[0]);
                month = parseInt(parts[1]) - 1;
                year = parseInt(parts[2]);
            }
        }
    }
    if (year !== -1 && month !== -1 && day !== -1) {
        return new Date(year, month, day);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

export const getYearWeekString = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const checkVehicleVerificationHistory = (plate: string, dateStr: string, currentId?: string) => {
    const norm = (p: string) => String(p || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const targetPlate = norm(plate);
    if (!targetPlate) return { alreadyCheckedThisWeek: false, alreadyCheckedThisMonth: false, weekRecordDate: '', monthRecordDate: '' };

    const targetDate = parseRobustDate(dateStr);
    if (!targetDate) return { alreadyCheckedThisWeek: false, alreadyCheckedThisMonth: false, weekRecordDate: '', monthRecordDate: '' };

    const targetWeek = getYearWeekString(targetDate);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    let alreadyCheckedThisWeek = false;
    let alreadyCheckedThisMonth = false;
    let weekRecordDate = '';
    let monthRecordDate = '';

    for (const r of bolaPretaRecords) {
        if (currentId && r.id === currentId) continue;
        if (norm(r.plate) === targetPlate) {
            const rDate = parseRobustDate(r.date);
            if (rDate) {
                // Check month/year
                if (rDate.getMonth() === targetMonth && rDate.getFullYear() === targetYear) {
                    alreadyCheckedThisMonth = true;
                    monthRecordDate = r.date;
                }
                // Check week
                if (getYearWeekString(rDate) === targetWeek) {
                    alreadyCheckedThisWeek = true;
                    weekRecordDate = r.date;
                }
            }
        }
    }

    return {
        alreadyCheckedThisWeek,
        alreadyCheckedThisMonth,
        weekRecordDate,
        monthRecordDate
    };
};

export const addFleetRecord = async (f: { frota: string, placa: string, base: string }) => {
    const norm = (p: string) => String(p || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const newRecord = {
        frota: f.frota.trim().toUpperCase(),
        placa: norm(f.placa),
        base: f.base.trim()
    };
    
    const exists = fleetData.some(x => norm(x.placa) === newRecord.placa);
    if (!exists) {
        fleetData.push(newRecord);
    }
    
    const row = [newRecord.frota, newRecord.placa, newRecord.base];
    try {
        await callAppsScript({
            type: 'addFleet',
            gid: globalSheetConfig.gidFleet,
            row: row
        });
        return { success: true };
    } catch (e: any) {
        console.error("Error saving fleet vehicle to Google Sheet:", e);
        return { success: false, error: e.message || String(e) };
    }
};

export const getFleetStatus = (month: number, year: number) => {
    // Normalizador de placa
    const norm = (p: string) => String(p || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();

    const monthRecords = bolaPretaRecords.filter(r => {
        if (!r.date) return false;
        
        // Parsing robusto para DD/MM/YYYY ou YYYY-MM-DD
        let rMonth = -1;
        let rYear = -1;

        if (r.date.includes('/')) {
            const parts = r.date.split('/');
            if (parts.length === 3) {
                rMonth = parseInt(parts[1]) - 1;
                rYear = parseInt(parts[2]);
            }
        } else if (r.date.includes('-')) {
            const parts = r.date.split('-');
            if (parts.length === 3) {
                // assume YYYY-MM-DD
                if (parts[0].length === 4) {
                    rMonth = parseInt(parts[1]) - 1;
                    rYear = parseInt(parts[0]);
                } else {
                    // assume DD-MM-YYYY
                    rMonth = parseInt(parts[1]) - 1;
                    rYear = parseInt(parts[2]);
                }
            }
        }

        if (rMonth === -1) {
            const d = new Date(r.date);
            rMonth = d.getMonth();
            rYear = d.getFullYear();
        }

        return rMonth === month && rYear === year;
    });

    return fleetData.map(f => {
        const checked = monthRecords.some(r => norm(r.plate) === norm(f.placa));
        return {
            ...f,
            checked
        };
    }).sort((a, b) => {
        if (a.checked === b.checked) return a.frota.localeCompare(b.frota);
        return a.checked ? 1 : -1; // Pendentes primeiro
    });
};

/**
 * Funcao para processar as macros conforme requisitado pelo usuario
 * Baseado nas colunas: Login(A), Nome(B), Data Inicio(C), Hora Inicio(D), Data Fim(E), Hora Fim(F), Placa(G), NomeMacro(H), TipoMacro(I), PontoReferencia(J), Duracao(K), KM(L)
 */

// Converte valor de hora do Excel (que às vezes vem como decimal ou string de data) para HH:mm
const formatExcelTime = (val: any): string => {
    if (!val) return "";
    let str = String(val).trim();
    
    // Se for formato de data e hora (ex: 30/12/1899 08:30:00)
    if (str.includes(':')) {
        const parts = str.split(' ');
        const timePart = parts.length > 1 ? parts[1] : parts[0];
        if (timePart.includes(':')) {
            const timeParts = timePart.split(':');
            const h = timeParts[0].padStart(2, '0');
            const m = timeParts[1].padStart(2, '0');
            return `${h}:${m}`;
        }
    }
    
    // Se for o "zero" do Excel 1899 sem tempo
    if (str === "30/12/1899" || str === "1899-12-30" || str.includes("30/12/1899")) return "00:00";
    
    // Se for número decimal (Excel Serial Time)
    const num = parseFloat(str.replace(',', '.'));
    if (!isNaN(num) && num >= 0 && num < 1) {
        const totalSeconds = Math.round(num * 24 * 3600);
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    }
    
    // Se for apenas HH:mm
    if (str.length === 5 && str.includes(':')) return str;
    
    return str;
};

export const calculateMacroMetrics = (date: string, plate: string, selectedDriver?: string): any => {
    const normalizePlate = (pl: string) => String(pl || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const normalizeText = (text: string) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    
    const p = normalizePlate(plate);
    const searchDate = normalizeDate(date); // Garante formato YYYY-MM-DD
    
    if (macroData.length === 0) return null;

    const dayMacros = macroData.filter(r => {
        if (!r || r.length < 8) return false;
        
        const rowDateStr = String(r[2]);
        // Tentar limpar datas do formato DD/MM/YY hh:mm e forçar leitura
        const rowDate = normalizeDate(rowDateStr.split(' ')[0]);
        const rowPlate = normalizePlate(String(r[6]));
        return rowDate === searchDate && rowPlate === p;
    });
    
    if (dayMacros.length === 0) return null;

    // Detectar múltiplos motoristas se não foi passado um específico
    const driversInMacros = Array.from(new Set(dayMacros.map(r => r[1] || r[0]).map(String).map(s => s.trim()).filter(Boolean)));
    if (driversInMacros.length > 1 && !selectedDriver) {
        return {
           type: 'multiple_drivers',
           drivers: driversInMacros
        };
    }
    
    const targetDriver = selectedDriver || driversInMacros[0];
    const filteredMacros = dayMacros.filter(r => (String(r[1] || r[0]).trim()) === targetDriver);
    if (filteredMacros.length === 0) return null;

    // Desduplicação de macros (evita inflar métricas se houver linhas redundantes no export)
    const uniqueMacros = Array.from(new Map(filteredMacros.map(r => [`${r[0]}-${r[3]}-${r[7]}`, r])).values());
    
    // Métricas principais usando macros desduplicadas
    const findStartTime = uniqueMacros.find(r => normalizeText(String(r[7])).includes('INICIO DE JORNADA'));
    const findDeparture = uniqueMacros.find(r => normalizeText(String(r[7])).includes('INICIO DE VIAGEM'));
    const findArrival = uniqueMacros.find(r => normalizeText(String(r[7])).includes('FIM DE VIAGEM'));
    const findEndTotal = [...uniqueMacros].reverse().find(r => r[7]); 

    const clientMacros = uniqueMacros.filter(r => normalizeText(String(r[7])).includes('CHEGADA NO CLIENTE'));
    const stopMacros = uniqueMacros.filter(r => normalizeText(String(r[7])).includes('PARADA'));
    
    const parseTimeSeconds = (timeStr: any) => {
        if (!timeStr) return 0;
        const sTime = String(timeStr).trim();
        
        // Formato HH:MM:SS ou HH:MM
        if (sTime.includes(':')) {
            const parts = sTime.split(':');
            const h = parseInt(parts[0]) || 0;
            const m = parseInt(parts[1]) || 0;
            const s = parseInt(parts[2]) || 0;
            return h * 3600 + m * 60 + s;
        }
        
        const num = parseFloat(sTime.replace(',', '.'));
        if (isNaN(num)) return 0;
        
        // Se for uma fração do dia (Serial Excel padrão: 0.5 = 12h)
        // Usamos 1.1 como limite para cobrir durações ligeiramente acima de 24h
        if (num > 0 && num < 1.1) {
            return Math.round(num * 24 * 3600);
        }
        
        // Se for >= 1.1, provavelmente são horas decimais (ex: 1.5 horas = 5400s)
        // A menos que seja um serial date gigante (45000+), mas em colunas de duração não costuma ser.
        if (num > 40000) {
            // Se for data serial, pegamos só a parte fracionária do tempo
            return Math.round((num - Math.floor(num)) * 24 * 3600);
        }
        
        return Math.round(num * 3600);
    };

    const getDurationSeconds = (row: any) => {
        // Validação adicional: Se o nome da macro for "INICIO" ou "FIM", a duração pode vir zerada ou negativa
        // Vamos priorizar o cálculo pelo Início e Fim da linha (Index 3 e Index 5)
        const startSec = parseTimeSeconds(row[3]);
        const endSec = parseTimeSeconds(row[5]);
        
        const diff = endSec > startSec ? endSec - startSec : (endSec > 0 && endSec < startSec ? (endSec + 24 * 3600) - startSec : 0);
        
        // Se a diferença for plausível (> 0), usamos ela
        if (diff > 0) return diff;
        
        // Fallback para a coluna Duracao (K - 10) que em alguns sistemas já vem pronta
        const rawDur = String(row[10] || "");
        return parseTimeSeconds(rawDur);
    };

    const formatSeconds = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    const sumDuration = (list: any[]) => {
        const total = list.reduce((acc, r) => acc + getDurationSeconds(r), 0);
        return formatSeconds(total);
    };

    const totalKM = dayMacros.reduce((acc, r) => {
        if (!r[11]) return acc;
        const valStr = String(r[11]).replace(',', '.');
        const val = parseFloat(valStr);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);

    // Busca robusta de frota
    const cleanPlate = (pl: string) => String(pl || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const targetPlate = cleanPlate(plate);
    
    let fleetInfo = fleetData.find(f => cleanPlate(f.placa) === targetPlate);
    if (!fleetInfo) {
        fleetInfo = fleetData.find(f => cleanPlate(f.frota) === targetPlate);
    }

    console.log("Fleet lookup result:", { search: p, found: !!fleetInfo, vehicle: fleetInfo?.frota, fleetSize: fleetData.length });

    const tClientsSec = clientMacros.reduce((acc, r) => acc + getDurationSeconds(r), 0);
    const avgSecs = clientMacros.length > 0 ? Math.floor(tClientsSec / clientMacros.length) : 0;

    return {
        driver: String(dayMacros[0][1] || '').toUpperCase(),
        vehicle: fleetInfo ? fleetInfo.frota : '',
        base: fleetInfo ? fleetInfo.base : '',
        startTime: findStartTime ? formatExcelTime(findStartTime[3]) : '',
        departureTime: findDeparture ? formatExcelTime(findDeparture[3]) : '',
        arrivalBaseTime: findArrival ? formatExcelTime(findArrival[3]) : '',
        endTime: findEndTotal ? formatExcelTime(findEndTotal[3]) : '',
        macroClients: clientMacros.length.toString(),
        timeAtClient: formatSeconds(tClientsSec),
        avgTimeClients: formatSeconds(avgSecs),
        informedStopsCount: stopMacros.length.toString(),
        totalStopsTime: sumDuration(stopMacros),
        kmDriven: totalKM.toFixed(2),
        macroClientsObs: "" // Deixar em branco para texto livre
    };
};

export const saveBolaPretaRecord = async (data: Omit<BolaPreta, 'id' | 'createdAt'>, images?: { field: string, base64: string }[]) => {
    const id = `BP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();
    const newRecord: BolaPreta = { ...data, id, createdAt };
    
    // Prepare images for upload
    const filesToUpload: any[] = [];
    if (images) {
        images.forEach(img => {
            if (img.base64) {
                const fileName = `${id}.${img.field}.png`;
                filesToUpload.push({ name: fileName, base64: img.base64, mimeType: 'image/png' });
                (newRecord as any)[img.field] = fileName;
                cacheBolaPretaImage(id, img.field, img.base64);
            }
        });
    }

    bolaPretaRecords.unshift(newRecord);
    
    const formatDateForSheet = (ds: string) => {
        if (!ds) return "";
        const p = ds.split('-');
        if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
        return ds;
    };
    
    await callAppsScript({
        type: 'addBolaPreta',
        gid: globalSheetConfig.gidBolaPreta,
        files: filesToUpload,
        row: [
            id,
            newRecord.operator,
            newRecord.status,
            formatDateForSheet(newRecord.date),
            newRecord.vehicle,
            newRecord.plate,
            newRecord.base,
            newRecord.driver,
            newRecord.startTime,
            newRecord.departureTime,
            newRecord.macroClients,
            newRecord.macroClientsObs || '',
            newRecord.timeAtClient,
            newRecord.avgTimeClients,
            newRecord.informedStopsCount,
            newRecord.totalStopsTime,
            newRecord.arrivalBaseTime,
            newRecord.endTime,
            newRecord.kmDriven,
            newRecord.uninformedStops + (newRecord.uninformedStopsObs ? ` - ${newRecord.uninformedStopsObs}` : ''),
            newRecord.suspiciousActivity + (newRecord.suspiciousActivityObs ? ` - ${newRecord.suspiciousActivityObs}` : ''),
            createdAt,
            newRecord.printImage1 || '',
            newRecord.printImage2 || '',
            newRecord.printImage3 || '',
            newRecord.mapImage || '',
            (newRecord.verificationStatus || 'OK') + (newRecord.verificationStatusObs ? ` - ${newRecord.verificationStatusObs}` : ''),
            newRecord.telemetryInfractions || 'Não',
            (newRecord.telemetryOptions || []).join(','),
            newRecord.videoTelemetryInfractions || 'Não',
            (newRecord.videoTelemetryOptions || []).join(','),
            newRecord.celularImage || '',
            newRecord.fumandoImage || '',
            newRecord.cintoImage || '',
            newRecord.printImage1Desc || '',
            newRecord.printImage2Desc || '',
            newRecord.printImage3Desc || '',
            newRecord.celularImageDesc || '',
            newRecord.fumandoImageDesc || '',
            newRecord.cintoImageDesc || ''
        ]
    });

    // Envio do E-mail Premium (Aguardado para garantir o envio)
    try {
        await callAppsScript({
            type: 'bolaPretaEmail',
            record: newRecord,
            email: 'deny.goncalves@risel.com.br',
            files: filesToUpload
        });
    } catch (e) {
        console.error("Erro ao enviar email BP", e);
    }

    return newRecord;
};

export const updateBolaPretaRecord = async (id: string, updates: Partial<BolaPreta>, images?: { field: string, base64: string }[], resendEmail?: boolean) => {
    const idx = bolaPretaRecords.findIndex(r => r.id === id);
    if (idx === -1) return;
    
    const updated = { ...bolaPretaRecords[idx], ...updates };
    
    const filesToUpload: any[] = [];
    if (images) {
        images.forEach(img => {
            if (img.base64) {
                const fileName = `${id}.${img.field}.png`;
                filesToUpload.push({ name: fileName, base64: img.base64, mimeType: 'image/png' });
                (updated as any)[img.field] = fileName;
                cacheBolaPretaImage(id, img.field, img.base64);
            }
        });
    }

    bolaPretaRecords[idx] = updated;
    
    const formatDateForSheet = (ds: string) => {
        if (!ds) return "";
        const p = ds.split('-');
        if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
        return ds;
    };

    await callAppsScript({
        type: 'updateBolaPreta',
        id,
        gid: globalSheetConfig.gidBolaPreta,
        files: filesToUpload,
        row: [
            updated.id,
            updated.operator,
            updated.status,
            formatDateForSheet(updated.date),
            updated.vehicle,
            updated.plate,
            updated.base,
            updated.driver,
            updated.startTime,
            updated.departureTime,
            updated.macroClients,
            updated.macroClientsObs || '',
            updated.timeAtClient,
            updated.avgTimeClients,
            updated.informedStopsCount,
            updated.totalStopsTime,
            updated.arrivalBaseTime,
            updated.endTime,
            updated.kmDriven,
            updated.uninformedStops + (updated.uninformedStopsObs ? ` - ${updated.uninformedStopsObs}` : ''),
            updated.suspiciousActivity + (updated.suspiciousActivityObs ? ` - ${updated.suspiciousActivityObs}` : ''),
            updated.createdAt,
            updated.printImage1 || '',
            updated.printImage2 || '',
            updated.printImage3 || '',
            updated.mapImage || '',
            (updated.verificationStatus || 'OK') + (updated.verificationStatusObs ? ` - ${updated.verificationStatusObs}` : ''),
            updated.telemetryInfractions || 'Não',
            (updated.telemetryOptions || []).join(','),
            updated.videoTelemetryInfractions || 'Não',
            (updated.videoTelemetryOptions || []).join(','),
            updated.celularImage || '',
            updated.fumandoImage || '',
            updated.cintoImage || '',
            updated.printImage1Desc || '',
            updated.printImage2Desc || '',
            updated.printImage3Desc || '',
            updated.celularImageDesc || '',
            updated.fumandoImageDesc || '',
            updated.cintoImageDesc || ''
        ]
    });

    if (resendEmail) {
        try {
            await callAppsScript({
                type: 'bolaPretaEmail',
                record: updated,
                email: 'deny.goncalves@risel.com.br',
                files: filesToUpload
            });
        } catch (e) {
            console.error("Erro ao reenviar email BP", e);
        }
    }

    return updated;
};

export const deleteBolaPretaRecord = async (id: string) => {
    bolaPretaRecords = bolaPretaRecords.filter(r => r.id !== id);
    await callAppsScript({
        type: 'deleteBolaPreta',
        id,
        gid: globalSheetConfig.gidBolaPreta
    });
};

export const uploadMacrosAndSync = async (rows: string[][]) => {
    // 1. Atualizar state local immediately para que o UI tenha as macros prontas
    macroData = [...macroData, ...rows];
    
    // 2. Chamar endpoint para salvar multiplas linhas num pancada só na Planilha
    await callAppsScript({
        type: 'macroSync',
        gid: globalSheetConfig.gidMacros,
        rows: rows
    });
};

export const getBolaPretaImage = async (fileName: string): Promise<string | null> => {
    const scriptUrl = getGoogleScriptUrl();
    if (!scriptUrl) return null;
    try {
        const response = await fetch(`${scriptUrl}?file=${encodeURIComponent(fileName)}`);
        if (!response.ok) return null;
        const text = await response.text();
        const data = JSON.parse(text);
        if (data && data.status === "OK") {
            return data.base64;
        }
    } catch (e) {
        console.error("Erro ao obter imagem do Google Drive", e);
    }
    return null;
};

// Memory cache to avoid LocalStorage quota limit issues and guarantee instant image loading
const memoryImageCache: Record<string, string> = {};

export const cacheBolaPretaImage = (recordId: string, field: string, base64: string) => {
    if (!recordId || !field || !base64) return;
    const key = `bp_img_cache_${recordId}_${field}`;
    memoryImageCache[key] = base64;
    try {
        localStorage.setItem(key, base64);
    } catch (e) {
        console.warn(`LocalStorage quota exceeded or unavailable. Image cached in memory only: ${key}`);
    }
};

export const getCachedBolaPretaImage = (recordId: string, field: string): string | null => {
    if (!recordId || !field) return null;
    const key = `bp_img_cache_${recordId}_${field}`;
    if (memoryImageCache[key]) {
        return memoryImageCache[key];
    }
    try {
        const local = localStorage.getItem(key);
        if (local) {
            memoryImageCache[key] = local; // cache back to memory
            return local;
        }
    } catch (e) {
        console.error("Erro ao ler do LocalStorage", e);
    }
    return null;
};

export const resendEvaluationEmail = async (evalId: string, customEmail?: string) => {
    const fullEv = getFullEvaluationById(evalId);
    return await callAppsScript({
        type: 'resendEvaluationEmail',
        id: evalId,
        row: fullEv?.rawRow || null,
        email: customEmail || null
    });
};

export const resendBolaPretaEmail = async (record: BolaPreta, customEmail?: string) => {
    const filesToInclude: Array<{ name: string; base64: string }> = [];
    const fields = ['celularImage', 'fumandoImage', 'cintoImage', 'printImage1', 'printImage2', 'printImage3', 'mapImage'] as const;
    
    fields.forEach(f => {
        const fileName = record[f];
        if (fileName && typeof fileName === 'string') {
            const cached = getCachedBolaPretaImage(record.id, f);
            if (cached) {
                filesToInclude.push({
                    name: fileName,
                    base64: cached
                });
            }
        }
    });

    return await callAppsScript({
        type: 'resendBolaPretaEmail',
        record: record,
        email: customEmail || 'deny.goncalves@risel.com.br',
        files: filesToInclude.length > 0 ? filesToInclude : undefined
    });
};

