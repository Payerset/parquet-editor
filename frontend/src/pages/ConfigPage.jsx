import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import Button from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useToast } from '../components/ui/Toast.jsx';

export default function ConfigPage() {
    const toast = useToast();
    const [config, setConfig] = useState({ accessKey: '', secretKey: '', region: 'us-east-1', bucket: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    useEffect(() => {
        api.getConfig()
            .then((data) => setConfig((prev) => ({ ...prev, ...data })))
            .catch((e) => toast.error(errorMessage(e, 'Could not load configuration.')))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const update = (key) => (e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }));

    const save = async () => {
        setSaving(true);
        try {
            await api.saveConfig(config);
            toast.success('Configuration saved.');
        } catch (e) {
            toast.error(errorMessage(e, 'Failed to save configuration.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
                Provide AWS credentials so the editor can browse buckets and read or write Parquet files
                on S3.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                        <Spinner /> Loading configuration…
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <Field label="Access key ID" htmlFor="accessKey">
                            <Input
                                id="accessKey"
                                value={config.accessKey}
                                onChange={update('accessKey')}
                                placeholder="AKIA…"
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </Field>

                        <Field label="Secret access key" htmlFor="secretKey">
                            <div className="relative">
                                <Input
                                    id="secretKey"
                                    type={showSecret ? 'text' : 'password'}
                                    value={config.secretKey}
                                    onChange={update('secretKey')}
                                    placeholder="••••••••••••••••"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecret((s) => !s)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                                >
                                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Region" htmlFor="region">
                                <Input
                                    id="region"
                                    value={config.region}
                                    onChange={update('region')}
                                    placeholder="us-east-1"
                                />
                            </Field>
                            <Field label="Default bucket" htmlFor="bucket" hint="Opened first when browsing S3.">
                                <Input
                                    id="bucket"
                                    value={config.bucket}
                                    onChange={update('bucket')}
                                    placeholder="my-bucket"
                                />
                            </Field>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-4">
                            <p className="flex items-center gap-2 text-xs text-slate-400">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                                Stored locally in <code className="font-mono">config.json</code> on the server.
                            </p>
                            <Button icon={Save} loading={saving} onClick={save}>
                                Save
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
