import { useEffect, useState } from 'react';
import { ArrowRight, Download, FileCheck2, Columns3, Rows3, PencilLine } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import { Field, Input } from './ui/Input.jsx';
import { cn } from '../lib/cn';

function defaultOutput(sourcePath) {
    if (!sourcePath) return '';
    if (sourcePath.startsWith('s3://')) return sourcePath.replace(/\.parquet$/i, '_edited.parquet');
    const name = (sourcePath.split('/').pop() || 'file').replace(/\.parquet$/i, '');
    return `/tmp/${name}_edited.parquet`;
}

const Value = ({ children }) =>
    children === null || children === undefined || children === '' ? (
        <span className="italic text-slate-300">empty</span>
    ) : (
        <span className="break-all">{String(children)}</span>
    );

function Stat({ icon: Icon, count, label, tone }) {
    return (
        <div className={cn('flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5', tone)}>
            <Icon className="h-5 w-5" />
            <div className="leading-tight">
                <div className="text-lg font-semibold">{count}</div>
                <div className="text-xs opacity-80">{label}</div>
            </div>
        </div>
    );
}

export default function EditFile({ open, onClose, editor, onSave, saving }) {
    const { edits, removedRows, removedColumns, selectedFile } = editor;
    const [outputPath, setOutputPath] = useState('');

    useEffect(() => {
        if (open) setOutputPath(defaultOutput(selectedFile));
    }, [open, selectedFile]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Review changes"
            subtitle="Your source file is never modified — a new Parquet file is written."
            size="xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        icon={FileCheck2}
                        loading={saving}
                        disabled={!outputPath.trim()}
                        onClick={() => onSave(outputPath.trim())}
                    >
                        Create edited Parquet
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-3 gap-3">
                    <Stat
                        icon={PencilLine}
                        count={edits.length}
                        label="cells edited"
                        tone="border-amber-200 bg-amber-50 text-amber-700"
                    />
                    <Stat
                        icon={Rows3}
                        count={removedRows.length}
                        label="rows removed"
                        tone="border-rose-200 bg-rose-50 text-rose-700"
                    />
                    <Stat
                        icon={Columns3}
                        count={removedColumns.length}
                        label="columns removed"
                        tone="border-sky-200 bg-sky-50 text-sky-700"
                    />
                </div>

                {edits.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Edited cells</h3>
                        <div className="pe-scroll max-h-64 overflow-auto rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">Row</th>
                                        <th className="px-3 py-2 font-semibold">Column</th>
                                        <th className="px-3 py-2 font-semibold">Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {edits.map((e, i) => (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="px-3 py-2 tabular-nums text-slate-500">{e.rowId}</td>
                                            <td className="px-3 py-2 font-medium text-slate-700">{e.field}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Value>{e.oldValue}</Value>
                                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                                    <span className="font-medium text-emerald-600">
                                                        <Value>{e.newValue}</Value>
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {removedColumns.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Removed columns</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {removedColumns.map((c) => (
                                <span
                                    key={c}
                                    className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                                >
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {removedRows.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Removed rows</h3>
                        <p className="text-sm text-slate-500">
                            Row {removedRows.length > 30 ? `count: ${removedRows.length}` : `#: ${removedRows.join(', ')}`}
                        </p>
                    </div>
                )}

                <Field label="Output file path" hint="Write to an s3:// path or a local file path. The file is created, not overwritten in place.">
                    <div className="flex gap-2">
                        <Input
                            value={outputPath}
                            onChange={(e) => setOutputPath(e.target.value)}
                            placeholder="s3://bucket/path/file.parquet  or  /tmp/file.parquet"
                        />
                        <Button
                            variant="secondary"
                            icon={Download}
                            onClick={() => setOutputPath(defaultOutput(selectedFile))}
                            title="Use suggested path"
                        >
                            Suggest
                        </Button>
                    </div>
                </Field>
            </div>
        </Modal>
    );
}
