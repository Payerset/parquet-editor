import React, { useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import axios from 'axios';

const ConfigPage = () => {
    const [s3Config, setS3Config] = useState({
        accessKey: '',
        secretKey: '',
        region: '',
        bucket: '',
    });

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await axios.get('http://localhost:5001/config/s3');
                setS3Config(response.data);
            } catch (error) {
                console.error('Error loading S3 configuration:', error);
            }
        };
        loadConfig();
    }, []);

    const saveS3Config = async () => {
        try {
            await axios.post('http://localhost:5001/config/s3', s3Config);
            alert('S3 configuration saved successfully!');
        } catch (error) {
            console.error('Error saving S3 configuration:', error);
            alert('Failed to save S3 configuration.');
        }
    };

    return (
        <div className="p-fluid p-4">
            <h3 className="p-mb-3">Config Settings</h3>
            <p>Provide your S3 credentials to connect to your bucket.</p>

            <div className="formgrid grid">
                <div className="field col-12 md:col-6">
                    <label htmlFor="accessKey" className="p-text-bold">Access Key</label>
                    <InputText
                        id="accessKey"
                        value={s3Config.accessKey}
                        onChange={(e) => setS3Config({ ...s3Config, accessKey: e.target.value })}
                        placeholder="Enter your Access Key"
                        className="w-full"
                    />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="secretKey" className="p-text-bold">Secret Key</label>
                    <InputText
                        id="secretKey"
                        value={s3Config.secretKey}
                        onChange={(e) => setS3Config({ ...s3Config, secretKey: e.target.value })}
                        placeholder="Enter your Secret Key"
                        className="w-full"
                    />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="region" className="p-text-bold">Region</label>
                    <InputText
                        id="region"
                        value={s3Config.region}
                        onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                        placeholder="Enter your Region"
                        className="w-full"
                    />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="bucket" className="p-text-bold">Bucket Name</label>
                    <InputText
                        id="bucket"
                        value={s3Config.bucket}
                        onChange={(e) => setS3Config({ ...s3Config, bucket: e.target.value })}
                        placeholder="Enter your Default Bucket Name"
                        className="w-full"
                    />
                </div>

                <div className="field col-12">
                    <Button
                        label="Save Configuration"
                        icon="pi pi-check"
                        onClick={saveS3Config}
                        className="p-button w-2"
                    />
                </div>
            </div>
        </div>
    );
};

export default ConfigPage;
