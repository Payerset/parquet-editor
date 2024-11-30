const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const duckdb = require('duckdb');
const { S3Client, ListObjectsV2Command, ListBucketsCommand } = require('@aws-sdk/client-s3');


const app = express();
const db = new duckdb.Database(':memory:');

BigInt.prototype.toJSON = function () {
    return this.toString();
};


app.use(cors());
app.use(express.json());

// File path for configuration
const configPath = path.join(__dirname, 'config.json');

// Check if config.json exists
if (!fs.existsSync(configPath)) {
    console.log('config.json not found. Creating a default configuration file...');
    const defaultConfig = {
        accessKey: '',
        secretKey: '',
        region: '',
        bucket: '',
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('Default config.json created.');
}

// Read the configuration file
const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// S3 client initialization
const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
        accessKeyId: s3Config.accessKey,
        secretAccessKey: s3Config.secretKey,
    },
});

// Endpoint to list objects in the S3 bucket
app.get('/s3/list', async (req, res) => {
    const prefix = req.query.prefix || ''; // Prefix for folder navigation
    const bucket = req.query.bucket || s3Config.bucket; // Allow bucket override

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            Delimiter: '/', // Ensures we only get one level of objects
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

// Endpoint to list all buckets
app.get('/s3/buckets', async (req, res) => {
    try {
        // Read the S3 config from the file
        const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Fetch the list of buckets
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);

        // Return the bucket names along with the default bucket
        res.json({
            buckets: response.Buckets.map((bucket) => bucket.Name),
            defaultBucket: s3Config.bucket, // Default bucket from config
        });
    } catch (error) {
        console.error('Error listing buckets:', error);
        res.status(500).send('Failed to list buckets.');
    }
});


// Initialize default config if the file does not exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
        configPath,
        JSON.stringify(
            {
                accessKey: '',
                secretKey: '',
                region: '',
                bucket: '',
            },
            null,
            2
        )
    );
}

app.post('/parquet/load', async (req, res) => {
    const { s3Path, limit = 10, offset = 0 } = req.body;

    try {
        // Configure S3 credentials in DuckDB
        db.all(`
            INSTALL httpfs;
            LOAD httpfs;
            SET s3_region='${s3Config.region}';
            SET s3_access_key_id='${s3Config.accessKey}';
            SET s3_secret_access_key='${s3Config.secretKey}';
        `);

        // Query for the total count of rows
        const countQuery = `SELECT count(*)::varchar as total FROM read_parquet('${s3Path}')`;
        const [{ total }] = await new Promise((resolve, reject) =>
            db.all(countQuery, (err, rows) => (err ? reject(err) : resolve(rows)))
        );

        // Query for paginated results
        const query = `SELECT ROW_NUMBER() OVER () AS pe_identif, * FROM '${s3Path}' LIMIT ${limit} OFFSET ${offset}`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error('DuckDB query error:', err.message);
                return res.status(500).send({ error: 'Failed to load parquet file.' });
            }
            const columns = rows.length > 0 ? Object.keys(rows[0]) : []; // Extract column names
            res.json({ rows, columns, totalRows: total }); // Include total rows in response
        });
    } catch (error) {
        console.error('Error querying DuckDB:', error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/parquet/create', async (req, res) => {
    const { query } = req.body;

    try {
        // Execute the COPY query in DuckDB
        db.all(query, (err) => {
            if (err) {
                console.error('DuckDB COPY query error:', err.message);
                return res.status(500).send({ error: 'Failed to create the edited file.' });
            }
            res.sendStatus(200); // Success
        });
    } catch (error) {
        console.error('Error executing COPY query:', error);
        res.status(500).send({ error: error.message });
    }
});


// Endpoint to save S3 configuration
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

// Endpoint to fetch S3 configuration
app.get('/config/s3', (req, res) => {
    try {
        const s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.status(200).json(s3Config);
    } catch (error) {
        console.error('Error loading S3 configuration:', error);
        res.status(500).send('Failed to load configuration.');
    }
});

// DuckDB Secret (optional step to set in-memory S3 secret)
app.post('/config/s3/duckdb', async (req, res) => {
    const { accessKey, secretKey, region, bucket } = req.body;

    try {
        const createSecretQuery = `
            CREATE OR REPLACE SECRET s3_secret (
                TYPE S3,
                KEY_ID '${accessKey}',
                SECRET '${secretKey}',
                REGION '${region}'
            );
        `;
        db.run(createSecretQuery);
        res.send('DuckDB S3 configuration set successfully.');
    } catch (error) {
        console.error('Error setting DuckDB S3 configuration:', error);
        res.status(500).send('Failed to configure DuckDB S3 access.');
    }
});

// API to query Parquet files
app.post('/query', async (req, res) => {
    const { query } = req.body;

    try {
        const result = await new Promise((resolve, reject) => {
            db.all(query, (err, rows) => {
                if (err) {
                    console.error('DuckDB query error:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
        res.json(result);
    } catch (error) {
        res.status(500).send({ error: error.message || 'Unknown error querying DuckDB' });
    }
});

// Start server
const PORT = 5001;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
