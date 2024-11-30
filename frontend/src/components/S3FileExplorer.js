import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';

const S3FileExplorer = ({ onFileSelect }) => {
    const [buckets, setBuckets] = useState([]);
    const [selectedBucket, setSelectedBucket] = useState('');
    const [bucketContents, setBucketContents] = useState([]);
    const [currentPath, setCurrentPath] = useState('');
    const [breadcrumbItems, setBreadcrumbItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch bucket list on mount
    useEffect(() => {
        const fetchBuckets = async () => {
            try {
                const response = await axios.get('http://localhost:5001/s3/buckets');
                const { buckets, defaultBucket } = response.data;

                setBuckets(buckets.map((bucket) => ({ label: bucket, value: bucket })));
                setSelectedBucket(defaultBucket || buckets[0]);
            } catch (error) {
                console.error('Error fetching buckets:', error);
            }
        };
        fetchBuckets();
    }, []);

    // List objects when bucket or path changes
    useEffect(() => {
        if (selectedBucket) {
            listObjects(currentPath); // Fetch contents for the current path
            updateBreadcrumb(currentPath);
        }
    }, [selectedBucket, currentPath]);


    const listObjects = async (path = '') => {
        const sanitizedPath = path === '/' ? '' : path; // Treat "/" as root
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5001/s3/list', {
                params: { bucket: selectedBucket, prefix: sanitizedPath },
            });

            const folders = response.data.folders.map((folder) => ({
                ...folder,
                name: folder.name.split('/').filter(Boolean).pop(),
                type: 'folder',
            }));
            const files = response.data.files.map((file) => ({
                ...file,
                name: file.name.split('/').filter(Boolean).pop(),
                type: 'file',
            }));

            setBucketContents([...folders, ...files]);

            if (sanitizedPath === '') {
                setCurrentPath(''); // Ensure currentPath is reset at root
            }
        } catch (error) {
            console.error('Error listing S3 objects:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateBack = () => {
        if (!currentPath || currentPath === '/') {
            setCurrentPath(''); // Ensure root path is represented as an empty string
            return;
        }

        const parentPath = currentPath.split('/').slice(0, -2).join('/') + '/';
        setCurrentPath(parentPath || ''); // Reset to root if no parent exists
    };


    const refreshCurrentPath = () => {
        listObjects(currentPath); // Reload current path
    };

    const handleRowClick = (rowData) => {
        if (rowData.type === 'folder') {
            const newPath = `${currentPath}${rowData.name}/`.replace(/\/{2,}/g, '/');
            setCurrentPath(newPath);
        } else if (rowData.name.endsWith('.parquet')) {
            const s3Url = `s3://${selectedBucket}/${currentPath}${rowData.name}`;
            onFileSelect(s3Url); // Call parent callback with the file path
        }
    };

    const updateBreadcrumb = (path) => {
        const parts = path.split('/').filter(Boolean);
        const items = parts.map((part, index) => ({
            label: decodeURIComponent(part),
            command: () => {
                const newPath = parts.slice(0, index + 1).join('/') + '/';
                setCurrentPath(newPath);
            },
        }));

        const bucketDropdown = {
            template: () => (
                <Dropdown
                    value={selectedBucket}
                    options={buckets}
                    onChange={(e) => {
                        setSelectedBucket(e.value);
                        setCurrentPath(''); // Reset path when bucket changes
                    }}
                    placeholder="Select Bucket"
                    className="p-dropdown-item p-dropdown-clearable"
                />
            ),
        };

        setBreadcrumbItems([bucketDropdown, ...items]);
    };

    const filteredContents = bucketContents.filter((item) => {
        if (item.type === 'folder') return true;
        if (item.name.endsWith('.parquet')) return item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return false;
    });

    return (
        <div>
            <BreadCrumb model={breadcrumbItems} className="border-none" />
            <div className="grid m-1">
                <div className="col-1">
                    <Button
                        icon="pi pi-angle-left"
                        rounded
                        text
                        onClick={navigateBack}
                        disabled={!currentPath && selectedBucket === ''} // Disable if no bucket is selected
                    />
                        <Button
                            icon="pi pi-refresh"
                            rounded
                            text
                            onClick={() => { listObjects(currentPath);}}
                        />
                </div>
                <div className="col-11">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search files and folders..."
                        className="p-inputtext w-full mb-2"
                    />
                </div>
            </div>

            <DataTable
                value={filteredContents}
                loading={loading}
                onRowClick={(e) => handleRowClick(e.data)}
                className="p-mt-2"
            >
                <Column
                    field="name"
                    header="Name"
                    sortable
                    body={(rowData) => (
                        <span style={{ fontWeight: rowData.type === 'folder' ? 'bold' : 'normal' }}>
                            {rowData.name}
                        </span>
                    )}
                />
                <Column field="type" header="Type" sortable />
                <Column field="size" header="Size" sortable />
                <Column field="lastModified" header="Last Modified" sortable />
            </DataTable>
        </div>
    );
};

export default S3FileExplorer;

