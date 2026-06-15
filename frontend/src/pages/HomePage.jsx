import { useEffect, useRef, useState } from 'react';
import {
    ClipboardCheck,
    Cloud,
    FileUp,
    HardDrive,
    Info,
    Play,
    Table2,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { formatNumber } from '../lib/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import DataGrid from '../components/DataGrid.jsx';
import S3FileExplorer from '../components/S3FileExplorer.jsx';
import EditFile from '../components/EditFile.jsx';

const PREVIEW_LIMIT = 10000;

export default function HomePage({ editor }) {
    const toast = useToast();
    const [localPath, setLocalPath] = useState('');
    const [loadEntireFile, setLoadEntireFile] = useState(false);
    const [loading, setLoading] = useState(false);
    const [querying, setQuerying] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showExplorer, setShowExplorer] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [loadCount, setLoadCount] = useState(0);

    const { selectedFile, setSelectedFile, rows, columns, totalRows, matchedRows, hasChanges, query } =
        editor;
    const isS3 = selectedFile.startsWith('s3://');
    const isFiltered =
        query.search.trim() !== '' || Object.values(query.filters).some((v) => v && v.trim());

    const debouncedQuery = useDebouncedValue(query, 300);
    const appliedQueryRef = useRef(JSON.stringify(query));
    const queryIdRef = useRef(0);

    const handleLoad = async () => {
        if (!selectedFile) {
            toast.error('Choose a file first.');
            return;
        }
        setLoading(true);
        try {
            // A fresh load always opens the file unfiltered.
            const data = await api.loadParquet({
                path: selectedFile,
                limit: loadEntireFile ? null : PREVIEW_LIMIT,
                search: '',
                filters: {},
            });
            editor.openFile(data);
            appliedQueryRef.current = JSON.stringify({ search: '', filters: {} });
            setLoadCount((c) => c + 1);
            if (data.truncated) {
                toast.info(
                    `Loaded ${formatNumber(data.rows.length)} of ${formatNumber(data.totalRows)} rows — search & filters scan the whole file.`
                );
            } else {
                toast.success(`Loaded ${formatNumber(data.rows.length)} rows.`);
            }
        } catch (e) {
            toast.error(errorMessage(e, 'Failed to load the file.'));
        } finally {
            setLoading(false);
        }
    };

    // Search/filter runs server-side over the whole file. Refetch when the
    // debounced query changes; the latest request wins.
    useEffect(() => {
        if (!editor.isOpen) return;
        const qKey = JSON.stringify(debouncedQuery);
        if (qKey === appliedQueryRef.current) return;
        appliedQueryRef.current = qKey;
        const id = ++queryIdRef.current;
        setQuerying(true);
        api.loadParquet({
            path: selectedFile,
            limit: null,
            search: debouncedQuery.search,
            filters: debouncedQuery.filters,
        })
            .then((data) => {
                if (id === queryIdRef.current) editor.applyQueryResult(data);
            })
            .catch((e) => {
                if (id === queryIdRef.current) toast.error(errorMessage(e, 'Filter failed.'));
            })
            .finally(() => {
                if (id === queryIdRef.current) setQuerying(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery]);

    const handleSave = async (outputPath) => {
        setSaving(true);
        try {
            await api.saveParquet({
                sourcePath: selectedFile,
                outputPath,
                edits: editor.edits.map(({ rowId, field, newValue }) => ({ rowId, field, newValue })),
                removedColumns: editor.removedColumns,
                removedRows: editor.removedRows,
            });
            toast.success(`Saved edited file to ${outputPath}`);
            setShowReview(false);
        } catch (e) {
            toast.error(errorMessage(e, 'Failed to create the edited file.'));
        } finally {
            setSaving(false);
        }
    };

    const changeCount =
        editor.edits.length + editor.removedRows.length + editor.removedColumns.length;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parquet Editor</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Open a Parquet file from S3 or local disk, edit it in the table, and write the result
                    to a new file.
                </p>
            </div>

            {/* Source picker */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                            Local file path
                        </span>
                        <div className="flex gap-2">
                            <Input
                                value={localPath}
                                onChange={(e) => setLocalPath(e.target.value)}
                                placeholder="/path/to/file.parquet"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && localPath) setSelectedFile(localPath);
                                }}
                            />
                            <Button
                                variant="secondary"
                                icon={FileUp}
                                disabled={!localPath}
                                onClick={() => setSelectedFile(localPath)}
                            >
                                Use
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:pb-0">
                        <span className="hidden text-sm text-slate-400 sm:block">or</span>
                        <Button icon={Cloud} onClick={() => setShowExplorer(true)}>
                            Browse S3
                        </Button>
                    </div>
                </div>

                {selectedFile && (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3">
                        {isS3 ? (
                            <Cloud className="h-5 w-5 shrink-0 text-sky-500" />
                        ) : (
                            <HardDrive className="h-5 w-5 shrink-0 text-sky-500" />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium uppercase tracking-wide text-sky-600">
                                {isS3 ? 'S3 file' : 'Local file'}
                            </div>
                            <div className="truncate font-mono text-sm text-slate-700" title={selectedFile}>
                                {selectedFile}
                            </div>
                        </div>
                    </div>
                )}

                {selectedFile && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={loadEntireFile}
                                onChange={(e) => setLoadEntireFile(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500/40"
                            />
                            Load entire file
                            <span className="text-slate-400">
                                (otherwise first {formatNumber(PREVIEW_LIMIT)} rows)
                            </span>
                        </label>
                        <div className="ml-auto flex items-center gap-3">
                            <Button icon={Play} loading={loading} onClick={handleLoad}>
                                Load data
                            </Button>
                            <Button
                                variant="warning"
                                icon={ClipboardCheck}
                                disabled={!hasChanges}
                                onClick={() => setShowReview(true)}
                            >
                                Review changes
                                {changeCount > 0 && (
                                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-semibold">
                                        {changeCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Data grid or empty state */}
            {editor.isOpen ? (
                <div className="flex flex-col gap-4">
                    {editor.truncated && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                            {isFiltered ? (
                                <div>
                                    Showing the first{' '}
                                    <span className="font-semibold">{formatNumber(rows.length)}</span> of{' '}
                                    <span className="font-semibold">{formatNumber(matchedRows)}</span> matching
                                    rows. Refine your filters to narrow the results further.
                                </div>
                            ) : (
                                <div>
                                    Showing the first{' '}
                                    <span className="font-semibold">{formatNumber(rows.length)}</span> of{' '}
                                    <span className="font-semibold">{formatNumber(totalRows)}</span> rows — this
                                    file is too large to load fully. Use search &amp; filters above (they scan
                                    the whole file) to reach any row; saving rewrites the entire file and keeps
                                    the rows you didn't load.
                                </div>
                            )}
                        </div>
                    )}
                    <DataGrid
                        key={`grid-${loadCount}`}
                        rows={rows}
                        columns={columns}
                        editedCells={editor.editedCells}
                        onEditCell={editor.editCell}
                        onRemoveColumn={editor.removeColumn}
                        onRemoveRow={editor.removeRow}
                        totalRows={totalRows}
                        matchedRows={matchedRows}
                        truncated={editor.truncated}
                        query={query}
                        onQueryChange={editor.setQuery}
                        loading={querying}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
                    <div className="mb-4 rounded-full bg-sky-50 p-4">
                        <Table2 className="h-8 w-8 text-sky-500" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-700">No data loaded yet</h3>
                    <p className="mt-1 max-w-sm text-sm text-slate-500">
                        {selectedFile
                            ? 'Click “Load data” above to read this file into the editor.'
                            : 'Choose a local file or browse S3 to get started.'}
                    </p>
                    {!selectedFile && (
                        <Button className="mt-5" icon={Cloud} onClick={() => setShowExplorer(true)}>
                            Browse S3
                        </Button>
                    )}
                </div>
            )}

            {/* S3 explorer modal */}
            <Modal
                open={showExplorer}
                onClose={() => setShowExplorer(false)}
                title="Browse S3"
                subtitle="Pick a .parquet file to load"
                size="xl"
            >
                <S3FileExplorer
                    onFileSelect={(filePath) => {
                        setSelectedFile(filePath);
                        setShowExplorer(false);
                        toast.info('File selected. Click “Load data” to open it.');
                    }}
                />
            </Modal>

            {/* Review changes modal */}
            <EditFile
                open={showReview}
                onClose={() => setShowReview(false)}
                editor={editor}
                onSave={handleSave}
                saving={saving}
            />
        </div>
    );
}
