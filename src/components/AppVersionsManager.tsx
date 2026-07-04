import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles,
  GitBranch, 
  History,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Trees
} from 'lucide-react';
import { motion } from 'motion/react';

interface AppVersion {
  id: number;
  version_number: string;
  title: string;
  description: string;
  update_type: string;
  status: 'Desenvolvimento' | 'Testes' | 'Publicada' | string;
  published_at: string | null;
  created_at: string;
}

interface AppVersionsManagerProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export function AppVersionsManager({ fetchWithAuth }: AppVersionsManagerProps) {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<AppVersion | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/app-versions');
      if (res.ok) {
        const data = await res.json();
        const sortedData = Array.isArray(data) ? data : [];
        setVersions(sortedData);
        if (sortedData.length > 0) {
          // Default to the latest version (first in array)
          setSelectedVersion(sortedData[0]);
        }
      } else {
        console.error('Failed to fetch versions');
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '02/07/2026';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderTextWithBoldPhrases = (text: string) => {
    // Splits text around double asterisks
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900 bg-indigo-50 px-1 rounded">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderDescriptionList = (description: string) => {
    const lines = description.split('\n');
    return (
      <ul className="space-y-4 md:space-y-5 font-sans">
        {lines.map((line, idx) => {
          // Clean up bullet symbols from start
          const cleanLine = line.trim().replace(/^[-•*]\s*/, '');
          if (!cleanLine) return null;
          
          // Check if there is a colon separating category/title and text
          const colonIdx = cleanLine.indexOf(':');
          if (colonIdx > -1) {
            const title = cleanLine.substring(0, colonIdx).trim().replace(/\*\*/g, '');
            const rest = cleanLine.substring(colonIdx + 1).trim();
            
            return (
              <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm md:text-base leading-relaxed">
                <span className="text-indigo-400 font-bold mt-1.5 select-none text-xs sm:text-sm">•</span>
                <span>
                  <strong className="text-slate-900 font-bold tracking-wide uppercase text-xs sm:text-sm mr-1">
                    {title}:
                  </strong>{' '}
                  {renderTextWithBoldPhrases(rest)}
                </span>
              </li>
            );
          } else {
            return (
              <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm md:text-base leading-relaxed">
                <span className="text-indigo-400 font-bold mt-1.5 select-none text-xs sm:text-sm">•</span>
                <span>{renderTextWithBoldPhrases(cleanLine)}</span>
              </li>
            );
          }
        })}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm font-sans">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-gray-500">Buscando versão instalada...</p>
      </div>
    );
  }

  if (versions.length === 0 || !selectedVersion) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-500 space-y-3 font-sans">
        <Sparkles className="mx-auto h-12 w-12 text-gray-300" />
        <p className="font-semibold text-base">Nenhum registro de versão encontrado.</p>
        <p className="text-xs">Entre em contato com o administrador do sistema.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
      {/* Main Content Area - Matching OrganizaAI's design and typography perfectly! */}
      <div className="lg:col-span-9 space-y-8">
        {/* Rounded Outer Container */}
        <div className="bg-white rounded-3xl border border-slate-100/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* 1. Header Banner */}
          <div className="bg-[#0b0e17] py-12 md:py-16 px-4 text-center relative overflow-hidden border-b border-slate-900">
            {/* Subtle light reflections inside the banner */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <h1 className="text-3xl md:text-4xl tracking-tight select-none font-bold text-white flex items-center justify-center gap-2 mb-2">
              <Trees size={32} className="text-indigo-400" />
              <span>Organiza</span>
              <span className="text-indigo-400 bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="text-[10px] md:text-xs font-bold tracking-[0.25em] text-slate-400 uppercase">
              PLATAFORMA INTEGRADA DE GESTÃO E CONTROLE
            </p>
          </div>

          {/* 2. Version Installed Card overlapping */}
          <div className="px-6 pb-8 text-center relative">
            <div className="bg-white px-8 py-5 rounded-2xl border border-gray-100/80 shadow-[0_12px_40px_rgba(0,0,0,0.05)] max-w-[260px] mx-auto -mt-8 relative z-10 text-center flex flex-col items-center justify-center transition-all duration-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
              <span className="text-[10px] tracking-[0.15em] font-bold text-slate-400 uppercase mb-1">
                VERSÃO INSTALADA
              </span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                v{selectedVersion.version_number}
              </h2>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100/60 px-3.5 py-1 rounded-full text-xs font-bold shadow-sm">
                Atualizado: {formatDate(selectedVersion.published_at || selectedVersion.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. "What's new" section & Details */}
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2.5 px-1">
            <span className="flex items-center justify-center text-indigo-600 bg-indigo-50 p-1.5 rounded-xl">
              <Sparkles size={20} className="text-indigo-600 fill-indigo-100" />
            </span>
            O que há de novo na v{selectedVersion.version_number}?
          </h3>

          {/* Styled card box with light indigo borders and soft background */}
          <div className="bg-white/95 border border-indigo-100/40 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            {/* Subtle glow effect on top-right */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-400/5 rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Dynamic bullet items with bold keywords */}
            {renderDescriptionList(selectedVersion.description)}
          </div>
        </div>
      </div>

      {/* Sidebar for History Navigation - matching user's image exactly! */}
      <div className="lg:col-span-3">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.03)] space-y-6">
          {/* Sidebar Header */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100/80">
            <History size={18} className="text-slate-400" />
            <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">
              HISTÓRICO DE VERSÕES
            </h4>
          </div>

          {/* Version Item List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {versions.map((v) => {
              const isSelected = selectedVersion.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVersion(v)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-2 group ${
                    isSelected 
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.04)]' 
                      : 'bg-white border-transparent hover:border-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-base font-bold transition-colors ${
                        isSelected ? 'text-indigo-600' : 'text-slate-950'
                      }`}>
                        v{v.version_number}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                      )}
                    </div>
                    <p className={`text-xs font-semibold ${
                      isSelected ? 'text-indigo-500' : 'text-slate-400'
                    }`}>
                      {formatDate(v.published_at || v.created_at)}
                    </p>
                  </div>
                  <ChevronRight 
                    size={15} 
                    className={`transition-all duration-300 ${
                      isSelected 
                        ? 'text-indigo-600 translate-x-0.5' 
                        : 'text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5'
                    }`} 
                  />
                </button>
              );
            })}
          </div>

          {/* Sincronizado automaticamente indicator */}
          <div className="pt-4 border-t border-slate-100/80 flex items-center gap-2 text-xs font-semibold text-emerald-600 justify-center">
            <ShieldCheck size={14} className="text-emerald-500 fill-emerald-50" />
            Sincronizado automaticamente
          </div>
        </div>
      </div>
    </div>
  );
}
