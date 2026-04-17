'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Smartphone, Wrench, Camera, Plus, X, FileText, Clock, Search, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DEVICE_TYPES, REPAIR_STATUSES } from '@/lib/utils';

interface Customer { id: number; name: string; phone: string; email?: string | null; }

const MAX_PHOTOS = 15;

export default function NewRepairPage() {
  const router = useRouter();
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [isDefinedService, setIsDefinedService] = useState(false);

  // Customer
  const [customerTab, setCustomerTab]         = useState<'search' | 'new'>('search');
  const [customers, setCustomers]             = useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [customerSearch, setCustomerSearch]   = useState('');
  const [showCustomers, setShowCustomers]     = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName]   = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError]       = useState('');

  const loadCustomers = () => {
    if (customersLoaded) return;
    fetch('/api/customers').then(r => r.json()).then(data => {
      setCustomers(data);
      setCustomersLoaded(true);
    });
  };

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      ).slice(0, 6)
    : [];

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setCustomerError('Nombre y teléfono son requeridos.');
      return;
    }
    setCreatingCustomer(true);
    setCustomerError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim(), email: newCustomerEmail.trim() || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const created = await res.json();
      setSelectedCustomer({ id: created.id, name: created.name, phone: created.phone });
      setCustomers(prev => [...prev, created]);
      setNewCustomerName(''); setNewCustomerPhone(''); setNewCustomerEmail('');
      setCustomerTab('search');
    } catch (err: any) {
      setCustomerError(err.message);
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Initial note state
  const [noteContent, setNoteContent]   = useState('');
  const [noteFiles, setNoteFiles]       = useState<File[]>([]);
  const [notePreviews, setNotePreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Photo picker helpers ───────────────────────────────────────────────────

  const addPhotos = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList).slice(0, MAX_PHOTOS - noteFiles.length);
    const readers  = incoming.map(f => new Promise<string>(res => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(urls => {
      setNoteFiles(prev => [...prev, ...incoming]);
      setNotePreviews(prev => [...prev, ...urls]);
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (i: number) => {
    setNoteFiles(prev => prev.filter((_, idx) => idx !== i));
    setNotePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Form submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!selectedCustomer && customerTab === 'search') {
      setError('Selecciona o crea un cliente.');
      setLoading(false);
      return;
    }

    const form = e.currentTarget;
    const data: Record<string, any> = Object.fromEntries(new FormData(form).entries());
    data.isDefinedService = isDefinedService;
    if (selectedCustomer) data.customerId = selectedCustomer.id;

    try {
      // 1. Create the repair
      const repairRes = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!repairRes.ok) {
        const err = await repairRes.json();
        throw new Error(err.error || 'Error al crear la orden');
      }
      const { id } = await repairRes.json();

      // 2. If there's an initial note (content or photos), create it
      if (noteContent.trim() || noteFiles.length > 0) {
        const noteForm = new FormData();
        noteForm.append('content', noteContent.trim() || 'Nota de recepción');
        noteForm.append('stage', 'RECEIVED');
        noteFiles.forEach((f, i) => noteForm.append(`photo_${i}`, f));

        await fetch(`/api/repairs/${id}/notes`, {
          method: 'POST',
          body: noteForm,
        });
        // Note creation errors are non-blocking — repair was already created
      }

      router.push(`/repairs/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const remaining = MAX_PHOTOS - noteFiles.length;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/repairs" className="btn-ghost">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <p className="section-title mb-0.5">Reparaciones</p>
          <h1 className="page-title">Nueva orden de trabajo</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Customer ── */}
        <Section icon={<User size={14} />} title="Cliente">
          {selectedCustomer ? (
            <div className="flex items-center gap-3 p-3 bg-[#0f0f0f] rounded-lg border border-[#1e1e1e]">
              <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 font-bold text-sm flex-shrink-0">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#ddd]">{selectedCustomer.name}</p>
                <p className="text-xs text-[#555] font-mono">{selectedCustomer.phone}</p>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="text-[#444] hover:text-red-400 transition-colors">
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-3 bg-[#0a0a0a] rounded-lg p-1">
                <button type="button" onClick={() => { setCustomerTab('search'); setCustomerError(''); loadCustomers(); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${customerTab === 'search' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}>
                  <Search size={11} /> Buscar
                </button>
                <button type="button" onClick={() => { setCustomerTab('new'); setCustomerError(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${customerTab === 'new' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}>
                  <UserPlus size={11} /> Nuevo
                </button>
              </div>

              {customerTab === 'search' ? (
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomers(true); loadCustomers(); }}
                    onFocus={() => { setShowCustomers(true); loadCustomers(); }}
                    onBlur={() => setTimeout(() => setShowCustomers(false), 150)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="input pl-9"
                    autoComplete="off"
                  />
                  {showCustomers && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-xl">
                      {filteredCustomers.map(c => (
                        <button key={c.id} type="button"
                          onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomers(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a1a] text-left">
                          <div className="w-6 h-6 bg-amber-500/20 rounded-md flex items-center justify-center text-amber-500 text-xs font-bold flex-shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-[#ddd]">{c.name}</p>
                            <p className="text-xs text-[#555] font-mono">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Nombre completo *" className="input" />
                    <input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="Teléfono *" className="input" type="tel" />
                  </div>
                  <input value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} placeholder="Correo electrónico (opcional)" className="input" type="email" />
                  {customerError && <p className="text-xs text-red-400">{customerError}</p>}
                  <button type="button" onClick={handleCreateCustomer} disabled={creatingCustomer} className="btn-primary w-full justify-center py-2 text-sm disabled:opacity-40">
                    {creatingCustomer ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : <><UserPlus size={13} /> Crear y seleccionar</>}
                  </button>
                </div>
              )}
            </>
          )}
        </Section>

        {/* ── Device ── */}
        <Section icon={<Smartphone size={14} />} title="Información del dispositivo">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de dispositivo *</label>
              <select name="deviceType" className="select" required>
                <option value="">Seleccionar...</option>
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="Marca *" name="deviceBrand" placeholder="Ej. Apple, Dell, Sony" required />
            <Field label="Modelo *" name="deviceModel" placeholder="Ej. MacBook Pro 13 2020" required />
            <Field label="Número de serie" name="serialNumber" placeholder="Ej. C02XF3HVJGHJ" />
            <Field label="Contraseña / PIN del equipo" name="password" placeholder="Solo si aplica" />
          </div>
        </Section>

        {/* ── Issue ── */}
        <Section icon={<Wrench size={14} />} title="Descripción del problema">
          <div className="space-y-4">
            <div>
              <label className="label">Problema reportado *</label>
              <textarea
                name="issue"
                required
                rows={3}
                placeholder="Describe el problema que reporta el cliente..."
                className="input resize-none"
              />
            </div>
            <div>
              <label className="label">Notas internas</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Notas para el técnico, observaciones físicas, etc."
                className="input resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Estado inicial</label>
                <select name="status" className="select" defaultValue="RECEIVED">
                  {Object.entries(REPAIR_STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Costo estimado (MXN)</label>
                <input name="laborCost" type="number" step="0.01" min="0" placeholder="0.00" className="input" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Dates ── */}
        <Section icon={<Clock size={14} />} title="Tiempos de servicio">
          <div className="space-y-4">
            <div>
              <label className="label">Fecha de entrada a diagnóstico *</label>
              <input
                name="queueDate"
                type="date"
                required
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-[11px] text-[#555] mt-1">Fecha en que le comunicas al cliente que su equipo entrará a revisión.</p>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] cursor-pointer" onClick={() => setIsDefinedService(v => !v)}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isDefinedService ? 'bg-amber-500 border-amber-500' : 'border-[#444]'}`}>
                {isDefinedService && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <div>
                <p className="text-sm text-[#ccc]">Servicio ya definido (sin diagnóstico)</p>
                <p className="text-[11px] text-[#555]">Ej. cambio de pantalla, cambio de batería, limpieza</p>
              </div>
            </div>
            <input type="hidden" name="isDefinedService" value={String(isDefinedService)} />

            {isDefinedService && (
              <div>
                <label className="label">Fecha estimada de entrega al cliente</label>
                <input
                  name="dueDate"
                  type="date"
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-[11px] text-[#555] mt-1">Opcional. Solo para servicios cuyo tiempo de reparación ya conoces.</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── Initial note (optional) ── */}
        <Section icon={<FileText size={14} />} title="Nota de recepción (opcional)">
          <div className="space-y-3">
            <p className="text-xs text-[#555]">
              Agrega una nota y fotos del equipo al momento de recibirlo. Se registrará como entrada en el historial.
            </p>
            <div>
              <label className="label">Observaciones de recepción</label>
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                rows={2}
                placeholder="Ej. Equipo con pantalla rota, sin cargador, con golpe en esquina inferior..."
                className="input resize-none"
              />
            </div>

            {/* Photo thumbnails */}
            {notePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notePreviews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 flex-shrink-0">
                    <img src={src} className="w-full h-full object-cover rounded-lg border border-[#2a2a2a]" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] border border-[#333] rounded-full flex items-center justify-center text-[#888] hover:text-red-400"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border border-dashed border-[#2a2a2a] flex flex-col items-center justify-center text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                  >
                    <Plus size={14} />
                    <span className="text-[9px] mt-0.5">{remaining}</span>
                  </button>
                )}
              </div>
            )}

            {notePreviews.length === 0 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-[#666] hover:text-amber-400 transition-colors py-1"
              >
                <Camera size={14} /> Adjuntar fotos de recepción
                <span className="text-[10px] text-[#3a3a3a]">(máx. {MAX_PHOTOS})</span>
              </button>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => addPhotos(e.target.files)}
            />
          </div>
        </Section>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/repairs" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            <Save size={14} />
            {loading ? 'Guardando...' : 'Crear orden'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1a1a1a]">
        <span className="text-amber-500">{icon}</span>
        <h2 className="text-sm font-semibold text-[#ccc]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, name, type = 'text', placeholder, required }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} placeholder={placeholder} required={required} className="input" />
    </div>
  );
}
