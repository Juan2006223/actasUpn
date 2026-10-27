import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, PenLine } from 'lucide-react';
import SignatureCanvasBox from './SignatureCanvasBox';

export default function SignaturePad({ open, onClose, onConfirm, userName }) {
    const boxRef = useRef(null);
    const [ready, setReady] = useState(false);

    if (!open) return null;

    const handleConfirm = () => {
        const data = boxRef.current?.getDataUrl(userName);
        if (data) onConfirm(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Firmar Acta</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-500">Dibuja tu firma o sube una imagen</p>
                    <SignatureCanvasBox ref={boxRef} width={360} height={150} onStateChange={setReady} />
                </div>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!ready}
                        className="px-5 py-2 text-sm font-bold bg-ilinyx-700 text-white rounded-xl hover:bg-ilinyx-800 shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        <PenLine className="h-4 w-4 inline mr-1.5" /> Confirmar firma
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
