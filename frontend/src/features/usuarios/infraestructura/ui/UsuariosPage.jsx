import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../auth/aplicacion/AuthContext';
import { useUsuarios } from '../../aplicacion/useUsuarios';
import * as usuariosApi from '../api/usuariosApi';
import { IconUpload } from '../../../../shared/components/ui/IconosMemorian';
import UsuarioFiltrosBar from './UsuarioFiltrosBar';
import UsuariosTabla from './UsuariosTabla';
import InvitacionesTabla from './InvitacionesTabla';
import UsuarioRolModal from './UsuarioRolModal';
import UsuarioNuevoModal from './UsuarioNuevoModal';
import UsuarioCargaMasivaModal from './UsuarioCargaMasivaModal';
import DependenciasPanel from './DependenciasPanel';

export default function UsuariosPage() {
    const { user } = useAuth();
    const {
        usuarios,
        todosLosUsuarios,
        resumenRoles,
        cargando,
        error,
        busqueda,
        setBusqueda,
        rolFiltro,
        setRolFiltro,
        procesandoId,
        actualizarPerfil,
        dependencias,
        crearDependencia,
        actualizarDependencia,
        eliminarDependencia,
        alternarEstado,
        crearUsuario,
        importarMasivo,
    } = useUsuarios(usuariosApi);

    const [pestanaActiva, setPestanaActiva] = useState('usuarios');
    const [usuarioModalRol, setUsuarioModalRol] = useState(null);
    const [modalPreRegistro, setModalPreRegistro] = useState(false);
    const [modalCargaMasiva, setModalCargaMasiva] = useState(false);
    const [seleccionados, setSeleccionados] = useState([]);

    const toggleSeleccion = (id) => {
        setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    if (user && user.role !== 'ADMIN') {
        return <Navigate to="/actas" replace />;
    }

    const pendientes = todosLosUsuarios.filter((u) => u.is_active === false);
    const metricas = [
        { label: 'Total Usuarios', valor: resumenRoles.total, color: 'text-slate-800' },
        { label: 'Redactores', valor: resumenRoles.redactores, color: 'text-emerald-700' },
        { label: 'Revisores', valor: resumenRoles.revisores, color: 'text-purple-700' },
        { label: 'Invitaciones Pendientes', valor: resumenRoles.pendientesInvitaciones, color: 'text-amber-600' },
    ];

    return (
        <div className="space-y-5">
            {/* Header de la sección */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Usuarios del Sistema &amp; Gestión de Roles
                    </h1>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        Administración de accesos, permisos y perfiles institucionales
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setModalCargaMasiva(true)}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                    >
                        <IconUpload className="w-4 h-4 text-brand-blue" />
                        <span>Carga Masiva (Excel / CSV)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setModalPreRegistro(true)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-blue hover:bg-blue-600 active:scale-[0.99] rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                        <span>+ Invitar</span>
                    </button>
                </div>
            </div>

            {/* Métricas rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {metricas.map((m) => (
                    <div key={m.label} className="bg-card rounded-4xl border border-slate-100/90 shadow-soft p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase">{m.label}</p>
                        <p className={`text-xl font-black mt-1 ${m.color}`}>{m.valor}</p>
                    </div>
                ))}
            </div>

            {/* Pestañas principales */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                <button
                    type="button"
                    onClick={() => setPestanaActiva('usuarios')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        pestanaActiva === 'usuarios' ? 'bg-brand-blue text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    Usuarios Activos ({todosLosUsuarios.length})
                </button>
                <button
                    type="button"
                    onClick={() => setPestanaActiva('invitaciones')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
                        pestanaActiva === 'invitaciones' ? 'bg-brand-blue text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    <span>Invitaciones Enviadas</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${pestanaActiva === 'invitaciones' ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                        {pendientes.length}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setPestanaActiva('dependencias')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        pestanaActiva === 'dependencias' ? 'bg-brand-blue text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    Dependencias ({dependencias.length})
                </button>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-medium">{error}</div>
            )}

            {cargando ? (
                <div className="bg-card rounded-4xl border border-slate-100/90 shadow-soft p-12">
                    <div className="flex flex-col items-center justify-center p-8 space-y-3">
                        <div className="w-8 h-8 border-[3px] border-brand-blue border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-medium text-slate-500">Cargando usuarios e invitaciones...</p>
                        <div className="w-full max-w-md space-y-2 pt-2">
                            <div className="animate-pulse bg-slate-100 rounded-xl h-5 w-full" />
                            <div className="animate-pulse bg-slate-100 rounded-xl h-5 w-4/5 mx-auto" />
                        </div>
                    </div>
                </div>
            ) : pestanaActiva === 'usuarios' ? (
                <>
                    <div className="flex items-center justify-end gap-3">
                        {seleccionados.length > 0 && (
                            <span className="text-xs font-semibold text-slate-500">{seleccionados.length} usuarios seleccionados</span>
                        )}
                        <button
                            type="button"
                            disabled={!seleccionados.length}
                            onClick={() => {
                                const primero = todosLosUsuarios.find((u) => seleccionados.includes(u.id));
                                if (primero) setUsuarioModalRol(primero);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-brand-blue shadow-2xs transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 cursor-pointer"
                        >
                            Editar usuario seleccionado
                        </button>
                    </div>
                    <UsuarioFiltrosBar busqueda={busqueda} onBusquedaChange={setBusqueda} rolFiltro={rolFiltro} onRolFiltroChange={setRolFiltro} />
                    <UsuariosTabla
                        usuarios={usuarios}
                        usuarioSesionId={user?.id}
                        procesandoId={procesandoId}
                        onEditarRol={(u) => setUsuarioModalRol(u)}
                        onToggleEstado={alternarEstado}
                        seleccionados={seleccionados}
                        onToggleSeleccion={toggleSeleccion}
                    />
                </>
            ) : pestanaActiva === 'dependencias' ? (
                <DependenciasPanel dependencias={dependencias} onCrear={crearDependencia}
                    onActualizar={actualizarDependencia} onEliminar={eliminarDependencia} />
            ) : (
                <InvitacionesTabla invitaciones={pendientes} />
            )}

            <UsuarioRolModal usuario={usuarioModalRol} dependencias={dependencias} procesando={procesandoId === usuarioModalRol?.id}
                esMismoUsuario={Number(usuarioModalRol?.id) === Number(user?.id)}
                onCerrar={() => setUsuarioModalRol(null)} onConfirmar={actualizarPerfil} />
            <UsuarioNuevoModal abierto={modalPreRegistro} dependencias={dependencias} onCerrar={() => setModalPreRegistro(false)} onCrearUsuario={crearUsuario} />
            <UsuarioCargaMasivaModal abierto={modalCargaMasiva} onCerrar={() => setModalCargaMasiva(false)} onImportarMasivo={importarMasivo} />
        </div>
    );
}
