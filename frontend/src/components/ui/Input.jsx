import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            className={cn(
                'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800',
                'shadow-sm transition-colors placeholder:text-slate-400',
                'focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30',
                'disabled:bg-slate-50 disabled:text-slate-400',
                className
            )}
            {...props}
        />
    );
});

export function Field({ label, hint, htmlFor, children, className }) {
    return (
        <div className={className}>
            {label && (
                <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}
            {children}
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}
