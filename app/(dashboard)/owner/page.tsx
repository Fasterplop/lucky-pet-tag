// app/(dashboard)/owner/page.tsx
import { supabase } from '@/lib/supabase';
import { PawPrint, Settings, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function OwnerDashboard() {
  // Obtenemos la sesión del usuario actual
  const { data: { user } } = await supabase.auth.getUser();

  // Obtenemos las mascotas vinculadas a este dueño (usando su email)
  const { data: pets } = await supabase
    .from('pets')
    .select(`
      id, pet_name, pet_type, pet_photo_url, is_lost_mode_active, slug,
      owners!inner(email)
    `)
    .eq('owners.email', user?.email);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Pets</h1>
          <p className="text-gray-500 text-sm">Manage your pet profiles and safety tags</p>
        </div>
        <Link 
          href="/owner/profile" 
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Settings size={20} className="text-gray-600" />
        </Link>
      </header>

      {/* Grid de Mascotas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pets?.map((pet) => (
          <div key={pet.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-gray-50">
              {pet.pet_photo_url ? (
                <Image 
                  src={pet.pet_photo_url} 
                  alt={pet.pet_name} 
                  fill 
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300">
                  <PawPrint size={40} />
                </div>
              )}
              {pet.is_lost_mode_active && (
                <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  Lost Mode Active
                </div>
              )}
            </div>
            
            <div className="p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{pet.pet_name}</h3>
                <p className="text-gray-500 text-xs uppercase tracking-tight">{pet.pet_type}</p>
              </div>
              <Link 
                href={`/owner/pet/${pet.id}`}
                className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}

        {/* Card para añadir nueva mascota (opcional según flujo de compra) */}
        <button className="border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-10 text-gray-400 hover:border-[#0b6946] hover:text-[#0b6946] transition-all group">
          <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Register New Tag</span>
        </button>
      </div>
    </div>
  );
}