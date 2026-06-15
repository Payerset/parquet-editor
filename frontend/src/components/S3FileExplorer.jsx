import { useCallback, useEffect, useState } from 'react';
import {
    ChevronLeft,
    Database,
    Folder,
    Home,
    RefreshCw,
    Search,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { formatBytes, formatDate } from '../lib/format';
import { cn } from '../lib/cn';
import { useToast } from './ui/Toast.jsx';
import Spinner from './ui/Spinner.jsx';

const leaf = (key) => key.split('/').filter(Boolean).pop() || key;

export default function S3FileExplorer({ onFileSelect }) {
    const toast = useToast();
    const [buckets, setBuckets] = useState([]);
    const [bucket, setBucket] = useState('');
    const [path, setPath] = useState('');
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.listBuckets()
            .then(({ buckets: list, defaultBucket }) => {
                setBuckets(list);
                setBucket(defaultBucket || list[0] || '');
            })
            .catch((e) => toast.error(errorMessage(e, 'Could not list buckets.')));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const list = useCallback(
        async (targetBucket, targetPath) => {
            if (!targetBucket) return;
            setLoading(true);
            try {
                const data = await api.listObjects(targetBucket, targetPath === '/' ? '' : targetPath);
                const folders = data.folders.map((f) => ({ ...f, name: leaf(f.name), type: 'folder' }));
                const files = data.files.map((f) => ({ ...f, name: leaf(f.name), type: 'file' }));
                setContents([...folders, ...files]);
            } catch (e) {
                toast.error(errorMessage(e, 'Could not list this folder.'));
            } finally {
                setLoading(false);
            }
        },
        [toast]
    );

    useEffect(() => {
        if (bucket) list(bucket, path);
    }, [bucket, path, list]);

    const goBack = () => {
        if (!path) return;
        const parent = path.split('/').filter(Boolean).slice(0, -1).join('/');
        setPath(parent ? `${parent}/` : '');
    };

    const open = (item) => {
        if (item.type === 'folder') {
            setPath(`${path}${item.name}/`.replace(/\/{2,}/g, '/'));
        } else if (item.name.toLowerCase().endsWith('.parquet')) {
            onFileSelect(`s3://${bucket}/${path}${item.name}`);
        }
    };

    const crumbs = path.split('/').filter(Boolean);
    const filtered = contents.filter((item) => {
        if (item.type === 'folder') return item.name.toLowerCase().includes(search.toLowerCase());
        return (
            item.name.toLowerCase().endsWith('.parquet') &&
            item.name.toLowerCase().includes(search.toLowerCase())
        );
    });

    return (
        <div className="flex flex-col gap-3">
            {/* Bucket + controls */}
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={bucket}
                    onChange={(e) => {
                        setBucket(e.target.value);
                        setPath('');
                    }}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                    {buckets.length === 0 && <option value="">No buckets</option>}
                    {buckets.map((b) => (
                        <option key={b} value={b}>
                            {b}
                        </option>
                    ))}
                </select>
                <button
                    onClick={goBack}
                    disabled={!path}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
                    title="Back"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={() => list(bucket, path)}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
                    title="Refresh"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </button>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search this folder…"
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
                <button
                    onClick={() => setPath('')}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-700"
                >
                    <Home className="h-3.5 w-3.5" />
                    {bucket || 'root'}
                </button>
                {crumbs.map((part, i) => (
                    <span key={i} className="flex items-center gap-1">
                        <span className="text-slate-300">/</span>
                        <button
                            onClick={() => setPath(`${crumbs.slice(0, i + 1).join('/')}/`)}
                            className="rounded px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-700"
                        >
                            {decodeURIComponent(part)}
                        </button>
                    </span>
                ))}
            </div>

            {/* Listing */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className="flex-1">Name</span>
                    <span className="w-24 text-right">Size</span>
                    <span className="hidden w-44 text-right sm:block">Modified</span>
                </div>
                <div className="pe-scroll max-h-[48vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                            <Spinner /> Loading…
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center text-sm text-slate-400">
                            This folder has no sub-folders or .parquet files.
                        </div>
                    ) : (
                        filtered.map((item) => {
                            const isFolder = item.type === 'folder';
                            return (
                                <button
                                    key={`${item.type}-${item.name}`}
                                    onClick={() => open(item)}
                                    className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition hover:bg-sky-50/60"
                                >
                                    {isFolder ? (
                                        <Folder className="h-5 w-5 shrink-0 text-sky-500" />
                                    ) : (
                                        <Database className="h-5 w-5 shrink-0 text-slate-400" />
                                    )}
                                    <span
                                        className={cn(
                                            'flex-1 truncate text-sm',
                                            isFolder ? 'font-medium text-slate-800' : 'text-slate-600'
                                        )}
                                    >
                                        {item.name}
                                    </span>
                                    <span className="w-24 text-right text-xs text-slate-400">
                                        {isFolder ? '—' : formatBytes(item.size)}
                                    </span>
                                    <span className="hidden w-44 text-right text-xs text-slate-400 sm:block">
                                        {isFolder ? '—' : formatDate(item.lastModified)}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
            <p className="text-xs text-slate-400">
                Click a folder to open it, or a <span className="font-medium">.parquet</span> file to load it.
            </p>
        </div>
    );
}
