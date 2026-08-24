import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Car, 
  Bike, 
  Clock, 
  User, 
  Building2, 
  Phone, 
  Palette, 
  Hash, 
  ShieldCheck, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { EmployeeVehicle } from '../types';
import { MercosulPlateBadge, ColorPill, toTitleCase, formatMercosulPlate } from './EmployeeVehicleHelpers';

interface VehicleEditModalProps {
  vehicle: EmployeeVehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedVehicle: EmployeeVehicle) => Promise<boolean>;
  onDelete?: (vehicle: EmployeeVehicle) => Promise<boolean>;
  canDelete?: boolean;
}

export const VehicleEditModal: React.FC<VehicleEditModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onSave,
  onDelete,
  canDelete = false
}) => {
  const [formData, setFormData] = useState<EmployeeVehicle>({
    id: '',
    timestamp: '',
    employeeName: '',
    phone: '',
    extension: '',
    department: '',
    entryTime: '',
    exitTime: '',
    plate: '',
    brand: '',
    model: '',
    color: '',
    type: 'CARRO'
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setFormData({ ...vehicle });
      setError(null);
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName.trim()) {
      setError('O nome do colaborador é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const cleanPlate = formData.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const updated: EmployeeVehicle = {
        ...formData,
        employeeName: formData.employeeName.trim(),
        plate: cleanPlate,
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        color: formData.color.trim(),
        department: formData.department.trim(),
        phone: formData.phone.trim(),
        extension: formData.extension.trim()
      };

      const success = await onSave(updated);
      if (success) {
        onClose();
      } else {
        setError('Ocorreu um erro ao sincronizar com a Planilha. Os dados foram atualizados localmente.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !vehicle) return;
    if (window.confirm(`Tem certeza que deseja excluir o registro do veículo de ${formData.employeeName} (${formData.plate}) da planilha e do sistema?`)) {
      setDeleting(true);
      try {
        const success = await onDelete(vehicle);
        if (success) {
          onClose();
        } else {
          setError('Não foi possível remover da planilha. O item foi removido da tela local.');
        }
      } catch (err: any) {
        setError(err?.message || 'Falha ao excluir.');
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* TOPO DO MODAL */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 via-[#00ad74] to-teal-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Sparkles size={22} className="text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Editar Dados do Veículo</h3>
              <p className="text-xs text-emerald-100">Atualização em tempo real no Sistema e na Planilha Google</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={saving || deleting}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* MENSAGEM DE ERRO SE HOUVER */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-700">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* PRÉVIA VISUAL EM TEMPO REAL */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MercosulPlateBadge plate={formData.plate} />
            <div>
              <div className="text-xs font-black text-slate-800">
                {toTitleCase(formData.employeeName) || 'Nome do Colaborador'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span>{toTitleCase(formData.brand)} {toTitleCase(formData.model)}</span>
                <span>•</span>
                <span>{toTitleCase(formData.department) || 'Setor'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ColorPill colorName={formData.color} />
            <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 border ${
              formData.type === 'MOTO' 
                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {formData.type === 'MOTO' ? <Bike size={13} /> : <Car size={13} />}
              {formData.type === 'MOTO' ? 'Moto' : 'Carro'}
            </span>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 font-aptos-narrow">
          {/* SEÇÃO: COLABORADOR */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User size={14} className="text-[#00ad74]" /> Dados do Colaborador
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.employeeName}
                  onChange={e => setFormData({ ...formData, employeeName: e.target.value })}
                  placeholder="Ex: Deny Gonçalves"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Setor / Departamento</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ex: Monitoramento, RH, TI..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ramal Interno</label>
                <input
                  type="text"
                  value={formData.extension}
                  onChange={e => setFormData({ ...formData, extension: e.target.value })}
                  placeholder="Ex: 2104"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: (19) 99999-9999 / (19) 98888-8888"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO: VEÍCULO */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Car size={14} className="text-[#00ad74]" /> Dados do Veículo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Veículo</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-[#00ad74] outline-none"
                >
                  <option value="CARRO">🚗 Carro</option>
                  <option value="MOTO">🏍️ Moto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Placa (Mercosul / Tradicional)</label>
                <input
                  type="text"
                  value={formData.plate}
                  onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  placeholder="Ex: BRA2E19"
                  maxLength={10}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black uppercase focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cor do Veículo</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Ex: Prata, Preto, Vermelho..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marca / Fabricante</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Ex: Chevrolet, Honda..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modelo do Veículo</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Onix Plus 1.0 Turbo / CG 160 Titan"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#00ad74] focus:ring-2 focus:ring-[#00ad74]/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO: HORÁRIOS HABITUAIS */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock size={14} className="text-[#00ad74]" /> Horários Habituais
            </h4>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Entrada Habitual</label>
                <input
                  type="text"
                  value={formData.entryTime}
                  onChange={e => setFormData({ ...formData, entryTime: e.target.value })}
                  placeholder="Ex: 08:00"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium focus:bg-white focus:border-[#00ad74] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Saída Habitual</label>
                <input
                  type="text"
                  value={formData.exitTime}
                  onChange={e => setFormData({ ...formData, exitTime: e.target.value })}
                  placeholder="Ex: 18:00"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium focus:bg-white focus:border-[#00ad74] outline-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* RODAPÉ COM AÇÕES */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div>
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-100/80 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                title="Excluir este registro da planilha"
              >
                <Trash2 size={15} />
                <span>{deleting ? 'Excluindo...' : 'Excluir'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs md:text-sm transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || deleting}
              className="px-5 py-2 bg-gradient-to-r from-[#00ad74] to-[#008f61] hover:from-[#009b68] hover:to-[#007d54] text-white rounded-xl font-bold text-xs md:text-sm shadow-md shadow-[#00ad74]/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{saving ? 'Sincronizando com a Planilha...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
