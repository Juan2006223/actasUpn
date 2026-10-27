import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../aplicacion/AuthContext';
import HeroCardBanner from './HeroCardBanner';
import LoginFormCard from './LoginFormCard';

export default function Login() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (username, password) => {
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative min-h-screen bg-[#f3f7fc] bg-cover bg-center bg-no-repeat overflow-x-hidden flex items-center justify-center p-4 sm:p-6"
            style={{ backgroundImage: "url('/img/login-canvas-bg.png')" }}
        >
            <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch justify-center gap-6 lg:gap-8">
                <div className="flex-1 min-w-0">
                    <HeroCardBanner />
                </div>
                <div className="w-full lg:w-auto flex justify-center">
                    <LoginFormCard
                        onSubmitLogin={handleLogin}
                        loading={loading}
                        error={error}
                    />
                </div>
            </div>
        </div>
    );
}
