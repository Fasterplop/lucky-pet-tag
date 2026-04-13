'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  Loader2, 
  LayoutDashboard, 
  Printer, 
  Users, 
  Search, 
  Plus, 
  LogOut, 
  AlertTriangle, 
  MailWarning, 
  ChevronLeft, 
  ChevronRight, 
  Undo2, 
  Pencil, 
  Trash2, 
  ArrowLeft, 
  PawPrint, 
  QrCode, 
  ExternalLink, 
  Info 
} from 'lucide-react';

type View = 'overview' | 'printing' | 'teams' | 'edit' | 'create';

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            resolve(file); 
          }
        }, 'image/jpeg', 0.8); 
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<View>('overview');
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [printFilter, setPrintFilter] = useState<'all' | 'ready' | 'pending'>('all');

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', id: '', title: '' });

  const [pendingProfileData, setPendingProfileData] = useState<any>(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const refreshData = async () => {
    const { data: petsData } = await supabase.from('pets').select(`*, owners (*)`).order('id', { ascending: false });
    const { data: adminsData } = await supabase.from('admin_users').select('*');
    if (petsData) setPets(petsData);
    if (adminsData) setAdmins(adminsData);
  };

 useEffect(() => {
  async function initAdmin() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.replace('https://admin.luckypetag.com/login');
      return;
    }

    const normalizedEmail = (session.user.email || '').toLowerCase().trim();

    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (adminError) {
      console.error('Admin lookup failed:', adminError.message);
    }

    if (!admin) {
      // 1. Limpiamos la sesión "fantasma" en el subdominio admin
      await supabase.auth.signOut();
      
      // 2. Redirigimos a app o al login
      window.location.replace('https://app.luckypetag.com/login');
      return;
    }

    setAdminData(admin);
    await refreshData();
    setLoading(false);
  }

  initAdmin();
}, []);

  const requestDeletePet = (id: string, name: string) => {
    setModalConfig({ isOpen: true, type: 'pet', id, title: `the pet "${name}"` });
  };

  const requestDeleteOwner = (id: string, name: string) => {
    setModalConfig({ isOpen: true, type: 'owner', id, title: `the owner "${name}" and ALL their pets` });
  };

  const executeDelete = async () => {
    if (modalConfig.type === 'pet') {
      await supabase.from('pets').delete().eq('id', modalConfig.id);
      if (view === 'edit') setView('printing');
    } else if (modalConfig.type === 'owner') {
      await supabase.from('owners').delete().eq('id', modalConfig.id);
      setView('printing');
    }
    setModalConfig({ isOpen: false, type: '', id: '', title: '' });
    refreshData();
  };

  const togglePrintStatus = async (petId: string, currentStatus: boolean) => {
    const now = !currentStatus ? new Date().toISOString() : null;
    const { error } = await supabase.from('pets').update({ is_printed: !currentStatus, printed_at: now }).eq('id', petId);
    if (!error) {
      setPets(pets.map(p => p.id === petId ? { ...p, is_printed: !currentStatus, printed_at: now } : p));
    }
  };

  const handleSaveProfile = async (petId: string, ownerId: string, updates: any) => {
    try {
      let finalPhotoUrl = selectedPet.pet_photo_url;

      if (updates.newPhotoFile) {
        const compressedFile = await compressImage(updates.newPhotoFile);
        const fileName = `pet_photo_${petId}_${Math.random()}.jpg`; 
        const { error: uploadError } = await supabase.storage.from('lucky-pet-assets').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        finalPhotoUrl = supabase.storage.from('lucky-pet-assets').getPublicUrl(fileName).data.publicUrl;
      }

      await supabase.from('pets').update({
        pet_name: updates.pet_name,
        pet_type: updates.pet_type,
        breed: updates.breed,
        age: updates.age,
        pet_description: updates.pet_description,
        allergies: updates.allergies,
        is_lost_mode_active: updates.is_lost_mode_active,
        pet_photo_url: finalPhotoUrl
      }).eq('id', petId);

      if (ownerId) {
        await supabase.from('owners').update({
          full_name: updates.full_name,
          address: updates.address,
          phone_number: updates.phone_number,
          has_whatsapp: updates.has_whatsapp
        }).eq('id', ownerId);
      }

      await refreshData();
      setView('printing');
    } catch (err: any) {
      console.error("Error saving profile:", err);
      alert(`Error saving profile: ${err.message}`);
    }
  };

  const handleCreateProfileCheck = async (data: any) => {
    try {
      const { data: existingOwner, error: checkError } = await supabase
        .from('owners')
        .select('id, full_name')
        .eq('email', data.email)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingOwner) {
        setPendingProfileData({
          ...data,
          existingOwnerId: existingOwner.id,
          existingOwnerName: existingOwner.full_name
        });
        setShowOverwriteModal(true);
        return; 
      }

      await executeCreateProfile(data, null, false);

    } catch (err: any) {
      console.error("Error checking email:", err);
      alert(`Error checking database: ${err.message}`);
    }
  };

  const executeCreateProfile = async (data: any, existingOwnerId: string | null, overwriteOwner: boolean = true) => {
    try {
      let ownerId = existingOwnerId;

      if (ownerId) {
        if (overwriteOwner) {
          const { error: updateErr } = await supabase.from('owners').update({
            full_name: data.full_name,
            address: data.address,
            phone_number: data.phone_number,
            has_whatsapp: data.has_whatsapp
          }).eq('id', ownerId);
          if (updateErr) throw updateErr;
        }
      } else {
        const { data: newOwner, error: ownerErr } = await supabase.from('owners').insert([{
          email: data.email,
          full_name: data.full_name,
          address: data.address,
          phone_number: data.phone_number,
          has_whatsapp: data.has_whatsapp
        }]).select().single();
        if (ownerErr) throw ownerErr;
        ownerId = newOwner.id;
      }

      const slug = Math.random().toString(36).substring(2, 8);
      const { data: pet, error: petErr } = await supabase.from('pets').insert([{
        owner_id: ownerId,
        slug: slug,
        pet_name: data.pet_name || 'New Pet',
        pet_type: data.pet_type,
        breed: data.breed,
        age: data.age,
        pet_description: data.pet_description,
        allergies: data.allergies,
        is_lost_mode_active: data.is_lost_mode_active,
      }]).select().single();
      
      if (petErr) throw petErr;

      let photoUrl = null;
      if (data.photoFile) {
        const compressedFile = await compressImage(data.photoFile);
        const fileName = `pet_photo_${pet.id}_${Math.random()}.jpg`;
        await supabase.storage.from('lucky-pet-assets').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        photoUrl = supabase.storage.from('lucky-pet-assets').getPublicUrl(fileName).data.publicUrl;
      }

      const qrBaseUrl =
  process.env.NEXT_PUBLIC_PUBLIC_PET_PROFILE_BASE_URL ||
  'https://luckypetag.com/id';

const publicUrl = `${qrBaseUrl}/${slug}`;
      const qrRes = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`);
      const qrBlob = await qrRes.blob();
      const qrName = `Order_QR_${slug}.png`;
      await supabase.storage.from('lucky-pet-assets').upload(qrName, qrBlob, { contentType: 'image/png' });
      const qrUrl = supabase.storage.from('lucky-pet-assets').getPublicUrl(qrName).data.publicUrl;

      await supabase.from('pets').update({
        pet_photo_url: photoUrl,
        qr_code_url: qrUrl
      }).eq('id', pet.id);

      await refreshData();
      setView('printing');
    } catch (err: any) {
      console.error("Error executing profile creation:", err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  const confirmOverwrite = async () => {
    setIsOverwriting(true);
    await executeCreateProfile(pendingProfileData, pendingProfileData.existingOwnerId, true);
    setIsOverwriting(false);
    setShowOverwriteModal(false);
    setPendingProfileData(null);
  };

  const confirmKeepExisting = async () => {
    setIsOverwriting(true);
    await executeCreateProfile(pendingProfileData, pendingProfileData.existingOwnerId, false);
    setIsOverwriting(false);
    setShowOverwriteModal(false);
    setPendingProfileData(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredPets = pets.filter((p: any) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (p.pet_name || '').toLowerCase().includes(term);
    const emailMatch = (p.owners?.email || '').toLowerCase().includes(term);
    const slugMatch = (p.slug || '').toLowerCase().includes(term);
    const ownerNameMatch = (p.owners?.full_name || '').toLowerCase().includes(term);
    const matchesSearch = nameMatch || emailMatch || slugMatch || ownerNameMatch;

    let matchesFilter = true;
    if (printFilter === 'ready') matchesFilter = p.is_printed === true;
    if (printFilter === 'pending') matchesFilter = p.is_printed !== true;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2fbf6] text-[#0b6946] font-headline gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="font-bold tracking-widest uppercase text-sm">Initializing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f2fbf6] font-body text-[#151d1b] pb-20 md:pb-0 relative">
      
      <aside className="hidden md:flex flex-col sticky top-0 h-screen overflow-y-auto p-4 bg-[#151d1b] w-72 shrink-0 border-r-0">
        <div className="px-4 py-8">
          <span className="text-2xl font-headline font-black text-[#85d7ab]">Lucky Pet Tag</span>
          <p className="text-[10px] uppercase tracking-widest text-[#85d7ab]/50 font-bold mt-1">Admin Console</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem icon={LayoutDashboard} label="Overview" active={view === 'overview'} onClick={() => setView('overview')} />
          <NavItem icon={Printer} label="Printing" active={view === 'printing' || view === 'create'} onClick={() => setView('printing')} />
          <NavItem icon={Users} label="Teams" active={view === 'teams'} onClick={() => setView('teams')} />
        </nav>

        <div className="p-4 bg-[#0b6946]/10 rounded-xl mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#30835d] flex items-center justify-center text-white font-headline font-bold cursor-default">
              {adminData?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{adminData?.full_name}</p>
              <p className="text-[10px] text-[#85d7ab] truncate">Superuser</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center px-6 md:px-8 py-6 sticky top-0 bg-[#f2fbf6]/90 backdrop-blur-md z-10">
          <h1 className="text-2xl md:text-3xl font-headline font-bold tracking-tight capitalize">{view === 'create' ? 'Create Profile' : view}</h1>
          
          {view === 'printing' && (
            <div className="hidden md:flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <div className="relative w-80">
                  <Search className="absolute left-4 top-2.5 text-[#6f7a72] w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, or slug..." 
                    className="w-full bg-[#e7f0eb] border-none rounded-full pl-12 pr-6 py-2.5 text-sm focus:ring-2 focus:ring-[#0b6946]/20 transition-all outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={() => setView('create')} className="bg-[#0b6946] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md shadow-[#0b6946]/20 hover:bg-[#0a5c3e] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <Plus className="w-5 h-5" /> New Profile
                </button>
              </div>
              
              <div className="flex gap-2 mt-1 pl-2">
                <FilterTab label="All" active={printFilter === 'all'} onClick={() => setPrintFilter('all')} />
                <FilterTab label="Pending" active={printFilter === 'pending'} onClick={() => setPrintFilter('pending')} />
                <FilterTab label="Ready" active={printFilter === 'ready'} onClick={() => setPrintFilter('ready')} />
              </div>
            </div>
          )}

          <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-full text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors cursor-pointer ml-auto md:ml-0">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {view === 'printing' && (
          <div className="px-6 mb-6 md:hidden flex flex-col gap-4">
            <button onClick={() => setView('create')} className="bg-[#0b6946] text-white w-full py-3 rounded-full font-bold text-sm shadow-md shadow-[#0b6946]/20 hover:bg-[#0a5c3e] transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Plus className="w-5 h-5" /> Create New Profile
            </button>
            
            <div className="relative w-full">
              <Search className="absolute left-4 top-3 text-[#6f7a72] w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search tag..." 
                className="w-full bg-[#e7f0eb] border-none rounded-full pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-[#0b6946]/20 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <FilterTab label="All" active={printFilter === 'all'} onClick={() => setPrintFilter('all')} />
                <FilterTab label="Pending" active={printFilter === 'pending'} onClick={() => setPrintFilter('pending')} />
                <FilterTab label="Ready" active={printFilter === 'ready'} onClick={() => setPrintFilter('ready')} />
            </div>
          </div>
        )}

        <div className="px-6 md:px-8 pb-28 md:pb-12">
          {view === 'overview' && <OverviewContent pets={pets} setView={setView} />}
          {view === 'printing' && <PrintingTable pets={filteredPets} onEdit={(p: any) => { setSelectedPet(p); setView('edit'); }} onToggle={togglePrintStatus} onDelete={requestDeletePet} />}
          {view === 'teams' && <TeamsTable admins={admins} />}
          {view === 'edit' && <EditView key={selectedPet?.id} pet={selectedPet} onBack={() => setView('printing')} onDeleteOwner={requestDeleteOwner} onDeletePet={requestDeletePet} onSave={handleSaveProfile} />}
          {view === 'create' && <CreateView onBack={() => setView('printing')} onSave={handleCreateProfileCheck} />}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-[#f2fbf6]/90 backdrop-blur-xl shadow-[0_-20px_40px_rgba(11,105,70,0.06)] rounded-t-3xl border-t border-[#e7f0eb]">
        <button onClick={() => setView('overview')} className={`flex flex-col items-center justify-center rounded-full px-4 py-2 transition-all cursor-pointer ${view === 'overview' ? 'text-[#0b6946]' : 'text-[#6f7a72]'}`}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-semibold mt-1">Overview</span>
        </button>
        <button onClick={() => setView('printing')} className={`flex flex-col items-center justify-center rounded-full px-6 py-2 transition-all cursor-pointer ${view === 'printing' || view === 'create' ? 'bg-[#0b6946] text-white shadow-lg' : 'text-[#6f7a72]'}`}>
          <Printer className="w-6 h-6" />
          <span className="text-[10px] font-semibold mt-1">Printing</span>
        </button>
        <button onClick={() => setView('teams')} className={`flex flex-col items-center justify-center rounded-full px-4 py-2 transition-all cursor-pointer ${view === 'teams' ? 'text-[#0b6946]' : 'text-[#6f7a72]'}`}>
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-semibold mt-1">Teams</span>
        </button>
      </nav>

      {/* DELETE WARNING MODAL */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#151d1b]/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl border border-[#ffdad6]">
            <div className="w-16 h-16 bg-[#ffdad6] rounded-full flex items-center justify-center text-[#ba1a1a] mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-headline font-bold text-center mb-2">Confirm Deletion?</h2>
            <p className="text-[#6f7a72] text-center text-sm mb-8">
              You are about to permanently delete <strong className="text-[#151d1b]">{modalConfig.title}</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="flex-1 py-3 rounded-full font-bold text-[#3f4942] bg-[#e1eae5] hover:bg-[#dce5e0] transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={executeDelete} className="flex-1 py-3 rounded-full font-bold text-white bg-[#ba1a1a] shadow-lg shadow-[#ba1a1a]/30 hover:scale-95 transition-transform cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERWRITE WARNING MODAL */}
      {/* OVERWRITE WARNING MODAL (UPDATED) */}
      {showOverwriteModal && pendingProfileData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#151d1b]/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl border border-[#ffdad6]">
            <div className="w-16 h-16 bg-[#ffdad6] rounded-full flex items-center justify-center text-[#ba1a1a] mb-6 mx-auto">
              <span className="material-symbols-outlined text-3xl">contact_mail</span>
            </div>
            <h2 className="text-xl font-headline font-bold text-center mb-2">Email Already Exists!</h2>
            <p className="text-[#6f7a72] text-center text-sm mb-6">
              The email <strong>{pendingProfileData.email}</strong> is already registered to <strong>{pendingProfileData.existingOwnerName || 'another owner'}</strong>.<br/><br/>
              How would you like to handle the owner's contact information?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmKeepExisting} 
                disabled={isOverwriting}
                className="w-full py-3 rounded-full font-bold text-white bg-[#0b6946] shadow-lg shadow-[#0b6946]/30 hover:scale-95 transition-transform cursor-pointer disabled:opacity-50"
              >
                {isOverwriting ? 'Processing...' : 'Keep Existing Info'}
              </button>
              <button 
                onClick={confirmOverwrite} 
                disabled={isOverwriting}
                className="w-full py-3 rounded-full font-bold text-[#ba1a1a] bg-[#ffdad6] hover:bg-[#ba1a1a] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Overwrite with New Info
              </button>
              <button 
                onClick={() => { setShowOverwriteModal(false); setPendingProfileData(null); }} 
                disabled={isOverwriting}
                className="w-full py-3 rounded-full font-bold text-[#3f4942] bg-[#e1eae5] hover:bg-[#dce5e0] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// SUBCOMPONENTS
// ==========================================

function FilterTab({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${active ? 'bg-[#151d1b] text-white shadow-md' : 'bg-transparent text-[#6f7a72] hover:bg-[#e7f0eb]'}`}
    >
      {label}
    </button>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3 rounded-r-full transition-all cursor-pointer ${active ? 'bg-[#f2fbf6] text-[#0b6946] shadow-sm' : 'text-[#85d7ab]/70 hover:text-[#85d7ab] hover:bg-white/5'}`}>
      <Icon className="w-6 h-6" />
      <span className="font-headline font-semibold">{label}</span>
    </button>
  );
}

function OverviewContent({ pets, setView }: any) {
  const pending = pets.filter((p:any) => !p.is_printed).length;
  const recent = pets.slice(0, 5);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="p-6 md:p-8 bg-white rounded-3xl border border-[#e7f0eb] shadow-sm">
          <p className="text-[10px] font-bold text-[#6f7a72] uppercase tracking-widest mb-2">Total Records</p>
          <p className="text-4xl md:text-5xl font-headline font-black text-[#151d1b]">{pets.length}</p>
        </div>
        <div className="p-6 md:p-8 bg-[#0b6946] rounded-3xl shadow-xl shadow-[#0b6946]/20">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">Printed Tags</p>
          <p className="text-4xl md:text-5xl font-headline font-black text-white">{pets.length - pending}</p>
        </div>
        <div className="p-6 md:p-8 bg-white rounded-3xl border-2 border-[#ba1a1a]/10">
          <p className="text-[10px] font-bold text-[#ba1a1a] uppercase tracking-widest mb-2 font-black">Pending</p>
          <p className="text-4xl md:text-5xl font-headline font-black text-[#ba1a1a]">{pending}</p>
          <button onClick={() => setView('printing')} className="mt-4 text-xs font-bold text-[#ba1a1a] underline underline-offset-4 cursor-pointer">Go to printing now →</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#e7f0eb]">
        <h3 className="text-xl font-headline font-bold mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {recent.map((p:any) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-[#f2fbf6] rounded-2xl">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#0b6946] shrink-0"></div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{p.pet_name || 'Unnamed'}</p>
                  <p className="text-[10px] text-[#6f7a72] truncate">{p.owners?.email}</p>
                </div>
              </div>
              <p className="text-[10px] font-mono font-bold bg-[#e1eae5] px-2 py-1 rounded shrink-0 ml-2">{p.slug}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrintingTable({ pets, onEdit, onToggle, onDelete }: any) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; 

  useEffect(() => {
    setCurrentPage(1);
  }, [pets.length]);

  const totalItems = pets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPets = pets.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (date: string) => {
    if (!date) return 'No date';
    return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
  };

  const renderPagination = () => {
    if (totalItems <= itemsPerPage) return null;
    return (
      <div className="flex justify-between items-center px-2 py-4 mt-2 border-t border-[#e7f0eb] md:border-none md:bg-[#e7f0eb] md:px-8 md:py-4">
        <div className="text-xs font-semibold text-[#6f7a72]">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#edf6f1] text-[#151d1b] hover:bg-white hover:text-[#0b6946] transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all text-xs font-bold cursor-pointer ${currentPage === page ? 'bg-[#151d1b] text-white shadow-sm' : 'bg-[#edf6f1] text-[#151d1b] hover:bg-white hover:text-[#0b6946]'}`}
              >
                {page}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#edf6f1] text-[#151d1b] hover:bg-white hover:text-[#0b6946] transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="md:hidden space-y-4">
        {paginatedPets.length === 0 && (
          <div className="text-center py-10 text-[#6f7a72] text-sm font-medium">No results found for your search.</div>
        )}
        
        {paginatedPets.map((p: any) => (
          <div key={p.id} className="bg-white p-5 rounded-3xl border border-[#e7f0eb] shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <a href={p.qr_code_url} target="_blank" className="w-12 h-12 bg-white border border-[#e7f0eb] rounded-lg p-1 shrink-0 cursor-pointer">
                  <img src={p.qr_code_url} alt="QR" className="w-full h-full object-contain" />
                </a>
                <div className="min-w-0">
                  <p className="font-bold text-[#151d1b] truncate">{p.pet_name}</p>
                  <p className="text-[10px] font-mono text-[#0b6946] font-black">{p.slug}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shrink-0 ${p.is_printed ? 'bg-[#c3ecd4] text-[#486c59]' : 'bg-[#ffdad6] text-[#ba1a1a] animate-pulse'}`}>
                {p.is_printed ? 'READY' : 'PENDING'}
              </span>
            </div>
            <div className="text-xs text-[#3f4942] space-y-1 bg-[#f2fbf6] p-3 rounded-xl">
              <p className="truncate"><span className="font-bold text-[9px] uppercase text-[#6f7a72] mr-1">Owner:</span> {p.owners?.full_name || 'Unnamed'} ({p.owners?.email})</p>
              <p><span className="font-bold text-[9px] uppercase text-[#6f7a72] mr-1">Purchased:</span> {formatDate(p.created_at)}</p>
              {p.is_printed && <p><span className="font-bold text-[9px] uppercase text-[#6f7a72] mr-1">Printed:</span> <span className="text-[#0b6946] font-bold">{formatDate(p.printed_at)}</span></p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => onToggle(p.id, p.is_printed)} className={`w-10 h-10 rounded-full transition-all flex items-center justify-center cursor-pointer ${p.is_printed ? 'text-[#6f7a72] bg-[#edf6f1]' : 'bg-[#0b6946] text-white shadow-md shadow-[#0b6946]/20'}`}>
                {p.is_printed ? <Undo2 className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
              </button>
              <button onClick={() => onEdit(p)} className="w-10 h-10 text-[#3f4942] bg-[#edf6f1] hover:bg-[#e1eae5] rounded-full flex items-center justify-center cursor-pointer">
                <Pencil className="w-5 h-5" />
              </button>
              <button onClick={() => onDelete(p.id, p.pet_name)} className="w-10 h-10 text-[#ba1a1a] bg-[#ffdad6] hover:bg-[#ba1a1a] hover:text-white rounded-full flex items-center justify-center transition-colors cursor-pointer">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {renderPagination()}
      </div>

      <div className="hidden md:block bg-white rounded-3xl overflow-hidden border border-[#e7f0eb] shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#edf6f1] text-[#6f7a72] uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-8 py-5">QR & Pet</th>
              <th className="px-6 py-5">Owner</th>
              <th className="px-6 py-5">Dates</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[#edf6f1]">
            {paginatedPets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-10 text-center text-[#6f7a72] font-medium">No results found for your search.</td>
              </tr>
            )}
            
            {paginatedPets.map((p: any) => (
              <tr key={p.id} className="hover:bg-[#f2fbf6] transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <a href={p.qr_code_url} target="_blank" className="w-12 h-12 bg-white border border-[#e7f0eb] rounded-lg p-1 hover:scale-110 transition-transform shrink-0 cursor-pointer">
                      <img src={p.qr_code_url} alt="QR" className="w-full h-full object-contain" />
                    </a>
                    <div className="min-w-0">
                      <p className="font-bold text-[#151d1b] truncate">{p.pet_name}</p>
                      <p className="text-[10px] font-mono text-[#0b6946] font-black">{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-[#3f4942] min-w-0">
                  <p className="font-bold truncate">{p.owners?.full_name || 'Unnamed'}</p>
                  <p className="text-[11px] text-[#6f7a72] truncate">{p.owners?.email}</p>
                </td>
                <td className="px-6 py-5 leading-tight">
                  <p className="text-[10px] text-[#6f7a72]">Purchased: <span className="text-[#151d1b] font-medium">{formatDate(p.created_at)}</span></p>
                  {p.is_printed && <p className="text-[10px] text-[#0b6946] font-bold mt-0.5">Printed: {formatDate(p.printed_at)}</p>}
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${p.is_printed ? 'bg-[#c3ecd4] text-[#486c59]' : 'bg-[#ffdad6] text-[#ba1a1a] animate-pulse'}`}>
                    {p.is_printed ? 'READY' : 'PENDING'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right flex justify-end gap-2 mt-2">
                  <button onClick={() => onToggle(p.id, p.is_printed)} className={`p-2 rounded-full transition-all flex items-center justify-center cursor-pointer ${p.is_printed ? 'text-[#6f7a72] hover:bg-[#edf6f1]' : 'bg-[#0b6946] text-white shadow-md shadow-[#0b6946]/20'}`}>
                    {p.is_printed ? <Undo2 className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
                  </button>
                  <button onClick={() => onEdit(p)} className="p-2 text-[#3f4942] hover:bg-[#edf6f1] rounded-full flex items-center justify-center cursor-pointer">
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(p.id, p.pet_name)} className="p-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-full flex items-center justify-center transition-colors cursor-pointer">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {renderPagination()}
      </div>
    </>
  );
}

function TeamsTable({ admins }: any) {
  return (
    <div className="bg-white rounded-3xl overflow-x-auto border border-[#e7f0eb]">
      <table className="w-full text-left min-w-[500px]">
        <thead className="bg-[#edf6f1] text-[#6f7a72] uppercase text-[11px] font-bold tracking-widest">
          <tr>
            <th className="px-8 py-5">Administrator</th>
            <th className="px-6 py-5">Role</th>
            <th className="px-8 py-5 text-right">Access</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {admins.map((a: any) => (
            <tr key={a.email} className="border-b border-[#edf6f1]">
              <td className="px-8 py-5">
                <p className="font-bold">{a.full_name || 'Unnamed'}</p>
                <p className="text-xs text-[#6f7a72]">{a.email}</p>
              </td>
              <td className="px-6 py-5 uppercase text-[10px] font-black tracking-tighter">{a.role}</td>
              <td className="px-8 py-5 text-right text-[#0b6946] font-bold">Active</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditView({ pet, onBack, onDeleteOwner, onDeletePet, onSave }: any) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!pet) return null;

  // Define publicUrl for the pet profile
  const qrBaseUrl =
    process.env.NEXT_PUBLIC_PUBLIC_PET_PROFILE_BASE_URL ||
    'https://luckypetag.com/id';
  const publicUrl = `${qrBaseUrl}/${pet.slug}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    await onSave(pet.id, pet.owners?.id, {
      pet_name: formData.get('pet_name'),
      pet_description: formData.get('pet_description'),
      allergies: formData.get('allergies'),
      // AÑADIDO: Captura de las nuevas variables
      pet_type: formData.get('pet_type'),
      breed: formData.get('breed'),
      age: formData.get('age'),
      is_lost_mode_active: formData.get('is_lost_mode_active') === 'on',
      full_name: formData.get('full_name'),
      address: formData.get('address'),
      phone_number: formData.get('phone_number'),
      has_whatsapp: formData.get('has_whatsapp') === 'on',
      newPhotoFile: photoFile
      
    });
    
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl border border-[#e7f0eb] space-y-8">
      {/* HEADER REFINADO PARA EDIT */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-[#e7f0eb] text-[#151d1b] rounded-full hover:bg-[#dce5e0] transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h2 className="text-xl md:text-2xl font-headline font-bold truncate">Edit: {pet.pet_name}</h2>
        </div>
        
        <div className="hidden md:flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => onDeletePet(pet.id, pet.pet_name)} 
            className="text-[#ba1a1a] font-bold text-sm border border-[#ba1a1a] px-5 py-2 rounded-full hover:bg-[#ba1a1a] hover:text-white transition-all cursor-pointer"
          >
            Delete Pet
          </button>
          <button 
            type="button" 
            onClick={() => onDeleteOwner(pet.owners?.id, pet.owners?.full_name || pet.owners?.email)} 
            className="text-white bg-[#ba1a1a] font-bold text-sm px-5 py-2 rounded-full hover:scale-95 transition-transform shadow-md shadow-[#ba1a1a]/30 cursor-pointer"
          >
            Delete Owner
          </button>
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        <button 
          type="button" 
          onClick={() => onDeletePet(pet.id, pet.pet_name)} 
          className="text-[#ba1a1a] w-full font-bold text-sm border border-[#ba1a1a] px-4 py-3 rounded-full hover:bg-[#ba1a1a] hover:text-white transition-all cursor-pointer"
        >
          Delete Pet
        </button>
        <button 
          type="button" 
          onClick={() => onDeleteOwner(pet.owners?.id, pet.owners?.full_name || pet.owners?.email)} 
          className="text-white bg-[#ba1a1a] w-full font-bold text-sm px-4 py-3 rounded-full shadow-md shadow-[#ba1a1a]/30 transition-all cursor-pointer"
        >
          Delete Owner
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <section className="space-y-4">
          <h3 className="font-headline font-bold text-[#0b6946] border-b pb-2">Pet Information</h3>
          <div className="space-y-4">
            
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#6f7a72] mb-1 ml-4">Pet Photo</label>
              <div className="flex items-center gap-4 bg-[#edf6f1] rounded-3xl p-3">
                {pet.pet_photo_url ? (
  <div className="flex flex-col items-center gap-1">
    <img src={pet.pet_photo_url} alt="Pet" className="w-12 h-12 rounded-full object-cover shadow-sm border border-white" />
    <a href={`${pet.pet_photo_url}?download=`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#0b6946] hover:underline flex items-center gap-1 cursor-pointer">
       <span className="material-symbols-outlined text-[12px]">download</span> Download
    </a>
  </div>
) : (
                  <div className="w-12 h-12 rounded-full bg-[#dce5e0] flex items-center justify-center text-[#6f7a72]">
                    <span className="material-symbols-outlined">pets</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="text-sm text-[#6f7a72] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#0b6946] file:text-white hover:file:bg-[#0b6946]/90 cursor-pointer w-full outline-none"
                />
              </div>
            </div>

            <Input name="pet_name" label="Pet Name" value={pet.pet_name} />
            <Input name="pet_description" label="Short Description" value={pet.pet_description} area />
            <Input name="allergies" label="Allergies / Medical Notes" value={pet.allergies} />

            {/* AÑADIDO: Campos para pet_type, breed y age */}
            <div className="grid grid-cols-3 gap-3">
              <Input name="pet_type" label="Type" value={pet.pet_type} />
              <Input name="breed" label="Breed" value={pet.breed} />
              <Input name="age" label="Age" value={pet.age} />
            </div>

            {/* AÑADIDO: Control de Lost Mode y Public Link */}
            <div className="bg-[#edf6f1] p-5 rounded-3xl border border-[#dce5e0] space-y-4">
               <div>
                  <label className="block text-[10px] font-bold uppercase text-[#6f7a72] mb-1 ml-1">Public Profile Link</label>

                  
                  <a 
                    href={publicUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm font-bold text-[#0b6946] hover:underline flex items-center gap-2 truncate"
                  >
                    {publicUrl}
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
               </div>

               <label className="flex items-center gap-3 cursor-pointer w-max">
                 <input 
                   type="checkbox" 
                   name="is_lost_mode_active" 
                   defaultChecked={pet.is_lost_mode_active} 
                   className="w-5 h-5 rounded border-[#a8cfb9] text-[#ba1a1a] focus:ring-[#ba1a1a] bg-white cursor-pointer" 
                 />
                 <span className="text-[11px] font-black text-[#ba1a1a] uppercase tracking-wider">Activate Lost Mode (Alert)</span>
               </label>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#6f7a72] mb-1 ml-4">Assigned QR Code ({pet.slug})</label>
              <div className="flex items-center gap-4 bg-[#edf6f1] rounded-3xl p-3">
                <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm shrink-0">
                  {pet.qr_code_url ? (
                    <img src={pet.qr_code_url} alt="QR" className="w-full h-full object-contain" />
                  ) : (
                    <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-[#6f7a72]">qr_code</span>
                  )}
                </div>
                {pet.qr_code_url && (
                  <a href={pet.qr_code_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0b6946] hover:underline flex items-center gap-1 cursor-pointer">
                    View original file <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                )}
              </div>
            </div>

          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-headline font-bold text-[#426654] border-b pb-2">Owner Information</h3>
          <div className="space-y-4">
            <Input label="Shopify Email" value={pet.owners?.email} disabled />
            <Input name="full_name" label="Owner Name" value={pet.owners?.full_name || ''} />
            <Input name="address" label="Address (Default: Shipping Address from Shopify)" value={pet.owners?.address || ''} />
            
            <div className="bg-[#edf6f1] p-4 rounded-3xl border border-[#dce5e0] space-y-3">
               <Input name="phone_number" label="Phone Number" value={pet.owners?.phone_number || ''} />
               <label className="flex items-center gap-3 ml-4 cursor-pointer w-max">
                 <input 
                   type="checkbox" 
                   name="has_whatsapp" 
                   defaultChecked={pet.owners?.has_whatsapp} 
                   className="w-4 h-4 rounded border-[#a8cfb9] text-[#0b6946] focus:ring-[#0b6946] bg-white cursor-pointer" 
                 />
                 <span className="text-[11px] font-bold text-[#426654] uppercase tracking-wide">This number has WhatsApp</span>
               </label>
            </div>
            
          </div>
        </section>
      </div>
      
      <div className="pt-6 flex justify-end">
        <button type="submit" disabled={saving} className="bg-[#0b6946] text-white px-8 md:px-12 py-3 rounded-full font-bold shadow-lg shadow-[#0b6946]/20 w-full md:w-auto hover:bg-[#0a5c3e] transition-colors disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function CreateView({ onBack, onSave }: any) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    await onSave({
      email: formData.get('email'),
      pet_name: formData.get('pet_name'),
      pet_type: formData.get('pet_type'),
      breed: formData.get('breed'),
      age: formData.get('age'),
      pet_description: formData.get('pet_description'),
      allergies: formData.get('allergies'),
      full_name: formData.get('full_name'),
      address: formData.get('address'),
      phone_number: formData.get('phone_number'),
      has_whatsapp: formData.get('has_whatsapp') === 'on',
      photoFile: photoFile
    });
    
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl border border-[#e7f0eb] space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <button 
          type="button" 
          onClick={onBack} 
          className="w-10 h-10 flex items-center justify-center bg-[#e7f0eb] text-[#151d1b] rounded-full hover:bg-[#dce5e0] transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl md:text-2xl font-headline font-bold truncate">Create New Profile</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <section className="space-y-4">
          <h3 className="font-headline font-bold text-[#0b6946] border-b pb-2">Pet Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#6f7a72] mb-1 ml-4">Pet Photo</label>
              <div className="flex items-center gap-4 bg-[#edf6f1] rounded-3xl p-3">
                <div className="w-12 h-12 rounded-full bg-[#dce5e0] flex items-center justify-center text-[#6f7a72]">
                  <PawPrint className="w-6 h-6" />
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="text-sm text-[#6f7a72] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#0b6946] file:text-white hover:file:bg-[#0b6946]/90 cursor-pointer w-full outline-none"
                />
              </div>
            </div>
            
            <Input name="pet_name" label="Pet Name" />
            
            <div className="grid grid-cols-2 gap-4">
              <Input name="pet_type" label="Type (Dog, Cat...)" />
              <Input name="breed" label="Breed" />
            </div>
            <Input name="age" label="Age (e.g. 3 years)" />

            <Input name="pet_description" label="Short Description" area />
            <Input name="allergies" label="Allergies / Medical Notes" />
            
            <div className="p-4 bg-[#edf6f1] rounded-2xl">
              <p className="text-xs text-[#426654] font-bold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                A secure QR code and unique URL will be automatically generated upon saving.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-headline font-bold text-[#426654] border-b pb-2">Owner Information</h3>
          <div className="space-y-4">
            <div className="relative">
              <Input name="email" label="Owner Email (Required)" type="email" />
              <div className="absolute top-0 right-4 text-[10px] text-[#ba1a1a] font-bold">*</div>
            </div>
            
            <Input name="full_name" label="Owner Name" />
            <Input name="address" label="Address (Default: Shipping Address from Shopify)" />
            
            <div className="bg-[#edf6f1] p-4 rounded-3xl border border-[#dce5e0] space-y-3">
               <Input name="phone_number" label="Phone Number" />
               <label className="flex items-center gap-3 ml-4 cursor-pointer w-max">
                 <input 
                   type="checkbox" 
                   name="has_whatsapp" 
                   className="w-4 h-4 rounded border-[#a8cfb9] text-[#0b6946] focus:ring-[#0b6946] bg-white cursor-pointer" 
                 />
                 <span className="text-[11px] font-bold text-[#426654] uppercase tracking-wide">This number has WhatsApp</span>
               </label>
            </div>
          </div>
        </section>
      </div>
      
      <div className="pt-6 flex justify-end">
        <button type="submit" disabled={saving} className="bg-[#0b6946] text-white px-8 md:px-12 py-3 rounded-full font-bold shadow-lg shadow-[#0b6946]/20 w-full md:w-auto hover:bg-[#0a5c3e] transition-colors disabled:opacity-50 cursor-pointer">
          {saving ? 'Creating Profile...' : 'Create Profile'}
        </button>
      </div>
    </form>
  );
}

function Input({ label, name, value, area, disabled, type = "text" }: any) {
  const safeValue = value || ''; 

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase text-[#6f7a72] mb-1 ml-4">{label}</label>
      {area ? (
        <textarea name={name} className="w-full bg-[#edf6f1] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#0b6946]/20 outline-none" defaultValue={safeValue} rows={3} />
      ) : (
        <input type={type} name={name} required={type === 'email'} className="w-full bg-[#edf6f1] border-none rounded-full px-6 py-3 text-sm focus:ring-2 focus:ring-[#0b6946]/20 disabled:opacity-50 outline-none" defaultValue={safeValue} disabled={disabled} />
      )}
    </div>
  );
}