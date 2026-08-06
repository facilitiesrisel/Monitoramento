
import React, { useState, useEffect } from 'react';
import { getManagedDrivers, getChecklistQuestions, saveEvaluation, loadData, getFullEvaluationById } from '../services/dataService';
import { DriverProfile } from '../types';
import { User, Calendar, Truck, Save, ClipboardList, CheckCircle, ArrowLeft, Upload, Image, X, Calculator, FileText, MapPin, Clock, Building2, Loader2, Camera, ShieldCheck, Eye, ExternalLink } from 'lucide-react';

interface EvaluationFormProps {
  evaluatorName: string;
  initialDriverId?: string;
  editEvaluationId?: string;
  onCancel?: () => void;
  readOnly?: boolean;
}

interface ChecklistItem {
  id: string; // Column Letter
  question: string;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ evaluatorName, onCancel, initialDriverId, editEvaluationId, readOnly = false }) => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [generatedId, setGeneratedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [headerData, setHeaderData] = useState({
      driverId: '',
      driverName: '',      
      evaluator: evaluatorName.split(' ')[0].toUpperCase(), 
      transportadora: '',  
      frota: '',           
      base: '',            
      date: new Date().toISOString().split('T')[0], 
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
      local: ''            
  });

  const [checklistQuestions, setChecklistQuestions] = useState<ChecklistItem[]>([]);
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, 'SIM' | 'NÃO' | 'NA'>>({});

  const [images, setImages] = useState<Record<string, File | string | null>>({
      'AN': null, 'AO': null, 'AP': null, 'AQ': null
  });

  const [footerData, setFooterData] = useState<Record<string, string>>({
      'AR': '', 'AS': '', 'AT': '', 'AU': '', 'AV': '', 'AW': '', 
      'AX': '', 'AY': '', 'AZ': '', 'BA': '', 'BB': ''
  });

  const [calculatedScore, setCalculatedScore] = useState<number>(0);

  const questionWeights: Record<string, number> = {
    'J': 4, 'K': 2, 'L': 5, 'M': 4, 'N': 3, 'O': 5, 'P': 1, 'Q': 4, 'R': 4, 'S': 1,
    'T': 2, 'U': 1, 'V': 4, 'W': 2, 'X': 1, 'Y': 5, 'Z': 5, 'AA': 2, 'AB': 2, 'AC': 3,
    'AD': 4, 'AE': 2, 'AF': 5, 'AG': 1, 'AH': 1, 'AI': 4, 'AJ': 5, 'AK': 3, 'AL': 5, 'AM': 2
  };

  useEffect(() => {
    const allDrivers = getManagedDrivers();
    const driversWithCamera = allDrivers.filter(d => d.hasCamera === true);
    setDrivers(driversWithCamera);
    setChecklistQuestions(getChecklistQuestions());

    if (editEvaluationId) {
        setIsEditMode(true);
        const ev = getFullEvaluationById(editEvaluationId);
        if (ev && ev.rawRow) {
            const r = ev.rawRow;
            setGeneratedId(ev.id);
            setHeaderData({
                driverId: driversWithCamera.find(d => d.name === r[1])?.id || '',
                driverName: r[1],
                evaluator: r[2],
                transportadora: r[3],
                frota: r[4],
                base: r[5],
                date: r[6],
                time: r[7],
                local: r[8]
            });

            const answers: any = {};
            const colMap: any = {
                'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
                'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25, 'AA': 26, 'AB': 27, 'AC': 28,
                'AD': 29, 'AE': 30, 'AF': 31, 'AG': 32, 'AH': 33, 'AI': 34, 'AJ': 35, 'AK': 36, 'AL': 37, 'AM': 38
            };
            Object.keys(colMap).forEach(key => answers[key] = r[colMap[key]]);
            setChecklistAnswers(answers);

            setImages({
                'AN': r[39] || null,
                'AO': r[40] || null,
                'AP': r[41] || null,
                'AQ': r[42] || null
            });

            const footer: any = {};
            const footerMap: any = {
                'AR': 43, 'AS': 44, 'AT': 45, 'AU': 46, 'AV': 47, 'AW': 48, 
                'AX': 49, 'AY': 50, 'AZ': 51, 'BA': 52, 'BB': 53
            };
            Object.keys(footerMap).forEach(key => footer[key] = r[footerMap[key]]);
            setFooterData(footer);
        }
    } else {
        const newId = Math.random().toString(16).substring(2, 10);
        setGeneratedId(newId);
        if (initialDriverId) {
            const found = driversWithCamera.find(d => d.id === initialDriverId);
            if (found) {
                setHeaderData(prev => ({
                    ...prev,
                    driverId: found.id,
                    driverName: found.name,
                    base: found.base
                }));
            }
        }
    }
  }, [initialDriverId, editEvaluationId]);

  useEffect(() => {
    let totalObtained = 0;
    const totalPossible = Object.values(questionWeights).reduce((a, b) => a + b, 0);

    Object.entries(checklistAnswers).forEach(([colId, answer]) => {
        const weight = questionWeights[colId] || 0;
        if (answer === 'SIM' || answer === 'NA') {
            totalObtained += weight;
        }
    });

    const score = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
    const finalScore = Math.min(100, Math.max(0, score)); 
    setCalculatedScore(finalScore);
    setFooterData(prev => ({
        ...prev,
        'AV': totalObtained.toString(), 
        'AW': finalScore.toFixed(2) + '%' 
    }));
  }, [checklistAnswers]);

  const resizeImage = (file: File, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new (window as any).Image(); 
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/png'); // FORÇA PNG
                    resolve(dataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''));
                } else reject(new Error("Canvas error"));
            };
            img.onerror = (err: any) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (readOnly) return;
      
      const missingErrors: string[] = [];
      if (!headerData.driverId) missingErrors.push("- Motorista");
      if (!headerData.transportadora.trim()) missingErrors.push("- Transportadora");
      if (!headerData.frota.trim()) missingErrors.push("- Frota");
      if (!headerData.date) missingErrors.push("- Data");
      if (!headerData.time) missingErrors.push("- Horário");
      if (!headerData.local.trim()) missingErrors.push("- Local/Trecho");
      
      const unanswered = checklistQuestions.filter(item => !checklistAnswers[item.id]);
      if (unanswered.length > 0) missingErrors.push(`- ${unanswered.length} itens do checklist`);

      const allImages = Object.values(images).every(img => img !== null);
      if (!allImages) missingErrors.push("- As 4 fotos são obrigatórias");

      if (missingErrors.length > 0) {
          alert("Campos obrigatórios:\n" + missingErrors.join("\n"));
          return;
      }

      setIsSubmitting(true);
      try {
          const processedImages = await Promise.all(
              Object.entries(images).map(async ([col, val]) => {
                  if (val instanceof File) {
                      const base64 = await resizeImage(val);
                      return { col, fileName: `${generatedId}.${col}.png`, base64 };
                  } else if (typeof val === 'string') {
                      return { col, fileName: val, base64: null };
                  }
                  return { col, fileName: '', base64: null };
              })
          );

          await saveEvaluation({
              header: headerData,
              checklist: checklistAnswers,
              footer: footerData,
              images: processedImages
          }, isEditMode ? editEvaluationId : undefined);

          alert(`Avaliação Salva!\nNota: ${footerData['AW']}`);
          if (onCancel) onCancel();
      } catch (error) {
          console.error(error);
          alert("Registro salvo localmente devido a falha de conexão. Ele será sincronizado automaticamente depois.");
          if (onCancel) onCancel();
      } finally {
          setIsSubmitting(false);
      }
  };

  const renderImagePreview = (col: string, val: File | string) => {
      if (val instanceof File) {
          return <img src={URL.createObjectURL(val)} className="w-full h-full object-cover rounded-xl shadow-lg border border-slate-200" />;
      }
      
      if (typeof val === 'string' && val.startsWith('http')) {
          return <img src={val} className="w-full h-full object-cover rounded-xl shadow-lg border border-slate-200" onError={(e) => e.currentTarget.style.display='none'} />;
      }

      // Try to construct a Google Drive thumbnail URL assuming it *might* be an ID
      // If it fails (e.g. it's a filename), the onError will catch it and we show the fallback.
      // We also check if it's clearly a filename (has dot) to avoid 404s on obvious non-IDs, but some systems use dots in IDs? Unlikely.
      // Let's assume standard Drive IDs don't have dots.
      const looksLikeFilename = val.includes('.') || val.includes(' ');
      const driveThumbnailUrl = `https://drive.google.com/thumbnail?id=${val}&sz=w400`;

      return (
          <div className="relative w-full h-full">
             {!looksLikeFilename && (
                 <img 
                    src={driveThumbnailUrl} 
                    className="w-full h-full object-cover rounded-xl shadow-lg border border-slate-200 absolute inset-0 z-10"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        // Reveal fallback below
                    }}
                 />
             )}
             
             {/* Fallback / Filename View */}
             <div className="flex flex-col items-center justify-center h-full w-full bg-slate-100 rounded-xl p-2 border border-slate-200">
                  <div className="bg-white p-2 rounded-full shadow-sm mb-2">
                    <Image size={20} className="text-[#00ad74]" />
                  </div>
                  <span className="text-[8px] text-slate-500 font-bold truncate max-w-full break-all px-1 bg-white/50 rounded">{val}</span>
                  <a href={`https://drive.google.com/drive/folders/1QjcgNaMbyQECI5u_g1UAPW5ZySJ9dkJv?q=${encodeURIComponent(val)}`} target="_blank" rel="noreferrer" className="mt-2 text-[9px] text-blue-500 font-bold flex items-center gap-1 hover:underline bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 shadow-sm z-20 relative">
                      <ExternalLink size={10} /> Visualizar
                  </a>
             </div>
          </div>
      );
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="flex items-center justify-between sticky top-0 bg-slate-50 z-20 py-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500"><ArrowLeft size={24} /></button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-[#00ad74] to-[#008f61] text-white rounded-lg shadow-lg">
                        {readOnly ? <Eye size={24}/> : <ClipboardList size={24} />}
                    </div>
                    {readOnly ? 'Detalhes da Avaliação' : (isEditMode ? 'Editar Avaliação' : 'Nova Avaliação')}
                </h2>
            </div>
          </div>
          <div className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl shadow-xl flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score em Tempo Real</span>
                <span className={`text-3xl font-black ${calculatedScore >= 90 ? 'text-[#00ad74]' : calculatedScore >= 70 ? 'text-[#ffa000]' : 'text-red-500'}`}>
                    {calculatedScore.toFixed(1)}%
                </span>
          </div>
       </div>

       {isSubmitting && (
           <div className="fixed inset-0 bg-slate-900/50 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
               <div className="bg-white p-8 rounded-2xl flex flex-col items-center shadow-2xl">
                   <Loader2 size={48} className="text-[#00ad74] animate-spin mb-4" />
                   <h3 className="text-xl font-bold text-slate-800">Sincronizando...</h3>
               </div>
           </div>
       )}

       <form onSubmit={handleSubmit} className="space-y-8">
           <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00ad74] to-[#00d68f]" />
                <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest"><User size={14} className="text-[#00ad74]"/> Motorista *</label>
                    <select disabled={readOnly} value={headerData.driverId} onChange={(e) => {
                        const drv = drivers.find(d => d.id === e.target.value);
                        setHeaderData({...headerData, driverId: e.target.value, driverName: drv?.name || '', base: drv?.base || ''});
                    }} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500">
                        <option value="">Selecione o motorista...</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest"><Building2 size={14} className="text-[#00ad74]"/> Transportadora *</label>
                    <input disabled={readOnly} type="text" value={headerData.transportadora} onChange={e => setHeaderData({...headerData, transportadora: e.target.value.toUpperCase()})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest"><Truck size={14} className="text-[#00ad74]"/> Frota *</label>
                    <input disabled={readOnly} type="text" value={headerData.frota} onChange={e => setHeaderData({...headerData, frota: e.target.value.toUpperCase()})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest"><Calendar size={14} className="text-[#00ad74]"/> Data da Avaliação *</label>
                    <input disabled={readOnly} type="date" value={headerData.date} onChange={e => setHeaderData({...headerData, date: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest"><Clock size={14} className="text-[#00ad74]"/> Horário *</label>
                    <input disabled={readOnly} type="time" value={headerData.time} onChange={e => setHeaderData({...headerData, time: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
                <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest"><MapPin size={14} className="text-[#00ad74]"/> Local / Trecho *</label>
                    <input disabled={readOnly} type="text" value={headerData.local} onChange={e => setHeaderData({...headerData, local: e.target.value.toUpperCase()})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500" placeholder="EX: RODOVIA ANHANGUERA KM 120" />
                </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-[#00ad74]" />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Checklist Operacional de Segurança</h3>
                </div>
                <div className="p-6 space-y-1">
                    {checklistQuestions.map(q => (
                        <div key={q.id} className="flex flex-col md:flex-row justify-between items-start md:items-center py-3 border-b border-slate-50 hover:bg-slate-50/30 transition-colors px-2 rounded-lg gap-3">
                            <span className="text-sm font-bold text-slate-700 flex-1">{q.question}</span>
                            <div className="flex gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                {['SIM', 'NÃO', 'NA'].map(v => (
                                    <button 
                                        key={v} 
                                        type="button" 
                                        disabled={readOnly}
                                        onClick={() => setChecklistAnswers({...checklistAnswers, [q.id]: v as any})}
                                        className={`px-4 py-1.5 text-xs font-black rounded-lg border transition-all duration-300 ${
                                            checklistAnswers[q.id] === v 
                                                ? v === 'SIM' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20' 
                                                : v === 'NÃO' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600 shadow-md shadow-red-500/20' 
                                                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white'
                                        }`}
                                    >{v}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Camera size={20} className="text-[#00ad74]" />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Registro Fotográfico de Evidências</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {['AN', 'AO', 'AP', 'AQ'].map(col => (
                        <div key={col} className={`group relative border-2 border-dashed ${readOnly && !images[col] ? 'border-slate-100 bg-slate-50' : 'border-slate-200'} rounded-2xl p-2 flex flex-col items-center justify-center text-center bg-slate-50 hover:border-[#00ad74] hover:bg-[#00ad74]/5 transition-all duration-300 min-h-[160px]`}>
                            {images[col] ? (
                                <div className="relative w-full h-full min-h-[140px] animate-in zoom-in-95 duration-300">
                                    {renderImagePreview(col, images[col]!)}
                                    {!readOnly && (
                                        <button type="button" onClick={() => setImages({...images, [col]: null})} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-600 active:scale-95 transition-all"><X size={16}/></button>
                                    )}
                                </div>
                            ) : (
                                !readOnly ? (
                                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center py-4">
                                        <div className="p-4 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-[#00ad74] group-hover:scale-110 transition-all">
                                            <Upload size={28} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase mt-4 tracking-widest">Foto Evidência {col} *</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setImages({...images, [col]: e.target.files[0]})} />
                                    </label>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                        <Image size={24} />
                                        <span className="text-[10px] font-bold mt-2">Sem Imagem</span>
                                    </div>
                                )
                            )}
                        </div>
                    ))}
                </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
                <div className="flex items-center gap-2 mb-6">
                    <FileText size={20} className="text-[#00ad74]" />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Conclusão e Observações Finais</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Responsável pela Frota (AU) *</label>
                        <input disabled={readOnly} type="text" value={footerData['AU']} onChange={e => setFooterData({...footerData, 'AU': e.target.value.toUpperCase()})} placeholder="Nome do Gestor de Frota" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500" />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Observações Adicionais (BB)</label>
                        <input disabled={readOnly} type="text" value={footerData['BB']} onChange={e => setFooterData({...footerData, 'BB': e.target.value.toUpperCase()})} placeholder="Notas complementares sobre a conduta..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#00ad74]/20 focus:border-[#00ad74] transition-all font-bold disabled:bg-slate-100 disabled:text-slate-500" />
                    </div>
                </div>
           </div>

           <div className="flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="px-8 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">Voltar</button>
                {!readOnly && (
                    <button type="submit" disabled={isSubmitting} className="px-12 py-3 bg-gradient-to-r from-[#00ad74] to-[#00d68f] text-white rounded-xl font-black flex items-center gap-2 shadow-xl shadow-[#00ad74]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Finalizar Avaliação
                    </button>
                )}
           </div>
       </form>
    </div>
  );
};

export default EvaluationForm;
