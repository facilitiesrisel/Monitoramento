
import React, { useState, useEffect, useRef } from 'react';
import { getManagedDrivers, saveBolaPretaRecord, updateBolaPretaRecord, getMacroData, DEFAULT_DRIVE_FOLDER_ID, calculateMacroMetrics, getBolaPretaImage, cacheBolaPretaImage, getCachedBolaPretaImage, getFleetData, checkVehicleVerificationHistory, addFleetRecord, loadData, uploadMacrosAndSync } from '../services/dataService';
import { BolaPreta, DriverProfile, MacroData } from '../types';
import { X, Save, AlertCircle, CheckCircle, Truck, User, Calendar, PlusCircle, ShieldAlert, Zap, Camera, Image as ImageIcon, Map as MapIcon, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface BolaPretaFormProps {
    onClose: () => void;
    onSave: (record?: BolaPreta) => void;
    editRecord?: BolaPreta;
    operatorName?: string;
    preFilledFleet?: { vehicle: string, plate: string, base: string };
    readOnly?: boolean;
}

const violationTypes = [
    'Uso de Celular',
    'Fadiga / Sonolência',
    'Excesso de Velocidade',
    'Distração / Interação com Objetos',
    'Sem Cinto de Segurança',
    'Câmera Obstruída',
    'Ultrapassagem Indevida',
    'Fumando / Comendo',
    'Outros'
];

const BolaPretaForm: React.FC<BolaPretaFormProps> = ({ onClose, onSave, editRecord, operatorName, preFilledFleet, readOnly = false }) => {
    const [loading, setLoading] = useState(false);
    const [drivers, setDrivers] = useState<DriverProfile[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const macroFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
    const [base64Images, setBase64Images] = useState<Record<string, string>>({});
    const [macroDriverSelection, setMacroDriverSelection] = useState<string[] | null>(null);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    const [showEmailConfirm, setShowEmailConfirm] = useState<{ isOpen: boolean; onDecision: (resend: boolean) => void } | null>(null);
    
    // States for vehicle fleet verification and registration
    const [showRegisterVehicleModal, setShowRegisterVehicleModal] = useState<{ isOpen: boolean; plate: string } | null>(null);
    const [newVehicleData, setNewVehicleData] = useState({ frota: '', base: '' });
    const [showHistoryWarnModal, setShowHistoryWarnModal] = useState<{
        isOpen: boolean;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    } | null>(null);
    const [hasBypassedHistoryCheck, setHasBypassedHistoryCheck] = useState(false);
    
    const [formData, setFormData] = useState({
        date: editRecord?.date || preFilledFleet ? new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        driver: editRecord?.driver || '',
        vehicle: editRecord?.vehicle || preFilledFleet?.vehicle || '',
        plate: editRecord?.plate || preFilledFleet?.plate || '',
        base: editRecord?.base || preFilledFleet?.base || '',
        startTime: '',
        departureTime: '',
        macroClients: '',
        macroClientsObs: '',
        timeAtClient: '',
        avgTimeClients: '',
        informedStopsCount: '',
        totalStopsTime: '',
        arrivalBaseTime: '',
        endTime: '',
        kmDriven: '',
        uninformedStops: 'Não',
        uninformedStopsObs: '',
        suspiciousActivity: 'Não',
        suspiciousActivityObs: '',
        telemetryInfractions: 'Não',
        telemetryOptions: [] as string[],
        videoTelemetryInfractions: 'Não',
        videoTelemetryOptions: [] as string[],
        celularImageDesc: '',
        fumandoImageDesc: '',
        cintoImageDesc: '',
        printImage1Desc: '',
        printImage2Desc: '',
        printImage3Desc: '',
        verificationStatus: 'OK' as 'OK' | 'Observações Inseridas',
        verificationStatusObs: '',
        status: 'Aberto' as const
    });

    useEffect(() => {
        setDrivers(getManagedDrivers().sort((a, b) => a.name.localeCompare(b.name)));
        if (editRecord) {
            setFormData({
                date: editRecord.date,
                driver: editRecord.driver,
                vehicle: editRecord.vehicle,
                plate: editRecord.plate || '',
                base: editRecord.base,
                startTime: editRecord.startTime || '',
                departureTime: editRecord.departureTime || '',
                macroClients: editRecord.macroClients || '',
                macroClientsObs: editRecord.macroClientsObs || '',
                timeAtClient: editRecord.timeAtClient || '',
                avgTimeClients: editRecord.avgTimeClients || '',
                informedStopsCount: editRecord.informedStopsCount || '',
                totalStopsTime: editRecord.totalStopsTime || '',
                arrivalBaseTime: editRecord.arrivalBaseTime || '',
                endTime: editRecord.endTime || '',
                kmDriven: editRecord.kmDriven || '',
                uninformedStops: editRecord.uninformedStops || 'Não',
                uninformedStopsObs: editRecord.uninformedStopsObs || '',
                suspiciousActivity: editRecord.suspiciousActivity || 'Não',
                suspiciousActivityObs: editRecord.suspiciousActivityObs || '',
                telemetryInfractions: editRecord.telemetryInfractions || 'Não',
                telemetryOptions: editRecord.telemetryOptions || [],
                videoTelemetryInfractions: editRecord.videoTelemetryInfractions || 'Não',
                videoTelemetryOptions: editRecord.videoTelemetryOptions || [],
                celularImageDesc: editRecord.celularImageDesc || '',
                fumandoImageDesc: editRecord.fumandoImageDesc || '',
                cintoImageDesc: editRecord.cintoImageDesc || '',
                printImage1Desc: editRecord.printImage1Desc || '',
                printImage2Desc: editRecord.printImage2Desc || '',
                printImage3Desc: editRecord.printImage3Desc || '',
                verificationStatus: editRecord.verificationStatus || 'OK',
                verificationStatusObs: editRecord.verificationStatusObs || '',
                status: editRecord.status
            });

            // Carrega mídias salvas de forma híbrida: Cache + Fallback por rede
            const fields = ['celularImage', 'fumandoImage', 'cintoImage', 'printImage1', 'printImage2', 'printImage3', 'mapImage'];
            
            // Inferência automática para imagens de vídeo-telemetria caso não estejam no record do CSV mas a infração esteja marcada
            fields.forEach(f => {
                let imgVal = (editRecord as any)[f];
                if (!imgVal) {
                    if (f === 'celularImage' && editRecord.videoTelemetryOptions?.includes('Condutor ao Celular')) {
                        imgVal = `${editRecord.id}.celularImage.png`;
                        (editRecord as any).celularImage = imgVal;
                    } else if (f === 'fumandoImage' && editRecord.videoTelemetryOptions?.includes('Condutor Fumando')) {
                        imgVal = `${editRecord.id}.fumandoImage.png`;
                        (editRecord as any).fumandoImage = imgVal;
                    } else if (f === 'cintoImage' && editRecord.videoTelemetryOptions?.includes('Sem cinto de Segurança')) {
                        imgVal = `${editRecord.id}.cintoImage.png`;
                        (editRecord as any).cintoImage = imgVal;
                    }
                }
            });

            const loadedPreviews: Record<string, string> = {};
            
            fields.forEach(f => {
                const imgVal = (editRecord as any)[f];
                if (imgVal) {
                    const cached = getCachedBolaPretaImage(editRecord.id, f);
                    if (cached) {
                        loadedPreviews[f] = cached;
                    } else if (imgVal.startsWith('data:')) {
                        loadedPreviews[f] = imgVal;
                    }
                }
            });
            setImagePreviews(loadedPreviews);

            fields.forEach(async (f) => {
                const imgVal = (editRecord as any)[f];
                if (imgVal && !imgVal.startsWith('data:') && !getCachedBolaPretaImage(editRecord.id, f)) {
                    try {
                        const base64 = await getBolaPretaImage(imgVal);
                        if (base64) {
                            setImagePreviews(prev => ({ ...prev, [f]: base64 }));
                            cacheBolaPretaImage(editRecord.id, f, base64);
                        }
                    } catch (err) {
                        console.error(`Erro ao obter imagem para ${f}`, err);
                    }
                }
            });
        } else {
            setImagePreviews({});
            setBase64Images({});
        }
    }, [editRecord]);



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setImagePreviews(prev => ({ ...prev, [field]: base64 }));
            setBase64Images(prev => ({ ...prev, [field]: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleDriverSelect = (name: string) => {
        const drv = drivers.find(d => d.name === name);
        if (drv) {
            setFormData({ ...formData, driver: name, base: drv.base });
        } else {
            setFormData({ ...formData, driver: name });
        }
    };

    const handleAutoFill = (driverChoice?: string | any) => {
        if (!formData.date || !formData.plate) {
            alert("⚠️ Preencha a Data e a Placa primeiro.");
            return;
        }

        setIsSyncing(true);
        // Pequeno atraso para dar feedback visual de "buscando"
        setTimeout(() => {
            try {
                const choice = typeof driverChoice === 'string' ? driverChoice : undefined;
                const metrics = calculateMacroMetrics(formData.date, formData.plate, choice);

                if (metrics) {
                    if (metrics.type === 'multiple_drivers') {
                        setMacroDriverSelection(metrics.drivers);
                        setIsSyncing(false);
                        return;
                    }
                    
                    setMacroDriverSelection(null);
                    setFormData(prev => ({
                        ...prev,
                        vehicle: metrics.vehicle || prev.vehicle,
                        base: metrics.base || prev.base,
                        driver: metrics.driver || prev.driver,
                        startTime: metrics.startTime || prev.startTime,
                        departureTime: metrics.departureTime || prev.departureTime,
                        macroClients: metrics.macroClients || prev.macroClients,
                        macroClientsObs: metrics.macroClientsObs || prev.macroClientsObs,
                        timeAtClient: metrics.timeAtClient || prev.timeAtClient,
                        avgTimeClients: metrics.avgTimeClients || prev.avgTimeClients,
                        informedStopsCount: metrics.informedStopsCount || prev.informedStopsCount,
                        totalStopsTime: metrics.totalStopsTime || prev.totalStopsTime,
                        arrivalBaseTime: metrics.arrivalBaseTime || prev.arrivalBaseTime,
                        endTime: metrics.endTime || prev.endTime,
                        kmDriven: metrics.kmDriven || prev.kmDriven
                    }));
                    alert("✅ Dados recuperados com sucesso da Aba Macros!");
                } else {
                    alert("🔍 Nenhum dado encontrado para esta placa e data.\n\nVerifique se:\n1. O ID (GID) da aba 'Macros' está correto nas configurações (ícone de engrenagem no topo).\n2. A data e placa no arquivo coincidem exatamente.\n3. Você realizou a sincronização recente do arquivo.");
                }
            } catch (err) {
                console.error(err);
                alert("❌ Erro ao processar dados. Verifique o console para mais detalhes.");
            } finally {
                setIsSyncing(false);
            }
        }, 1200);
    };

    const handleMacroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formData.date || !formData.plate) {
            alert("⚠️ Preencha a Data e a Placa no formulário antes de importar o arquivo.");
            if (macroFileInputRef.current) macroFileInputRef.current.value = '';
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        setIsSyncing(true);
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
                setIsSyncing(false);
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
            
            const parseExcelDate = (val: any): { d: string, t: string } => {
                if (!val) return { d: '', t: '' };
                if (val instanceof Date) {
                    const dd = val.getUTCDate().toString().padStart(2, '0');
                    const mm = (val.getUTCMonth() + 1).toString().padStart(2, '0');
                    const yyyy = val.getUTCFullYear();
                    const H = val.getUTCHours().toString().padStart(2, '0');
                    const M = val.getUTCMinutes().toString().padStart(2, '0');
                    const S = val.getUTCSeconds().toString().padStart(2, '0');
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
                const str = String(val).trim();
                const p = str.split(/\s+/);
                let d = p[0];
                let t = p.slice(1).join(' ');
                if (d && d.includes('/')) {
                    const parts = d.split('/');
                    if (parts[0].length === 4) d = `${parts[2].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[0]}`;
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
                
                let dur = getStr(colMap.duracao);
                if (typeof getRaw(colMap.duracao) === 'number' && getRaw(colMap.duracao) < 1) {
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
                await loadData(true);
                alert(`✅ ${dataRows.length} macros sincronizadas com sucesso da planilha! Elas estão disponíveis para preenchimento.`);
                
                // Agora, autocompleta para a placa e data atualmente selecionadas
                handleAutoFill();
            } else {
                alert('Não foram encontrados dados válidos na planilha anexada.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao processar o arquivo Excel: ' + (err as Error).message);
        } finally {
            setIsSyncing(false);
            if (macroFileInputRef.current) macroFileInputRef.current.value = '';
        }
    };

    const handlePlateCheck = async (plateVal: string, dateVal: string, forceCheckHistory = false) => {
        const cleanPlateStr = (pl: string) => String(pl || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
        const targetPl = cleanPlateStr(plateVal);
        if (!targetPl || targetPl.length < 5) return true;

        // 1. Verificar se o veículo existe na base de frotas
        const list = getFleetData();
        const vehicleInfo = list.find(f => cleanPlateStr(f.placa) === targetPl || cleanPlateStr(f.frota) === targetPl);

        if (!vehicleInfo && !editRecord) {
            // Não existe na base! Perguntar se gostaria de cadastrar
            setShowRegisterVehicleModal({ isOpen: true, plate: plateVal });
            setNewVehicleData({ frota: formData.vehicle || '', base: formData.base || '' });
            return false; // Interrompe para cadastrar primeiro
        } else if (vehicleInfo) {
            // Existe! Vamos preencher Frota e Base se ainda estiverem vazios
            setFormData(prev => ({
                ...prev,
                vehicle: prev.vehicle || vehicleInfo.frota,
                base: prev.base || vehicleInfo.base
            }));
        }

        // 2. Verificar o histórico de verificação na semana/mês (somente para novos registros)
        if (dateVal && (!hasBypassedHistoryCheck || forceCheckHistory) && !editRecord) {
            const h = checkVehicleVerificationHistory(plateVal, dateVal, editRecord?.id);
            if (h.alreadyCheckedThisWeek || h.alreadyCheckedThisMonth) {
                let msg = "";
                if (h.alreadyCheckedThisWeek && h.alreadyCheckedThisMonth) {
                    msg = `⚠️ Atenção: Uma análise de viagem para este veículo (${plateVal}) já foi realizada esta semana (em ${h.weekRecordDate}) e também este mês (em ${h.monthRecordDate}).`;
                } else if (h.alreadyCheckedThisWeek) {
                    msg = `⚠️ Atenção: Uma análise de viagem para este veículo (${plateVal}) já foi realizada esta semana (em ${h.weekRecordDate}).`;
                } else {
                    msg = `⚠️ Atenção: Uma análise de viagem para este veículo (${plateVal}) já foi realizada este mês (em ${h.monthRecordDate}).`;
                }
                
                return new Promise<boolean>((resolve) => {
                    setShowHistoryWarnModal({
                        isOpen: true,
                        message: `${msg}\nDeseja continuar e realizar uma nova análise ou deseja cancelar?`,
                        onConfirm: () => {
                            setShowHistoryWarnModal(null);
                            setHasBypassedHistoryCheck(true);
                            resolve(true);
                        },
                        onCancel: () => {
                            setShowHistoryWarnModal(null);
                            resolve(false);
                        }
                    });
                });
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.driver || !formData.vehicle) {
            alert("Preencha os campos obrigatórios (Motorista e Frota).");
            return;
        }

        // Realiza validação de frotas e histórico ao tentar salvar
        const proceed = await handlePlateCheck(formData.plate, formData.date);
        if (!proceed) return;

        if (editRecord && !readOnly) {
            setShowEmailConfirm({
                isOpen: true,
                onDecision: async (resend) => {
                    setShowEmailConfirm(null);
                    await saveRecordFlow(resend);
                }
            });
        } else {
            await saveRecordFlow(false);
        }
    };

    const saveRecordFlow = async (resendEmail: boolean) => {
        setLoading(true);
        try {
            const imagesToUpload = Object.entries(base64Images).map(([field, base64]) => ({ field, base64: base64 as string }));
            
            let saved: BolaPreta | undefined;
            if (editRecord) {
                saved = await updateBolaPretaRecord(editRecord.id, formData, imagesToUpload, resendEmail);
            } else {
                saved = await saveBolaPretaRecord({
                    ...formData,
                    operator: operatorName || 'SISTEMA'
                }, imagesToUpload);
            }
            if (saved) {
                const finalId = saved.id;
                imagesToUpload.forEach(({ field, base64 }) => {
                    cacheBolaPretaImage(finalId, field, base64);
                });
            }
            
            // Recarrega os dados em background para sincronizar com todos os operadores
            try {
                await loadData(true);
            } catch (loadErr) {
                console.error("Erro ao sincronizar dados em background:", loadErr);
            }

            onSave(saved);
            onClose();
        } catch (err) {
            alert("Erro ao salvar registro.");
        } finally {
            setLoading(false);
        }
    };

    const renderImagePreview = (field: string, label: string, isBig: boolean = false) => {
        const previewSrc = imagePreviews[field];
        const isMap = field === 'mapImage';
        const hasExistingImage = editRecord && (editRecord as any)[field];
        const isLoadingImage = hasExistingImage && !previewSrc;
        
        if (readOnly) {
            if (isLoadingImage) {
                return (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">{label}</label>
                        <div className={`rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-slate-500 font-bold text-xs uppercase tracking-wider ${isMap ? 'h-80 md:h-[450px]' : (isBig ? 'h-64' : 'h-40')}`}>
                            <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
                            <span className="text-[10px] text-slate-400 font-black tracking-widest">Buscando do Google Drive...</span>
                        </div>
                    </div>
                );
            }
            if (previewSrc) {
                const descValue = editRecord ? (editRecord as any)[`${field}Desc`] : '';
                return (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">{label}</label>
                        <div 
                            className={`relative rounded-2xl border border-slate-200 bg-black overflow-hidden group cursor-zoom-in shadow-md ${isMap ? 'h-80 md:h-[450px]' : (isBig ? 'h-64' : 'h-40')}`}
                            onClick={() => setExpandedImage(previewSrc)}
                        >
                            <img 
                                src={previewSrc} 
                                className={`w-full h-full ${isMap ? 'object-cover' : 'object-contain'} transition-transform duration-300 group-hover:scale-[1.03]`} 
                                alt={label} 
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black uppercase tracking-widest gap-2">
                                🔍 Clique para Ampliar o Mapa Completo
                            </div>
                        </div>
                        {field !== 'mapImage' && descValue && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-600 italic">
                                <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block not-italic mb-0.5">Descrição:</span>
                                {descValue}
                            </div>
                        )}
                    </div>
                );
            } else {
                return (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">{label}</label>
                        <div className={`rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-wider ${isMap ? 'h-80 md:h-[450px]' : (isBig ? 'h-64' : 'h-40')}`}>
                            <ImageIcon className="w-8 h-8 text-slate-300 mb-1" />
                            Nenhuma evidência anexada
                        </div>
                    </div>
                );
            }
        }

        if (isLoadingImage) {
            return (
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">{label}</label>
                    <div className={`rounded-2xl border-2 border-dashed border-red-200 bg-red-50/10 flex flex-col items-center justify-center text-slate-500 font-bold text-xs uppercase tracking-wider ${isMap ? 'h-64 md:h-80' : (isBig ? 'h-48' : 'h-32')}`}>
                        <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
                        <span className="text-[10px] text-red-600 font-black tracking-widest">Sincronizando evidência...</span>
                    </div>
                </div>
            );
        }

        const descValue = (formData as any)[`${field}Desc`] || '';

        return (
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">{label}</label>
                <div className="flex flex-col gap-3">
                    <label 
                        className={`flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-red-400 hover:bg-red-50/20 transition-all overflow-hidden ${previewSrc ? (isMap ? 'h-40' : (isBig ? 'h-32' : 'h-20')) : (isMap ? 'h-64 md:h-80' : (isBig ? 'h-48' : 'h-32'))}`}
                    >
                        {previewSrc ? (
                            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase">
                                <CheckCircle size={16} /> Substituir Arquivo
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1.5 text-slate-400">
                                <Camera size={24} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Selecionar Evidência</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, field)} />
                    </label>
                    {previewSrc && (
                        <div 
                            className={`rounded-2xl border border-slate-200 bg-black overflow-hidden relative group cursor-zoom-in shadow-md ${isMap ? 'h-64 md:h-[350px]' : (isBig ? 'h-48' : 'h-32')}`}
                            onClick={() => setExpandedImage(previewSrc)}
                        >
                            <img src={previewSrc} alt="Preview" className={`w-full h-full ${isMap ? 'object-cover' : 'object-contain'}`} referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black uppercase tracking-widest gap-2">
                                🔍 Ver imagem em tamanho real
                            </div>
                        </div>
                    )}
                    {field !== 'mapImage' && (
                        <input 
                            type="text"
                            placeholder="Descreva o que este anexo representa..."
                            value={descValue}
                            onChange={e => setFormData(prev => ({ ...prev, [`${field}Desc`]: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                        />
                    )}
                </div>
            </div>
        );
    };

    const sectionTitle = (title: string) => (
        <div className="col-span-1 md:col-span-2 border-l-4 border-red-600 pl-3 py-1 bg-red-50/50 my-2">
            <span className="text-xs font-black text-red-700 uppercase tracking-widest">{title}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh] relative"
            >
                <AnimatePresence>
                   {macroDriverSelection && macroDriverSelection.length > 0 && (
                        <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        >
                           <div className="bg-white border-2 border-red-100 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                               <div className="bg-red-50 p-6 border-b border-red-100">
                                   <h3 className="text-xl font-black text-red-700 uppercase">Múltiplos Motoristas</h3>
                                   <p className="text-sm text-red-600/80 font-medium mt-1">Identificamos macros de mais de um motorista para esta placa nesta data. Selecione quem deseja avaliar:</p>
                               </div>
                               <div className="p-6 flex flex-col gap-3">
                                   {macroDriverSelection.map((driverName, idx) => (
                                       <button
                                           key={idx}
                                           type="button"
                                           onClick={() => handleAutoFill(driverName)}
                                           className="w-full text-left px-5 py-4 rounded-2xl bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 font-bold transition-all text-slate-700 flex justify-between items-center"
                                       >
                                           {driverName}
                                           <span className="text-red-600">→</span>
                                       </button>
                                   ))}
                               </div>
                               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                   <button 
                                      type="button" 
                                      onClick={() => setMacroDriverSelection(null)}
                                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200"
                                   >
                                       Cancelar Auto-Preenchimento
                                   </button>
                               </div>
                           </div>
                        </motion.div>
                   )}
                </AnimatePresence>
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/20">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                {readOnly ? 'DETALHES DA VERIFICAÇÃO (LEITURA)' : (editRecord ? 'DETALHES DA OCORRÊNCIA' : 'NOVA ANÁLISE DE VIAGEM')}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">Análise detalhada de jornada e macros</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!editRecord && !readOnly && (
                            <button 
                                type="button"
                                onClick={() => handleAutoFill()}
                                disabled={isSyncing}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border-2
                                    ${isSyncing 
                                        ? 'bg-slate-100 text-slate-400 border-slate-200' 
                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                            >
                                <Zap size={14} className={isSyncing ? 'animate-pulse' : ''} />
                                {isSyncing ? 'BUSCANDO...' : 'AUTO-PREENCHER (MACRO)'}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={24} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        
                        {sectionTitle('Informações Básicas')}
                        
                        {/* GRID LADO A LADO PARA DATA E PLACA (CAMPOS OBRIGATÓRIOS) */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-red-50/30 rounded-2xl border border-red-100">
                            {/* Data */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Data da Viagem</label>
                                <input 
                                    type="date" required
                                    disabled={readOnly}
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-white border border-slate-200 disabled:bg-slate-50 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                                />
                            </div>

                            {/* Placa */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Placa do Veículo</label>
                                <input 
                                    type="text" required
                                    disabled={readOnly}
                                    value={formData.plate}
                                    onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                                    onBlur={() => handlePlateCheck(formData.plate, formData.date)}
                                    placeholder="ABC-1234"
                                    className="w-full bg-white border-2 border-red-100 disabled:bg-slate-50 disabled:text-red-700 disabled:border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-black text-red-600 placeholder:text-red-300"
                                />
                            </div>

                            {/* Botão de Importação de Macros de Viagem */}
                            {!editRecord && !readOnly && (
                                <div className="md:col-span-2 mt-2 pt-2 border-t border-red-100/50 flex flex-col md:flex-row items-center justify-between gap-3">
                                    <span className="text-[11px] text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 leading-normal max-w-md">
                                        💡 O preenchimento automático só ocorrerá se a placa e a data informadas acima coincidirem exatamente com as informações contidas no relatório de macros importado.
                                    </span>
                                    <input 
                                        type="file" 
                                        ref={macroFileInputRef} 
                                        onChange={handleMacroFileUpload} 
                                        accept=".csv, .xlsx, .xls" 
                                        className="hidden" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.date || !formData.plate) {
                                                alert("⚠️ Preencha a Data e a Placa no formulário antes de importar o arquivo.");
                                                return;
                                            }
                                            macroFileInputRef.current?.click();
                                        }}
                                        disabled={isSyncing}
                                        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all border-2 w-full md:w-auto shrink-0
                                            ${isSyncing 
                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/10 hover:scale-[1.01] active:scale-95'}`}
                                    >
                                        <Upload size={14} className={isSyncing ? 'animate-pulse' : ''} />
                                        {isSyncing ? 'PROCESSANDO...' : 'IMPORTAR MACROS DA PLACA (DATA SELECIONADA)'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Operador */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Operador Logado</label>
                            <input 
                                type="text" disabled
                                value={editRecord ? editRecord.operator : (operatorName || 'SISTEMA')}
                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 font-bold cursor-not-allowed"
                            />
                        </div>

                        {/* Motorista */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Motorista</label>
                            <input 
                                type="text" required
                                disabled={readOnly}
                                value={formData.driver}
                                onChange={e => setFormData({ ...formData, driver: e.target.value.toUpperCase() })}
                                placeholder="Nome do Motorista"
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Veículo (Frota) */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Frota</label>
                            <input 
                                type="text" required
                                disabled={readOnly}
                                value={formData.vehicle}
                                onChange={e => setFormData({ ...formData, vehicle: e.target.value.toUpperCase() })}
                                placeholder="Ex: CT-1234"
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Base */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Base</label>
                            <input 
                                type="text" required
                                disabled={readOnly}
                                value={formData.base}
                                onChange={e => setFormData({ ...formData, base: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-100 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold text-slate-500"
                            />
                        </div>

                        {sectionTitle('Cronologia da Jornada')}

                        {/* Hora Início Jornada */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Hora Início de Jornada</label>
                            <input 
                                type="time"
                                disabled={readOnly}
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Hora Saída Base */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Hora Saída Base</label>
                            <input 
                                type="time"
                                disabled={readOnly}
                                value={formData.departureTime}
                                onChange={e => setFormData({ ...formData, departureTime: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Chegada na Base */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Chegada na Base</label>
                            <input 
                                type="time"
                                disabled={readOnly}
                                value={formData.arrivalBaseTime}
                                onChange={e => setFormData({ ...formData, arrivalBaseTime: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Fim de Jornada */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Fim de Jornada</label>
                            <input 
                                type="time"
                                disabled={readOnly}
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {sectionTitle('Métricas e Macros')}

                        {/* Clientes Macro */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Clientes Macro</label>
                            <input 
                                type="text"
                                disabled={readOnly}
                                value={formData.macroClients}
                                onChange={e => setFormData({ ...formData, macroClients: e.target.value })}
                                placeholder="ID ou Nomes"
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Tempo em Cliente */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tempo em Cliente</label>
                            <input 
                                type="text"
                                disabled={readOnly}
                                value={formData.timeAtClient}
                                onChange={e => setFormData({ ...formData, timeAtClient: e.target.value })}
                                placeholder="Total em Clientes"
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Tempo Médio Clientes */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tempo Médio Clientes</label>
                            <input 
                                type="text"
                                disabled={readOnly}
                                value={formData.avgTimeClients}
                                onChange={e => setFormData({ ...formData, avgTimeClients: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Obs Cliente Macro */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Obs Cliente Macro</label>
                            <input 
                                type="text"
                                disabled={readOnly}
                                value={formData.macroClientsObs}
                                onChange={e => setFormData({ ...formData, macroClientsObs: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {sectionTitle('Paradas e KM')}

                        {/* Qtd Paradas Informadas */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Qtd. Paradas informadas</label>
                            <input 
                                type="number"
                                disabled={readOnly}
                                value={formData.informedStopsCount}
                                onChange={e => setFormData({ ...formData, informedStopsCount: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* Tempo Total Paradas */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tempo Total Paradas</label>
                            <input 
                                type="text"
                                disabled={readOnly}
                                value={formData.totalStopsTime}
                                onChange={e => setFormData({ ...formData, totalStopsTime: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {/* KM Rodado */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">KM Rodado</label>
                            <input 
                                type="text"
                                disabled={readOnly}
                                value={formData.kmDriven}
                                onChange={e => setFormData({ ...formData, kmDriven: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold"
                            />
                        </div>

                        {sectionTitle('Telemetria e Video Telemetria')}

                        {/* Infrações de Telemetria */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Infrações de Telemetria?</label>
                            <div className="flex gap-2">
                                {['Não', 'Sim'].map(opt => (
                                    <button 
                                        key={opt}
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => setFormData({ ...formData, telemetryInfractions: opt })}
                                        className={`flex-1 py-1.5 px-4 rounded-xl text-sm font-bold border transition-colors ${formData.telemetryInfractions === opt ? (opt === 'Sim' ? 'bg-red-500 text-white border-red-500 font-black shadow-sm' : 'bg-green-500 text-white border-green-500 font-black shadow-sm') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formData.telemetryInfractions === 'Sim' && (
                            <div className="space-y-2 pl-2 border-l-2 border-red-200 col-span-1 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Selecione as Infrações</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Pico de Velocidade Seco', 'Pico de Velocidade Molhado', 'Freada Brusca'].map(opt => {
                                        const isSelected = formData.telemetryOptions.includes(opt);
                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                disabled={readOnly}
                                                onClick={() => {
                                                    const next = isSelected 
                                                        ? formData.telemetryOptions.filter(o => o !== opt)
                                                        : [...formData.telemetryOptions, opt];
                                                    setFormData({ ...formData, telemetryOptions: next });
                                                }}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${isSelected ? 'bg-red-100 text-red-700 border-red-200 font-black' : 'bg-white border-slate-200 text-slate-500 disabled:opacity-60'}`}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Infrações de VideoTelemetria */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Infrações de VideoTelemetria?</label>
                            <div className="flex gap-2">
                                {['Não', 'Sim'].map(opt => (
                                    <button 
                                        key={opt}
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => setFormData({ ...formData, videoTelemetryInfractions: opt })}
                                        className={`flex-1 py-1.5 px-4 rounded-xl text-sm font-bold border transition-colors ${formData.videoTelemetryInfractions === opt ? (opt === 'Sim' ? 'bg-red-500 text-white border-red-500 font-black shadow-sm' : 'bg-green-500 text-white border-green-500 font-black shadow-sm') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formData.videoTelemetryInfractions === 'Sim' && (
                            <div className="space-y-4 pl-2 border-l-2 border-red-200 col-span-1 md:col-span-2">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Selecione as Infrações</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {['Condutor ao Celular', 'Condutor Fumando', 'Sem cinto de Segurança'].map(opt => {
                                            const isSelected = formData.videoTelemetryOptions.includes(opt);
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => {
                                                        const next = isSelected 
                                                            ? formData.videoTelemetryOptions.filter(o => o !== opt)
                                                            : [...formData.videoTelemetryOptions, opt];
                                                        setFormData({ ...formData, videoTelemetryOptions: next });
                                                    }}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${isSelected ? 'bg-red-100 text-red-700 border-red-200 font-black' : 'bg-white border-slate-200 text-slate-500 disabled:opacity-60'}`}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {formData.videoTelemetryOptions.includes('Condutor ao Celular') && renderImagePreview('celularImage', 'Condutor ao Celular')}
                                    {formData.videoTelemetryOptions.includes('Condutor Fumando') && renderImagePreview('fumandoImage', 'Condutor Fumando')}
                                    {formData.videoTelemetryOptions.includes('Sem cinto de Segurança') && renderImagePreview('cintoImage', 'Sem Cinto de Segurança')}
                                </div>
                            </div>
                        )}

                        {sectionTitle('Avaliação Crítica')}

                        {/* Paradas não informadas */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Paradas não Informadas?</label>
                            <div className="flex gap-2 mb-2">
                                {['Não', 'Sim'].map(opt => (
                                    <button 
                                        key={opt} type="button"
                                        disabled={readOnly}
                                        onClick={() => setFormData({...formData, uninformedStops: opt})}
                                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border ${formData.uninformedStops === opt ? (opt === 'Não' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-red-600 border-red-600 text-white shadow-md') : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300'}`}
                                    >
                                        {opt.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            {formData.uninformedStops === 'Sim' && (
                                <input 
                                    type="text"
                                    placeholder="Detalhes da parada..."
                                    disabled={readOnly}
                                    value={formData.uninformedStopsObs}
                                    onChange={e => setFormData({ ...formData, uninformedStopsObs: e.target.value })}
                                    className="w-full bg-amber-50 border border-amber-100 disabled:bg-slate-50 disabled:text-slate-705 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-red-600 outline-none font-medium text-amber-900 placeholder:text-amber-300"
                                />
                            )}
                        </div>

                        {/* Atitude Suspeita */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Atitude Suspeita?</label>
                            <div className="flex gap-2 mb-2">
                                {['Não', 'Sim'].map(opt => (
                                    <button 
                                        key={opt} type="button"
                                        disabled={readOnly}
                                        onClick={() => setFormData({...formData, suspiciousActivity: opt})}
                                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border ${formData.suspiciousActivity === opt ? (opt === 'Não' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-red-600 border-red-600 text-white shadow-md') : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300'}`}
                                    >
                                        {opt.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            {formData.suspiciousActivity === 'Sim' && (
                                <input 
                                    type="text"
                                    placeholder="Detalhes da atitude..."
                                    disabled={readOnly}
                                    value={formData.suspiciousActivityObs}
                                    onChange={e => setFormData({ ...formData, suspiciousActivityObs: e.target.value })}
                                    className="w-full bg-amber-50 border border-amber-100 disabled:bg-slate-50 disabled:text-slate-705 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-red-600 outline-none font-medium text-amber-900 placeholder:text-amber-300"
                                />
                            )}
                        </div>

                        {sectionTitle('Evidências e Imagens')}

                        {/* Prints de Evidência */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(num => (
                                <React.Fragment key={num}>
                                    {renderImagePreview(`printImage${num}`, `Print Evidência ${num}`)}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Mapa de Movimentação */}
                        <div className="md:col-span-2">
                            {renderImagePreview('mapImage', 'Mapa de Movimentação do Veículo', true)}
                        </div>

                        {/* Status Final da Verificação */}
                        <div className="md:col-span-2 space-y-3 pt-6 border-t border-slate-100">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                <ShieldAlert size={14} className="text-red-500" /> STATUS FINAL DA VERIFICAÇÃO
                            </label>
                            <div className="flex gap-3">
                                {(['OK', 'Observações Inseridas'] as const).map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => setFormData({ ...formData, verificationStatus: option })}
                                        className={`flex-1 py-4 rounded-xl text-[11px] font-black border transition-colors ${
                                            formData.verificationStatus === option
                                                ? option === 'OK' 
                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 font-black' 
                                                    : 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30 font-black'
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-300'
                                        }`}
                                    >
                                        {option.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {formData.verificationStatus === 'Observações Inseridas' && (
                                <div className="space-y-2 mt-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        REPORTE DE OBSERVAÇÃO DETALHADA
                                    </label>
                                    <textarea
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-xs text-slate-800 disabled:bg-slate-50 resize-y min-h-[100px]"
                                        placeholder="Descreva aqui com detalhes o desvio ou a não conformidade que foi encontrada durante a viagem..."
                                        value={formData.verificationStatusObs || ''}
                                        rows={3}
                                        disabled={readOnly}
                                        onChange={e => setFormData({ ...formData, verificationStatusObs: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-10 sticky bottom-0 bg-white md:bg-white/95 backdrop-blur-sm z-10 pb-4">
                        {readOnly ? (
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="w-full py-4 bg-emerald-600 rounded-2xl text-white font-black text-sm hover:bg-emerald-700 transition-all uppercase tracking-wide shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-95"
                            >
                                FECHAR VISUALIZAÇÃO
                            </button>
                        ) : (
                            <>
                                <button 
                                    type="button" 
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-600 font-black text-sm hover:bg-slate-200 transition-all uppercase"
                                >
                                    FECHAR
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-red-600 rounded-2xl text-white font-black text-sm shadow-xl shadow-red-600/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale uppercase"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                    {loading ? 'SALVANDO...' : (editRecord ? 'ATUALIZAR REGISTRO' : 'SALVAR ANÁLISE DE VIAGEM')}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </motion.div>

            {/* Modal de Zoom da Imagem */}
            {expandedImage && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 cursor-zoom-out animate-in fade-in duration-200"
                    onClick={() => setExpandedImage(null)}
                >
                    <button 
                        onClick={() => setExpandedImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-slate-300 p-3 text-xs font-black uppercase tracking-widest bg-white/10 rounded-xl"
                    >
                        Fechar ✕
                    </button>
                    <img 
                        src={expandedImage} 
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
                        alt="Zoom" 
                        referrerPolicy="no-referrer"
                    />
                </div>
            )}

            {/* Modal de Confirmação de Envio de E-mail */}
            {showEmailConfirm && showEmailConfirm.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-205">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-600">
                            <ShieldAlert size={28} />
                            <h3 className="text-lg font-black tracking-tight uppercase">Reenviar por e-mail?</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            Você editou uma verificação. Deseja enviar o relatório atualizado por e-mail para a lista de destinatários?
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button 
                                onClick={() => showEmailConfirm.onDecision(true)}
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 rounded-2xl text-white font-black text-xs shadow-lg shadow-red-600/20 hover:scale-[1.01] active:scale-95 transition-all uppercase"
                            >
                                Sim, reenviar e-mail
                            </button>
                            <button 
                                onClick={() => showEmailConfirm.onDecision(false)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 font-black text-xs transition-all uppercase"
                            >
                                Não, apenas salvar
                            </button>
                            <button 
                                onClick={() => setShowEmailConfirm(null)}
                                className="w-full sm:w-auto px-4 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-400 font-bold text-xs uppercase"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro de Veículo (Se não houver na Base de frotas) */}
            {showRegisterVehicleModal && showRegisterVehicleModal.isOpen && (
                <div id="modal-register-vehicle" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
                        <div className="flex items-center gap-4 text-emerald-600">
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <Truck size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight leading-none uppercase">Cadastrar Veículo</h3>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Novo veículo detectado</span>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            O veículo com a placa <strong className="text-emerald-700 font-bold">{showRegisterVehicleModal.plate}</strong> não consta na Base de Veículos da frota. Gostaria de cadastrá-lo para fins de controle e estatísticas?
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">Placa</label>
                                <input 
                                    type="text" disabled
                                    value={showRegisterVehicleModal.plate}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 font-black cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">Frota (Ex: CT-1234)</label>
                                <input 
                                    type="text" required
                                    placeholder="Prefixo da Frota"
                                    value={newVehicleData.frota}
                                    onChange={e => setNewVehicleData(prev => ({ ...prev, frota: e.target.value.toUpperCase() }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">Base (Ex: SAO PAULO)</label>
                                <input 
                                    type="text" required
                                    placeholder="Base de Atuação"
                                    value={newVehicleData.base}
                                    onChange={e => setNewVehicleData(prev => ({ ...prev, base: e.target.value.toUpperCase() }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button 
                                id="btn-confirm-register"
                                onClick={async () => {
                                    if (!newVehicleData.frota || !newVehicleData.base) {
                                        alert("⚠️ Por favor, informe a Frota e a Base para cadastrar.");
                                        return;
                                    }
                                    setLoading(true);
                                    try {
                                        const res = await addFleetRecord({
                                            placa: showRegisterVehicleModal.plate,
                                            frota: newVehicleData.frota,
                                            base: newVehicleData.base
                                        });
                                        setFormData(prev => ({
                                            ...prev,
                                            plate: showRegisterVehicleModal.plate,
                                            vehicle: newVehicleData.frota,
                                            base: newVehicleData.base
                                        }));
                                        setShowRegisterVehicleModal(null);
                                        
                                        if (res && !res.success) {
                                            alert(`⚠️ O veículo foi adicionado temporariamente nesta sessão, mas não pôde ser gravado definitivamente na planilha do Google Sheets.\n\nMotivo: ${res.error}\n\nPor favor, salve esta viagem normalmente e depois solicite ao administrador (DENY) para atualizar o Script da Planilha (usando as instruções mais recentes), garantindo que os novos cadastros fiquem salvos para sempre.`);
                                        } else {
                                            alert("✅ Veículo cadastrado com sucesso e adicionado aos controles!");
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert("❌ Ocorreu um erro ao cadastrar o veículo.");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-white font-black text-xs shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-95 transition-all uppercase"
                            >
                                Sim, Cadastrar no Sistema
                            </button>
                            <button 
                                id="btn-cancel-register"
                                onClick={() => {
                                    setShowRegisterVehicleModal(null);
                                }}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 font-black text-xs transition-all uppercase"
                            >
                                Não cadastrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Alerta de Histórico (Duplicidade na Semana ou Mês) */}
            {showHistoryWarnModal && showHistoryWarnModal.isOpen && (
                <div id="modal-history-warn" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
                        <div className="flex items-center gap-4 text-amber-600">
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <AlertCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight leading-none uppercase">Alerta de Frequência</h3>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Histórico de Verificação</span>
                            </div>
                        </div>

                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-900 font-semibold leading-relaxed">
                            {showHistoryWarnModal.message.split('\nDeseja')[0]}
                        </div>

                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            O operador já realizou uma verificação recente para este veículo. Você deseja prosseguir e realizar uma nova análise ou deseja cancelar este preenchimento?
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button 
                                id="btn-confirm-history"
                                onClick={() => {
                                    showHistoryWarnModal.onConfirm();
                                }}
                                className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 rounded-2xl text-white font-black text-xs shadow-lg shadow-amber-600/20 hover:scale-[1.01] active:scale-95 transition-all uppercase"
                            >
                                Sim, Fazer de Novo
                            </button>
                            <button 
                                id="btn-cancel-history"
                                onClick={() => {
                                    showHistoryWarnModal.onCancel();
                                }}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 font-black text-xs transition-all uppercase"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BolaPretaForm;
