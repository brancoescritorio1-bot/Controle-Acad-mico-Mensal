import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
};

type DialogContextType = {
  confirm: (message: string, options?: string | ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
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

  const handleClose = (id: string, result: boolean | void) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id);
      if (dialog) dialog.resolve(result);
      return prev.filter((d) => d.id !== id);
    });
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <AnimatePresence>
        {dialogs.map((dialog) => (
          <motion.div
            key={dialog.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
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
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-center gap-3">
                {dialog.type === 'confirm' && (
                  <button
                    onClick={() => handleClose(dialog.id, false)}
                    className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {dialog.cancelText || 'Cancelar'}
                  </button>
                )}
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
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </DialogContext.Provider>
  );
};
