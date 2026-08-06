
import React, { useState, useEffect, useMemo } from 'react';
import { getInternalTickets, saveInternalTicket, updateInternalTicket, deleteInternalTicket, loadData, normalizeText } from '../services/dataService';
import { InternalTicket, UserRole } from '../types';
import { 
    Search, PlusCircle, Save, X, RefreshCw, Ticket, CheckCircle, AlertCircle, 
    Link2, Loader2, Pencil, Trash2, Calendar, FileText, Upload, Image as ImageIcon, Tablet, Video, Wrench, MapPin, Clock, File, Truck, User
} from 'lucide-react';

interface InternalTicketsProps {
    operatorName?: string;
    userRole?: UserRole;
}

const PREDEFINED_PROBLEMS = [
    "Câmera Frota Mal Posicionada",
    "Câmera Frota Vídeo Loss (Uma ou mais)",
    "Câmeras Frota OFF (Checar se não está em Oficina, ou parado há muito tempo antes).",
    "Tablet não acata Macros (Reiniciar o tablet, e tentar atualizar a versão antes)",
    "Tablet Não Liga"
];

const InternalTickets: React.FC<InternalTicketsProps> = ({ operatorName, userRole }) => {
    const [tickets, setTickets] = useState<InternalTicket[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estado para controlar a seleção do dropdown vs texto livre
    const [selectedProblemOption, setSelectedProblemOption] = useState('');

    const [formData, setFormData] = useState<{
        operator: string;
        date: string;
        fleetTicket: string; 
        base: string; 
        requestType: string; 
        description: string;
        ticketNumber: string; // Nº Chamado
        status: 'Em Aberto' | 'Em Andamento' | 'Finalizado';
        isDone: boolean;
        attachmentName: string;
        scheduledDate: string;
    }>({
        operator: operatorName || '',
        date: new Date().toLocaleDateString('pt-BR'),
        fleetTicket: '',
        base: '',
        requestType: '',
        description: '',
        ticketNumber: '',
        status: 'Em Aberto',
        isDone: false,
        attachmentName: '',
        scheduledDate: ''
    });

    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    // Controle de visibilidade da coluna Operador (Apenas Admin vê)
    const showOperatorCol = userRole === 'admin';

    const refreshList = async (showLoading = true) => {
        if (showLoading) setIsRefreshing(true);
        try {
            await loadData(true); 
            setTickets([...getInternalTickets()]); 
        } catch (error) {
            console.error("Erro ao sincronizar chamados:", error);
        } finally {
            if (showLoading) setIsRefreshing(false);
        }
    };

    useEffect(() => {
        refreshList(); 
    }, []);

    const handleOpenNew = () => {
        setEditingId(null);
        setAttachmentFile(null);
        setSelectedProblemOption('');
        setFormData({
            operator: operatorName || '',
            date: new Date().toLocaleDateString('pt-BR'),
            fleetTicket: '',
            base: '',
            requestType: '',
            description: '',
            ticketNumber: '',
            status: 'Em Aberto',
            isDone: false,
            attachmentName: '',
            scheduledDate: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (t: InternalTicket) => {
        setEditingId(t.id);
        setAttachmentFile(null);
        
        // Define se é um problema pré-definido ou "Outros"
        if (PREDEFINED_PROBLEMS.includes(t.requestType)) {
            setSelectedProblemOption(t.requestType);
        } else if (t.requestType) {
            setSelectedProblemOption('Outros');
        } else {
            setSelectedProblemOption('');
        }

        setFormData({
            operator: t.operator,
            date: t.date,
            fleetTicket: t.fleetTicket,
            base: t.base,
            requestType: t.requestType,
            description: t.description,
            ticketNumber: t.ticketNumber,
            status: t.status,
            isDone: t.isDone,
            attachmentName: t.attachmentName,
            scheduledDate: t.scheduledDate || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Excluir este chamado permanentemente?")) {
            setIsRefreshing(true);
            try {
                await deleteInternalTicket(id);
                setTimeout(() => refreshList(), 1500);
            } catch (e) {
                alert("Erro ao excluir.");
                setIsRefreshing(false);
            }
        }
    };

    const formatText = (text: string) => {
        return normalizeText(text);
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.requestType || !formData.description) {
            alert("Campos obrigatórios: Problema e Descrição");
            return;
        }

        setIsSubmitting(true);
        try {
            let fileBase64 = undefined;
            let mimeType = undefined;
            
            if (attachmentFile) {
                const fullBase64 = await convertFileToBase64(attachmentFile);
                fileBase64 = fullBase64.split(',')[1];
                mimeType = attachmentFile.type;
            }

            const normalizedData = {
                ...formData,
                operator: formatText(formData.operator),
                fleetTicket: formatText(formData.fleetTicket),
                base: formatText(formData.base),
                description: formatText(formData.description),
                ticketNumber: formatText(formData.ticketNumber),
            };

            if (editingId) {
                await updateInternalTicket(editingId, normalizedData, fileBase64, mimeType);
            } else {
                await saveInternalTicket(normalizedData, fileBase64, mimeType);
            }
            
            setIsModalOpen(false);
            setTimeout(() => refreshList(), 2000);

        } catch (error) {
            console.error(error);
            alert("Erro ao salvar chamado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Finalizado':
                return <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 uppercase shadow-sm"><CheckCircle size={10} /> Finalizado</span>;
            case 'Em Andamento':
                return <span className="inline-flex items-center gap-1 text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 uppercase shadow-sm"><RefreshCw size={10} /> Em Andamento</span>;
            default:
                return <span className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 uppercase shadow-sm"><AlertCircle size={10} /> Em Aberto</span>;
        }
    };

    const getProblemIcon = (type: string) => {
        const t = normalizeText(type);
        if (t.includes('TABLET')) return <Tablet size={13} className="text-purple-500" />;
        if (t.includes('CAMERA') || t.includes('CAM')) return <Video size={13} className="text-blue-500" />;
        return <Wrench size={13} className="text-slate-400" />;
    };

    const filteredTickets = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return tickets.filter(t => 
            t.description.toLowerCase().includes(lowerSearch) ||
            t.requestType.toLowerCase().includes(lowerSearch) ||
            t.operator.toLowerCase().includes(lowerSearch) ||
            t.fleetTicket.toLowerCase().includes(lowerSearch) ||
            t.base.toLowerCase().includes(lowerSearch) ||
            t.ticketNumber.toLowerCase().includes(lowerSearch)
        );
    }, [tickets, searchTerm]);

    // Ordenação interativa
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const sortedTickets = useMemo(() => {
        let items = [...filteredTickets];
        if (sortConfig) {
            items.sort((a: any, b: any) => {
                let valA = a[sortConfig.key] || '';
                let valB = b[sortConfig.key] || '';
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredTickets, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 z-10 shadow-sm">
                <div className="flex flex-col space-y-1">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <Ticket className="text-[#00ad74]" size={20} /> Chamados Internos
                    </h2>
                    <p className="text-slate-500 text-xs font-medium flex items-center gap-2">
                        Gestão de solicitações e manutenção.
                    </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => refreshList(true)} 
                        className={`p-2 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 hover:text-[#00ad74] hover:border-[#00ad74] transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}
                        title="Atualizar Lista"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar chamados..." 
                            className="bg-slate-50 border border-slate-200 text-slate-800 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00ad74] w-full text-xs font-bold shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleOpenNew}
                        className="flex items-center gap-2 bg-[#00ad74] hover:bg-[#008f61] text-white px-4 py-2 rounded-lg font-bold transition-all shadow-md text-xs whitespace-nowrap active:scale-95"
                    >
                        <PlusCircle size={16} /> Novo Chamado
                    </button>
                </div>
            </div>

            {/* Table Area - Full Height */}
            <div className="flex-1 overflow-hidden relative bg-slate-50">
                <div className="absolute inset-0 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-white shadow-sm border-b border-slate-200">
                            <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-black">
                                <th className="p-3 pl-6 text-center cursor-pointer hover:bg-slate-50 w-16" onClick={() => requestSort('id')}>ID</th>
                                <th className="p-3 text-center cursor-pointer hover:bg-slate-50 w-24" onClick={() => requestSort('status')}>Status</th>
                                {showOperatorCol && <th className="p-3 cursor-pointer hover:bg-slate-50 w-24" onClick={() => requestSort('operator')}>Operador</th>}
                                <th className="p-3 cursor-pointer hover:bg-slate-50 w-24" onClick={() => requestSort('date')}>Data</th>
                                <th className="p-3 cursor-pointer hover:bg-slate-50 w-20" onClick={() => requestSort('fleetTicket')}>Frota</th>
                                <th className="p-3 cursor-pointer hover:bg-slate-50 w-20" onClick={() => requestSort('base')}>Base</th>
                                <th className="p-3 cursor-pointer hover:bg-slate-50 w-32" onClick={() => requestSort('requestType')}>Problema</th>
                                <th className="p-3 w-auto">Descrição</th>
                                <th className="p-3 cursor-pointer hover:bg-slate-50 w-24" onClick={() => requestSort('ticketNumber')}>Nº Chamado</th>
                                <th className="p-3 cursor-pointer hover:bg-slate-50 w-24" onClick={() => requestSort('scheduledDate')}>Data Ag.</th>
                                <th className="p-3 text-center w-20">Realizada?</th>
                                <th className="p-3 text-center w-16">Anexos</th>
                                <th className="p-3 pr-6 text-right w-20">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs bg-white">
                            {sortedTickets.length > 0 ? (
                                sortedTickets.map((t, index) => (
                                    <tr key={`${t.id}-${index}`} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-2 pl-6 font-mono text-slate-400 text-[9px] font-bold whitespace-nowrap text-center">
                                            {t.id.replace('TKT-', '')}
                                        </td>
                                        <td className="p-2 text-center whitespace-nowrap">
                                            {getStatusBadge(t.status)}
                                        </td>
                                        {showOperatorCol && (
                                            <td className="p-2 font-bold text-slate-600 uppercase whitespace-nowrap">
                                                {t.operator}
                                            </td>
                                        )}
                                        <td className="p-2 font-mono text-slate-600 whitespace-nowrap font-bold">
                                            {t.date}
                                        </td>
                                        <td className="p-2 font-black text-slate-800 uppercase whitespace-nowrap">
                                            {t.fleetTicket || '-'}
                                        </td>
                                        <td className="p-2 font-bold text-slate-600 uppercase whitespace-nowrap">
                                            {t.base ? (
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={10} className="text-slate-400" />
                                                    {t.base}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 font-bold text-slate-800 uppercase whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded w-fit border border-slate-200 text-[10px]">
                                                {getProblemIcon(t.requestType)}
                                                {t.requestType}
                                            </div>
                                        </td>
                                        <td className="p-2 text-slate-500 font-medium line-clamp-1 max-w-[300px] truncate" title={t.description}>
                                            {t.description}
                                        </td>
                                        <td className="p-2 text-slate-600 font-bold uppercase whitespace-nowrap">
                                            {t.ticketNumber || '-'}
                                        </td>
                                        <td className="p-2 text-slate-500 font-medium whitespace-nowrap">
                                            {t.scheduledDate ? (
                                                <div className="flex items-center gap-1 text-[#00ad74] font-bold">
                                                    <Clock size={10} /> {new Date(t.scheduledDate).toLocaleDateString('pt-BR')}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 text-center">
                                            {t.isDone ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                                                    SIM
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="p-2 text-center">
                                            {t.attachmentName ? (
                                                <a 
                                                    href={`https://drive.google.com/drive/folders/1Msu9YThHz8TSEvtwU-oUUgsqd4zZ93Gi?q=${encodeURIComponent(t.attachmentName)}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-center gap-1 p-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 group/img w-10 h-8"
                                                    title={`Ver anexo: ${t.attachmentName}`}
                                                >
                                                    {t.attachmentName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                                                        <ImageIcon size={14} />
                                                    ) : (
                                                        <File size={14} />
                                                    )}
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="p-2 pr-6 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <button onClick={() => handleEdit(t)} className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-[#00ad74] hover:border-[#00ad74] rounded-md transition-colors"><Pencil size={12} /></button>
                                                <button onClick={() => handleDelete(t.id)} className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 rounded-md transition-colors"><Trash2 size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={13} className="p-16 text-center text-slate-400 uppercase font-bold text-xs tracking-widest">
                                        Nenhum chamado encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-0 shadow-2xl border border-emerald-50 flex flex-col max-h-[95vh] overflow-hidden">
                        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                                {editingId ? <Pencil size={20} className="text-[#00ad74]" /> : <Ticket size={20} className="text-[#00ad74]" />}
                                {editingId ? 'Editar Chamado' : 'Novo Chamado'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Linha 1: Status e Data */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Status</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.status}
                                                onChange={e => setFormData({...formData, status: e.target.value as any})}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none appearance-none bg-white"
                                            >
                                                <option value="Em Aberto">Em Aberto</option>
                                                <option value="Em Andamento">Em Andamento</option>
                                                <option value="Finalizado">Finalizado</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <div className="border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Data</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input 
                                                type="text" 
                                                value={formData.date}
                                                onChange={e => setFormData({...formData, date: e.target.value})}
                                                className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none"
                                                placeholder="DD/MM/AAAA"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Linha 2: Frota e Base (Solicitado Inversão e mesma linha) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Frota</label>
                                        <div className="relative">
                                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input 
                                                type="text" 
                                                value={formData.fleetTicket}
                                                onChange={e => setFormData({...formData, fleetTicket: e.target.value.toUpperCase()})}
                                                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none bg-white"
                                                placeholder="Nº ou ID"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Base</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <select 
                                                value={formData.base}
                                                onChange={e => setFormData({...formData, base: e.target.value})}
                                                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none appearance-none bg-white"
                                            >
                                                <option value="">Selecione...</option>
                                                {['AGU', 'ARA', 'CBO', 'JLS', 'OUR', 'PLN', 'SBC', 'SUPRI'].map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <div className="border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Linha 3: Operador e Nº Chamado */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Operador</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input 
                                                type="text" 
                                                value={formData.operator}
                                                onChange={e => setFormData({...formData, operator: e.target.value.toUpperCase()})}
                                                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Nº Chamado</label>
                                        <input 
                                            type="text" 
                                            value={formData.ticketNumber}
                                            onChange={e => setFormData({...formData, ticketNumber: e.target.value.toUpperCase()})}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none bg-white"
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Problema (Solicitação) *</label>
                                    <div className="relative mb-2">
                                        <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <select 
                                            required
                                            value={selectedProblemOption}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setSelectedProblemOption(val);
                                                if (val === "Outros") {
                                                    setFormData({...formData, requestType: ''});
                                                } else {
                                                    setFormData({...formData, requestType: val});
                                                }
                                            }}
                                            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none appearance-none bg-white"
                                        >
                                            <option value="">Selecione...</option>
                                            {PREDEFINED_PROBLEMS.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                            <option value="Outros">Outros</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <div className="border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400"></div>
                                        </div>
                                    </div>
                                    
                                    {selectedProblemOption === 'Outros' && (
                                        <input 
                                            type="text"
                                            value={formData.requestType}
                                            onChange={e => setFormData({...formData, requestType: e.target.value.toUpperCase()})}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none bg-white animate-in fade-in slide-in-from-top-2"
                                            placeholder="DIGITE O TIPO DE PROBLEMA..."
                                            autoFocus
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Descrição Detalhada *</label>
                                    <textarea 
                                        required
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value.toUpperCase()})}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-1 focus:ring-[#00ad74] outline-none min-h-[80px] uppercase bg-white"
                                        placeholder="Descreva o problema ou solicitação..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Data Agendada</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input 
                                                type="date" 
                                                value={formData.scheduledDate}
                                                onChange={e => setFormData({...formData, scheduledDate: e.target.value})}
                                                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold uppercase focus:ring-1 focus:ring-[#00ad74] outline-none bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Conclusão</label>
                                        <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2.5 bg-white h-[38px]">
                                            <input 
                                                type="checkbox" 
                                                id="isDone" 
                                                checked={formData.isDone} 
                                                onChange={e => setFormData({...formData, isDone: e.target.checked})}
                                                className="w-4 h-4 text-[#00ad74] rounded border-slate-300 focus:ring-[#00ad74] cursor-pointer"
                                            />
                                            <label htmlFor="isDone" className="text-xs font-bold text-slate-700 uppercase cursor-pointer select-none">Realizada?</label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Anexo (Opcional)</label>
                                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors group">
                                        <input 
                                            type="file" 
                                            onChange={e => setAttachmentFile(e.target.files ? e.target.files[0] : null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        {attachmentFile ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <img src={URL.createObjectURL(attachmentFile)} alt="Preview" className="h-20 w-20 object-cover rounded-lg shadow-sm border border-slate-200" />
                                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-full px-2">{attachmentFile.name}</span>
                                                <span className="text-[9px] text-[#00ad74] font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded">Novo Arquivo</span>
                                            </div>
                                        ) : formData.attachmentName ? (
                                            <div className="flex flex-col items-center gap-2">
                                                {formData.attachmentName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                                                    <div className="h-20 w-20 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#00ad74] group-hover:border-[#00ad74]/30 transition-colors">
                                                        <ImageIcon size={32} />
                                                    </div>
                                                ) : (
                                                    <div className="h-20 w-20 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#00ad74] group-hover:border-[#00ad74]/30 transition-colors">
                                                        <File size={32} />
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-full px-2">{formData.attachmentName}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase group-hover:text-[#00ad74] transition-colors">Clique para Substituir</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 pointer-events-none">
                                                <Upload className="text-slate-300 group-hover:text-[#00ad74] transition-colors" size={24} />
                                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase">
                                                    Clique para anexar arquivo
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs uppercase tracking-widest">
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-gradient-to-r from-[#00ad74] to-[#00d68f] text-white font-black rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 active:scale-95 text-xs uppercase tracking-widest"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {editingId ? 'Salvar' : 'Criar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternalTickets;
