import React, { useState } from 'react';
import EditFile from '../components/EditFile';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { FileUpload } from 'primereact/fileupload';
import S3FileExplorer from '../components/S3FileExplorer';

import axios from 'axios';

const HomePage = ({
                      selectedFile,
                      setSelectedFile,
                      tableData,
                      setTableData,
                      columnNames,
                      setColumnNames,
                      totalRows,
                      setTotalRows,
                  }) => {
    const [loadEntireFile, setLoadEntireFile] = useState(false);
    const [showS3FileModal, setShowS3FileModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editedRows, setEditedRows] = useState([]);
    const [localFilePath, setLocalFilePath] = useState(''); // New state for local file input


    const renderEditableCell = (rowData, column) => {
        return (
            <input
                type="text"
                value={rowData[column.field]}
                onChange={(e) => updateCell(rowData, column.field, e.target.value)}
                className="p-inputtext p-d-block"
            />
        );
    };

    const updateCell = (rowData, field, value) => {
        const updatedData = [...tableData];
        const rowIndex = updatedData.indexOf(rowData);
        const oldValue = updatedData[rowIndex][field];

        // Update cell value
        updatedData[rowIndex][field] = value;

        // Track changes
        setEditedRows((prev) => {
            const existingEdit = prev.find(
                (edit) => edit.pe_identif === rowData.pe_identif && edit.field === field
            );
            if (existingEdit) {
                return prev.map((edit) =>
                    edit.pe_identif === rowData.pe_identif && edit.field === field
                        ? { ...edit, newValue: value }
                        : edit
                );
            }
            return [...prev, { pe_identif: rowData.pe_identif, field, oldValue, newValue: value }];
        });

        setTableData(updatedData);
    };

    const handleLoadData = async () => {
        if (!selectedFile) {
            alert('Please select a file first!');
            return;
        }

        try {
            const limit = loadEntireFile ? null : 10000;
            const response = await axios.post('http://localhost:5001/parquet/load', {
                s3Path: selectedFile,
                limit,
                offset: 0,
            });

            setTableData(response.data.rows);
            setColumnNames(response.data.columns.filter((col) => col !== 'pe_identif'));
            setTotalRows(response.data.totalRows);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data from the file.');
        }
    };

    const handleCreateEditedParquet = (outputPath) => {
        console.log('Creating edited parquet at:', outputPath);
        console.log('Edits:', editedRows);
        setShowEditModal(false);
    };

    return (
        <div className="p-4">
            <p>Choose a parquet file from S3 or input a full system path to a local file.</p>

            {/* Input for Local File Path */}
            <div className="mb-3">
                <input
                    type="text"
                    placeholder="Enter full system path of the file"
                    value={localFilePath}
                    onChange={(e) => setLocalFilePath(e.target.value)}
                    className="p-inputtext w-8 mr-2"
                />
                <Button
                    label="Set Local File"
                    icon="pi pi-file"
                    className="p-button-outlined"
                    onClick={() => setSelectedFile(localFilePath)}
                    disabled={!localFilePath}
                />
            </div>
            <Button
                label="Choose File from S3"
                icon="pi pi-cloud"
                className="p-button-outlined"
                onClick={() => setShowS3FileModal(true)}
            />

            {selectedFile && <p><strong>Selected File:</strong> {selectedFile}</p>}

            {selectedFile && (
                <>
                    <div>
                        <Checkbox
                            inputId="loadEntireFile"
                            checked={loadEntireFile}
                            onChange={(e) => setLoadEntireFile(e.checked)}
                        />
                        <label htmlFor="loadEntireFile" className="ml-2">Load Entire File</label>
                    </div>
                    <div className="mr-3 mt-3 mb-3">
                        <Button label="Load Data" onClick={handleLoadData} className="mr-4"/>
                        <Button
                            label="Review Changes"
                            icon="pi pi-pencil"
                            className="p-button-warning"
                            disabled={editedRows.length === 0}
                            onClick={() => setShowEditModal(true)}
                        />
                    </div>
                </>
            )}


            {tableData.length > 0 && (
                <DataTable value={tableData} paginator rows={10} totalRecords={totalRows}>
                    {columnNames.map((col) => (
                        <Column
                            key={col}
                            field={col}
                            header={col}
                            sortable
                            body={(rowData) => renderEditableCell(rowData, {field: col})}
                        />
                    ))}
                </DataTable>
            )}

            <Dialog
                header="Select a File from S3"
                visible={showS3FileModal}
                style={{width: '90vw'}}
                onHide={() => setShowS3FileModal(false)}
            >
                <S3FileExplorer
                    onFileSelect={(filePath) => {
                        setSelectedFile(filePath);
                        setEditedRows([]); // Clear edits when a new file is selected
                        setShowS3FileModal(false);
                    }}
                />
            </Dialog>

            <EditFile
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                editedRows={editedRows}
                selectedFile={selectedFile} // Pass the selected file
            />
        </div>
    );
};

export default HomePage;
