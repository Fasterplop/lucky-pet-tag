'use client'; // Esto le dice a Next.js que esta página es interactiva en el navegador

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'; // <-- Importamos nuestro cable público

export default function LoginPage() {
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError('');
    setMessage('');
    setLoading(true);

    try {
     if (isLogin) {
        // --- INICIO DE SESIÓN DIRECTO EN EL NAVEGADOR ---
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (signInError) {
          setError('Correo o contraseña incorrectos.');
          setLoading(false);
          return;
        }

        // --- EL RECEPCIONISTA INTELIGENTE ---
        // Verificamos si este correo está en la lista secreta de administradores
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('email')
          .eq('email', email)
          .single();

        if (adminUser) {
          // ¡Es del equipo! Lo mandamos al Centro de Mando
          router.push('/admin');
        } else {
          // Es un dueño de mascota, lo mandamos a su galería
          router.push('/app');
        }

      } else { 
        // --- REGISTRO SEGURO A TRAVÉS DE LA API ---
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Ocurrió un error inesperado');
          setLoading(false);
          return;
        }

        setMessage(data.message);
        setIsLogin(true);
        setPassword(''); 
        setLoading(false);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Bienvenido de vuelta' : 'Configura tu placa'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isLogin 
              ? 'Ingresa tus datos para ver a tus mascotas' 
              : 'Usa el correo de tu compra en Shopify para crear tu cuenta'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isLogin 
              ? '¿Es tu primera vez aquí? Crea tu cuenta' 
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

      </div>
    </div>
  );
}