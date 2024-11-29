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
   ```
   git clone https://github.com/Payerset/parquet-editor.git
   cd parquet-editor
   ```

2. Install dependencies for the frontend and backend:
   - **Backend**:
     ```
     cd backend
     pip install -r requirements.txt
     ```
   - **Frontend**:
     ```
     cd ../frontend
     npm install
     ```

3. Start the application:
   - **Backend** (Python API):
     ```
     cd backend
     python app.py
     ```
   - **Frontend** (React app):
     ```
     cd ../frontend
     npm run start
     ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## Usage

### Connecting to S3
1. Go to the **Settings** page in the editor.
2. Enter your AWS Access Key, Secret Key, and Region.
3. Select a bucket and prefix to browse your Parquet files.

### Editing a Parquet File
1. Select a file to view its contents in the interactive table.
2. Use the table interface to:
   - **Search**: Filter rows by column values.
   - **Edit**: Modify cell values directly.
   - **Delete**: Remove rows.
   - **Add**: Insert new rows.
3. Save your changes back to the original Parquet file or export them as a new file.

---

## Configuration
- **SQLite Database**: The application stores your S3 configurations and recent file history in a local SQLite database (`backend/db.sqlite`).

---

## Roadmap
- [ ] Add support for file previews before full loading.
- [ ] Implement batch operations (e.g., bulk updates).
- [ ] Support exporting to formats like CSV.
- [ ] Add file upload/download via S3.

---

## Contributing
We welcome contributions! If you'd like to help:
1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Submit a pull request explaining your changes.

---

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments
- Built with ❤️ by [Payerset](https://payerset.com).
- Powered by [DuckDB](https://duckdb.org/), [React](https://reactjs.org/), and [FastAPI](https://fastapi.tiangolo.com/).
