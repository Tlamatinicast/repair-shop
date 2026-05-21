'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, X, AlertCircle } from 'lucide-react';

export function QrScannerButton() {
  const [open, setOpen]       = useState(false);
  const [error, setError]     = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef            = useRef<any>(null);
  const router                = useRouter();
  const CONTAINER_ID          = 'qr-reader-container';

  // Arrancar / detener escáner según si el modal está abierto
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const start = async () => {
      setError('');
      setScanning(false);

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode(CONTAINER_ID);
        scannerRef.current = scanner;

        const onDecode = (decoded: string) => handleDecoded(decoded, scanner);
        const onError  = () => { /* ignorar errores de frame */ };
        const config   = { fps: 10, qrbox: { width: 240, height: 240 } };

        // 'ideal' nunca lanza error — es solo una sugerencia al navegador.
        // En iOS, pedir alta resolución tiende a activar el sensor principal.
        await scanner.start(
          { facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } },
          config, onDecode, onError,
        );

        if (!cancelled) setScanning(true);
      } catch (e: any) {
        if (!cancelled) setError('No se pudo acceder a la cámara. Verifica los permisos.');
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); }    catch {}
      scannerRef.current = null;
    }
  };

  const handleDecoded = async (text: string, scanner: any) => {
    // Detener antes de navegar para liberar la cámara
    try { await scanner.stop(); } catch {}
    try { scanner.clear(); }      catch {}
    scannerRef.current = null;

    setOpen(false);

    // Extraer la ruta interna del QR (puede venir como URL completa o solo path)
    try {
      const url  = new URL(text);
      router.push(url.pathname);
    } catch {
      // Si no es una URL válida, intentar como ruta directa
      if (text.startsWith('/')) {
        router.push(text);
      } else {
        setError(`QR no reconocido: ${text}`);
        setOpen(true);
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Botón en el dashboard */}
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary"
        title="Escanear código QR"
      >
        <QrCode size={15} />
        <span className="hidden sm:inline">Escanear</span>
      </button>

      {/* Modal del escáner */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm">

            {/* Header del modal */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="section-title mb-0.5">Lector QR</p>
                <h2 className="text-white font-semibold text-lg">Escanear orden</h2>
              </div>
              <button
                onClick={handleClose}
                className="text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenedor de la cámara */}
            <div className="relative rounded-2xl overflow-hidden bg-[#111] border border-[#222]">
              <div id={CONTAINER_ID} className="w-full" />

              {/* Overlay de guía mientras carga */}
              {!scanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                  <div className="text-center">
                    <QrCode size={40} className="text-[#333] mx-auto mb-3" />
                    <p className="text-[#555] text-sm">Iniciando cámara...</p>
                  </div>
                </div>
              )}

              {/* Marco de enfoque */}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-amber-400/60 rounded-xl" />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <p className="text-center text-white/30 text-xs mt-4">
              Apunta al código QR de la etiqueta de la orden
            </p>
          </div>
        </div>
      )}
    </>
  );
}
