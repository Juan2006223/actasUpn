import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Upload } from 'lucide-react';

const SignatureCanvasBox = forwardRef(function SignatureCanvasBox({ width = 380, height = 150, onStateChange }, ref) {
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState(null);

    const updateReady = (drawn, url) => onStateChange?.(Boolean(drawn || url));

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const t = e.touches?.[0] || e;
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const startDraw = (e) => {
        e.preventDefault();
        setDrawing(true);
        const ctx = canvasRef.current.getContext('2d');
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };

    const draw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const p = getPos(e);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        setHasDrawn(true);
        updateReady(true, uploadedUrl);
    };

    const stopDraw = () => setDrawing(false);

    const clearCanvas = () => {
        if (canvasRef.current) {
            canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setHasDrawn(false);
        setUploadedUrl(null);
        updateReady(false, null);
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setUploadedUrl(ev.target.result);
            setHasDrawn(false);
            updateReady(false, ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    useImperativeHandle(ref, () => ({
        getDataUrl: (fallback = null) => uploadedUrl || (hasDrawn && canvasRef.current ? canvasRef.current.toDataURL('image/png') : fallback),
    }));

    return (
        <div className="space-y-3">
            {!uploadedUrl ? (
                <div className="relative">
                    <canvas ref={canvasRef} width={width} height={height}
                        className="w-full border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-crosshair touch-none"
                        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                    {!hasDrawn && <p className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none">Dibuja aquí con el dedo o mouse</p>}
                </div>
            ) : (
                <div className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                    <img src={uploadedUrl} alt="Firma" className="max-h-[140px] mx-auto" />
                </div>
            )}
            <div className="flex items-center gap-3">
                <button type="button" onClick={clearCanvas} className="text-xs text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100">Limpiar</button>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ilinyx-600 hover:text-ilinyx-800 px-3 py-1.5 rounded-lg hover:bg-ilinyx-50 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" /> Subir imagen
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
            </div>
        </div>
    );
});

export default SignatureCanvasBox;
