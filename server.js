const express = require('express');
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, ListBucketsCommand } = require('@aws-sdk/client-s3');
const { DuckDBInstance } = require('@duckdb/node-api');

const app = express();
app.use(express.json({ limit: '50mb' }));

// DuckDB returns BIGINT/HUGEINT as BigInt; make them JSON-serializable.
BigInt.prototype.toJSON = function () {
    return this.toString();
};

const PORT = process.env.PORT || 5001;
const CLIENT_DIR = path.join(__dirname, 'frontend', 'dist');
const configPath = path.join(__dirname, 'config.json');

// A browser table can't hold an unbounded file. These caps bound how much we
// read into memory and serialize, so a multi-million-row file degrades to a
// large preview instead of crashing. Override via env if you have the headroom.
const MAX_LOAD_ROWS = Number(process.env.PARQUET_EDITOR_MAX_ROWS) || 100000;
const MAX_PAYLOAD_BYTES = Number(process.env.PARQUET_EDITOR_MAX_BYTES) || 120_000_000;

const DEFAULT_CONFIG = { accessKey: '', secretKey: '', region: 'us-east-1', bucket: '' };

function readConfig() {
    try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

function writeConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

if (!fs.existsSync(configPath)) writeConfig(DEFAULT_CONFIG);

function getS3Client() {
    const cfg = readConfig();
    return new S3Client({
        region: cfg.region,
        credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    });
}

// ----- SQL helpers: quote identifiers and literals so user input can't break queries -----
function quoteIdent(name) {
    return '"' + String(name).replace(/"/g, '""') + '"';
}

function quoteLiteral(value) {
    if (value === null || value === undefined) return 'NULL';
    return "'" + String(value).replace(/'/g, "''") + "'";
}

const isS3Path = (p) => typeof p === 'string' && p.startsWith('s3://');

// Build a WHERE clause for a global search term (matches any column) plus
// per-column "contains" filters. User text is treated as a literal substring:
// %, _ and \ are escaped so they aren't interpreted as LIKE wildcards.
function buildWhere(columnNames, search, filters) {
    const escapeLike = (text) => String(text).replace(/[\\%_]/g, (ch) => '\\' + ch);
    const contains = (col, text) =>
        `CAST(${quoteIdent(col)} AS VARCHAR) ILIKE ${quoteLiteral('%' + escapeLike(text) + '%')} ESCAPE '\\'`;

    const conditions = [];
    const term = String(search || '').trim();
    if (term && columnNames.length) {
        conditions.push('(' + columnNames.map((c) => contains(c, term)).join(' OR ') + ')');
    }
    for (const [col, value] of Object.entries(filters || {})) {
        if (value && String(value).trim() && columnNames.includes(col)) {
            conditions.push(contains(col, String(value).trim()));
        }
    }
    return conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
}

// ----- DuckDB setup -----
let connection;

async function configureS3(conn) {
    const cfg = readConfig();
    await conn.run('INSTALL httpfs');
    await conn.run('LOAD httpfs');
    await conn.run(`
        CREATE OR REPLACE SECRET s3_secret (
            TYPE S3,
            KEY_ID ${quoteLiteral(cfg.accessKey)},
            SECRET ${quoteLiteral(cfg.secretKey)},
            REGION ${quoteLiteral(cfg.region)}
        );
    `);
}

// Only touch the network stack when the path is actually on S3.
async function configureForPath(conn, p) {
    if (isS3Path(p)) await configureS3(conn);
}

// ROW_NUMBER() OVER () has no inherent order, so the numbering must be made
// reproducible: the same row must get the same id on load and on save, otherwise
// edits land on the wrong rows. Single-threaded reads with preserved insertion
// order give a stable, file-order numbering across both queries.
async function ensureDeterministicOrder(conn) {
    await conn.run('SET threads TO 1');
    await conn.run('SET preserve_insertion_order TO true');
}

// ----- API routes -----
const api = express.Router();

api.get('/s3/buckets', async (req, res) => {
    try {
        const cfg = readConfig();
        const response = await getS3Client().send(new ListBucketsCommand({}));
        res.json({
            buckets: (response.Buckets || []).map((b) => b.Name),
            defaultBucket: cfg.bucket,
        });
    } catch (error) {
        console.error('Error listing buckets:', error);
        res.status(500).json({ error: 'Failed to list buckets. Check your S3 credentials.' });
    }
});

api.get('/s3/list', async (req, res) => {
    const cfg = readConfig();
    const prefix = req.query.prefix || '';
    const bucket = req.query.bucket || cfg.bucket;

    if (!bucket) return res.status(400).json({ error: 'No bucket specified.' });

    try {
        const response = await getS3Client().send(
            new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: '/' })
        );
        res.json({
            folders: (response.CommonPrefixes || []).map((f) => ({ name: f.Prefix, type: 'folder' })),
            files: (response.Contents || []).map((f) => ({
                name: f.Key,
                size: f.Size,
                lastModified: f.LastModified,
                type: 'file',
            })),
        });
    } catch (error) {
        console.error('Error listing S3 objects:', error);
        res.status(500).json({ error: 'Failed to list S3 objects.' });
    }
});

api.post('/parquet/load', async (req, res) => {
    const { path: filePath, limit = 10000, offset = 0, search = '', filters = {} } = req.body;
    if (!filePath) return res.status(400).json({ error: 'No file path provided.' });

    try {
        await configureForPath(connection, filePath);

        const source = `read_parquet(${quoteLiteral(filePath)})`;

        // Column names first, so a global search can target every column.
        const describe = await connection.run(`DESCRIBE SELECT * FROM ${source}`);
        const allColumns = (await describe.getRowObjects()).map((r) => String(r.column_name));
        const whereClause = buildWhere(allColumns, search, filters);

        // Counts can use all cores; only the row-numbered data query below must
        // be single-threaded for stable, reproducible row ids.
        await connection.run('RESET threads');

        // count(*) over parquet is metadata-fast; the filtered count needs a scan.
        const totalRows = Number(
            (await (await connection.run(`SELECT count(*) AS n FROM ${source}`)).getRows())[0][0]
        );
        const matchedRows = whereClause
            ? Number(
                  (await (await connection.run(`SELECT count(*) AS n FROM ${source} ${whereClause}`)).getRows())[0][0]
              )
            : totalRows;

        // "Load entire file" / any filter sends limit: null. Always cap how many
        // rows we materialize so a huge result becomes a large preview, not a crash.
        const wantAll = !(typeof limit === 'number' && limit > 0);
        const requested = wantAll ? matchedRows : Math.floor(limit);
        const cappedLimit = Math.max(0, Math.min(requested, MAX_LOAD_ROWS));
        const safeOffset = Math.max(0, Math.floor(offset));

        // Assign the row id over the FULL file BEFORE filtering, so a matched row
        // keeps its true file position. This is what lets you filter to rows past
        // the first page, edit them, and have the edits land correctly on save.
        await ensureDeterministicOrder(connection);
        const result = await connection.run(
            `SELECT * FROM (
                SELECT ROW_NUMBER() OVER () AS pe_identif, * FROM ${source}
            ) ${whereClause}
            LIMIT ${cappedLimit} OFFSET ${safeOffset}`
        );

        // getRowObjectsJson converts DuckDB-native values (DECIMAL, DATE,
        // TIMESTAMP, BIGINT, …) into JSON-friendly primitives so every cell is
        // editable as text instead of rendering as "[object Object]".
        let rows = await result.getRowObjectsJson();
        const columns = result.columnNames().filter((c) => c !== 'pe_identif');

        // Second guard for very wide rows: keep the response under a byte budget
        // so res.json() never trips "RangeError: Invalid string length".
        let bytes = 0;
        let cutoff = rows.length;
        for (let i = 0; i < rows.length; i++) {
            bytes += JSON.stringify(rows[i]).length + 1;
            if (bytes > MAX_PAYLOAD_BYTES) {
                cutoff = i;
                break;
            }
        }
        if (cutoff < rows.length) rows = rows.slice(0, Math.max(1, cutoff));

        res.json({ rows, columns, totalRows, matchedRows, truncated: rows.length < matchedRows });
    } catch (error) {
        console.error('Error loading parquet:', error);
        res.status(500).json({ error: error.message || 'Failed to read parquet file.' });
    }
});

api.post('/parquet/save', async (req, res) => {
    const { sourcePath, outputPath, edits = [], removedColumns = [], removedRows = [] } = req.body;
    if (!sourcePath || !outputPath) {
        return res.status(400).json({ error: 'sourcePath and outputPath are required.' });
    }

    try {
        await configureForPath(connection, sourcePath);
        await configureForPath(connection, outputPath);
        await ensureDeterministicOrder(connection);

        const source = `read_parquet(${quoteLiteral(sourcePath)})`;

        // Original column order + types, so the output schema is preserved and
        // edited values get cast back to their column's real type.
        const describe = await connection.run(`DESCRIBE SELECT * FROM ${source}`);
        const described = await describe.getRowObjects();
        const columnTypes = new Map(described.map((r) => [String(r.column_name), String(r.column_type)]));

        const removed = new Set(removedColumns);
        const editsByField = new Map();
        for (const edit of edits) {
            if (!columnTypes.has(edit.field)) continue;
            if (!editsByField.has(edit.field)) editsByField.set(edit.field, []);
            editsByField.get(edit.field).push(edit);
        }

        const selectParts = [];
        for (const [name, type] of columnTypes) {
            if (removed.has(name)) continue;
            const fieldEdits = editsByField.get(name);
            if (fieldEdits && fieldEdits.length) {
                const whens = fieldEdits
                    .map((e) => {
                        const value = e.newValue === '' ? 'NULL' : `CAST(${quoteLiteral(e.newValue)} AS ${type})`;
                        return `WHEN row_id = ${Number(e.rowId)} THEN ${value}`;
                    })
                    .join(' ');
                selectParts.push(`CASE ${whens} ELSE ${quoteIdent(name)} END AS ${quoteIdent(name)}`);
            } else {
                selectParts.push(quoteIdent(name));
            }
        }

        if (selectParts.length === 0) {
            return res.status(400).json({ error: 'Refusing to write a file with no columns.' });
        }

        const cleanRows = removedRows.map(Number).filter((n) => Number.isFinite(n));
        const whereClause = cleanRows.length ? `row_id NOT IN (${cleanRows.join(', ')})` : 'TRUE';

        const query = `
            COPY (
                WITH cte AS (
                    SELECT *, ROW_NUMBER() OVER () AS row_id FROM ${source}
                )
                SELECT ${selectParts.join(', ')}
                FROM cte
                WHERE ${whereClause}
            ) TO ${quoteLiteral(outputPath)} (FORMAT 'parquet');
        `;

        await connection.run(query);
        res.json({ ok: true, outputPath });
    } catch (error) {
        console.error('Error saving parquet:', error);
        res.status(500).json({ error: error.message || 'Failed to create the edited file.' });
    }
});

api.get('/config', (req, res) => {
    res.json(readConfig());
});

api.post('/config', (req, res) => {
    try {
        const { accessKey = '', secretKey = '', region = 'us-east-1', bucket = '' } = req.body || {};
        writeConfig({ accessKey, secretKey, region, bucket });
        res.json({ ok: true });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({ error: 'Failed to save configuration.' });
    }
});

app.use('/api', api);

// ----- Serve the built SPA (single-process deploy) -----
if (fs.existsSync(CLIENT_DIR)) {
    app.use(express.static(CLIENT_DIR));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));
} else {
    app.get('/', (req, res) =>
        res
            .status(200)
            .send('Frontend not built yet. Run "npm run build", then restart. In dev, use "npm run dev".')
    );
}

(async () => {
    const instance = await DuckDBInstance.create(':memory:');
    connection = await instance.connect();
    app.listen(PORT, () => console.log(`Parquet Editor running at http://localhost:${PORT}`));
})();
