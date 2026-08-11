import React, { useState } from 'react';
import { getFullEvaluationById, getChecklistQuestions, resendEvaluationEmail } from '../services/dataService';
import { X, Printer, Mail, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Truck, User, Calendar, MapPin, Building2, Camera } from 'lucide-react';

interface EvaluationReportViewProps {
    evaluationId: string;
    onClose: () => void;
}

export const EvaluationReportView: React.FC<EvaluationReportViewProps> = ({ evaluationId, onClose }) => {
    const [isResending, setIsResending] = useState(false);
    const [resendStatus, setResendStatus] = useState<{ success?: boolean; message?: string } | null>(null);

    const ev = getFullEvaluationById(evaluationId);

    if (!ev) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
                    <AlertTriangle className="mx-auto text-amber-500 mb-3" size={40} />
                    <h3 className="text-lg font-bold text-slate-800">Avaliação não encontrada</h3>
                    <p className="text-sm text-slate-500 mt-1">Não foi possível carregar os dados desta avaliação ({evaluationId}).</p>
                    <button 
                        onClick={onClose}
                        className="mt-5 px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all text-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    const r = ev.rawRow || [];
    const questions = getChecklistQuestions();

    // Map columns from rawRow if available, or fall back to evaluation properties
    const driverName = r[1] || ev.driver || '-';
    const evaluatorName = r[2] || ev.evaluator || '-';
    const transportadora = r[3] || 'RISEL';
    const frota = r[4] || ev.vehicle || '-';
    const base = r[5] || ev.base || '-';
    const evalDate = r[6] || (ev.timestamp ? new Date(ev.timestamp).toLocaleDateString('pt-BR') : '-');
    const evalTime = r[7] || (ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
    const localTrecho = r[8] || '-';

    const colMap: Record<string, number> = {
        'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
        'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25, 'AA': 26, 'AB': 27, 'AC': 28,
        'AD': 29, 'AE': 30, 'AF': 31, 'AG': 32, 'AH': 33, 'AI': 34, 'AJ': 35, 'AK': 36, 'AL': 37, 'AM': 38
    };

    const imagesList = [r[39], r[40], r[41], r[42]].filter(img => Boolean(img && img.trim()));

    const planoAcao = r[43] || '';
    const prazo = r[44] || '';
    const statusPlano = r[45] || '';
    const respPlano = r[46] || '';

    // Observações vem de r[53] (Coluna BB)
    const obs = r[53] || '';

    // Pontos por Hora vem de r[47] (Coluna AV)
    const scoreVal = ev.score || parseFloat((r[48] || '0').replace('%', '').replace(',', '.')) || 0;
    const pontosPorHora = r[47] || (scoreVal ? scoreVal.toFixed(0) : '0');

    // Resultado Geral do Acompanhamento em %
    let rawResult = r[49] || r[48] || (scoreVal ? `${scoreVal.toFixed(2)}%` : '100.00%');
    let resultadoGeralVal = String(rawResult).trim();
    if (!resultadoGeralVal.includes('%') && !isNaN(parseFloat(resultadoGeralVal))) {
        resultadoGeralVal = parseFloat(resultadoGeralVal).toFixed(2) + '%';
    }

    // Formatação de Data da Avaliação (dd/mm/aaaa sem horário)
    const rawDateStr = r[6] || '';
    let evalDateOnly = '-';
    if (rawDateStr) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateStr.trim())) {
            const [y, m, d] = rawDateStr.trim().split('-');
            evalDateOnly = `${d}/${m}/${y}`;
        } else if (rawDateStr.includes('/')) {
            evalDateOnly = rawDateStr.trim().split(' ')[0];
        } else {
            evalDateOnly = rawDateStr.trim();
        }
    } else if (ev.timestamp) {
        const d = new Date(ev.timestamp);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            evalDateOnly = `${day}/${month}/${year}`;
        }
    }

    // Formatação da Emissão (dd/mm/aaaa hh:mm)
    let emissaoFormatted = '';
    if (ev.timestamp) {
        const d = new Date(ev.timestamp);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            emissaoFormatted = `${day}/${month}/${year} ${hours}:${mins}`;
        }
    }
    if (!emissaoFormatted) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        emissaoFormatted = `${day}/${month}/${year} ${hours}:${mins}`;
    }

    const gestorNome = r[51] || r[46] || evaluatorName || '-';

    // Determinar gradientes conforme nota/score
    let numScore = scoreVal;
    if (!numScore) {
        const parsed = parseFloat(String(resultadoGeralVal || pontosPorHora).replace('%', '').replace(',', '.'));
        if (!isNaN(parsed)) numScore = parsed;
    }
    if (numScore <= 1 && numScore > 0) numScore *= 100;

    let cardGradientPoints = 'from-emerald-700 via-emerald-600 to-green-700 text-white border-emerald-800 shadow-emerald-900/20';
    let cardGradientResult = 'from-[#006633] via-emerald-800 to-teal-800 text-white border-emerald-900 shadow-emerald-950/20';

    if (numScore < 70) {
        cardGradientPoints = 'from-rose-700 via-red-600 to-rose-800 text-white border-rose-900 shadow-rose-950/20';
        cardGradientResult = 'from-red-800 via-rose-700 to-red-900 text-white border-rose-950 shadow-red-950/20';
    } else if (numScore < 90) {
        cardGradientPoints = 'from-amber-600 via-yellow-600 to-amber-700 text-white border-amber-800 shadow-amber-900/20';
        cardGradientResult = 'from-amber-700 via-amber-600 to-yellow-700 text-white border-amber-900 shadow-yellow-950/20';
    }

    const handlePrint = () => {
        window.print();
    };

    const handleResend = async () => {
        const customEmail = prompt(
            `Reenviar relatório de ${driverName} por e-mail?\n\nDigite um e-mail específico (ou deixe em branco para os destinatários padrão da Risel):`,
            ""
        );
        if (customEmail === null) return;

        setIsResending(true);
        setResendStatus(null);
        try {
            await resendEvaluationEmail(ev.id, customEmail.trim() || undefined);
            setResendStatus({ success: true, message: 'Relatório reenviado com sucesso por e-mail!' });
        } catch (e: any) {
            setResendStatus({ success: false, message: 'Erro ao reenviar e-mail: ' + (e?.message || e) });
        } finally {
            setIsResending(false);
        }
    };

    const renderResultBadge = (rawVal: string) => {
        const valUpper = String(rawVal || '').trim().toUpperCase();
        const isNao = (valUpper === 'NÃO' || valUpper === 'NAO' || valUpper.includes('NÃO') || valUpper.includes('NAO') || valUpper === 'N' || valUpper === 'NC');
        const isNa = (valUpper === 'NA' || valUpper === 'N/A' || valUpper.includes('N/A'));

        if (isNao) {
            return (
                <span className="inline-block px-3 py-1 bg-[#ef4444] text-white font-black text-xs rounded uppercase tracking-wide text-center w-20 shadow-sm">
                    NÃO
                </span>
            );
        }
        if (isNa) {
            return (
                <span className="inline-block px-3 py-1 bg-[#3b82f6] text-white font-black text-xs rounded uppercase tracking-wide text-center w-20 shadow-sm">
                    N/A
                </span>
            );
        }
        return (
            <span className="inline-block px-3 py-1 bg-[#10b981] text-white font-black text-xs rounded uppercase tracking-wide text-center w-20 shadow-sm">
                SIM
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
            {/* Modal Container */}
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full">
                
                {/* Header Toolbar (Hidden in Print) */}
                <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#006633] flex items-center justify-center font-bold text-white shadow">
                            R
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white leading-tight">Relatório de Avaliação de Direção</h3>
                            <p className="text-xs text-slate-400">Motorista: <span className="text-emerald-400 font-semibold">{driverName}</span> | {evalDate} {evalTime}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                            title="Reenviar e-mail oficial com relatório anexado"
                        >
                            {isResending ? <Loader2 size={14} className="animate-spin text-emerald-400" /> : <Mail size={14} className="text-emerald-400" />}
                            <span>Reenviar E-mail</span>
                        </button>

                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006633] hover:bg-[#004d26] text-white text-xs font-bold rounded-lg transition-all shadow-md"
                            title="Imprimir ou Salvar como PDF"
                        >
                            <Printer size={14} />
                            <span>Imprimir / PDF</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
                            title="Fechar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Resend status alert */}
                {resendStatus && (
                    <div className={`p-3 text-xs font-bold text-center border-b ${resendStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'} print:hidden`}>
                        {resendStatus.message}
                    </div>
                )}

                {/* Report Document Body */}
                <div className="p-6 sm:p-8 overflow-y-auto bg-slate-50 flex-1 font-sans text-slate-800 print:bg-white print:p-0 print:overflow-visible">
                    
                    {/* Paper Document Wrapper */}
                    <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
                        
                        {/* Top Accent Line */}
                        <div className="h-2 bg-[#006633] rounded-t mb-4"></div>

                        {/* Document Header / Logo */}
                        <div className="flex items-center justify-between pb-4 border-b-2 border-[#006633] mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <img 
                                    src="https://risel.com.br/wp-content/uploads/2024/07/RISEL.png" 
                                    alt="Risel Combustíveis" 
                                    className="h-12 w-auto object-contain"
                                />
                                <div>
                                    <h1 className="text-lg font-black text-[#006633] uppercase tracking-tight">RISEL COMBUSTÍVEIS</h1>
                                    <p className="text-[11px] font-bold text-[#F99D1C] uppercase tracking-wider">SISTEMA DE MONITORAMENTO E AVALIAÇÃO DE DIREÇÃO</p>
                                </div>
                            </div>
                            <div className="text-right text-[10px] font-mono text-slate-500">
                                <div><strong>CÓD:</strong> {ev.id}</div>
                                <div><strong>EMISSÃO:</strong> {emissaoFormatted}</div>
                            </div>
                        </div>

                        {/* Informações Iniciais Box */}
                        <div className="space-y-2 mb-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">👤 MOTORISTA</span>
                                    <span className="text-base font-black text-slate-900 uppercase">{driverName}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">📋 AVALIADOR</span>
                                    <span className="text-sm font-bold text-slate-800 uppercase">{evaluatorName}</span>
                                </div>
                            </div>

                            {/* Título Seção Descarga */}
                            <div className="bg-[#006633] text-white text-center py-2 rounded-md font-extrabold text-xs uppercase tracking-wider shadow-sm">
                                INFORMAÇÕES DA DESCARGA
                            </div>

                            {/* Meta Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">🏢 TRANSPORTADORA</span>
                                    <span className="font-extrabold text-slate-900 uppercase text-xs">{transportadora}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">🚛 FROTA</span>
                                    <span className="font-extrabold text-slate-900 uppercase text-xs">{frota}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">📅 DATA DA AVALIAÇÃO</span>
                                    <span className="font-extrabold text-slate-900 uppercase text-xs">{evalDateOnly}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">📍 LOCAL / TRECHO</span>
                                    <span className="font-extrabold text-slate-900 uppercase text-xs">{localTrecho}</span>
                                </div>
                            </div>
                        </div>

                        {/* Detalhamento dos Itens Avaliados Header */}
                        <div className="mb-2 font-extrabold text-[#006633] text-xs uppercase tracking-wider border-l-4 border-[#006633] pl-2 py-0.5">
                            DETALHAMENTO DOS ITENS AVALIADOS
                        </div>

                        {/* Checklist Items Table */}
                        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
                            <table className="w-full text-left text-xs border-collapse">
                                <tbody>
                                    {questions.map((qObj, idx) => {
                                        const qNum = idx + 1;
                                        const colIdx = colMap[qObj.id];
                                        const answerVal = colIdx !== undefined && r[colIdx] !== undefined ? r[colIdx] : 'SIM';

                                        const isSection1Header = qNum === 1;
                                        const isSection2Header = qNum === 3;
                                        const isSection3Header = qNum === 29;

                                        return (
                                            <React.Fragment key={qObj.id}>
                                                {/* SECTION 1 HEADER */}
                                                {isSection1Header && (
                                                    <>
                                                        <tr className="bg-[#006633] text-white">
                                                            <td colSpan={2} className="px-3 py-2 font-black uppercase text-xs tracking-wider border-b border-[#004d26]">
                                                                ANTES DO INÍCIO DA VIAGEM
                                                            </td>
                                                        </tr>
                                                        <tr className="bg-white text-slate-900 text-[10px] uppercase font-bold border-b border-slate-300">
                                                            <td className="px-3 py-1.5 border-r border-slate-300 text-slate-900 font-bold">ITEM DE AVALIAÇÃO</td>
                                                            <td className="px-3 py-1.5 text-center w-32 text-slate-900 font-bold">RESULTADO / RESPOSTA</td>
                                                        </tr>
                                                    </>
                                                )}

                                                {/* SECTION 2 HEADER */}
                                                {isSection2Header && (
                                                    <>
                                                        <tr className="bg-[#006633] text-white">
                                                            <td colSpan={2} className="px-3 py-2 font-black uppercase text-xs tracking-wider border-b border-[#004d26]">
                                                                PROCEDIMENTOS DA EMPRESA
                                                            </td>
                                                        </tr>
                                                        <tr className="bg-white text-slate-900 text-[10px] uppercase font-bold border-b border-slate-300">
                                                            <td className="px-3 py-1.5 border-r border-slate-300 text-slate-900 font-bold">ITEM DE AVALIAÇÃO</td>
                                                            <td className="px-3 py-1.5 text-center w-32 text-slate-900 font-bold">RESULTADO / RESPOSTA</td>
                                                        </tr>
                                                    </>
                                                )}

                                                {/* SECTION 3 HEADER */}
                                                {isSection3Header && (
                                                    <>
                                                        <tr className="bg-[#006633] text-white">
                                                            <td colSpan={2} className="px-3 py-2 font-black uppercase text-xs tracking-wider border-b border-[#004d26]">
                                                                UTILIZAÇÃO DAS CÂMERAS EMBARCADAS
                                                            </td>
                                                        </tr>
                                                        <tr className="bg-white text-slate-900 text-[10px] uppercase font-bold border-b border-slate-300">
                                                            <td className="px-3 py-1.5 border-r border-slate-300 text-slate-900 font-bold">ITEM DE AVALIAÇÃO</td>
                                                            <td className="px-3 py-1.5 text-center w-32 text-slate-900 font-bold">RESULTADO / RESPOSTA</td>
                                                        </tr>
                                                    </>
                                                )}

                                                {/* ITEM ROW */}
                                                <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} border-b border-slate-200`}>
                                                    <td className="px-3 py-2 font-bold text-slate-800 text-[11px] leading-snug border-r border-slate-200">
                                                        {qObj.question}
                                                    </td>
                                                    <td className="px-2 py-2 text-center align-middle w-32">
                                                        {renderResultBadge(answerVal)}
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Registros de Verificação de Imagens (Se houver) */}
                        {imagesList.length > 0 && (
                            <div className="mb-6">
                                <div className="mb-2 font-extrabold text-[#006633] text-xs uppercase tracking-wider border-l-4 border-[#006633] pl-2 py-0.5">
                                    REGISTROS DE VERIFICAÇÃO DAS IMAGENS
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {imagesList.map((imgSrc, iIdx) => (
                                        <div key={iIdx} className="border border-slate-300 rounded-lg p-2 bg-white text-center shadow-sm">
                                            <img 
                                                src={imgSrc} 
                                                alt={`Registro de Verificação ${iIdx + 1}`} 
                                                className="max-h-48 w-auto max-w-full mx-auto rounded object-contain"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Plano de Ação (4 Linhas em Branco) */}
                        <div className="mb-6">
                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#006633] text-white">
                                            <th className="p-2 font-bold uppercase text-[10px] w-5/12 border-r border-[#004d26]">PLANO DE AÇÃO</th>
                                            <th className="p-2 font-bold uppercase text-[10px] text-center w-2/12 border-r border-[#004d26]">PRAZO</th>
                                            <th className="p-2 font-bold uppercase text-[10px] text-center w-2/12 border-r border-[#004d26]">STATUS</th>
                                            <th className="p-2 font-bold uppercase text-[10px] w-3/12">RESPONSÁVEL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white h-7 border-b border-slate-200">
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2"></td>
                                        </tr>
                                        <tr className="bg-slate-50/50 h-7 border-b border-slate-200">
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2"></td>
                                        </tr>
                                        <tr className="bg-white h-7 border-b border-slate-200">
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2"></td>
                                        </tr>
                                        <tr className="bg-slate-50/50 h-7">
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Observações */}
                        <div className="mb-6">
                            <div className="mb-1 font-extrabold text-[#006633] text-xs uppercase tracking-wider border-l-4 border-[#006633] pl-2 py-0.5">
                                OBSERVAÇÕES
                            </div>
                            <div className="bg-slate-50 border border-slate-300 border-l-4 border-l-[#006633] rounded-lg p-3 text-xs text-slate-800 min-h-[44px] leading-relaxed">
                                {obs || 'Nenhum comentário registrado.'}
                            </div>
                        </div>

                        {/* Quadros de Pontos por Hora e Resultado Geral do Acompanhamento (Cards Gradientes com Destaque) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            {/* Card Pontos por Hora */}
                            <div className={`bg-gradient-to-br ${cardGradientPoints} rounded-2xl p-6 shadow-lg border text-center flex flex-col justify-center items-center transform transition-all`}>
                                <span className="text-xs font-black uppercase tracking-widest opacity-95 mb-1 drop-shadow-sm">
                                    PONTOS POR HORA / PONTUAÇÃO
                                </span>
                                <span className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md my-1">
                                    {pontosPorHora}
                                </span>
                            </div>

                            {/* Card Resultado Geral do Acompanhamento */}
                            <div className={`bg-gradient-to-br ${cardGradientResult} rounded-2xl p-6 shadow-lg border text-center flex flex-col justify-center items-center transform transition-all`}>
                                <span className="text-xs font-black uppercase tracking-widest opacity-95 mb-1 drop-shadow-sm">
                                    RESULTADO GERAL DO ACOMPANHAMENTO
                                </span>
                                <span className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md my-1">
                                    {resultadoGeralVal}
                                </span>
                            </div>
                        </div>

                        {/* Conversa de Feedback */}
                        <div className="mb-6">
                            <div className="mb-1 font-extrabold text-[#006633] text-xs uppercase tracking-wider border-l-4 border-[#006633] pl-2 py-0.5">
                                CONVERSA DE FEEDBACK
                            </div>
                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#006633] text-white">
                                            <th className="p-2 font-bold uppercase text-[10px] text-center w-2/12 border-r border-[#004d26]">DATA</th>
                                            <th className="p-2 font-bold uppercase text-[10px] w-4/12 border-r border-[#004d26]">NOME DO GESTOR</th>
                                            <th className="p-2 font-bold uppercase text-[10px] w-3/12 border-r border-[#004d26]">FUNÇÃO</th>
                                            <th className="p-2 font-bold uppercase text-[10px] text-center w-3/12">ASSINATURA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white h-10">
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2 font-bold text-slate-800 uppercase border-r border-slate-200">{gestorNome}</td>
                                            <td className="p-2 border-r border-slate-200"></td>
                                            <td className="p-2"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Declaração do Motorista */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-700 mb-2">Declaro que recebi todas as informações acima:</p>
                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#006633] text-white">
                                            <th className="p-2 font-bold uppercase text-[10px] w-1/2 border-r border-[#004d26]">NOME MOTORISTA</th>
                                            <th className="p-2 font-bold uppercase text-[10px] text-center w-1/2">ASSINATURA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white h-10">
                                            <td className="p-2 font-bold text-slate-800 uppercase border-r border-slate-200">{driverName}</td>
                                            <td className="p-2"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Disclaimer */}
                        <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
                            Risel Combustíveis - Sistema de Monitoramento e Avaliação de Direção
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
