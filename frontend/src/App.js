import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ConfigPage from './pages/ConfigPage';

import { Menubar } from 'primereact/menubar';

import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

function App() {
    const [selectedFile, setSelectedFile] = useState('');
    const [tableData, setTableData] = useState([]);
    const [columnNames, setColumnNames] = useState([]);
    const [totalRows, setTotalRows] = useState(0);

    const menubarItems = [
        { label: 'Parquet Editor', icon: 'pi pi-home', command: () => (window.location.href = '/') },
        { label: 'Config Settings', icon: 'pi pi-cog', command: () => (window.location.href = '/config') },
    ];

    const menubarStart = (
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo192.png" alt="Parquet Editor Logo" style={{ height: '30px' }} />
            Parquet Editor
        </Link>
    );
    return (
        <Router>
            <div>
                <Menubar model={menubarItems} start={menubarStart} />
                <div className="p-4">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <HomePage
                                    selectedFile={selectedFile}
                                    setSelectedFile={setSelectedFile}
                                    tableData={tableData}
                                    setTableData={setTableData}
                                    columnNames={columnNames}
                                    setColumnNames={setColumnNames}
                                    totalRows={totalRows}
                                    setTotalRows={setTotalRows}
                                />
                            }
                        />
                        <Route path="/config" element={<ConfigPage />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
