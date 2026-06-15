import axios from 'axios';

// Same-origin /api in production; Vite proxies it to the Express server in dev.
const client = axios.create({ baseURL: '/api' });

export function errorMessage(error, fallback = 'Something went wrong.') {
    return error?.response?.data?.error || error?.message || fallback;
}

export const api = {
    getConfig: () => client.get('/config').then((r) => r.data),
    saveConfig: (config) => client.post('/config', config).then((r) => r.data),
    listBuckets: () => client.get('/s3/buckets').then((r) => r.data),
    listObjects: (bucket, prefix) =>
        client.get('/s3/list', { params: { bucket, prefix } }).then((r) => r.data),
    loadParquet: (payload) => client.post('/parquet/load', payload).then((r) => r.data),
    saveParquet: (payload) => client.post('/parquet/save', payload).then((r) => r.data),
};
