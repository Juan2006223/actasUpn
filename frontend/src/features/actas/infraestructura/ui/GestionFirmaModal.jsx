import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Save, PenLine } from 'lucide-react';
import SignatureCanvasBox from './SignatureCanvasBox';

export default function GestionFirmaModal({ firmaActual, onSave, onDelete, onClose }) {
    const boxRef = useRef(null);
    const [ready, setReady] = useState(false);

    const handleSave = () => {
        const data = boxRef.current?.getDataUrl(null);
        if (data) onSave(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                        <PenLine className="h-4 w-4 text-ilinyx-600" /> Mi Firma Personal
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-500">Tu firma se guardará para firmar actas con un solo clic.</p>
                    {firmaActual && (
                        <div className="border-2 border-emerald-200 rounded-xl p-4 bg-emerald-50">
                            <p className="text-xs font-bold text-emerald-700 mb-2">Firma actual guardada:</p>
                            <img src={firmaActual} alt="Mi firma" className="max-h-[100px] mx-auto bg-white rounded-lg p-2 shadow-sm" />
                        </div>
                    )}
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        {firmaActual ? 'Reemplazar con nueva firma:' : 'Dibuja o sube tu firma:'}
                    </p>
                    <SignatureCanvasBox ref={boxRef} width={400} height={160} onStateChange={setReady} />
                </div>
                <div className="flex justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
                    <div>
                        {firmaActual && (
                            <button onClick={onDelete} className="px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl">
                                Eliminar firma
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                        <button onClick={handleSave} disabled={!ready}
                            className="px-5 py-2 text-sm font-bold bg-ilinyx-700 text-white rounded-xl hover:bg-ilinyx-800 shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <Save className="h-4 w-4 inline mr-1.5" /> Guardar firma
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
