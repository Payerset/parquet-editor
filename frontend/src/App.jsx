import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.jsx';
import Navbar from './components/Navbar.jsx';
import HomePage from './pages/HomePage.jsx';
import ConfigPage from './pages/ConfigPage.jsx';
import { useEditor } from './hooks/useEditor.js';

export default function App() {
    // Editor state lives here so it survives navigating between pages.
    const editor = useEditor();

    return (
        <ToastProvider>
            <BrowserRouter>
                <div className="min-h-full">
                    <Navbar />
                    <main className="mx-auto w-[90%] py-8">
                        <Routes>
                            <Route path="/" element={<HomePage editor={editor} />} />
                            <Route path="/config" element={<ConfigPage />} />
                        </Routes>
                    </main>
                </div>
            </BrowserRouter>
        </ToastProvider>
    );
}
