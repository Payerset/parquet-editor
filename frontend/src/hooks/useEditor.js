import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Central editor state. The displayed rows/columns are DERIVED from the raw
// server data (`base*`) plus pending edits and removals. Because edits live in a
// separate diff, re-querying the file (search/filter, which hits the server) can
// swap the visible rows without losing pending changes — they re-overlay onto
// whatever rows come back, and unseen edits still apply on save.
export function useEditor() {
    const [selectedFile, setSelectedFile] = useState('');
    const [baseRows, setBaseRows] = useState([]);
    const [baseColumns, setBaseColumns] = useState([]);
    const [totalRows, setTotalRows] = useState(0); // full file row count
    const [matchedRows, setMatchedRows] = useState(0); // rows matching the active filter (= total if none)
    const [truncated, setTruncated] = useState(false);
    const [edits, setEdits] = useState([]); // { rowId, field, oldValue, newValue }
    const [removedColumns, setRemovedColumns] = useState([]);
    const [removedRows, setRemovedRows] = useState([]);
    const [query, setQuery] = useState({ search: '', filters: {} }); // active search/filter

    // Read current base rows inside callbacks without stale closures.
    const baseRowsRef = useRef(baseRows);
    useEffect(() => {
        baseRowsRef.current = baseRows;
    }, [baseRows]);

    // Open a file fresh: replace everything and clear pending changes.
    const openFile = useCallback((data) => {
        setBaseRows(data.rows);
        setBaseColumns(data.columns);
        setTotalRows(data.totalRows);
        setMatchedRows(data.matchedRows ?? data.totalRows);
        setTruncated(Boolean(data.truncated));
        setEdits([]);
        setRemovedColumns([]);
        setRemovedRows([]);
        setQuery({ search: '', filters: {} });
    }, []);

    // Re-query the same file (search/filter): swap visible rows, keep edits/removals.
    const applyQueryResult = useCallback((data) => {
        setBaseRows(data.rows);
        setBaseColumns(data.columns);
        setMatchedRows(data.matchedRows ?? data.totalRows);
        setTruncated(Boolean(data.truncated));
    }, []);

    const editCell = useCallback((rowId, field, newValue) => {
        setEdits((prev) => {
            const existing = prev.find((e) => e.rowId === rowId && e.field === field);
            if (existing) {
                return prev.map((e) => (e === existing ? { ...e, newValue } : e));
            }
            const base = baseRowsRef.current.find((r) => r.pe_identif === rowId);
            const oldValue = base ? base[field] : null;
            return [...prev, { rowId, field, oldValue, newValue }];
        });
    }, []);

    const removeColumn = useCallback((col) => {
        setRemovedColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
        setEdits((prev) => prev.filter((e) => e.field !== col));
    }, []);

    const removeRow = useCallback((rowId) => {
        setRemovedRows((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
        setEdits((prev) => prev.filter((e) => e.rowId !== rowId));
    }, []);

    // Derived view: columns minus removed.
    const columns = useMemo(
        () => baseColumns.filter((c) => !removedColumns.includes(c)),
        [baseColumns, removedColumns]
    );

    // Derived view: rows minus removed, with edited values overlaid.
    const removedRowSet = useMemo(() => new Set(removedRows), [removedRows]);
    const editsByRow = useMemo(() => {
        const map = new Map();
        for (const e of edits) {
            if (!map.has(e.rowId)) map.set(e.rowId, {});
            map.get(e.rowId)[e.field] = e.newValue;
        }
        return map;
    }, [edits]);

    const rows = useMemo(() => {
        if (editsByRow.size === 0 && removedRowSet.size === 0) return baseRows;
        return baseRows
            .filter((r) => !removedRowSet.has(r.pe_identif))
            .map((r) => {
                const rowEdits = editsByRow.get(r.pe_identif);
                return rowEdits ? { ...r, ...rowEdits } : r;
            });
    }, [baseRows, editsByRow, removedRowSet]);

    const editedCells = useMemo(
        () => new Set(edits.map((e) => `${e.rowId}:${e.field}`)),
        [edits]
    );

    const hasChanges = edits.length > 0 || removedColumns.length > 0 || removedRows.length > 0;
    const isOpen = baseColumns.length > 0;

    return {
        selectedFile,
        setSelectedFile,
        rows,
        columns,
        totalRows,
        matchedRows,
        truncated,
        edits,
        removedColumns,
        removedRows,
        editedCells,
        hasChanges,
        isOpen,
        query,
        setQuery,
        openFile,
        applyQueryResult,
        editCell,
        removeColumn,
        removeRow,
    };
}
