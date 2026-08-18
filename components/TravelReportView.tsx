import React, { useEffect, useState } from 'react';
import { BolaPreta } from '../types';
import { 
    X, Printer, ShieldAlert, Calendar, User, Truck, Clock, AlertTriangle, 
    CheckCircle2, MapPin, Eye, Camera, CheckSquare, Zap, Activity, Loader2, Mail
} from 'lucide-react';
import { motion } from 'motion/react';
import { getBolaPretaImage, getCachedBolaPretaImage, cacheBolaPretaImage, resendBolaPretaEmail } from '../services/dataService';

interface TravelReportViewProps {
    record: BolaPreta;
    onClose: () => void;
}

export const TravelReportView: React.FC<TravelReportViewProps> = ({ record, onClose }) => {
    const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
    const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
    const [isResending, setIsResending] = useState(false);

    const handleResendEmail = async () => {
        const customEmail = prompt(`Reenviar e-mail de Análise de Viagem de ${record.driver}?\n\nInforme o e-mail de destino (ou deixe em branco para enviar aos destinatários padrão):`, "deny.goncalves@risel.com.br");
        if (customEmail === null) return;

        setIsResending(true);
        try {
            await resendBolaPretaEmail(record, customEmail.trim() || undefined);
            alert("E-mail de Análise de Viagem reenviado com sucesso!");
        } catch (e: any) {
            alert("Erro ao reenviar e-mail: " + (e?.message || e));
        } finally {
            setIsResending(false);
        }
    };

    useEffect(() => {
        const fields = ['celularImage', 'fumandoImage', 'cintoImage', 'printImage1', 'printImage2', 'printImage3', 'mapImage'];
        
        // Inferência automática de mídias para relatório de viagem
        fields.forEach(f => {
            let imgVal = (record as any)[f];
            if (!imgVal) {
                if (f === 'celularImage' && record.videoTelemetryOptions?.includes('Condutor ao Celular')) {
                    imgVal = `${record.id}.celularImage.png`;
                } else if (f === 'fumandoImage' && record.videoTelemetryOptions?.includes('Condutor Fumando')) {
                    imgVal = `${record.id}.fumandoImage.png`;
                } else if (f === 'cintoImage' && record.videoTelemetryOptions?.includes('Sem cinto de Segurança')) {
                    imgVal = `${record.id}.cintoImage.png`;
                }
            }
        });

        const loadedPreviews: Record<string, string> = {};
        
        fields.forEach(f => {
            let imgVal = (record as any)[f];
            if (!imgVal) {
                if (f === 'celularImage' && record.videoTelemetryOptions?.includes('Condutor ao Celular')) imgVal = `${record.id}.celularImage.png`;
                if (f === 'fumandoImage' && record.videoTelemetryOptions?.includes('Condutor Fumando')) imgVal = `${record.id}.fumandoImage.png`;
                if (f === 'cintoImage' && record.videoTelemetryOptions?.includes('Sem cinto de Segurança')) imgVal = `${record.id}.cintoImage.png`;
            }
            if (imgVal) {
                const cached = getCachedBolaPretaImage(record.id, f);
                if (cached) {
                    loadedPreviews[f] = cached;
                } else if (imgVal.startsWith('data:') || imgVal.startsWith('http://') || imgVal.startsWith('https://')) {
                    loadedPreviews[f] = imgVal;
                }
            }
        });
        setImagePreviews(loadedPreviews);

        fields.forEach(async (f) => {
            let imgVal = (record as any)[f];
            if (!imgVal) {
                if (f === 'celularImage' && record.videoTelemetryOptions?.includes('Condutor ao Celular')) imgVal = `${record.id}.celularImage.png`;
                if (f === 'fumandoImage' && record.videoTelemetryOptions?.includes('Condutor Fumando')) imgVal = `${record.id}.fumandoImage.png`;
                if (f === 'cintoImage' && record.videoTelemetryOptions?.includes('Sem cinto de Segurança')) imgVal = `${record.id}.cintoImage.png`;
            }

            if (imgVal && !imgVal.startsWith('data:') && !imgVal.startsWith('http://') && !imgVal.startsWith('https://') && !getCachedBolaPretaImage(record.id, f)) {
                setLoadingImages(prev => ({ ...prev, [f]: true }));
                try {
                    const base64 = await getBolaPretaImage(imgVal);
                    if (base64) {
                        setImagePreviews(prev => ({ ...prev, [f]: base64 }));
                        cacheBolaPretaImage(record.id, f, base64);
                    }
                } catch (err) {
                    console.error(`Erro ao obter imagem corporativa ${f}`, err);
                } finally {
                    setLoadingImages(prev => ({ ...prev, [f]: false }));
                }
            }
        });
    }, [record]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const hasInfractions = record.telemetryInfractions === 'Sim' || record.videoTelemetryInfractions === 'Sim' || record.uninformedStops === 'Sim' || record.suspiciousActivity === 'Sim';

    const visibleFields = ['celularImage', 'fumandoImage', 'cintoImage', 'printImage1', 'printImage2', 'printImage3', 'mapImage'].filter(f => {
        return (typeof (record as any)[f] === 'string' && (record as any)[f].trim() !== '') ||
            (f === 'celularImage' && record.videoTelemetryOptions?.includes('Condutor ao Celular')) ||
            (f === 'fumandoImage' && record.videoTelemetryOptions?.includes('Condutor Fumando')) ||
            (f === 'cintoImage' && record.videoTelemetryOptions?.includes('Sem cinto de Segurança'));
    });

    const isAnyImageLoading = visibleFields.some(f => loadingImages[f] === true);

    const handlePrint = () => {
        if (isAnyImageLoading) {
            alert("Aguarde o carregamento completo de todas as imagens antes de imprimir.");
            return;
        }
        window.focus();
        window.print();
    };

    const renderReportImage = (field: string, label: string) => {
        const hasImage = (typeof (record as any)[field] === 'string' && (record as any)[field].trim() !== '') ||
            (field === 'celularImage' && record.videoTelemetryOptions?.includes('Condutor ao Celular')) ||
            (field === 'fumandoImage' && record.videoTelemetryOptions?.includes('Condutor Fumando')) ||
            (field === 'cintoImage' && record.videoTelemetryOptions?.includes('Sem cinto de Segurança'));
            
        if (!hasImage) return null;
        
        const previewSrc = imagePreviews[field];
        const isLoading = loadingImages[field];
        
        const descValue = (record as any)[`${field}Desc`] || '';
        
        return (
            <div className="space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/70 break-inside-avoid shadow-sm flex flex-col justify-between">
                <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">{label}</span>
                    <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video max-h-56 border border-slate-200 flex items-center justify-center relative min-h-[140px] shadow-inner">
                        {previewSrc ? (
                            <img 
                                src={previewSrc} 
                                alt={label} 
                                className="w-full h-full object-contain" 
                                referrerPolicy="no-referrer" 
                            />
                        ) : isLoading ? (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Loader2 className="animate-spin text-[#00ad74]" size={24} />
                                <span className="text-[9px] font-bold tracking-wider uppercase text-slate-500">Carregando do Drive...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                                <Camera size={24} className="opacity-40" />
                                <span className="text-[9px] font-bold tracking-wider uppercase">Falta carregar anexo</span>
                            </div>
                        )}
                    </div>
                </div>
                {descValue && (
                    <div className="bg-white border border-slate-150 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-600 font-medium italic mt-2 shadow-sm break-words">
                        <span className="font-black text-[8px] uppercase tracking-wider text-slate-400 not-italic block mb-0.5">Descrição do Anexo:</span>
                        {descValue}
                    </div>
                )}
            </div>
        );
    };

    const renderReportMap = () => {
        const hasMap = typeof record.mapImage === 'string' && record.mapImage.trim() !== '';
        if (!hasMap) return null;
        
        const previewSrc = imagePreviews.mapImage;
        const isLoading = loadingImages.mapImage;
        
        return (
            <div className="space-y-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/70 break-inside-avoid print:break-inside-avoid shadow-sm w-full block">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">6. Trajeto Geográfico (Mapa de Movimentação)</span>
                <div className="rounded-xl overflow-hidden bg-slate-900 aspect-[16/9] w-full border border-slate-200 flex items-center justify-center relative min-h-[220px] shadow-inner">
                    {previewSrc ? (
                        <img 
                            src={previewSrc} 
                            alt="Mapa de Trajeto" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer" 
                        />
                    ) : isLoading ? (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Loader2 className="animate-spin text-[#00ad74]" size={30} />
                            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-500">Carregando mapa...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                            <Camera size={30} className="opacity-40" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">Falta carregar mapa</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-0 md:p-4 overflow-y-auto animate-in fade-in duration-300 printable-modal-backdrop print:bg-white print:p-0 print:static print:z-auto print:overflow-visible">
            {/* Main Container */}
            <motion.div 
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-50 w-full max-w-4xl shadow-2xl rounded-none md:rounded-[2.5rem] overflow-hidden flex flex-col my-0 md:my-8 max-h-full md:max-h-[92vh] border border-slate-100 print:shadow-none print:border-none print:max-h-none print:my-0 print:p-0 print:static print:overflow-visible"
            >
                {/* Header (Hidden in Print) */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800 print:hidden font-sans">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#00ad74] rounded-xl text-white shadow-lg shadow-[#00ad74]/30 flex items-center justify-center">
                            <Truck size={20} className="text-white animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Análise de Viagem</h2>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Risel Combustíveis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button" 
                            onClick={handleResendEmail}
                            disabled={isResending}
                            className="flex items-center gap-2 font-black text-xs uppercase px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-lg shadow-blue-600/20 transition-all font-sans disabled:opacity-50"
                            title="Reenviar este relatório por e-mail"
                        >
                            {isResending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Mail size={16} />
                                    Reenviar E-mail
                                </>
                            )}
                        </button>
                        <button 
                            type="button" 
                            onClick={handlePrint}
                            disabled={isAnyImageLoading}
                            className={`flex items-center gap-2 font-black text-xs uppercase px-5 py-3 rounded-xl shadow-lg transition-all font-sans ${
                                isAnyImageLoading 
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                    : 'bg-[#00ad74] hover:bg-[#009462] active:scale-95 text-white shadow-[#00ad74]/20'
                            }`}
                        >
                            {isAnyImageLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Carregando Mídias...
                                </>
                            ) : (
                                <>
                                    <Printer size={16} />
                                    Imprimir PDF
                                </>
                            )}
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Area - Formatted like a real paper form */}
                <div className="relative overflow-y-auto p-4 md:p-10 space-y-8 print:overflow-visible print:p-0 print:space-y-6 bg-white flex-1 custom-scrollbar">

                    {/* Document Brand & Header */}
                    <div className="relative z-10 border-b-4 border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            {/* Logo Risel Combustíveis Oficial */}
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white flex items-center justify-center shadow-md shrink-0 border border-slate-100 p-0.5 print:border-slate-200">
                                <img 
                                    src="https://i.ibb.co/My6STcDv/71144827-2525571747712417-6231227587708846080-n.jpg" 
                                    alt="Logo Risel Combustíveis" 
                                    className="w-full h-full object-cover rounded-xl"
                                    referrerPolicy="no-referrer"
                                  />
                            </div>
                            <div className="space-y-0.5">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight select-none leading-none">RISEL COMBUSTÍVEIS</h1>
                                <p className="text-[10px] text-[#00ad74] font-black uppercase tracking-widest">SISTEMA DE CONTROLE DE MONITORAMENTO DE VIAGENS</p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right font-mono text-[10px] text-slate-500 space-y-0.5 shrink-0">
                            <div><strong>DOCUMENTO ID:</strong> BP-{record.id.slice(0, 8).toUpperCase()}</div>
                            <div><strong>EMISSÃO:</strong> {new Date(record.createdAt || Date.now()).toLocaleString('pt-BR')}</div>
                            <div><strong>OPERADOR:</strong> {record.operator?.toUpperCase() || 'SISTEMA'}</div>
                        </div>
                    </div>

                    {/* SECTION 1: DADOS GERAIS */}
                    <div className="relative z-10 space-y-4 break-inside-avoid print:break-inside-avoid">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                            <User size={16} className="text-[#00ad74]" />
                            1. Identificação do Condutor e Veículo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50/60 rounded-[1.5rem] border border-slate-200">
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">👤 Motorista</span>
                                <p className="text-sm font-black text-slate-800 uppercase leading-none">{record.driver}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">🚛 Frota / ID</span>
                                <p className="text-sm font-black text-slate-800 uppercase leading-none">{record.vehicle}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">🔢 Placa do Veículo</span>
                                <p className="text-sm font-mono font-black text-[#00ad74] leading-none">{record.plate}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">🏢 Base Operacional</span>
                                <p className="text-sm font-black text-slate-800 uppercase leading-none">{record.base || 'TRIÂNGULO'}</p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: CRONOLOGIA DA JORNADA */}
                    <div className="relative z-10 space-y-3 break-inside-avoid print:break-inside-avoid">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Clock size={16} className="text-slate-400" />
                            2. Cronologia e Resumo do Percurso
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Data Viagem</span>
                                <span className="text-xs font-black text-slate-800">{formatDate(record.date)}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Início Jornada</span>
                                <span className="text-xs font-black text-slate-800">{record.startTime || '--:--'}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Saída Base</span>
                                <span className="text-xs font-black text-slate-800">{record.departureTime || '--:--'}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Retorno Base</span>
                                <span className="text-xs font-black text-slate-800">{record.arrivalBaseTime || '--:--'}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Fim Jornada</span>
                                <span className="text-xs font-black text-slate-800">{record.endTime || '--:--'}</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: MÉTRICAS DA JORNADA & CLIENTES MACRO */}
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                            <MapPin size={16} className="text-slate-400" />
                            3. Métricas de Paradas e Clientes Macro
                        </h3>
                        
                        {/* Row 1: Métricas Quantitativas em Visual Bento-Grid Horizontal */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 break-inside-avoid print:break-inside-avoid">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Tempo Clientes</span>
                                <span className="text-sm font-black text-slate-800 mt-1">{record.timeAtClient || '--:--'}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Tempo Médio</span>
                                <span className="text-sm font-black text-slate-800 mt-1">{record.avgTimeClients || '--:--'}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Paradas Inf.</span>
                                <span className="text-sm font-black text-slate-800 mt-1">{record.informedStopsCount || '0'}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">Tempo Paradas</span>
                                <span className="text-sm font-black text-slate-800 mt-1">{record.totalStopsTime || '--:--'}</span>
                            </div>
                            <div className="bg-[#00ad74]/5 border border-[#00ad74]/15 p-4 rounded-xl flex flex-col justify-between col-span-2 sm:col-span-1 text-[#008f61]">
                                <span className="text-[10px] font-black uppercase block leading-tight">Distância</span>
                                <span className="text-sm font-black mt-1">{record.kmDriven ? `${record.kmDriven} KM` : 'N/A'}</span>
                            </div>
                        </div>

                        {/* Row 2: Dados Qualitativos de Clientes Macro e seu Relatório */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 break-inside-avoid print:break-inside-avoid">
                            {/* Clientes Macro */}
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Clientes Macro</span>
                                <p className="text-xs font-black text-slate-800 uppercase leading-relaxed">{record.macroClients || 'Nenhum informado'}</p>
                            </div>
                            
                            {/* Observação Cliente Macro */}
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Obs Cliente Macro</span>
                                <p className="text-xs text-slate-700 italic leading-relaxed whitespace-pre-wrap font-medium">
                                    {record.macroClientsObs || 'Sem observações cadastradas.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* PAGE BREAK SLOTS REMOVED FOR CLEAN AUTOMATIC FLOW */}

                    {/* SECTION 4: CONVENCIONAIS E VIDEO-TELEMETRIAS (Formatação Condicional) */}
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Activity size={16} className="text-slate-400" />
                            4. Avaliação de Desvios de Telemetria e Conduta
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card de Telemetria Convencional */}
                            <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 break-inside-avoid print:break-inside-avoid ${
                                record.telemetryInfractions === 'Sim'
                                    ? 'bg-rose-500/5 border-rose-500/20'
                                    : 'bg-emerald-500/5 border-emerald-500/20'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Telemetria Convencional</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                        record.telemetryInfractions === 'Sim'
                                            ? 'bg-rose-100 border-rose-200 text-rose-700'
                                            : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                                    }`}>
                                        {record.telemetryInfractions === 'Sim' ? 'Infrações' : 'Sem desvios'}
                                    </span>
                                </div>
                                <div className="space-y-1 flex-1 py-1">
                                    {record.telemetryInfractions === 'Sim' && record.telemetryOptions && record.telemetryOptions.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {record.telemetryOptions.map(opt => (
                                                <span key={opt} className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded border border-rose-200">{opt}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-semibold text-slate-400">Nenhum evento severo de telemetria registrado na jornada.</p>
                                    )}
                                </div>
                            </div>

                            {/* Card de Vídeo Telemetria */}
                            <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 break-inside-avoid print:break-inside-avoid ${
                                record.videoTelemetryInfractions === 'Sim'
                                    ? 'bg-rose-500/5 border-rose-500/20'
                                    : 'bg-emerald-500/5 border-emerald-500/20'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Vídeo-Telemetria (Câmera)</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                        record.videoTelemetryInfractions === 'Sim'
                                            ? 'bg-rose-100 border-rose-200 text-rose-700'
                                            : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                                    }`}>
                                        {record.videoTelemetryInfractions === 'Sim' ? 'Infrações' : 'Sem desvios'}
                                    </span>
                                </div>
                                <div className="space-y-1 flex-1 py-1">
                                    {record.videoTelemetryInfractions === 'Sim' && record.videoTelemetryOptions && record.videoTelemetryOptions.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {record.videoTelemetryOptions.map(opt => (
                                                <span key={opt} className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded border border-rose-200">{opt}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-semibold text-slate-400">Nenhuma infração comportamental identificada por vídeo.</p>
                                    )}
                                </div>
                            </div>

                            {/* Paradas Não Informadas */}
                            <div className="p-5 rounded-2xl border flex flex-col justify-between gap-3 bg-white/40 break-inside-avoid print:break-inside-avoid">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Paradas Não Informadas</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                        record.uninformedStops === 'Sim'
                                            ? 'bg-rose-100 border-rose-200 text-rose-700'
                                            : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                                    }`}>
                                        {record.uninformedStops || 'Não'}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold italic text-slate-800">
                                    {record.uninformedStops === 'Sim' 
                                        ? `Detalhamento: ${record.uninformedStopsObs || 'Desvio identificado na rota'}`
                                        : ' Sem paradas Não Informadas'
                                    }
                                </p>
                            </div>

                            {/* Atitudes Suspeitas */}
                            <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 break-inside-avoid print:break-inside-avoid ${
                                record.suspiciousActivity === 'Sim'
                                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-900'
                                    : 'bg-emerald-500/5 border-emerald-500/20 text-[#008f61]'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Comportamentos Suspeitos</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                        record.suspiciousActivity === 'Sim'
                                            ? 'bg-rose-100 border-rose-200 text-rose-700'
                                            : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                                    }`}>
                                        {record.suspiciousActivity || 'Não'}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold italic">
                                    {record.suspiciousActivity === 'Sim' 
                                        ? `Detalhamento: ${record.suspiciousActivityObs || 'Falta de comunicação ou desvio injustificado'}`
                                        : 'Nenhuma inconformidade de segurança adicional.'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: EVIDÊNCIAS DE IMAGEM */}
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Camera size={16} className="text-slate-400" />
                            5. Anexos e Evidências Visuais
                        </h3>

                        {/* Grid de evidências */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                            {renderReportImage('printImage1', 'Print Evidência 01')}
                            {renderReportImage('printImage2', 'Print Evidência 02')}
                            {renderReportImage('printImage3', 'Print Evidência 03')}
                            {renderReportImage('celularImage', 'Infração de Celular')}
                            {renderReportImage('fumandoImage', 'Infração de Fumo')}
                            {renderReportImage('cintoImage', 'Infração de Cinto')}
                        </div>

                        {/* MAPA DE MOVIMENTAÇÃO (Widescreen Horizontal Layout) */}
                        {renderReportMap()}
                    </div>

                    {/* SECTION 6: STATUS FINAL DA VERIFICAÇÃO E OBSERVAÇÕES */}
                    {(() => {
                        let vStatus = record.verificationStatus || 'OK';
                        let vObs = record.verificationStatusObs || '';
                        if (vStatus.includes(' - ')) {
                            const parts = vStatus.split(' - ');
                            vStatus = parts[0];
                            if (!vObs) vObs = parts.slice(1).join(' - ');
                        }
                        const isObs = vStatus === 'Observações Inseridas' || Boolean(vObs);

                        return (
                            <div className="relative z-10 space-y-4 break-inside-avoid print:break-inside-avoid">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <ShieldAlert size={16} className={isObs ? "text-red-500" : "text-emerald-500"} />
                                    6. Parecer Final e Observações da Análise
                                </h3>

                                <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                                    isObs 
                                        ? 'bg-red-50/50 border-red-200 text-red-950 shadow-sm' 
                                        : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                }`}>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status da Verificação:</span>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide border shadow-sm ${
                                                isObs
                                                    ? 'bg-red-600 border-red-700 text-white'
                                                    : 'bg-emerald-600 border-emerald-700 text-white'
                                            }`}>
                                                {isObs ? 'OBSERVAÇÕES INSERIDAS' : 'OK - SEM DESVIOS'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            Operador Responsável: <strong className="text-slate-800">{record.operator || 'SISTEMA'}</strong>
                                        </span>
                                    </div>

                                    {isObs ? (
                                        <div className="bg-white rounded-xl p-4 border border-red-200 space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 block flex items-center gap-1.5">
                                                <AlertTriangle size={13} />
                                                Reporte de Observação Detalhada do Operador:
                                            </span>
                                            <p className="text-xs font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
                                                {vObs || 'Nenhum detalhe adicional informado.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs font-medium text-emerald-800 italic">
                                            Viagem analisada e validada sem não conformidades ou desvios adicionais reportados.
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Print Styles Sheet (Tailwind injection fallback) */}
                <span className="hidden">
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                            @page {
                                size: a4;
                                margin: 15mm 12mm 15mm 12mm;
                            }

                            /* Reset layout parameters of ALL parent wrappers to let content flow naturally on multiple pages */
                            html, body, #root, #root > div, main, main > div, main > div > div {
                                height: auto !important;
                                min-height: 0 !important;
                                max-height: none !important;
                                overflow: visible !important;
                                background: white !important;
                            }

                            /* Hide everything inside the body by default */
                            body * {
                                visibility: hidden !important;
                            }

                            /* Only reveal the printable container and its children */
                            .printable-modal-backdrop,
                            .printable-modal-backdrop * {
                                visibility: visible !important;
                            }

                            /* Explicit styling of the modal backdrop overlay inside a printed environment */
                            .printable-modal-backdrop {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                height: auto !important;
                                min-height: 100vh !important;
                                background: white !important;
                                overflow: visible !important;
                                z-index: 999999 !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                display: block !important;
                            }

                            /* Garantir que o container do relatório use toda a largura disponível sem bordas sobressalentes */
                            .printable-modal-backdrop > div {
                                width: 100% !important;
                                max-width: 100% !important;
                                border: none !important;
                                box-shadow: none !important;
                                background: transparent !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                border-radius: 0 !important;
                                overflow: visible !important;
                            }

                            .print\\:hidden,
                            .print\\:hidden * {
                                display: none !important;
                                visibility: hidden !important;
                            }

                            /* Avoid block content break inside layout boxes */
                            .break-inside-avoid {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }

                            /* Marca d'água perfeitamente centralizada e estática no PDF */
                            .print-watermark {
                                display: block !important;
                                position: fixed !important;
                                top: 40% !important;
                                left: 50% !important;
                                transform: translate(-50%, -50%) !important;
                                width: 85% !important;
                                max-width: 520px !important;
                                opacity: 0.025 !important;
                                z-index: -10 !important;
                                pointer-events: none !important;
                            }
                        }
                    `}} />
                </span>
            </motion.div>
        </div>
    );
};
