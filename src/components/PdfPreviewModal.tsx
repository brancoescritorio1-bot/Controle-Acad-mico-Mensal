import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

interface PdfPreviewModalProps {
  element: HTMLElement;
  title: string;
  onClose: (confirmed: boolean) => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ element, title, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && element) {
      const clone = element.cloneNode(true) as HTMLElement;
      // Ensure the clone is visible and not restricted by styles
      clone.classList.add('report-view');
      clone.style.position = 'static';
      clone.style.overflow = 'visible';
      clone.style.maxHeight = 'none';
      clone.style.height = 'auto';
      clone.style.width = '100%'; 
      clone.style.padding = '0'; // Use app's internal padding
      clone.style.backgroundColor = 'transparent';
      clone.style.margin = '0';
      
      // Remove interactive elements from preview if they weren't removed
      clone.querySelectorAll('button, .action-exclude, .no-export, .print\\:hidden, [aria-hidden="true"]').forEach((el: any) => {
        el.style.display = 'none';
      });

      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(clone);
    }
  }, [element]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-100 w-full max-w-6xl max-h-[80vh] rounded-2xl md:rounded-3xl shadow-2xl overflow-y-auto relative flex flex-col"
      >
        {/* Header matching screenshot */}
        <div className="bg-slate-900 text-white px-4 md:px-6 py-4 flex items-center justify-between shadow-lg z-20 sticky top-0 shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => onClose(false)} 
              className="p-2 hover:bg-slate-800 rounded-full transition-colors shrink-0"
            >
              <X size={24} />
            </button>
            <div className="min-w-0">
              <h3 className="font-bold text-sm md:text-lg leading-none truncate">Visualização</h3>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold hidden sm:block">Documento Pronto para PDF</p>
            </div>
          </div>
          
          <button 
            onClick={() => onClose(true)} 
            className="bg-[#f59e0b] hover:bg-[#d97706] text-slate-900 px-4 md:px-6 py-2.5 rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
          >
            <Download size={18} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">Confirmar e Salvar</span>
            <span className="sm:hidden">Salvar PDF</span>
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 p-4 md:p-8 flex flex-col items-center bg-slate-200/50">
          <div 
            className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] w-full max-w-[210mm] min-h-[297mm] h-fit p-[10mm] md:p-[15mm] relative origin-top transition-transform" 
            ref={containerRef}
            style={{ 
              transform: 'scale(1)',
              maxWidth: '100%',
              margin: '0 auto'
            }}
          >
            {/* Content will be injected here */}
          </div>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] py-8">
            — Fim da Visualização —
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
