import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import axios from 'axios';

const EditFile = ({ show, onHide, editedRows, removedRows, removedColumns, selectedFile }) => {
    const [outputPath, setOutputPath] = useState('');
    const [defaultPath, setDefaultPath] = useState('');

    // Generate default download path using selectedFile
    useEffect(() => {
        if (selectedFile) {
            const originalFileName = selectedFile.split('/').pop().replace('.parquet', '');
            setDefaultPath(`/tmp/${originalFileName}_edited.parquet`);
        }
    }, [selectedFile]);

    const handleCreateEditedFile = async (outputPath) => {
        try {
            if (!outputPath) {
                alert('Please specify an output file path.');
                return;
            }

            // Construct CASE statements for modified fields
            const caseStatements = editedRows
                .map(({ pe_identif, field, newValue }) =>
                    `WHEN row_id = ${pe_identif} THEN '${newValue}'`
                )
                .join(' ');

            const caseColumns = editedRows
                .map(({ field }) => field)
                .filter((value, index, self) => self.indexOf(value) === index) // Get unique fields
                .map((field) => `CASE ${caseStatements} ELSE ${field} END AS ${field}`)
                .join(',\n');

            // Generate EXCLUDE clause for removed columns
            const excludeColumns = removedColumns.length > 0
                ? `EXCLUDE (row_id, ${removedColumns.join(', ')})` // Exclude row_id and other removed columns
                : 'EXCLUDE (row_id)'; // Always exclude row_id

            // Generate WHERE clause for removed rows
            const excludeRows = removedRows.length > 0
                ? `row_id NOT IN (${removedRows.join(', ')})`
                : 'TRUE';

            // Construct the DuckDB query
            const copyQuery = `
            COPY (
                WITH cte AS (
                    SELECT *, ROW_NUMBER() OVER () AS row_id
                    FROM read_parquet('${selectedFile}')
                )
                SELECT
                    * ${excludeColumns},
                    ${caseColumns}
                FROM cte
                WHERE ${excludeRows}
            ) TO '${outputPath}' (FORMAT 'parquet');
        `;

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
            <p>Review the changes before creating the edited Parquet file:</p>

            {/* Edited Rows Table */}
            {editedRows.length > 0 && (
                <>
                    <h5>Modified Rows:</h5>
                    <DataTable value={editedRows} className="mb-4">
                        <Column field="pe_identif" header="Record ID" />
                        <Column field="oldValue" header="Old Value" />
                        <Column field="newValue" header="New Value" />
                        <Column field="field" header="Field" />
                    </DataTable>
                </>
            )}

            {/* Removed Rows Table */}
            {removedRows.length > 0 && (
                <>
                    <h5>Removed Rows:</h5>
                    <p>Row #: {removedRows.join(', ')}</p>
                </>
            )}

            {/* Removed Columns */}
            {removedColumns.length > 0 && (
                <>
                    <h5>Removed Columns:</h5>
                    <p>Column: {removedColumns.join(', ')}</p>
                </>
            )}

            {/* Output File Path Input */}
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

            {/* Create Button */}
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
