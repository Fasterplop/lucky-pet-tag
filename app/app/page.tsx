'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function OwnerDashboard() {
  const router = useRouter();
  const [mascotas, setMascotas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      // 1. Revisamos si el usuario tiene su gafete VIP (sesión activa)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Si no está autenticado, lo devolvemos a la página de login
        router.push('/login');
        return;
      }

      // 2. Buscamos el ID del dueño en nuestra base de datos usando su correo
      const { data: owner } = await supabase
        .from('owners')
        .select('id')
        .eq('email', session?.user?.email)
        .single();

      if (owner) {
        // 3. Traemos todas las mascotas que le pertenecen a este dueño
        const { data: pets } = await supabase
          .from('pets')
          .select('*')
          .eq('owner_id', owner.id);

        setMascotas(pets || []);
      }
      
      setCargando(false);
    }

    cargarDatos();
  }, [router]);

  // Función para cerrar sesión de forma segura
  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Pantalla de carga mientras el "detective" busca los datos
  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando tu galería...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Barra superior */}
        <div className="flex justify-between items-center mb-10 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Mis Mascotas</h1>
          <button
            onClick={handleCerrarSesion}
            className="text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Galería de Mascotas */}
        {mascotas.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-200">
            <p className="text-gray-500 mb-2">Aún no tienes placas registradas en tu cuenta.</p>
            <p className="text-sm text-gray-400">Si acabas de comprar en Shopify, espera unos minutos a que procesemos tu orden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mascotas.map((mascota) => (
              <div key={mascota.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-transform hover:-translate-y-1 hover:shadow-lg">
                
                {/* Cuadro de la Foto */}
                <div className="h-48 bg-gray-200 flex items-center justify-center relative">
                  {mascota.pet_photo_url ? (
                    <img src={mascota.pet_photo_url} alt={mascota.pet_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 font-medium">📷 Sin foto</span>
                  )}
                  {/* Etiqueta flotante del código QR */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">
                    ID: {mascota.slug}
                  </div>
                </div>

                {/* Información de la Mascota */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-800">{mascota.pet_name}</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">📱 WhatsApp:</span> {mascota.contact_whatsapp || 'No configurado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">⚠️ Alergias:</span> {mascota.allergies || 'Ninguna'}
                    </p>
                  </div>
                  
                  {/* Botón para editar (Lo programaremos más adelante) */}
                  <button className="mt-5 w-full bg-blue-50 text-blue-600 font-semibold py-2 rounded-lg hover:bg-blue-100 transition-colors">
                    Configurar Perfil
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}