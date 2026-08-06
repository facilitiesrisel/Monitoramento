
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authenticateOperator } from '../services/dataService';
import { ShieldCheck, User as UserIcon, Lock, ArrowRight, Loader2, Award, Eye } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'quality' | 'operator' | 'monitor'>('quality');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Gera um ID único por sessão para impedir que o navegador relacione campos salvos anteriormente
  const [uniqueId] = useState(() => Math.random().toString(36).substring(2, 10));

  // Form States
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Authenticate checking against Sheet (or Fallback)
        const user = await authenticateOperator(loginName, loginPass);
        
        if (user) {
            // Role Validation based on Tab
            if (activeTab === 'quality' && user.role !== 'quality' && user.role !== 'admin') {
                setError('Este usuário não tem permissão de Qualidade.');
                setLoading(false); return;
            }
            if (activeTab === 'monitor' && user.role !== 'monitor' && user.role !== 'admin') {
                setError('Este usuário não tem permissão de Monitoramento.');
                setLoading(false); return;
            }

            onLogin({
                name: user.name,
                role: user.role
            });
        } else {
            setError('Credenciais inválidas.');
            setLoading(false);
        }
    } catch (e) {
        setError('Erro ao autenticar. Verifique a planilha.');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#00ad74]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#ffa000]/10 rounded-full blur-[100px]" />

        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
            {/* Header */}
            <div className="bg-white p-8 pb-6 text-center border-b border-slate-100">
                <h1 className="text-3xl font-black tracking-tighter mb-2">
                    <span className="text-[#ffa000]">RI</span>
                    <span className="text-[#00ad74]">SEL</span>
                </h1>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sistema de Controle Inteligente</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
                <button 
                    onClick={() => { setActiveTab('quality'); setError(''); setLoginName(''); setLoginPass(''); }}
                    className={`flex-1 py-4 text-xs font-bold transition-all ${activeTab === 'quality' ? 'text-[#00ad74] border-b-2 border-[#00ad74] bg-slate-50' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Award size={16} />
                        QUALIDADE
                    </div>
                </button>
                <button 
                    onClick={() => { setActiveTab('operator'); setError(''); setLoginName(''); setLoginPass(''); }}
                    className={`flex-1 py-4 text-xs font-bold transition-all ${activeTab === 'operator' ? 'text-[#ffa000] border-b-2 border-[#ffa000] bg-slate-50' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <div className="flex flex-col items-center justify-center gap-1">
                        <UserIcon size={16} />
                        OPERADOR
                    </div>
                </button>
                <button 
                    onClick={() => { setActiveTab('monitor'); setError(''); setLoginName(''); setLoginPass(''); }}
                    className={`flex-1 py-4 text-xs font-bold transition-all ${activeTab === 'monitor' ? 'text-blue-500 border-b-2 border-blue-500 bg-slate-50' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Eye size={16} />
                        MONITOR
                    </div>
                </button>
            </div>

            <div className="p-8">
                <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" autoComplete="off">
                    {/* Campos invisíveis para "quebrar" a detecção padrão de autofill do navegador */}
                    <input type="text" name="fake_user_pre" style={{display: 'none'}} tabIndex={-1} />
                    <input type="password" name="fake_pass_pre" style={{display: 'none'}} tabIndex={-1} />

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            {activeTab === 'quality' ? 'Usuário Qualidade / Admin' : activeTab === 'monitor' ? 'Usuário Monitoramento' : 'Nome / Login'}
                        </label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                required
                                name={`risel_user_${uniqueId}`}
                                id={`risel_user_${uniqueId}`}
                                autoComplete="off"
                                data-lpignore="true"
                                value={loginName}
                                onChange={e => setLoginName(e.target.value)}
                                className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-4 text-slate-800 focus:outline-none focus:ring-2 ${activeTab === 'quality' ? 'focus:ring-[#00ad74]' : activeTab === 'monitor' ? 'focus:ring-blue-500' : 'focus:ring-[#ffa000]'}`}
                                placeholder={activeTab === 'quality' ? "Login Qualidade" : activeTab === 'monitor' ? "Ex: CARLOS" : "Seu nome"}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                required
                                name={`risel_pass_${uniqueId}`}
                                id={`risel_pass_${uniqueId}`}
                                autoComplete="new-password"
                                data-lpignore="true"
                                value={loginPass}
                                onChange={e => setLoginPass(e.target.value)}
                                className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-4 text-slate-800 focus:outline-none focus:ring-2 ${activeTab === 'quality' ? 'focus:ring-[#00ad74]' : activeTab === 'monitor' ? 'focus:ring-blue-500' : 'focus:ring-[#ffa000]'}`}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    
                    {error && <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{error}</div>}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full font-bold py-3 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-white
                            ${activeTab === 'quality' 
                                ? 'bg-[#00ad74] hover:bg-[#008f61] shadow-[#00ad74]/20' 
                                : activeTab === 'monitor'
                                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                : 'bg-[#ffa000] hover:bg-[#e69000] shadow-[#ffa000]/20'
                            }`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>ACESSAR <ArrowRight size={18} /></>}
                    </button>
                </form>
            </div>
            
            <div className="bg-slate-50 p-4 text-center text-[10px] text-slate-400">
                &copy; {new Date().getFullYear()} Risel Combustíveis. 
            </div>
        </div>
    </div>
  );
};

export default Login;
