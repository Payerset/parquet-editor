import { useEffect, useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Filter,
    Loader2,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatNumber } from '../lib/format';

const PAGE_SIZES = [10, 25, 50, 100];

function compareValues(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    const na = Number(a);
    const nb = Number(b);
    if (a !== '' && b !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
}

// `query` ({ search, filters }) is controlled by the parent, which runs the
// search/filter on the server (scanning the whole file). The grid only sorts and
// paginates the rows it's handed — sort/pagination are client-side over the
// returned set.
export default function DataGrid({
    rows,
    columns,
    editedCells,
    onEditCell,
    onRemoveColumn,
    onRemoveRow,
    totalRows,
    matchedRows,
    truncated,
    query,
    onQueryChange,
    loading,
}) {
    const [showFilters, setShowFilters] = useState(false);
    const [sort, setSort] = useState({ field: null, dir: null });
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(0);

    const isFiltered =
        query.search.trim() !== '' || Object.values(query.filters).some((v) => v && v.trim());
    const activeFilterCount = Object.values(query.filters).filter((v) => v && v.trim()).length;

    // New server result ⇒ back to the first page.
    useEffect(() => setPage(0), [query, pageSize, rows]);

    const sorted = useMemo(() => {
        if (!sort.field || !sort.dir) return rows;
        const copy = [...rows];
        copy.sort((a, b) => {
            const res = compareValues(a[sort.field], b[sort.field]);
            return sort.dir === 'asc' ? res : -res;
        });
        return copy;
    }, [rows, sort]);

    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, pageCount - 1);
    const start = safePage * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    const toggleSort = (field) =>
        setSort((prev) => {
            if (prev.field !== field) return { field, dir: 'asc' };
            if (prev.dir === 'asc') return { field, dir: 'desc' };
            return { field: null, dir: null };
        });

    const setSearch = (search) => onQueryChange({ ...query, search });
    const setFilter = (col, value) =>
        onQueryChange({ ...query, filters: { ...query.filters, [col]: value } });
    const clearAll = () => onQueryChange({ search: '', filters: {} });

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-64 max-w-full">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query.search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search whole file…"
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters((s) => !s)}
                        className={cn(
                            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors',
                            showFilters || activeFilterCount > 0
                                ? 'border-sky-300 bg-sky-50 text-sky-700'
                                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        )}
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-xs font-semibold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    {isFiltered && (
                        <button
                            onClick={clearAll}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X className="h-4 w-4" />
                            Clear
                        </button>
                    )}
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-sky-500" />}
                </div>
                <div className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                        {formatNumber(isFiltered ? matchedRows : totalRows)}
                    </span>{' '}
                    {isFiltered ? 'matched' : 'rows'}
                    {truncated && (
                        <span className="ml-1 text-slate-400">· showing {formatNumber(rows.length)}</span>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="relative">
                {loading && (
                    <div className="pe-fade-in absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                        <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                    </div>
                )}
                <div className="pe-scroll max-h-[64vh] overflow-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                            <tr>
                                {columns.map((col) => {
                                    const active = sort.field === col;
                                    const SortIcon = !active
                                        ? ChevronsUpDown
                                        : sort.dir === 'asc'
                                          ? ArrowUp
                                          : ArrowDown;
                                    return (
                                        <th
                                            key={col}
                                            className="group border-b border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-600"
                                        >
                                            <div className="flex min-w-[140px] items-center justify-between gap-2">
                                                <button
                                                    onClick={() => toggleSort(col)}
                                                    className="flex items-center gap-1.5 truncate hover:text-slate-900"
                                                    title={`Sort by ${col}`}
                                                >
                                                    <span className="truncate">{col}</span>
                                                    <SortIcon
                                                        className={cn(
                                                            'h-3.5 w-3.5 shrink-0',
                                                            active ? 'text-sky-600' : 'text-slate-400'
                                                        )}
                                                    />
                                                </button>
                                                <button
                                                    onClick={() => onRemoveColumn(col)}
                                                    className="shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                                                    title={`Remove column "${col}"`}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </th>
                                    );
                                })}
                                <th className="sticky right-0 border-b border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-right font-semibold text-slate-600">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                            {showFilters && (
                                <tr>
                                    {columns.map((col) => (
                                        <th key={col} className="border-b border-slate-200 px-2 pb-2 pt-0">
                                            <div className="relative min-w-[140px]">
                                                <input
                                                    value={query.filters[col] ?? ''}
                                                    onChange={(e) => setFilter(col, e.target.value)}
                                                    placeholder={`Filter ${col}…`}
                                                    className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 pr-6 text-xs font-normal text-slate-700 placeholder:text-slate-300 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                />
                                                {query.filters[col] && (
                                                    <button
                                                        onClick={() => setFilter(col, '')}
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-300 hover:text-slate-500"
                                                        title="Clear filter"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="sticky right-0 border-b border-slate-200 bg-slate-50" />
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {pageRows.map((row) => (
                                <tr key={row.pe_identif} className="group/row hover:bg-sky-50/40">
                                    {columns.map((col) => {
                                        const edited = editedCells.has(`${row.pe_identif}:${col}`);
                                        return (
                                            <td
                                                key={col}
                                                className="border-b border-slate-100 px-1.5 py-1 align-top"
                                            >
                                                <input
                                                    value={row[col] ?? ''}
                                                    onChange={(e) =>
                                                        onEditCell(row.pe_identif, col, e.target.value)
                                                    }
                                                    className={cn(
                                                        'w-full min-w-[140px] rounded-md border border-transparent bg-transparent px-2 py-1 text-slate-700 outline-none transition',
                                                        'hover:border-slate-200 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20',
                                                        edited && 'border-amber-200 bg-amber-50 text-amber-900'
                                                    )}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="sticky right-0 border-b border-l border-slate-100 bg-white px-3 py-1 text-right group-hover/row:bg-sky-50/40">
                                        <button
                                            onClick={() => onRemoveRow(row.pe_identif)}
                                            className="rounded-md p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                                            title="Remove row"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {pageRows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={columns.length + 1}
                                        className="px-3 py-12 text-center text-sm text-slate-400"
                                    >
                                        {isFiltered
                                            ? 'No rows match your search or filters.'
                                            : 'No rows to show.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    >
                        {PAGE_SIZES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-4">
                    <span className="tabular-nums">
                        {sorted.length === 0
                            ? '0'
                            : `${formatNumber(start + 1)}–${formatNumber(Math.min(start + pageSize, sorted.length))}`}{' '}
                        of {formatNumber(sorted.length)}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={safePage === 0}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="tabular-nums">
                            {safePage + 1} / {pageCount}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                            disabled={safePage >= pageCount - 1}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
