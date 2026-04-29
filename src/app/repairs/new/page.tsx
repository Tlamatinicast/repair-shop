'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, User, Smartphone, Wrench, Camera, Plus, X,
  FileText, Clock, Search, UserPlus, Loader2, Package, Shield,
  PenLine, RotateCcw, MessageCircle, Phone, Mail,
} from 'lucide-react';
import Link from 'next/link';
import { DEVICE_TYPES, REPAIR_STATUSES } from '@/lib/utils';

interface Customer { id: number; name: string; phone: string; email?: string | null; }

const MAX_PHOTOS = 15;

const ACCESSORIES_OPTIONS = [
  { id: 'NONE',     label: 'Ninguno / N.A.' },
  { id: 'CHARGER',  label: 'Cargador' },
  { id: 'CABLE',    label: 'Cable de corriente' },
  { id: 'CASE',     label: 'Funda' },
  { id: 'BOX',      label: 'Caja' },
  { id: 'ADAPTERS', label: 'Adaptadores' },
  { id: 'OTHER',    label: 'Otros' },
];

const CONDITION_OPTIONS = [
  { id: 'NONE',               label: 'Sin daños externos' },
  { id: 'BROKEN_SCREEN',      label: 'Pantalla rota' },
  { id: 'SCRATCHES',          label: 'Rayones' },
  { id: 'DENTS',              label: 'Golpes / abolladuras' },
  { id: 'MISSING_SCREWS',     label: 'Tornillos faltantes' },
  { id: 'WATER_DAMAGE',       label: 'Equipo mojado / humedad' },
  { id: 'PREVIOUSLY_OPENED',  label: 'Equipo previamente abierto' },
];

const SERVICE_TYPES = [
  { id: 'DIAGNOSIS',     label: 'Diagnóstico',        desc: 'El problema aún no se ha identificado' },
  { id: 'DIRECT_REPAIR', label: 'Reparación directa', desc: 'Ej. cambio de pantalla, batería' },
  { id: 'GENERAL_REVIEW',label: 'Revisión general',   desc: 'Limpieza, mantenimiento preventivo' },
];

export default function NewRepairPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Customer ──────────────────────────────────────────────────────────────
  const [customerTab, setCustomerTab]               = useState<'search' | 'new'>('search');
  const [customers, setCustomers]                   = useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded]       = useState(false);
  const [customerSearch, setCustomerSearch]         = useState('');
  const [showCustomers, setShowCustomers]           = useState(false);
  const [selectedCustomer, setSelectedCustomer]     = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName]       = useState('');
  const [newCustomerPhone, setNewCustomerPhone]     = useState('');
  const [newCustomerEmail, setNewCustomerEmail]     = useState('');
  const [creatingCustomer, setCreatingCustomer]     = useState(false);
  const [customerError, setCustomerError]           = useState('');

  // ── New fields ────────────────────────────────────────────────────────────
  const [contactPreference, setContactPreference]   = useState('');
  const [noPassword, setNoPassword]                 = useState(false);
  const [accessories, setAccessories]               = useState<string[]>([]);
  const [physicalCondition, setPhysicalCondition]   = useState<string[]>([]);
  const [physicalNotes, setPhysicalNotes]           = useState('');
  const [serviceType, setServiceType]               = useState('');
  const [authorizedDiagnosis, setAuthorizedDiagnosis] = useState(false);
  const [clientSignature, setClientSignature]       = useState('');

  // ── Signature pad ─────────────────────────────────────────────────────────
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const sigPadRef    = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    import('signature_pad').then(({ default: SignaturePad }) => {
      sigPadRef.current = new SignaturePad(canvasRef.current!, {
        backgroundColor: 'rgb(15,15,15)',
        penColor: '#f5f5f5',
        minWidth: 1,
        maxWidth: 2.5,
      });
      sigPadRef.current.addEventListener('endStroke', () => {
        setClientSignature(sigPadRef.current.toDataURL());
      });
    });
  }, []);

  const clearSignature = () => {
    sigPadRef.current?.clear();
    setClientSignature('');
  };

  // ── Initial photos ────────────────────────────────────────────────────────
  const [noteContent, setNoteContent]   = useState('');
  const [noteFiles, setNoteFiles]       = useState<File[]>([]);
  const [notePreviews, setNotePreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const addPhotos = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList).slice(0, MAX_PHOTOS - noteFiles.length);
    Promise.all(incoming.map(f => new Promise<string>(res => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    }))).then(urls => {
      setNoteFiles(prev => [...prev, ...incoming]);
      setNotePreviews(prev => [...prev, ...urls]);
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (i: number) => {
    setNoteFiles(prev => prev.filter((_, idx) => idx !== i));
    setNotePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleExclusive = (
    id: string,
    list: string[],
    setList: (v: string[]) => void,
    exclusiveId = 'NONE'
  ) => {
    if (id === exclusiveId) {
      setList([exclusiveId]);
    } else {
      const filtered = list.filter(i => i !== exclusiveId);
      setList(filtered.includes(id) ? filtered.filter(i => i !== id) : [...filtered, id]);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomer && customerTab === 'search') {
      setError('Selecciona o crea un cliente.');
      return;
    }
    if (!contactPreference) { setError('Selecciona el medio de contacto preferido.'); return; }
    if (accessories.length === 0) { setError('Indica los accesorios entregados (o "Ninguno").'); return; }
    if (physicalCondition.length === 0) { setError('Indica el estado físico del equipo.'); return; }
    if (!physicalCondition.includes('NONE') && !physicalNotes.trim()) {
      setError('Agrega observaciones del estado físico del equipo.');
      return;
    }
    if (!serviceType) { setError('Selecciona el tipo de servicio.'); return; }
    if (!authorizedDiagnosis) { setError('El cliente debe autorizar el servicio.'); return; }
    if (!clientSignature) { setError('Se requiere la firma del cliente.'); return; }

    setLoading(true);
    const form = e.currentTarget;
    const data: Record<string, any> = Object.fromEntries(new FormData(form).entries());

    if (selectedCustomer) data.customerId = selectedCustomer.id;
    data.contactPreference   = contactPreference;
    data.accessories         = JSON.stringify(accessories);
    data.physicalCondition   = JSON.stringify(physicalCondition);
    data.physicalNotes       = physicalNotes;
    data.serviceType         = serviceType;
    data.authorizedDiagnosis = authorizedDiagnosis;
    data.clientSignature     = clientSignature;
    data.password            = noPassword ? 'N/A' : (data.password || null);
    data.isDefinedService    = serviceType === 'DIRECT_REPAIR';

    try {
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

      if (noteContent.trim() || noteFiles.length > 0) {
        const noteForm = new FormData();
        noteForm.append('content', noteContent.trim() || 'Nota de recepción');
        noteForm.append('stage', 'RECEIVED');
        noteFiles.forEach((f, i) => noteForm.append(`photo_${i}`, f));
        await fetch(`/api/repairs/${id}/notes`, { method: 'POST', body: noteForm });
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
        <Link href="/repairs" className="btn-ghost"><ArrowLeft size={15} /></Link>
        <div>
          <p className="section-title mb-0.5">Reparaciones</p>
          <h1 className="page-title">Nueva orden de trabajo</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Cliente ── */}
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
                <button type="button"
                  onClick={() => { setCustomerTab('search'); setCustomerError(''); loadCustomers(); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${customerTab === 'search' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}>
                  <Search size={11} /> Buscar
                </button>
                <button type="button"
                  onClick={() => { setCustomerTab('new'); setCustomerError(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${customerTab === 'new' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}>
                  <UserPlus size={11} /> Nuevo
                </button>
              </div>

              {customerTab === 'search' ? (
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input type="text" value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomers(true); loadCustomers(); }}
                    onFocus={() => { setShowCustomers(true); loadCustomers(); }}
                    onBlur={() => setTimeout(() => setShowCustomers(false), 150)}
                    placeholder="Buscar por nombre o teléfono..." className="input pl-9" autoComplete="off" />
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

        {/* ── Contacto preferido ── */}
        <Section icon={<MessageCircle size={14} />} title="Medio de contacto preferido *">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'WHATSAPP', label: 'WhatsApp', icon: <MessageCircle size={14} /> },
              { id: 'CALL',     label: 'Llamada',  icon: <Phone size={14} /> },
              { id: 'EMAIL',    label: 'Correo',   icon: <Mail size={14} /> },
            ].map(opt => (
              <button key={opt.id} type="button"
                onClick={() => setContactPreference(opt.id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-all ${
                  contactPreference === opt.id
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-[#0f0f0f] border-[#1e1e1e] text-[#555] hover:text-[#888] hover:border-[#2a2a2a]'
                }`}>
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Dispositivo ── */}
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
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Contraseña / PIN del equipo *</label>
              <button type="button"
                onClick={() => setNoPassword(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all ${noPassword ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-[#555] hover:text-[#888]'}`}>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${noPassword ? 'bg-amber-500 border-amber-500' : 'border-[#444]'}`}>
                  {noPassword && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                Sin contraseña / N.A.
              </button>
            </div>
            {!noPassword && (
              <input name="password" type="text" placeholder="Ingresa la contraseña o patrón de desbloqueo" className="input" required />
            )}
          </div>
        </Section>

        {/* ── Accesorios ── */}
        <Section icon={<Package size={14} />} title="Accesorios entregados *">
          <div className="grid grid-cols-2 gap-2">
            {ACCESSORIES_OPTIONS.map(opt => (
              <button key={opt.id} type="button"
                onClick={() => toggleExclusive(opt.id, accessories, setAccessories)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${
                  accessories.includes(opt.id)
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-[#0f0f0f] border-[#1e1e1e] text-[#555] hover:text-[#888] hover:border-[#2a2a2a]'
                }`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${accessories.includes(opt.id) ? 'bg-amber-500 border-amber-500' : 'border-[#333]'}`}>
                  {accessories.includes(opt.id) && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Estado físico ── */}
        <Section icon={<Shield size={14} />} title="Estado físico del equipo *">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {CONDITION_OPTIONS.map(opt => (
              <button key={opt.id} type="button"
                onClick={() => toggleExclusive(opt.id, physicalCondition, setPhysicalCondition)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${
                  physicalCondition.includes(opt.id)
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-[#0f0f0f] border-[#1e1e1e] text-[#555] hover:text-[#888] hover:border-[#2a2a2a]'
                }`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${physicalCondition.includes(opt.id) ? 'bg-amber-500 border-amber-500' : 'border-[#333]'}`}>
                  {physicalCondition.includes(opt.id) && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
          <div>
            <label className="label">
              Observaciones{physicalCondition.includes('NONE') ? ' (opcional)' : ' *'}
            </label>
            <textarea
              value={physicalNotes}
              onChange={e => setPhysicalNotes(e.target.value)}
              rows={2}
              placeholder="Describe el estado físico con más detalle..."
              className="input resize-none"
            />
          </div>
        </Section>

        {/* ── Descripción del problema ── */}
        <Section icon={<Wrench size={14} />} title="Descripción del problema">
          <div className="space-y-4">
            <div>
              <label className="label">Problema reportado *</label>
              <textarea name="issue" required rows={3}
                placeholder="Describe el problema que reporta el cliente..."
                className="input resize-none" />
            </div>
            <div>
              <label className="label">Notas internas</label>
              <textarea name="notes" rows={2}
                placeholder="Notas para el técnico, solo visibles en el sistema"
                className="input resize-none" />
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
                <label className="label">Diagnóstico estimado (MXN)</label>
                <input name="diagnosisFee" type="number" step="0.01" min="0" placeholder="0.00" className="input" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Tipo de servicio ── */}
        <Section icon={<Wrench size={14} />} title="Tipo de servicio *">
          <div className="space-y-2">
            {SERVICE_TYPES.map(opt => (
              <button key={opt.id} type="button"
                onClick={() => setServiceType(opt.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                  serviceType === opt.id
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-[#0f0f0f] border-[#1e1e1e] text-[#888] hover:border-[#2a2a2a]'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${serviceType === opt.id ? 'border-amber-500' : 'border-[#333]'}`}>
                  {serviceType === opt.id && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-[#555]">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Tiempos ── */}
        <Section icon={<Clock size={14} />} title="Tiempos de servicio">
          <div className="space-y-4">
            <div>
              <label className="label">Fecha de entrada a diagnóstico *</label>
              <input name="queueDate" type="date" required className="input"
                min={new Date().toISOString().split('T')[0]} />
              <p className="text-[11px] text-[#555] mt-1">Fecha en que le comunicas al cliente que su equipo entrará a revisión.</p>
            </div>
            {serviceType === 'DIRECT_REPAIR' && (
              <div>
                <label className="label">Fecha estimada de entrega al cliente</label>
                <input name="dueDate" type="date" className="input"
                  min={new Date().toISOString().split('T')[0]} />
                <p className="text-[11px] text-[#555] mt-1">Opcional. Solo para servicios cuyo tiempo ya conoces.</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── Fotos de recepción (opcional) ── */}
        <Section icon={<FileText size={14} />} title="Fotos de recepción (opcional)">
          <div className="space-y-3">
            <p className="text-xs text-[#555]">Adjunta fotos del equipo al momento de recibirlo.</p>
            <div>
              <label className="label">Observaciones adicionales</label>
              <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
                rows={2} placeholder="Ej. Equipo llega con pantalla rota, sin cargador..."
                className="input resize-none" />
            </div>
            {notePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notePreviews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 flex-shrink-0">
                    <img src={src} className="w-full h-full object-cover rounded-lg border border-[#2a2a2a]" />
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] border border-[#333] rounded-full flex items-center justify-center text-[#888] hover:text-red-400">
                      <X size={9} />
                    </button>
                  </div>
                ))}
                {remaining > 0 && (
                  <button type="button" onClick={() => photoInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border border-dashed border-[#2a2a2a] flex flex-col items-center justify-center text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors">
                    <Plus size={14} />
                    <span className="text-[9px] mt-0.5">{remaining}</span>
                  </button>
                )}
              </div>
            )}
            {notePreviews.length === 0 && (
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-[#666] hover:text-amber-400 transition-colors py-1">
                <Camera size={14} /> Adjuntar fotos
                <span className="text-[10px] text-[#3a3a3a]">(máx. {MAX_PHOTOS})</span>
              </button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => addPhotos(e.target.files)} />
          </div>
        </Section>

        {/* ── Autorización y firma ── */}
        <Section icon={<PenLine size={14} />} title="Autorización y firma del cliente">
          <div className="space-y-4">
            <button type="button"
              onClick={() => setAuthorizedDiagnosis(v => !v)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${authorizedDiagnosis ? 'bg-amber-500/10 border-amber-500/40' : 'bg-[#0f0f0f] border-[#1e1e1e]'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${authorizedDiagnosis ? 'bg-amber-500 border-amber-500' : 'border-[#444]'}`}>
                {authorizedDiagnosis && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <div>
                <p className={`text-sm font-medium ${authorizedDiagnosis ? 'text-amber-400' : 'text-[#888]'}`}>
                  Autorizo el diagnóstico y los servicios indicados
                </p>
                <p className="text-xs text-[#555] mt-0.5">
                  El cliente acepta los términos, el presupuesto estimado y posibles cargos adicionales por piezas.
                </p>
              </div>
            </button>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Firma del cliente *</label>
                <button type="button" onClick={clearSignature}
                  className="flex items-center gap-1 text-xs text-[#555] hover:text-[#888] transition-colors">
                  <RotateCcw size={11} /> Limpiar
                </button>
              </div>
              <div className={`rounded-lg border overflow-hidden transition-colors ${clientSignature ? 'border-amber-500/30' : 'border-[#2a2a2a]'}`}>
                <canvas ref={canvasRef} width={600} height={160}
                  className="w-full touch-none bg-[#0f0f0f]"
                  style={{ height: '160px' }} />
              </div>
              {!clientSignature && (
                <p className="text-[11px] text-[#444] mt-1.5 text-center">Pide al cliente que firme en el recuadro</p>
              )}
              {clientSignature && (
                <p className="text-[11px] text-amber-500/70 mt-1.5 text-center">✓ Firma capturada</p>
              )}
            </div>
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
