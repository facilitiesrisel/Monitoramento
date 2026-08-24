import React from 'react';

// Helper: Formata texto em Title Case (Texto Padrão Formato Título)
export const toTitleCase = (str: string | undefined | null): string => {
  if (!str) return '';
  const lower = str.toLowerCase().trim();
  const smallWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'por', 'para', 'a', 'o', 'as', 'os', 'no', 'na', 'nos', 'nas']);
  
  return lower.split(/\s+/).map((word, index) => {
    if (word.length === 0) return '';
    // Se for sigla comum mantem
    if (['ti', 'rh', 'adm', 'cftv', 'ssma', 'pce', 'cnh', 'doc', 'gti', 'gmt', 'cce'].includes(word)) {
      return word.toUpperCase();
    }
    if (index > 0 && smallWords.has(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

// Helper: Formatação de Placa Padrão Mercosul / Padrão Antigo
export const formatMercosulPlate = (plateStr: string | undefined | null): string => {
  if (!plateStr) return '';
  const cleaned = plateStr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length === 7) {
    // Exemplo: ABC1D23 ou ABC1234 -> ABC-1D23 ou ABC-1234
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return cleaned || plateStr;
};

// Componente Visual de Placa Mercosul com Tarja Azul, Bandeira e Brasão
export const MercosulPlateBadge: React.FC<{ plate: string; className?: string }> = ({ plate, className = '' }) => {
  const formatted = formatMercosulPlate(plate);
  const raw = (plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const letters = raw.length >= 3 ? raw.slice(0, 3) : raw;
  const numbers = raw.length >= 7 ? raw.slice(3) : (raw.length > 3 ? raw.slice(3) : '');

  if (!raw) {
    return (
      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-400 font-mono text-xs rounded border border-slate-200">
        SEM PLACA
      </span>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center bg-white rounded-md border-2 border-slate-900 shadow-sm overflow-hidden select-none min-w-[102px] ${className}`}>
      {/* Tarja Azul Mercosul */}
      <div className="w-full bg-[#003399] text-white px-2 py-0.5 flex items-center justify-between gap-1 leading-none text-[8px] font-black tracking-widest">
        <span className="flex items-center gap-0.5">
          <span className="text-[7px] text-yellow-300">★</span>
          <span className="text-[7px] text-emerald-400">🇧🇷</span>
        </span>
        <span className="tracking-tighter font-extrabold">BRASIL</span>
        <span className="text-[7px] text-slate-300">MERCOSUL</span>
      </div>

      {/* Conteúdo da Placa */}
      <div className="px-2 py-0.5 flex items-center justify-center gap-1 font-mono font-black text-xs md:text-sm tracking-wider text-slate-950 bg-white">
        <span>{letters}</span>
        {numbers && <span>{numbers}</span>}
      </div>
    </div>
  );
};

// Mapeamento de estilos de Cores elegantes com fundo gradiente correspondente
export interface ColorStyle {
  bgGradient: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
  glowColor?: string;
}

export const getColorStyle = (colorName: string | undefined | null): ColorStyle => {
  const norm = (colorName || '').toLowerCase().trim();

  if (norm.includes('pret') || norm.includes('black') || norm.includes('escur')) {
    return {
      bgGradient: 'from-slate-950 via-slate-900 to-zinc-900',
      textColor: 'text-zinc-100',
      borderColor: 'border-slate-800',
      dotColor: 'bg-zinc-400'
    };
  }
  if (norm.includes('branc') || norm.includes('white') || norm.includes('gelo') || norm.includes('perola') || norm.includes('pérola')) {
    return {
      bgGradient: 'from-slate-100 via-white to-slate-200',
      textColor: 'text-slate-800',
      borderColor: 'border-slate-300',
      dotColor: 'bg-slate-400'
    };
  }
  if (norm.includes('prata') || norm.includes('silver') || norm.includes('titan') || norm.includes('cinza') || norm.includes('grey') || norm.includes('gray') || norm.includes('grafite') || norm.includes('chumbo')) {
    return {
      bgGradient: 'from-slate-400 via-slate-300 to-zinc-400',
      textColor: 'text-slate-900',
      borderColor: 'border-slate-400',
      dotColor: 'bg-slate-700'
    };
  }
  if (norm.includes('vermelh') || norm.includes('red') || norm.includes('vinho') || norm.includes('bord') || norm.includes('rubi')) {
    return {
      bgGradient: 'from-red-700 via-rose-600 to-red-800',
      textColor: 'text-white',
      borderColor: 'border-red-600',
      dotColor: 'bg-rose-200'
    };
  }
  if (norm.includes('azul') || norm.includes('blue') || norm.includes('marinho') || norm.includes('celeste') || norm.includes('indigo') || norm.includes('índigo')) {
    return {
      bgGradient: 'from-blue-700 via-sky-600 to-indigo-800',
      textColor: 'text-white',
      borderColor: 'border-blue-500',
      dotColor: 'bg-sky-200'
    };
  }
  if (norm.includes('verd') || norm.includes('green') || norm.includes('oliva') || norm.includes('musgo') || norm.includes('esmeralda')) {
    return {
      bgGradient: 'from-emerald-700 via-green-600 to-teal-800',
      textColor: 'text-white',
      borderColor: 'border-emerald-500',
      dotColor: 'bg-emerald-200'
    };
  }
  if (norm.includes('amarel') || norm.includes('yellow') || norm.includes('ouro') || norm.includes('dourad') || norm.includes('gold')) {
    return {
      bgGradient: 'from-amber-400 via-yellow-300 to-amber-500',
      textColor: 'text-amber-950',
      borderColor: 'border-amber-400',
      dotColor: 'bg-amber-800'
    };
  }
  if (norm.includes('laranja') || norm.includes('orange') || norm.includes('bronze') || norm.includes('cobre')) {
    return {
      bgGradient: 'from-orange-600 via-amber-500 to-orange-700',
      textColor: 'text-white',
      borderColor: 'border-orange-500',
      dotColor: 'bg-amber-200'
    };
  }
  if (norm.includes('marrom') || norm.includes('brown') || norm.includes('bege') || norm.includes('caramelo') || norm.includes('cafe') || norm.includes('café')) {
    return {
      bgGradient: 'from-amber-900 via-amber-800 to-yellow-950',
      textColor: 'text-amber-100',
      borderColor: 'border-amber-800',
      dotColor: 'bg-amber-300'
    };
  }
  if (norm.includes('rox') || norm.includes('purple') || norm.includes('violet') || norm.includes('lilas') || norm.includes('lilás')) {
    return {
      bgGradient: 'from-purple-800 via-indigo-700 to-purple-900',
      textColor: 'text-white',
      borderColor: 'border-purple-600',
      dotColor: 'bg-purple-200'
    };
  }
  if (norm.includes('rosa') || norm.includes('pink') || norm.includes('magenta')) {
    return {
      bgGradient: 'from-pink-600 via-rose-500 to-pink-700',
      textColor: 'text-white',
      borderColor: 'border-pink-500',
      dotColor: 'bg-pink-100'
    };
  }

  // Padrão Neutro Sofisticado
  return {
    bgGradient: 'from-slate-200 via-slate-100 to-zinc-200',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    dotColor: 'bg-slate-500'
  };
};

// Componente Badge de Cor com Formato Retangular Elegante (igual ao badge de Setor)
export const ColorPill: React.FC<{ colorName: string | undefined | null; className?: string }> = ({ colorName, className = '' }) => {
  if (!colorName || !colorName.trim()) {
    return <span className="text-slate-400 italic text-xs">Não inf.</span>;
  }

  const titleCaseColor = toTitleCase(colorName);
  const style = getColorStyle(colorName);

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs border bg-gradient-to-r ${style.bgGradient} ${style.textColor} ${style.borderColor} transition-all hover:scale-[1.02] select-none ${className}`}
      title={`Cor: ${titleCaseColor}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dotColor} shrink-0 shadow-2xs`} />
      <span className="font-semibold tracking-tight">{titleCaseColor}</span>
    </span>
  );
};
