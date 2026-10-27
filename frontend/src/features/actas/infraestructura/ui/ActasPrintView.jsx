import React, { useState, useMemo } from 'react';
import { ChevronLeft, Download } from 'lucide-react';
import { sincronizarFirmasConParticipantes } from '../../dominio/actaModel';
import { actaPrintStyles, paginateActa } from './actaPrintStyles';

const INLINE_ACTA_STYLE = `@media print{body *{visibility:hidden!important}.no-print{display:none!important}#print-acta,#print-acta *{visibility:visible!important}#print-acta{position:absolute;left:0;top:0;width:100%!important;max-width:none!important;box-shadow:none!important}@page{size:letter;margin:1.5cm}}#print-acta{font-family:Arial,sans-serif;letter-spacing:0}#print-acta table{border-collapse:collapse;width:100%;table-layout:fixed;border:1px solid #000}#print-acta>table{outline:1px solid #000;outline-offset:3px;margin:3px;width:calc(100% - 6px)}#print-acta td,#print-acta th{border:1px solid #000;padding:4px 6px;vertical-align:top;word-break:break-word}#print-acta .sec{background:#bfbfbf;font-weight:bold;padding:4px 6px;border:1px solid #000;margin-top:6px}#print-acta .sec+table{border-top:0}#print-acta .hdr{background:#bfbfbf;font-weight:bold}#print-acta .meta{font-weight:bold;text-align:center}.print-running-header{display:none}@media print{#print-acta{padding-top:0!important}.screen-header{display:none!important}.print-running-header{display:block;position:fixed;top:0;left:0;right:0;height:3.2cm;background:#fff;z-index:100}.print-running-header table{width:100%;margin:0!important;outline:none!important;border:1px solid #000!important}.print-running-header td{padding:3px 5px!important}.print-running-header .page-label::after{content:counter(page) " de " counter(pages)}@page{size:letter;margin:4cm 1.5cm 1.5cm}}`;

function Sec({ n, t }) {
    return <div className={`sec sec-${n}`}>{n}. {t}:</div>;
}

function PeoplePrint({ n, title, rows = [] }) {
    const cleanRows = (rows || []).filter(r => r && (r.nombre || r.cargo));
    const displayRows = [...(cleanRows.length ? cleanRows : [{ nombre: 'N/A', cargo: '' }])];
    while (displayRows.length < 6) displayRows.push({ nombre: '', cargo: '' });
    return (
        <>
            <Sec n={n} t={title} />
            <table>
                <thead>
                    <tr>
                        <th className="hdr">Nombres</th>
                        <th className="hdr">Cargo/Dependencia</th>
                    </tr>
                </thead>
                <tbody>
                    {displayRows.map((r, i) => (
                        <tr key={i} style={{ height: 24 }}>
                            <td>{r.nombre}</td>
                            <td>{r.cargo}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

export function OfficialActa({ acta, compact = false }) {
    const firmas = useMemo(() => sincronizarFirmasConParticipantes(acta), [acta]);
    return (
        <div id="print-acta" className={`bg-white text-black shadow-sm ${compact ? 'w-[720px] p-6 text-[14px]' : 'mx-auto w-[816px] max-w-full p-8 text-[14px]'}`}>
            <style>{INLINE_ACTA_STYLE}</style>
            <div className="print-running-header">
                <table><tbody>
                    <tr>
                        <td rowSpan={2} className="text-center align-middle" style={{ width: '30%' }}>
                            <img src="/upn-logo.png" alt="Universidad Pedagógica Nacional" style={{ height: 58, maxWidth: '100%', objectFit: 'contain', margin: 'auto' }} />
                        </td>
                        <td className="text-center font-bold" style={{ fontSize: 14 }}>FORMATO</td>
                    </tr>
                    <tr><td className="text-center font-bold" style={{ fontSize: 14 }}>ACTA DE REUNIÓN / RESUMEN DE REUNIÓN</td></tr>
                    <tr><td colSpan={2} className="p-0"><table><tbody><tr><td className="meta">Código: FOR023GDC</td><td className="meta">Versión: 03</td></tr></tbody></table></td></tr>
                    <tr><td colSpan={2} className="p-0"><table><tbody><tr><td className="meta">Fecha de Aprobación: 22-03-2012</td><td className="meta">Página <span className="page-label"></span></td></tr></tbody></table></td></tr>
                </tbody></table>
            </div>

            <table className="screen-header"><tbody>
                <tr>
                    <td rowSpan={2} className="text-center align-middle" style={{ width: '30%' }}>
                        <img src="/upn-logo.png" alt="Universidad Pedagógica Nacional" style={{ height: compact ? 58 : 82, maxWidth: '100%', objectFit: 'contain', margin: 'auto' }} />
                    </td>
                    <td className="text-center font-bold" style={{ fontSize: compact ? 14 : 16 }}>FORMATO</td>
                </tr>
                <tr><td className="text-center font-bold" style={{ fontSize: 14 }}>ACTA DE REUNIÓN / RESUMEN DE REUNIÓN</td></tr>
                <tr><td colSpan={2} className="p-0"><table><tbody><tr><td className="meta">Código: FOR023GDC</td><td className="meta">Versión: 03</td></tr></tbody></table></td></tr>
                <tr><td colSpan={2} className="p-0"><table><tbody><tr><td className="meta">Fecha de Aprobación: 22-03-2012</td><td className="meta">Página 1 de 4</td></tr></tbody></table></td></tr>
            </tbody></table>

            <p className="my-2 text-center font-bold">Marque según corresponda (*):</p>
            <p className="mb-2 text-center">
                <span className="border border-black px-2">{acta.tipo === 'ACTA' ? 'X' : ' '}</span> ACTA DE REUNIÓN&nbsp;&nbsp;
                <span className="border border-black px-2">{acta.tipo === 'RESUMEN' ? 'X' : ' '}</span> RESUMEN DE REUNIÓN
            </p>

            <table>
                <colgroup><col style={{ width: '30%' }} /><col style={{ width: '22%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /></colgroup>
                <tbody>
                    <tr><td colSpan={6} className="text-center font-bold">Acta / Resumen de Reunión No. {acta.numero || '___'} de {acta.total || '___'}</td></tr>
                    <tr><td colSpan={6} className="sec">1. Información General:</td></tr>
                    <tr>
                        <td style={{ width: '26%', background: '#bfbfbf' }}>Fecha</td>
                        <td style={{ width: '25%' }}>{acta.fecha}</td>
                        <td style={{ width: '12%', background: '#bfbfbf', textAlign: 'center' }}>Hora de<br />inicio:</td>
                        <td style={{ width: '12%' }}>{acta.hora_inicio}</td>
                        <td style={{ width: '12%', background: '#bfbfbf' }}>Hora final:</td>
                        <td style={{ width: '15%' }}>{acta.hora_final}</td>
                    </tr>
                    <tr><td style={{ width: '30%', minWidth: 190, background: '#bfbfbf', whiteSpace: 'nowrap' }}>Instancias o<br />Dependencias reunidas:</td><td colSpan={5}>{acta.instancias}</td></tr>
                    <tr><td style={{ background: '#bfbfbf' }}>Lugar de la reunión:</td><td colSpan={5}>{acta.lugar}</td></tr>
                </tbody>
            </table>

            <PeoplePrint n="2" title="Asistentes" rows={acta.asistentes} />
            <PeoplePrint n="3" title="Ausentes" rows={acta.ausentes} />
            <PeoplePrint n="4" title="Invitados" rows={acta.invitados} />

            <Sec n="5" t="Orden del Día" />
            <table><tbody><tr><td className="whitespace-pre-wrap" style={{ minHeight: 72 }}>{acta.orden_dia}</td></tr></tbody></table>

            <Sec n="6" t="Desarrollo del Orden del Día" />
            <table><tbody><tr><td className="whitespace-pre-wrap" style={{ minHeight: 120 }}>{acta.desarrollo}</td></tr></tbody></table>

            <Sec n="7" t="Compromisos" />
            <table>
                <thead><tr><th className="hdr">Compromiso</th><th className="hdr">Responsable</th><th className="hdr">Fecha (dd-mm-aaaa)</th></tr></thead>
                <tbody>{(acta.compromisos || []).map((c, i) => <tr key={i}><td>{c.compromiso}</td><td>{c.responsable}</td><td>{c.fecha}</td></tr>)}</tbody>
            </table>

            <Sec n="8" t="Próxima Convocatoria" />
            <table><tbody><tr><td className="whitespace-pre-wrap">{acta.proxima_convocatoria}</td></tr></tbody></table>

            <Sec n="9" t="Anexos" />
            <table><tbody><tr><td className="whitespace-pre-wrap">{acta.anexos}</td></tr></tbody></table>

            <Sec n="10" t="Firmas" />
            <table>
                <thead><tr><th className="hdr">Nombre</th><th className="hdr">Firma</th></tr></thead>
                <tbody>
                    {firmas.length === 0
                        ? <tr><td style={{ height: 32 }} /><td /></tr>
                        : firmas.map((f, i) => (
                            <tr key={i}>
                                <td>{f.nombre}</td>
                                <td>{f.firmado && f.firma?.startsWith('data:') ? <img src={f.firma} alt="Firma" style={{ maxHeight: 40, maxWidth: 140 }} /> : f.firmado ? 'Firmado' : 'Pendiente'}</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>

            <p className="mt-3 text-[10px]">
                <b>(*) Acta de Reunión:</b> Corresponde a aquellas reuniones que, de conformidad con las disposiciones vigentes en la Universidad, contemplan la elaboración de actas. <b>Resumen de Reunión:</b> Se aplica en los demás casos.
            </p>
        </div>
    );
}

export default function ActasPrintView({ acta, onBack }) {
    const [generating, setGenerating] = useState(false);

    const downloadPdf = async () => {
        const source = document.getElementById('print-acta');
        if (!source || generating) return;
        setGenerating(true);
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:816px;height:1056px;border:0';
        document.body.appendChild(frame);
        try {
            const doc = frame.contentDocument;
            doc.open();
            doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Acta FOR023GDC</title><style>' + actaPrintStyles + '</style></head><body></body></html>');
            doc.close();
            const printable = source.cloneNode(true);
            printable.removeAttribute('id');
            printable.querySelectorAll('style').forEach(style => style.remove());
            printable.style.cssText = 'position:absolute;left:-10000px;width:185.9mm';
            [...printable.querySelectorAll('img')].forEach((img, index) => {
                img.src = source.querySelectorAll('img')[index].src;
            });
            doc.body.append(printable);
            await Promise.all([...doc.images].map(img => img.decode().catch(() => {})));
            await doc.fonts.ready;
            paginateActa(printable, doc);
            printable.remove();
            frame.contentWindow.onafterprint = () => frame.remove();
            frame.contentWindow.focus();
            frame.contentWindow.print();
        } catch (error) {
            frame.remove();
            window.alert('No se pudo preparar el PDF: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl">
            <div className="no-print mb-4 flex items-center gap-2.5">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition">
                    <ChevronLeft size={16} /> Volver
                </button>
                <button type="button" onClick={downloadPdf} disabled={generating} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md cursor-pointer transition disabled:opacity-60">
                    <Download size={16} /> {generating ? 'Preparando PDF...' : 'Imprimir / guardar PDF'}
                </button>
            </div>
            <OfficialActa acta={acta} />
        </div>
    );
}
