import React from 'react';
import {
    IconDocumentActas,
    IconCommunityAcuerdos,
    IconFolderArchivo,
} from '../../../../shared/components/ui/IconosMemorian';

export default function HeroCardBanner() {
    return (
        <div className="relative overflow-hidden bg-white rounded-4xl border border-slate-100 p-8 sm:p-9 lg:p-10 shadow-soft flex flex-col justify-between min-h-[500px] lg:min-h-[540px]">
            <img
                src="/img/upn-hero-bg.png"
                alt="Gestión de actas institucionales"
                className="absolute inset-y-0 right-0 w-full lg:w-[66%] h-full object-cover object-right pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-lg">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#06152d] tracking-tight leading-[1.12]">
                    Gestión de actas
                    <br />
                    institucionales
                </h1>
                <p className="text-sm sm:text-[15px] font-medium text-[#5c728a] mt-3">
                    Registro, seguimiento y consulta de decisiones institucionales.
                </p>

                <div className="w-11 h-1 bg-[#2272ff] rounded-full mt-4 mb-8" />

                <div className="space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#eef5ff] text-[#2272ff] flex items-center justify-center shrink-0">
                            <IconDocumentActas className="w-6 h-6" />
                        </div>
                        <div className="pt-0.5">
                            <h3 className="text-[15px] font-bold text-[#071630] leading-snug">Gestión documental</h3>
                            <p className="text-xs sm:text-[13px] text-[#6d8299] font-medium mt-0.5">
                                Elaboración y organización de actas.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#faefff] text-[#a82ffc] flex items-center justify-center shrink-0">
                            <IconCommunityAcuerdos className="w-6 h-6" />
                        </div>
                        <div className="pt-0.5">
                            <h3 className="text-[15px] font-bold text-[#071630] leading-snug">Seguimiento de acuerdos</h3>
                            <p className="text-xs sm:text-[13px] text-[#6d8299] font-medium mt-0.5">
                                Control de compromisos y responsables.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#fff7e8] text-[#ea8d15] flex items-center justify-center shrink-0">
                            <IconFolderArchivo className="w-6 h-6" />
                        </div>
                        <div className="pt-0.5">
                            <h3 className="text-[15px] font-bold text-[#071630] leading-snug">Archivo institucional</h3>
                            <p className="text-xs sm:text-[13px] text-[#6d8299] font-medium mt-0.5">
                                Consulta centralizada de actas y decisiones.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lema Grabado en el muro arquitectónico enfocado en Memorian */}
            <div className="absolute right-10 lg:right-16 top-1/2 -translate-y-4 z-10 pointer-events-none select-none text-right hidden sm:block">
                <p className="text-[12px] lg:text-[13px] font-black text-slate-500/80 tracking-[0.18em] leading-tight">
                    REGISTRO
                </p>
                <p className="text-[12px] lg:text-[13px] font-black text-slate-500/80 tracking-[0.18em] leading-tight mt-1">
                    ACUERDOS
                </p>
                <p className="text-[12px] lg:text-[13px] font-black text-slate-500/80 tracking-[0.18em] leading-tight mt-1">
                    MEMORIA
                </p>
            </div>

            <div className="relative z-10 pt-8 border-t border-slate-200/60">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6d8299]">
                    MEMORIAN · GESTIÓN INSTITUCIONAL
                </p>
                <p className="text-xs font-medium text-[#5c728a] mt-1">
                    Trazabilidad documental y continuidad de los procesos.
                </p>
            </div>
        </div>
    );
}
