import { Link, useLocation } from 'react-router-dom';
import { Settings, Table2 } from 'lucide-react';
import { cn } from '../lib/cn';

const links = [
    { to: '/', label: 'Editor', icon: Table2 },
    { to: '/config', label: 'Settings', icon: Settings },
];

export default function Navbar() {
    const { pathname } = useLocation();

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-16 w-[90%] items-center justify-between">
                <Link to="/" className="flex items-center gap-2.5">
                    <img src="/logo192.png" alt="" className="h-8 w-8" />
                    <span className="text-lg font-bold tracking-tight text-slate-900">
                        Parquet<span className="text-sky-600">Editor</span>
                    </span>
                </Link>
                <nav className="flex items-center gap-1">
                    {links.map(({ to, label, icon: Icon }) => {
                        const active = pathname === to;
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-sky-50 text-sky-700'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
