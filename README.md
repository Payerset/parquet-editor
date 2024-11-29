# Parquet Editor

**Parquet Editor** is a lightweight, open-source tool for editing Parquet files. Built with [DuckDB](https://duckdb.org/), this application provides an intuitive interface for searching and updating Parquet files locally or on Amazon S3. With minimal setup, users can perform simple CRUD operations and save changes to Parquet files, making it perfect for developers and data analysts.

---

## Features
- **Simple Setup**: Clone the repo and start the editor with a single command.
- **S3 Integration**: Connect to your Amazon S3 buckets by entering access keys. Automatically lists accessible buckets and file prefixes.
- **Interactive Table**: View and edit Parquet files via a user-friendly table interface.
- **CRUD Operations**: Perform basic Create, Read, Update, and Delete actions directly on Parquet files.
- **Configuration Persistence**: Save your S3 keys and preferences securely using SQLite.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later)
- [Python 3.9+](https://www.python.org/)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Payerset/parquet-editor.git
   cd parquet-editor
