# Parquet Editor

**Parquet Editor** is a lightweight, open-source tool for editing [Parquet](https://parquet.apache.org/) files on Amazon S3 or your local disk. Powered by [DuckDB](https://duckdb.org/), it gives you an interactive table for searching, editing, and rewriting Parquet data — no notebooks, no SQL required.

It runs as a **single Node process**: one command builds the UI and serves both the app and its API on one port.

![Parquet Editor](frontend/public/logo192.png)

---

## Features

- **Interactive table** — edit cells inline, sort columns, paginate, and remove rows or columns.
- **Whole-file search & filters** — a global search and per-column filters run server-side in DuckDB, so you can find and edit rows anywhere in a multi-million-row file, not just the loaded preview.
- **Scales to huge files** — loads a capped preview (default 100k rows) instead of trying to pull a multi-GB file into the browser; filters reach the rest.
- **S3 browser** — connect your AWS credentials and explore buckets with a directory-style file picker.
- **Local files** — open any Parquet file on disk by path.
- **Safe edits** — your source file is never modified in place; edits are written to a new Parquet file (locally or back to S3).
- **Type-preserving** — edited values are cast back to each column's original type, so the output schema matches the input.
- **Single-process deploy** — one server, one port, one Docker image.

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- AWS credentials (only if you want S3 access)

### Run it

```bash
# 1. Install server + frontend dependencies
npm run setup

# 2. Build the UI and start the server
npm run serve
```

Then open **http://localhost:5001**.

That's it — the same Express server serves the built UI and the API, so there is no separate frontend to run in production.

### Develop

For hot-reloading while you work:

```bash
npm run dev
```

This starts the API on `:5001` and the Vite dev server on **http://localhost:5173** (which proxies `/api` to the backend).

---

## Deploy with Docker

```bash
docker build -t parquet-editor .
docker run -p 5001:5001 parquet-editor
```

Open http://localhost:5001. To persist your saved S3 credentials across restarts, mount a volume for the config file:

```bash
docker run -p 5001:5001 -v "$PWD/config.json:/app/config.json" parquet-editor
```

> The server listens on `PORT` (default `5001`).

---

## Usage

### Connecting to S3

1. Open the **Settings** page.
2. Enter your AWS access key, secret key, region, and a default bucket.
3. Click **Save**. Credentials are stored locally in `config.json` on the server.

### Editing a file

1. On the **Editor** page, either paste a local file path or click **Browse S3** to pick a `.parquet` file.
2. Click **Load data** (load the first 10,000 rows, or check *Load entire file*).
3. In the table you can:
   - **Edit** any cell inline
   - **Sort** by clicking a column header
   - **Search** the whole file (the search box and the per-column **Filters** run server-side, so they match rows beyond the loaded preview)
   - **Remove** a column (the ✕ on its header) or a row (the trash icon)
4. Click **Review changes** to see a summary of every edit.
5. Set an output path (`s3://…` or a local path) and click **Create edited Parquet**. A new file is written; the original is untouched.

> **Large files:** the editor loads at most `PARQUET_EDITOR_MAX_ROWS` rows (default `100000`) into the browser. To reach rows past that, use search or filters — they scan the entire file and bring matching rows back (also capped). Saving always rewrites the full file with your edits, so rows you never loaded are preserved.

---

## Architecture

```
parquet-editor/
├── server.js          # Express API + serves the built SPA (single process)
├── package.json       # server deps + setup/build/start/dev scripts
├── Dockerfile         # one-image build & run
└── frontend/          # Vite + React + Tailwind UI
    ├── src/
    └── dist/          # production build served by server.js
```

DuckDB runs server-side (it does the Parquet reads, edits, and writes, and talks to S3 via `httpfs`). The browser only renders the UI and calls the `/api` routes.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Server | Node.js + Express |
| Data engine | DuckDB (`@duckdb/node-api`) |
| Storage | Amazon S3 (`@aws-sdk/client-s3`) + local disk |
| UI | React + Vite |
| Styling | Tailwind CSS |
| Icons | lucide-react |

---

## Roadmap

- [ ] Inline cell-type awareness (numeric vs. text editors)
- [ ] Batch / bulk updates
- [ ] CSV export
- [ ] Upload local files to S3

---

## Contributing

Contributions are welcome! Fork the repo, create a feature branch, and open a pull request describing your change.

---

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

- Built with ❤️ by [Payerset](https://payerset.com).
- Powered by [DuckDB](https://duckdb.org/), [React](https://react.dev/), [Vite](https://vite.dev/), and [Tailwind CSS](https://tailwindcss.com/).
