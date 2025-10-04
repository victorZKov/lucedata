import { useState } from 'react';

type Backend = 'sqlite' | 'postgres' | 'sqlserver';

export default function FirstRunWizard({ onClose, mode }: { onClose?: () => void; mode?: 'first-run' | 'migrate' }) {
  const [step, setStep] = useState(1);
  const [backend, setBackend] = useState<Backend>('sqlite');
  const [connString, setConnString] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [migrateExisting, setMigrateExisting] = useState(true);
  const title = mode === 'migrate' ? 'Migrate setup' : 'Welcome — First Run Setup';

  const validate = async () => {
    setStatus('Validating...');
    try {
      const res = await window.electronAPI?.firstRun.validate({ backend, connString });
      console.log('validate result', res);
      if (res?.ok) setStep(3);
      setStatus(JSON.stringify(res));
    } catch (err) {
      setStatus('Validation failed: ' + String(err));
    }
  };

  const runMigrate = async () => {
    setStatus('Running migrations...');
    try {
      const res = await window.electronAPI?.firstRun.migrate({ backend, connString, migrateExisting });
      setStatus(JSON.stringify(res));
      if (res?.ok) {
        await window.electronAPI?.store.set('bootstrap.done', true);
        await window.electronAPI?.firstRun.complete({ backend });
        setStep(4);
      }
    } catch (err) {
      setStatus('Migration failed: ' + String(err));
    }
  };

  const migrateFromSqlite = async () => {
    setStatus('Migrating from existing sqlite...');
    try {
      const res = await window.electronAPI?.firstRun.migrateFromSqlite({ backend, connString });
      setStatus(JSON.stringify(res));
      if (res?.ok) {
        await window.electronAPI?.store.set('bootstrap.done', true);
        await window.electronAPI?.firstRun.complete({ backend });
        setStep(4);
      }
    } catch (err) {
      setStatus('Migration from sqlite failed: ' + String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-[3020] flex items-center justify-center bg-black/50 pointer-events-auto">
      <div className="w-[720px] bg-white dark:bg-gray-900 rounded shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {step === 1 && (
          <div>
            <p className="mb-3">Choose a storage backend:</p>
            <div className="flex gap-3 mb-4">
              {(['sqlite','postgres','sqlserver'] as Backend[]).map(b => (
                <button key={b} className={`px-3 py-2 rounded border ${b===backend? 'border-blue-500':''}`} onClick={()=>setBackend(b)}>{b}</button>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-1">Connection string / details</label>
              <input className="w-full p-2 border rounded" value={connString} onChange={e=>setConnString(e.target.value)} placeholder={backend==='sqlite' ? 'leave empty to use local sqlite file' : 'connection string'} />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input id="migrateExisting" type="checkbox" checked={migrateExisting} onChange={e=>setMigrateExisting(e.target.checked)} />
              <label htmlFor="migrateExisting" className="text-sm">Attempt to migrate existing local configuration (if found)</label>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={()=>{ onClose?.(); }}>Cancel</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={()=>setStep(2)}>Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3">Step 2 — Validate connection</p>
            <div className="mb-4">
              <pre className="whitespace-pre-wrap text-sm">Backend: {backend}\nConn: {connString || '(default)'}</pre>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={()=>setStep(1)}>Back</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={validate}>Validate</button>
            </div>
            {status && <div className="mt-3 text-sm">{status}</div>}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3">Step 3 — Run migrations</p>
            <div className="mb-3">You can either run a fresh migration or attempt to migrate from an existing sqlite configuration (if present).</div>
            <div className="flex gap-2 mb-4">
              <button className="px-3 py-2 rounded border" onClick={runMigrate}>Run fresh migrations</button>
              <button className="px-3 py-2 rounded border" onClick={migrateFromSqlite}>Migrate from local sqlite</button>
            </div>
            {status && <div className="mt-3 text-sm">{status}</div>}
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="mb-3">Setup complete</p>
            <div className="flex justify-end">
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={()=>{ onClose?.(); }}>Close and continue</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
