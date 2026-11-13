import React, { useEffect, useRef } from 'react';
import { Clock, LogIn } from 'lucide-react';

/** Ventana que bloquea la pantalla cuando la sesión está por cerrarse o ya expiró. */
export default function AvisoSesion({ tipo, segundos, onSeguir, onSalir }) {
    const boton = useRef(null);
    useEffect(() => { boton.current?.focus(); }, [tipo]);

    const expirada = tipo === 'expirada';
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 no-print">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="aviso-sesion-titulo"
                aria-describedby="aviso-sesion-texto"
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4"
            >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${expirada ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {expirada ? <LogIn className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="space-y-1.5">
                    <h2 id="aviso-sesion-titulo" className="text-base font-bold text-slate-900">
                        {expirada ? 'Tu sesión expiró' : '¿Sigues ahí?'}
                    </h2>
                    <p id="aviso-sesion-texto" className="text-sm text-slate-600">
                        {expirada
                            ? 'Por seguridad debes iniciar sesión de nuevo. Lo que estabas escribiendo quedó guardado y podrás recuperarlo.'
                            : `Llevas casi 3 horas sin usar el aplicativo. Por seguridad, la sesión se cerrará en ${segundos ?? 60} segundos. Tu avance quedó guardado.`}
                    </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    {!expirada && (
                        <button type="button" onClick={onSalir}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                            Cerrar sesión
                        </button>
                    )}
                    <button ref={boton} type="button" onClick={expirada ? onSalir : onSeguir}
                        className="px-4 py-2 text-sm font-bold text-white bg-brand-blue hover:opacity-90 rounded-xl cursor-pointer">
                        {expirada ? 'Iniciar sesión' : 'Seguir conectado'}
                    </button>
                </div>
            </div>
        </div>
    );
}
