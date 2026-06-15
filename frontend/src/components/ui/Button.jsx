import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const variants = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500 shadow-sm',
    secondary:
        'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-sky-500 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-sm',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm',
};

const sizes = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    icon: 'h-9 w-9',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    icon: Icon,
    loading = false,
    disabled = false,
    className,
    children,
    ...props
}) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={loading || disabled}
            {...props}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : Icon ? (
                <Icon className="h-4 w-4" />
            ) : null}
            {children}
        </button>
    );
}
