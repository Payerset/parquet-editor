# Parquet Editor

**Parquet Editor** is a lightweight, open-source tool for editing Parquet files. Built with [DuckDB](https://duckdb.org/), this application provides an intuitive interface for searching and updating Parquet files locally or on Amazon S3. With minimal setup, users can perform advanced data manipulations, making it perfect for developers and data analysts.

---

## Features

- **Intuitive User Interface**: Quickly search, filter, and update Parquet files using an interactive table interface.
- **S3 Integration**: Seamlessly connect to your Amazon S3 buckets and browse files with a directory-style explorer.
- **Editable Parquet Files**: Modify fields and create new Parquet files with the changes saved.
- **Advanced Search**: Filter rows by specific column values or perform global keyword searches.
- **Customizable Outputs**: Specify custom file paths or default locations for saving edited files.
- **Dynamic Field Management**: Easily track and modify rows using unique identifiers (`ROW_NUMBER`).
- **Support for Pagination**: Load large files in chunks (e.g., 10k rows at a time) to optimize performance.
- **Full/Partial File Loading**: Load entire files or limit rows for quick previews.
- **Configuration Persistence**: Save S3 credentials locally for quick re-access.
- **Cross-Platform**: Supports local file editing with system path input for developers working outside the cloud.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- AWS credentials (for S3 integration)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Payerset/parquet-editor.git
   cd parquet-editor
   ```

2. Install dependencies for the **frontend** and **backend**:
   - **Backend**:
     ```
     cd backend
     npm install
     ```
   - **Frontend**:
     ```
     cd ../frontend
     npm install
     ```

3. Start the application:
   - **Backend**:
     ```
     cd backend
     node server.js
     ```
   - **Frontend**:
     ```
     cd ../frontend
     npm start
     ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## Usage

### Connecting to S3
1. Go to the **Config Settings** page in the editor.
2. Enter your AWS Access Key, Secret Key, and Region.
3. Select a bucket to be your default location when browsing files.

### Editing a Parquet File
1. Select a file to view its contents in the interactive table.
2. Use the table interface to:
   - **Search**: Filter rows by column values or global search.
   - **Edit**: Modify cell values directly.
   - **Delete**: Remove rows.
   - **Add**: Insert new rows.
3. Save your changes back to the original Parquet file or export them to a new file.

### Creating an Edited File
1. After editing rows, click **Review Changes** to verify your modifications.
2. Specify the output path for the new Parquet file or use the default download location.
3. Click **Create Edited Parquet** to generate the new file.

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
- Powered by [DuckDB](https://duckdb.org/), [React](https://reactjs.org/), and [Node.js](https://nodejs.org/).
