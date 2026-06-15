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
      clone.style.position = 'static';
      clone.style.overflow = 'visible';
      clone.style.maxHeight = 'none';
      clone.style.height = 'auto';
      
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(clone);
    }
  }, [element]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg">{title} (Prévia)</h3>
          <button onClick={() => onClose(false)} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center">
            <div className="bg-white p-4 shadow-lg min-h-[500px]" ref={containerRef}>
                {/* Content will be injected here */}
            </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={() => onClose(false)} className="px-4 py-2 font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => onClose(true)} className="px-4 py-2 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2">
            <Download size={18} />
            Gerar PDF
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
