'use client';

import { useState } from 'react';
import { Save, Loader2, Check } from 'lucide-react';

interface Props {
  defaultTerms: string;
  defaultValidityDays: number;
}

const save = async (key: string, value: string) => {
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
};

export function QuoteSettingsForm({ defaultTerms, defaultValidityDays }: Props) {
  const [terms, setTerms] = useState(defaultTerms);
  const [validityDays, setValidityDays] = useState(String(defaultValidityDays));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    await Promise.all([
      save('quoteTerms', terms),
      save('quoteValidityDays', validityDays),
    ]);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Validez por defecto (días)</label>
        <input
          type="number" min="1" max="365"
          value={validityDays}
          onChange={e => setValidityDays(e.target.value)}
          className="input w-32"
        />
      </div>
      <div>
        <label className="label">Términos y condiciones por defecto</label>
        <textarea
          rows={5}
          value={terms}
          onChange={e => setTerms(e.target.value)}
          placeholder="Ej: Esta cotización es válida por 30 días. Los precios están sujetos a cambio sin previo aviso..."
          className="input resize-none text-sm"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary disabled:opacity-50"
      >
        {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</>
          : saved ? <><Check size={13} /> Guardado</>
          : <><Save size={13} /> Guardar</>}
      </button>
    </div>
  );
}
