import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PdfPreviewModal } from './PdfPreviewModal';

type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
};

type DialogContextType = {
  confirm: (message: string, options?: string | ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
  askOptions: <T>(config: { title: string; message: string; options: { label: string; value: T }[] }) => Promise<T | null>;
  preview: (element: HTMLElement, title: string) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogs, setDialogs] = useState<any[]>([]);

  const confirm = useCallback((message: string, options?: string | ConfirmOptions) => {
    let title = 'Confirmação';
    let confirmText = 'Confirmar';
    let cancelText = 'Cancelar';
    let type = 'warning';

    if (typeof options === 'string') {
      title = options;
    } else if (options) {
      title = options.title || title;
      confirmText = options.confirmText || confirmText;
      cancelText = options.cancelText || cancelText;
      type = options.type || type;
    }

    // Auto-detect danger from message or title
    if (
      message.toLowerCase().includes('excluir') || 
      message.toLowerCase().includes('apagar') ||
      title.toLowerCase().includes('excluir') ||
      title.toLowerCase().includes('apagar')
    ) {
      type = 'danger';
      confirmText = 'Sim, Apagar';
      if (title === 'Confirmação') title = 'Apagar Documento?';
    }

    return new Promise<boolean>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'confirm',
          dialogType: type,
          title,
          message,
          confirmText,
          cancelText,
          resolve,
        },
      ]);
    });
  }, []);

  const alert = useCallback((message: string, title: string = 'Aviso') => {
    return new Promise<void>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'alert',
          title,
          message,
          resolve,
        },
      ]);
    });
  }, []);

  const askOptions = useCallback(<T,>(config: { title: string; message: string; options: { label: string; value: T }[] }) => {
    return new Promise<T | null>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'options',
          title: config.title,
          message: config.message,
          options: config.options,
          resolve,
        },
      ]);
    });
  }, []);

  const preview = useCallback((element: HTMLElement, title: string) => {
    return new Promise<boolean>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'preview',
          element,
          title,
          resolve,
        },
      ]);
    });
  }, []);

  const handleClose = (id: string, result: any) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id);
      if (dialog) dialog.resolve(result);
      return prev.filter((d) => d.id !== id);
    });
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, askOptions, preview }}>
      {children}
      <AnimatePresence>
        {dialogs.map((dialog) => (
            dialog.type === 'preview' ? (
                <PdfPreviewModal
                    key={dialog.id}
                    element={dialog.element}
                    title={dialog.title}
                    onClose={(confirmed) => handleClose(dialog.id, confirmed)}
                />
            ) : (
          <motion.div
            key={dialog.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 overflow-y-auto">
                <div className="flex flex-col items-center text-center gap-4 mb-4">
                  <div className={`p-4 rounded-full ${
                    dialog.type === 'confirm' 
                      ? dialog.dialogType === 'danger' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-amber-100 text-amber-600' 
                      : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {dialog.type === 'confirm' ? (
                      dialog.dialogType === 'danger' ? <AlertTriangle size={32} /> : <AlertCircle size={32} />
                    ) : (
                      <CheckCircle2 size={32} />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{dialog.title}</h3>
                </div>
                <p className="text-gray-600 text-center whitespace-pre-wrap">{dialog.message}</p>
                {dialog.type === 'options' && (
                  <div className="mt-6 flex flex-col gap-3">
                    {dialog.options.map((opt: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleClose(dialog.id, opt.value)}
                        className="w-full px-4 py-3 text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-center gap-3">
                {(dialog.type === 'confirm' || dialog.type === 'options') && (
                  <button
                    onClick={() => handleClose(dialog.id, dialog.type === 'options' ? null : false)}
                    className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {dialog.type === 'options' ? 'Cancelar' : (dialog.cancelText || 'Cancelar')}
                  </button>
                )}
                {dialog.type !== 'options' && (
                  <button
                    onClick={() => handleClose(dialog.id, dialog.type === 'confirm' ? true : undefined)}
                    className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-colors ${
                      dialog.type === 'confirm' 
                        ? dialog.dialogType === 'danger'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-amber-600 hover:bg-amber-700' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {dialog.type === 'confirm' ? (dialog.confirmText || 'Confirmar') : 'OK'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
          )
        ))}
      </AnimatePresence>
    </DialogContext.Provider>
  );
};
