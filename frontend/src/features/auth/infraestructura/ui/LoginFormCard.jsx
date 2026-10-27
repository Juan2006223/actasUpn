import React, { useState } from 'react';
import {
    IconBrandMemorian,
    IconMail,
    IconLock,
    IconEye,
    IconEyeOff,
} from '../../../../shared/components/ui/IconosMemorian';

export default function LoginFormCard({ onSubmitLogin, loading, error }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmitLogin(username, password);
    };

    return (
        <div className="bg-white rounded-4xl border border-slate-100 p-7 sm:p-9 shadow-soft w-full max-w-[430px] lg:w-[430px] flex flex-col justify-between min-h-[500px] lg:min-h-[540px]">
            <div>
                <div className="text-center mb-7">
                    <div className="flex justify-center mb-2.5">
                        <IconBrandMemorian className="w-14 h-14" />
                    </div>
                    <h2 className="text-[15px] font-black tracking-[0.08em] text-[#071630] uppercase">
                        MEMORIAN
                    </h2>
                    <p className="text-xs font-medium text-[#7b8fa6] mt-0.5">
                        Sistema de Gestión de Actas
                    </p>
                </div>

                <div className="text-center mb-7">
                    <h3 className="text-2xl sm:text-[26px] font-extrabold text-[#071630] tracking-tight">
                        Acceso institucional
                    </h3>
                    <p className="text-xs sm:text-[13px] font-medium text-[#7b8fa6] mt-1.5">
                        Ingresa tus credenciales para acceder al sistema.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#1e293b] block mb-2">
                            Cédula, usuario o correo
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-[#6d8299] pointer-events-none">
                                <IconMail className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingresa tu usuario institucional"
                                className="w-full pl-11 pr-4 py-3 text-xs sm:text-[13px] text-[#0f172a] bg-[#e9f1fb] border border-transparent rounded-2xl focus:bg-white focus:border-[#2272ff] focus:ring-2 focus:ring-[#2272ff]/20 outline-none transition placeholder:text-[#7b8fa6]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#1e293b] block mb-2">
                            Contraseña
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-[#6d8299] pointer-events-none">
                                <IconLock className="w-4 h-4" />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña"
                                className="w-full pl-11 pr-11 py-3 text-xs sm:text-[13px] text-[#0f172a] bg-[#e9f1fb] border border-transparent rounded-2xl focus:bg-white focus:border-[#2272ff] focus:ring-2 focus:ring-[#2272ff]/20 outline-none transition placeholder:text-[#7b8fa6]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-4 text-[#6d8299] hover:text-[#1e293b] transition cursor-pointer"
                                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                                {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 text-sm font-bold text-white bg-[#2272ff] hover:bg-[#1958db] disabled:opacity-60 active:scale-[0.99] rounded-2xl transition shadow-md shadow-[#2272ff]/25 cursor-pointer mt-3"
                    >
                        {loading ? 'Validando credenciales...' : 'Ingresar'}
                    </button>
                </form>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 text-center space-y-1">
                <p className="text-xs font-medium text-[#6d8299]">
                    Autenticación mediante Directorio Activo
                </p>
                <p className="text-[11px] font-medium text-[#7b8fa6]">
                    Universidad Pedagógica Nacional
                </p>
            </div>
        </div>
    );
}
