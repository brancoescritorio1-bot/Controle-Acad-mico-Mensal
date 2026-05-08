const fs = require('fs');
const file = 'src/components/DialogContext.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('askOptions')) {
  code = code.replace(
    /type DialogContextType = \{/,
    `type DialogContextType = {\n  askOptions: <T>(config: { title: string; message: string; options: { label: string; value: T }[] }) => Promise<T | null>;`
  );

  code = code.replace(
    /const alert = useCallback/,
    `const askOptions = useCallback(<T,>(config: { title: string; message: string; options: { label: string; value: T }[] }) => {
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
  }, []);\n\n  const alert = useCallback`
  );

  code = code.replace(
    /<DialogContext.Provider value=\{\{ confirm, alert \}\}>/,
    `<DialogContext.Provider value={{ confirm, alert, askOptions }}>`
  );

  code = code.replace(
    /\{dialog.type === 'confirm' \? \(/,
    `{dialog.type === 'options' ? null : dialog.type === 'confirm' ? (`
  );

  code = code.replace(
    /<p className="text-gray-600 text-center whitespace-pre-wrap">\{dialog.message\}<\/p>\s*<\/div>\s*<div className="px-6 py-4 bg-gray-50 flex justify-center gap-3">/,
    `<p className="text-gray-600 text-center whitespace-pre-wrap">{dialog.message}</p>
                {dialog.type === 'options' && (
                  <div className="mt-6 flex gap-3">
                    {dialog.options.map((opt: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleClose(dialog.id, opt.value)}
                        className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-center gap-3">`
  );

  code = code.replace(
    /\{dialog.type === 'confirm' && \(/,
    `{(dialog.type === 'confirm' || dialog.type === 'options') && (`
  );

  code = code.replace(
    /dialog.cancelText \|\| 'Cancelar'/,
    `dialog.type === 'options' ? 'Cancelar' : (dialog.cancelText || 'Cancelar')`
  );
  
  code = code.replace(
    /onClick=\{\(\) => handleClose\(dialog.id, dialog.type === 'confirm' \? true : undefined\)\}\n\s*className=\{\`px-6 py-2.5/,
    `onClick={() => handleClose(dialog.id, dialog.type === 'confirm' ? true : undefined)}
                  style={{ display: dialog.type === 'options' ? 'none' : 'block' }}
                  className={\`px-6 py-2.5`
  );

  fs.writeFileSync(file, code);
  console.log('DialogContext patched successfully');
}
