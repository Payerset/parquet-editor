import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import axios from 'axios';

const EditFile = ({ show, onHide, editedRows, onCreate, selectedFile }) => {
    const [outputPath, setOutputPath] = useState('');
    const [defaultPath, setDefaultPath] = useState('');

    // Generate default download path using selectedFile
    useEffect(() => {
        const fetchDefaultPath = () => {
            if (selectedFile) {
                // Extract the filename from the selected file path
                const originalFileName = selectedFile.split('/').pop().replace('.parquet', '');
                const defaultDownloadPath = `/tmp/${originalFileName}_edited.parquet`;
                setDefaultPath(defaultDownloadPath);
            }
        };
        fetchDefaultPath();
    }, [selectedFile]);

    const handleCreateEditedFile = async (outputPath) => {
        try {
            if (!outputPath) {
                alert('Please specify an output file path.');
                return;
            }

            if (editedRows.length === 0) {
                alert('No edits to process!');
                return;
            }

            // Extract unique fields being modified
            const modifiedFields = [...new Set(editedRows.map(({ field }) => field))];

            // Generate CASE statements for each modified field
            const caseStatements = modifiedFields.map((field) => {
                const fieldCases = editedRows
                    .filter((edit) => edit.field === field)
                    .map(({ pe_identif, newValue }) => `WHEN ROW_NUMBER() OVER () = ${pe_identif} THEN '${newValue}'`)
                    .join(' ');

                return `CASE ${fieldCases} ELSE ${field} END AS ${field}`;
            }).join(',\n');

            // Generate the EXCLUDE clause for modified fields
            const excludeClause = modifiedFields.length > 0 ? `EXCLUDE (${modifiedFields.join(', ')})` : '';

            // Construct the DuckDB query
            const copyQuery = `
            COPY (
                SELECT
                    * ${excludeClause},
                    ${caseStatements}
                FROM read_parquet('${selectedFile}')
            ) TO '${outputPath}' (FORMAT 'parquet');
        `;

            // Send query to the backend
            const response = await axios.post('http://localhost:5001/parquet/create', { query: copyQuery });

            if (response.status === 200) {
                alert('Edited Parquet file created successfully!');
            } else {
                throw new Error('Failed to create the edited file.');
            }
        } catch (error) {
            console.error('Error creating edited file:', error);
            alert('Failed to create the edited file. Check the console for details.');
        }
    };

    return (
        <Dialog
            header="Review Edits"
            visible={show}
            style={{ width: '70vw' }}
            onHide={onHide}
        >
            <p>Review the changes before creating the edited parquet file:</p>
            <DataTable value={editedRows} className="mb-4">
                <Column field="pe_identif" header="Record ID" />
                <Column field="oldValue" header="Old Value" />
                <Column field="newValue" header="New Value" />
                <Column field="field" header="Field" />
            </DataTable>

            <div className="fluid mt-4 w-full">
                <div className="field">
                    <label htmlFor="outputPath" className="text-bold">Output File Path</label>
                    <div className="inputgroup">
                        <InputText
                            id="outputPath"
                            value={outputPath}
                            onChange={(e) => setOutputPath(e.target.value)}
                            placeholder="Enter output file path or use default"
                            className="w-7"
                        />
                        <Button
                            outlined
                            icon="pi pi-download"
                            onClick={() => setOutputPath(defaultPath)}
                            className="button-secondary ml-1"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <Button
                    label="Create Edited Parquet"
                    disabled={!outputPath}
                    onClick={() => handleCreateEditedFile(outputPath)}
                    className="button-success"
                />
            </div>
        </Dialog>
    );
};

export default EditFile;
