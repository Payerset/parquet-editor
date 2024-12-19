const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, ListBucketsCommand } = require('@aws-sdk/client-s3');
const { DuckDBInstance } = require('@duckdb/node-api');

const app = express();
app.use(cors());
app.use(express.json());

BigInt.prototype.toJSON = function () {
    return this.toString();
};

const configPath = path.join(__dirname, 'config.json');

// Ensure config exists
if (!fs.existsSync(configPath)) {
    const defaultConfig = {
        accessKey: '',
        secretKey: '',
        region: 'us-east-1',
        bucket: '',
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
}

// Helper to get fresh S3 client with latest config
function getS3Client() {
    const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return new S3Client({
        region: s3Config.region,
        credentials: {
            accessKeyId: s3Config.accessKey,
            secretAccessKey: s3Config.secretKey,
        },
    });
}

let instance, connection;
(async () => {
    instance = await DuckDBInstance.create(':memory:');
    connection = await instance.connect();

    // Start server only after DuckDB is ready
    const PORT = 5001;
    app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
})();

app.get('/s3/buckets', async (req, res) => {
    try {
        const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const s3Client = getS3Client();

        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);

        res.json({
            buckets: response.Buckets.map((bucket) => bucket.Name),
            defaultBucket: s3Config.bucket,
        });
    } catch (error) {
        console.error('Error listing buckets:', error);
        res.status(500).send('Failed to list buckets.');
    }
});

app.get('/s3/list', async (req, res) => {
    const prefix = req.query.prefix || '';
    const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const bucket = req.query.bucket || s3Config.bucket;

    try {
        const s3Client = getS3Client();
        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            Delimiter: '/',
        });

        const response = await s3Client.send(command);

        const folders = response.CommonPrefixes || [];
        const files = response.Contents || [];

        res.json({
            folders: folders.map((folder) => ({ name: folder.Prefix, type: 'folder' })),
            files: files.map((file) => ({
                name: file.Key,
                size: file.Size,
                lastModified: file.LastModified,
                type: 'file',
            })),
        });
    } catch (error) {
        console.error('Error listing S3 objects:', error);
        res.status(500).send('Failed to list S3 objects.');
    }
});

app.post('/parquet/load', async (req, res) => {
    const { s3Path, limit = 10, offset = 0 } = req.body;
    try {
        if (!connection) {
            res.status(500).send({ error: 'DuckDB not initialized yet' });
            return;
        }

        await connection.run(`INSTALL httpfs`);
        await connection.run(`LOAD httpfs`);

        const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        await connection.run(`SET s3_region='${s3Config.region}'`);
        await connection.run(`SET s3_access_key_id='${s3Config.accessKey}'`);
        await connection.run(`SET s3_secret_access_key='${s3Config.secretKey}'`);

        const countQuery = `SELECT count(*) as total FROM read_parquet('${s3Path}')`;
        const countResult = await connection.run(countQuery);
        const countRows = await countResult.getRows();

        if (!countRows || countRows.length === 0) {
            console.error('No rows returned from count query. Possibly invalid S3 path or empty file.');
            res.status(500).send({ error: 'Failed to read parquet: No rows returned.' });
            return;
        }

        const total = countRows[0].total;
        const limitClause = (typeof limit === 'number') ? `LIMIT ${limit} OFFSET ${offset}` : '';
        const query = `SELECT ROW_NUMBER() OVER () AS pe_identif, * FROM read_parquet('${s3Path}') ${limitClause}`;
        const result = await connection.run(query);
        const rowsArray = await result.getRows();
        const columns = result.columnNames();

        // Convert arrays to objects keyed by column name
        const rowObjects = rowsArray.map(rowArr => {
            const obj = {};
            columns.forEach((colName, i) => {
                obj[colName] = rowArr[i];
            });
            return obj;
        });

        res.json({ rows: rowObjects, columns: columns.filter((c) => c !== 'pe_identif'), totalRows: total });
    } catch (error) {
        console.error('Error querying DuckDB:', error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/parquet/create', async (req, res) => {
    const { query } = req.body;
    try {
        if (!connection) {
            res.status(500).send({ error: 'DuckDB not initialized yet' });
            return;
        }

        await connection.run(query);
        res.sendStatus(200);
    } catch (error) {
        console.error('DuckDB COPY query error:', error.message);
        res.status(500).send({ error: 'Failed to create the edited file.' });
    }
});

app.post('/config/s3', (req, res) => {
    const s3Config = req.body;
    try {
        fs.writeFileSync(configPath, JSON.stringify(s3Config, null, 2));
        res.status(200).send('S3 configuration saved successfully.');
    } catch (error) {
        console.error('Error saving S3 configuration:', error);
        res.status(500).send('Failed to save configuration.');
    }
});

app.get('/config/s3', (req, res) => {
    try {
        const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.status(200).json(s3Config);
    } catch (error) {
        console.error('Error loading S3 configuration:', error);
        res.status(500).send('Failed to load configuration.');
    }
});

app.post('/config/s3/duckdb', async (req, res) => {
    const { accessKey, secretKey, region } = req.body;
    try {
        if (!connection) {
            res.status(500).send('DuckDB not initialized yet');
            return;
        }

        const createSecretQuery = `
            CREATE OR REPLACE SECRET s3_secret (
                TYPE S3,
                KEY_ID '${accessKey}',
                SECRET '${secretKey}',
                REGION '${region}'
            );
        `;
        await connection.run(createSecretQuery);
        res.send('DuckDB S3 configuration set successfully.');
    } catch (error) {
        console.error('Error setting DuckDB S3 configuration:', error);
        res.status(500).send('Failed to configure DuckDB S3 access.');
    }
});

app.post('/query', async (req, res) => {
    const { query } = req.body;
    try {
        if (!connection) {
            res.status(500).send({ error: 'DuckDB not initialized yet' });
            return;
        }

        const result = await connection.run(query);
        const rows = await result.getRows();
        res.json(rows);
    } catch (error) {
        console.error('DuckDB query error:', error.message);
        res.status(500).send({ error: error.message || 'Unknown error querying DuckDB' });
    }
});