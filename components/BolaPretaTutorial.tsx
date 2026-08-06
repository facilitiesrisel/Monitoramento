import React from 'react';
import { 
    BookOpen, Printer, CheckCircle, FileSpreadsheet, Upload, PlusCircle, 
    ShieldAlert, ChevronDown, ChevronUp, Download, Eye, HelpCircle, 
    Cpu, Map, FileCheck, Star, Users, PhoneOff, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface BolaPretaTutorialProps {
    onClose?: () => void;
}

export const BolaPretaTutorial: React.FC<BolaPretaTutorialProps> = ({ onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div id="tutorial-bola-preta" className="bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden print:border-none print:shadow-none print:p-0">
            {/* Header com gradiente sutil das cores Risel */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-6 md:p-8 text-white relative overflow-hidden print:bg-none print:text-slate-800 print:p-0 print:border-b print:border-slate-300">
                <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 print:hidden">
                    <BookOpen size={240} />
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 text-xs font-black tracking-wider uppercase rounded-full print:border-slate-300 print:text-slate-600">
                                Guia Prático Operacional
                            </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight">COMO FAZER A ANÁLISE DE VIAGEM?</h3>
                        <p className="text-emerald-100/90 text-xs md:text-sm font-medium print:text-slate-500">
                            Procedimento passo a passo simplificado para o preenchimento e controle de conformidade (Bola Preta).
                        </p>
                    </div>

                    <div className="flex items-center gap-2 print:hidden shrink-0">
                        <button 
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-800 border border-emerald-100 hover:bg-emerald-50 rounded-xl text-xs font-extrabold shadow-md hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-wider"
                        >
                            <Printer size={15} />
                            Imprimir / PDF
                        </button>
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="px-4 py-2.5 bg-emerald-800/40 hover:bg-emerald-800/60 text-white rounded-xl text-xs font-black transition-all uppercase border border-white/10"
                            >
                                Fechar Manual
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Conteúdo do Manual Operacional */}
            <div className="p-6 md:p-8 space-y-10 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:space-y-8">
                
                {/* Intro Informativa */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex gap-4 print:bg-none print:border-slate-200">
                    <div className="p-3 bg-white text-emerald-600 rounded-xl border border-emerald-100 h-11 w-11 flex items-center justify-center shrink-0">
                        <HelpCircle size={22} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800">Objetivo do Procedimento</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">
                            A <strong>Análise de Viagem (Bola Preta)</strong> visa identificar desvios na jornada do motorista (como rotas inadequadas, excesso de paradas não autorizadas, excesso de velocidade, uso de celular ao volante e descumprimento de tempo de repouso). O cruzamento de dados garante a segurança da frota e a conformidade legal.
                        </p>
                    </div>
                </div>

                {/* Linha do Tempo de Passos */}
                <div className="space-y-8 select-none print:space-y-12">
                    
                    {/* PASSO 1 */}
                    <div className="relative pl-8 border-l-2 border-emerald-500/30 pb-2 break-inside-avoid print:border-slate-300">
                        {/* Indicador de número */}
                        <div className="absolute -left-[17px] top-0 w-8 height-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md print:bg-slate-200 print:text-slate-800 print:border print:border-slate-400">
                            1
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <FileSpreadsheet className="text-emerald-600" size={18} />
                                    Extrair Planilha de Macros de Viagem
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    O primeiro passo deve ser realizado no sistema de rastreamento do veículo. É necessário exportar o relatório bruto de mensagens enviadas pelo motorista durantre a viagem.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 print:bg-none print:border-slate-200">
                                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                                    <li>Acesse sua conta no painel operacional de rastreamento do caminhão (SASCAR, Autotrac, etc.).</li>
                                    <li>Filtre pelo Veículo e Período da viagem desejada.</li>
                                    <li>Exportar o histórico de comandos e mensagens de bordo (macros) no formato de arquivo de planilha <strong className="text-emerald-700">Excel (.xlsx)</strong> ou <strong className="text-emerald-700">CSV</strong>.</li>
                                </ul>

                                {/* Imitação Virtual de "Print" */}
                                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-inner text-[10px] font-mono overflow-x-auto print:border-slate-300">
                                    <div className="bg-slate-100 p-1.5 rounded-md mb-2 flex justify-between text-[9px] text-slate-400 border-b border-indigo-50">
                                        <span>📂 sasc_macros_export_2026.xlsx (Pré-visualização)</span>
                                        <span className="text-emerald-600 font-bold font-sans">SISTEMA ATIVO</span>
                                    </div>
                                    <table className="w-full text-slate-500 text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-[9px]">
                                                <th className="p-1">LOGIN</th>
                                                <th className="p-1">MOTORISTA</th>
                                                <th className="p-1">DATA</th>
                                                <th className="p-1">PLACA</th>
                                                <th className="p-1">NOME MACRO</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-slate-100">
                                                <td className="p-1">M10928</td>
                                                <td className="p-1 font-bold text-slate-700">JOÃO ALVES COSTA</td>
                                                <td className="p-1 text-slate-400">18/06/2026</td>
                                                <td className="p-1 font-bold text-emerald-600">RSL-2E11</td>
                                                <td className="p-1">01 - INÍCIO DE VIAGEM COMBUSTÍVEL</td>
                                            </tr>
                                            <tr>
                                                <td className="p-1">M10928</td>
                                                <td className="p-1 font-bold text-slate-700">JOÃO ALVES COSTA</td>
                                                <td className="p-1 text-slate-400">18/06/2026</td>
                                                <td className="p-1 font-bold text-emerald-600">RSL-2E11</td>
                                                <td className="p-1">11 - PARADA EM POSTO DE ABASTECIMENTO</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PASSO 2 */}
                    <div className="relative pl-8 border-l-2 border-emerald-500/30 pb-2 break-inside-avoid print:border-slate-300">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md print:bg-slate-200 print:text-slate-800 print:border print:border-slate-400">
                            2
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <Upload className="text-emerald-600" size={18} />
                                    Importar o Histórico de Macros na Risel
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Agora na plataforma Risel, use o carregamento automático de inteligência de viagem para varrer a planilha de dados do caminhão automaticamente.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 print:bg-none print:border-slate-200">
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    No canto superior direito da tela de Análise de Viagem, clique no botão <span className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-md px-2 py-0.5 text-[10px] font-black inline-flex items-center gap-1"><Upload size={10} /> IMPORTAR MACROS</span>. Selecione o arquivo extraído no <strong className="text-slate-800">Passo 1</strong>.
                                </p>

                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner text-xs space-y-2 relative overflow-hidden print:border-slate-300">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="font-bold text-slate-700 text-xs">Mapeador Inteligente de Logs</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">Layout Automatizado</span>
                                    </div>
                                    <div className="p-3 bg-emerald-50/50 rounded-lg text-emerald-800 text-[11px] leading-relaxed border border-emerald-100 flex items-center gap-3">
                                        <Cpu size={24} className="text-[#00ad74] shrink-0" />
                                        <span>
                                            <strong>Leitura Concluída:</strong> O sistema identificou automaticamente as colunas de data, hora, motorista, veículo e as regras de repouso programado da viagem carregada!
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PASSO 3 */}
                    <div className="relative pl-8 border-l-2 border-emerald-500/30 pb-2 break-inside-avoid print:border-slate-300">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md print:bg-slate-200 print:text-slate-800 print:border print:border-slate-400">
                            3
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <PlusCircle className="text-emerald-600" size={18} />
                                    Registrar Nova Análise de Viagem
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Com os logs carregados no sistema, abra a janela de inserção manual de novos registros para cruzar as informações com a base de dados administrativa.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 print:bg-none print:border-slate-200">
                                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5">
                                    <li>Clique em <strong className="text-slate-800">REGISTRAR ANÁLISE DE VIAGEM</strong>.</li>
                                    <li>Selecione o <strong className="text-slate-800">Motorista</strong> no menu de seleção rápida de condutores vinculados.</li>
                                    <li>Preencha a <strong className="text-slate-800">Frota (Identificação do Veículo)</strong> e a <strong className="text-slate-800">Placa</strong> correspondente.</li>
                                    <li>Informe a <strong className="text-slate-800">Base Operacional</strong> onde a jornada iniciou e a data de análise corrente.</li>
                                </ul>

                                {/* Visual Mockup da Ficha de Cadastro */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-300">
                                    <div className="bg-slate-900 px-3.5 py-2 text-white text-[11px] font-black flex items-center gap-1.5 justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="bg-[#00ad74] w-2 h-2 rounded-full"></div>
                                            <span>FICHA DE ANÁLISE DE VIAGEM</span>
                                        </div>
                                        <span className="text-[9px] text-[#00ad74] font-mono">REGISTRO #NEW</span>
                                    </div>
                                    <div className="p-3.5 grid grid-cols-2 gap-2 text-[10px]">
                                        <div className="space-y-1">
                                            <label className="text-slate-400 font-bold uppercase block text-[8px]">Selecione o Motorista *</label>
                                            <div className="p-1 px-2 border border-emerald-500/30 bg-emerald-50/20 text-slate-800 rounded font-bold">JOÃO ALVES COSTA</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-400 font-bold uppercase block text-[8px]">Frota de Viagem *</label>
                                            <div className="p-1 px-2 border border-slate-200 text-slate-800 rounded font-bold">FTR-409 (BI-TREM)</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-400 font-bold uppercase block text-[8px]">Placa do Cavalo *</label>
                                            <div className="p-1 px-2 border border-slate-200 text-slate-800 rounded font-bold">RSL-2E11</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-400 font-bold uppercase block text-[8px]">Base Operacional *</label>
                                            <div className="p-1 px-2 border border-slate-200 text-slate-800 rounded font-bold">ARAUCÁRIA/PR</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PASSO 4 */}
                    <div className="relative pl-8 border-l-2 border-emerald-500/30 pb-2 break-inside-avoid print:border-slate-300">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md print:bg-slate-200 print:text-slate-800 print:border print:border-slate-400">
                            4
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <AlertCircle className="text-emerald-600" size={18} />
                                    Preencher Checklist Operacional e Validar Evidências
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    A maior riqueza do parecer está na checagem metódica da viagem. Responda às questões operacionais cruciais e anexe as imagens comprovantes.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 print:bg-none print:border-slate-200">
                                <p className="text-xs text-slate-600">
                                    O formulário é dividido em grandes eixos de análise de riscos na via:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="p-3 bg-white rounded-xl border border-slate-150 space-y-2 print:border-slate-300">
                                        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                            <Map className="text-emerald-600 shrink-0 font-bold" size={15} />
                                            <span className="font-extrabold text-slate-700 text-[11px]">Jornada & Rota</span>
                                        </div>
                                        <ul className="text-[10px] text-slate-500 space-y-1 list-none pl-1">
                                            <li>- Verifique o tempo total no cliente (Fila/Inativo).</li>
                                            <li>- Registre o número de paradas não identificadas.</li>
                                            <li>- Anexe o <strong className="text-emerald-700">Print do Mapa Comercial</strong> da rota.</li>
                                        </ul>
                                    </div>

                                    <div className="p-3 bg-white rounded-xl border border-slate-150 space-y-2 print:border-slate-300">
                                        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                            <ShieldAlert className="text-emerald-600 shrink-0 font-bold" size={15} />
                                            <span className="font-extrabold text-slate-700 text-[11px]">Telemetria / Infração de Cabine</span>
                                        </div>
                                        <ul className="text-[10px] text-slate-500 space-y-1 list-none pl-1">
                                            <li>- Informe se houve alertas ativos de fadiga/comportamento.</li>
                                            <li>- Caso o motorista tenha cometido desvio crítico (usar celular, fumar ao volante, sem cinto), selecione a opção e faça upload do frame das câmeras.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Mockup para Evidências */}
                                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 print:border-slate-300">
                                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Anexos Fotográficos</span>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-slate-100/50 hover:bg-slate-100 flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer h-24 text-center print:border-slate-400">
                                            <PhoneOff size={18} className="text-rose-500 mb-1" />
                                            <span className="text-[9px] font-bold text-slate-800">Foto Celular</span>
                                            <span className="text-[8px] text-slate-400">Captura de cabine</span>
                                        </div>
                                        <div className="flex-1 bg-slate-100/50 hover:bg-slate-100 flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer h-24 text-center print:border-slate-400">
                                            <Map size={18} className="text-[#00ad74] mb-1" />
                                            <span className="text-[9px] font-bold text-slate-800">Mapa de Paradas</span>
                                            <span className="text-[8px] text-slate-400">Print do trajeto comercial</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PASSO 5 */}
                    <div className="relative pl-8 border-l-2 border-emerald-500/30 pb-2 break-inside-avoid print:border-slate-300">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md print:bg-slate-200 print:text-slate-800 print:border print:border-slate-400">
                            5
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <FileCheck className="text-emerald-600" size={18} />
                                    Finalizar Análise e Enviar Relatório Formal
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Após verificar todos os dados, selecione o parecer final (Conforme ou com Observações) e finalize o registro. O resto é automático!
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 print:bg-none print:border-slate-200">
                                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5">
                                    <li>Defina se a viagem está <strong className="text-[#00ad74]">OK (Conforme)</strong> ou <strong className="text-rose-600">Divergência Encontrada / Observações Inseridas</strong>.</li>
                                    <li>Clique em <strong className="text-emerald-700">SALVAR REGISTRO</strong> no final do formulário.</li>
                                    <li><strong>Automação de E-mails:</strong> O sistema gera instantaneamente o PDF profissional de Parecer de Viagem a partir de um código HTML de alta definição e o envia por e-mail para a diretoria, gestores de auditoria e para o endereço corporativo de monitoramento <strong className="text-emerald-800">monitoramento@risel.com.br</strong> para arquivamento regulamentar e ciência.</li>
                                </ul>

                                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-[10px] font-bold">
                                    <CheckCircle size={16} className="text-[#00ad74]" />
                                    <span>Procedimento concluído com segurança! Tudo pronto para o próximo check.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
