import React, { useMemo, useState } from 'react';
import { analizarDirectorioCSV } from '../../dominio/usuarioModel';
import {
    IconBrandMemorian,
    IconUpload,
    IconCheckCircle,
    IconAlert,
} from '../../../../shared/components/ui/IconosMemorian';

export default function UsuarioCargaMasivaModal({ abierto, onCerrar, onImportarMasivo }) {
    const [filas, setFilas] = useState([]);
    const [nombreArchivo, setNombreArchivo] = useState('');
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState(null);

    const validas = useMemo(() => filas.filter((f) => f.errores.length === 0), [filas]);

    if (!abierto) return null;

    const leerArchivo = (file) => {
        if (!file) return;
        setError(null);
        setResultado(null);
        setFilas([]);
        setNombreArchivo(file.name);
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Guarda la hoja de Excel como CSV UTF-8 y selecciónala de nuevo.');
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => setError('No se pudo leer el archivo CSV.');
        reader.onload = () => {
            const analizadas = analizarDirectorioCSV(String(reader.result || ''));
            if (!analizadas.length) {
                setError('El CSV solo contiene encabezados o no tiene filas para cargar.');
                return;
            }
            setFilas(analizadas);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const descargarPlantilla = () => {
        const contenido = 'NOMBRES,APELLIDOS,DOCUMENTO,CORREO INSTITUCIONAL,CARGO,DEPENDENCIA,ROL\nAna Lucia,Garcia Restrepo,1172164,docente@pedagogica.edu.co,Docente,Facultad de Educación,REDACTOR\n';
        const url = URL.createObjectURL(new Blob(['\uFEFF', contenido], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_directorio_memorian.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const procesar = async () => {
        if (!validas.length) return;
        setCargando(true);
        setError(null);
        try {
            const res = await onImportarMasivo(
                validas.map((f) => ({
                    document_number: f.numeroDocumento,
                    email: f.emailInstitucional,
                    first_name: f.nombres,
                    last_name: f.apellidos,
                    cargo: f.cargo,
                    dependencia: f.dependencia,
                    role: f.role,
                }))
            );
            setResultado(res);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al procesar la carga masiva.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <section className="w-full max-w-2xl overflow-hidden rounded-4xl border border-slate-100 bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-2xs">
                            <IconBrandMemorian className="h-6 w-6" />
                        </span>
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Administración de accesos
                            </span>
                            <h3 className="text-sm font-black text-slate-900">
                                Autorizar usuarios desde CSV / Excel
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                        ✕
                    </button>
                </header>

                <div className="max-h-[82vh] space-y-4 overflow-y-auto p-6">
                    {error && (
                        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                            <IconAlert className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {resultado ? (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1 rounded-3xl border border-emerald-200/80 bg-emerald-50 p-4 text-center">
                                <IconCheckCircle className="mx-auto h-8 w-8 text-emerald-600" />
                                <h4 className="text-sm font-black text-emerald-900">Proceso de autorización finalizado</h4>
                                <p className="text-xs text-emerald-700">Los usuarios exitosos quedaron habilitados en el directorio.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[
                                    ['Procesados', resultado.totalProcesados],
                                    ['Autorizados', resultado.exitosos],
                                    ['Omitidos / errores', resultado.omitidos],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-[10px] font-black text-slate-400">{label}</p>
                                        <p className="text-lg font-black text-slate-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => { setResultado(null); setFilas([]); setNombreArchivo(''); }}
                                className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                                Cargar otro archivo
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-500">Selecciona el CSV exportado desde Excel.</p>
                                <button type="button" onClick={descargarPlantilla} className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer">
                                    Descargar plantilla CSV
                                </button>
                            </div>
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition hover:border-brand-blue/60 hover:bg-blue-50/30">
                                <IconUpload className="mb-2 h-8 w-8 text-brand-blue" />
                                <span className="text-xs font-bold text-slate-800">
                                    {nombreArchivo || 'Haz clic para seleccionar un archivo CSV'}
                                </span>
                                <span className="mt-1 text-[10px] text-slate-400">
                                    Columnas: NOMBRES, APELLIDOS, DOCUMENTO, CORREO INSTITUCIONAL, CARGO, DEPENDENCIA, ROL (REDACTOR, REVISOR o ADMIN; si se deja vacío queda REDACTOR). Las dependencias que no existan se crean.
                                </span>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="sr-only"
                                    onChange={(e) => { leerArchivo(e.target.files?.[0]); e.currentTarget.value = ''; }}
                                />
                            </label>
                            {filas.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <p className="font-bold text-slate-800">
                                            Vista previa: {validas.length} listas · {filas.length - validas.length} excluidas
                                        </p>
                                        <span className="text-slate-500">{filas.length} filas detectadas</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-100">
                                        {filas.map((f) => (
                                            <div key={`${f.linea}-${f.numeroDocumento}`} className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2 text-xs last:border-b-0">
                                                <span className="font-bold text-slate-800">
                                                    Fila {f.linea} · {f.numeroDocumento || 'S/D'} · {f.nombres} {f.apellidos}
                                                </span>
                                                <span className={f.errores.length ? 'text-rose-600' : 'text-emerald-700'}>
                                                    {f.errores.length ? f.errores.join(' ') : f.emailInstitucional}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={procesar}
                                        disabled={cargando || validas.length === 0}
                                        className="w-full rounded-xl bg-brand-blue px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
                                    >
                                        {cargando ? 'Autorizando registros…' : `Autorizar ${validas.length} usuarios en directorio`}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
