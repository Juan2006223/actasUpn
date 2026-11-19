import React from 'react';
import { ESTADOS_ACTA } from '../../dominio/actaModel';

export default function EstadoActaBadge({ estado, pequeno = false }) {
    const cfg = ESTADOS_ACTA[estado] || ESTADOS_ACTA.BORRADOR;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-black border ${cfg.clase} ${
            pequeno ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-0.5'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.punto}`} />
            {cfg.label}
        </span>
    );
}
