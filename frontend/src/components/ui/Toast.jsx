import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const ToastContext = createContext(null);
let nextId = 1;

const styles = {
    success: { icon: CheckCircle2, box: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon_color: 'text-emerald-500' },
    error: { icon: XCircle, box: 'border-rose-200 bg-rose-50 text-rose-800', icon_color: 'text-rose-500' },
    info: { icon: Info, box: 'border-sky-200 bg-sky-50 text-sky-800', icon_color: 'text-sky-500' },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (type, message) => {
            const id = nextId++;
            setToasts((prev) => [...prev, { id, type, message }]);
            setTimeout(() => dismiss(id), 4500);
        },
        [dismiss]
    );

    const toast = {
        success: (message) => push('success', message),
        error: (message) => push('error', message),
        info: (message) => push('info', message),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
                {toasts.map((t) => {
                    const style = styles[t.type] || styles.info;
                    const Icon = style.icon;
                    return (
                        <div
                            key={t.id}
                            className={cn(
                                'pe-toast-in flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm',
                                style.box
                            )}
                        >
                            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon_color)} />
                            <p className="flex-1 break-words text-sm font-medium leading-snug">{t.message}</p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}
