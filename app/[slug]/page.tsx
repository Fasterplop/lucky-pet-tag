'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  MapPin, 
  PawPrint,
  Info,
  Mail,
  ExternalLink,
  Send,
  BellRing,
  Home,
  CalendarDays,
  Dog,
  LogIn,
  SearchCheck,
  Hand
} from 'lucide-react';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export default function PublicPetProfile() {
  const params = useParams();
  const router = useRouter();
  
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Finder Form State
  const [showFinderForm, setShowFinderForm] = useState(false);
  const [finderMessage, setFinderMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // 🚨 Honeypot for bots
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [formErrorMessage, setFormErrorMessage] = useState('');

  useEffect(() => {
    async function fetchPetProfile() {
      try {
        if (!params?.slug) throw new Error('Invalid tag link.');

        const { data, error: fetchError } = await supabase
          .from('pets')
          .select('*, owners(*), pet_type, breed, age')
          .eq('slug', params.slug)
          .single();

        if (fetchError || !data) throw new Error('Profile not found or tag is inactive.');
        
        setPet(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPetProfile();
  }, [params]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finderMessage.trim() || !pet.id) return;

    setFormStatus('sending');
    setFormErrorMessage('');

    try {
      const response = await fetch('/api/notify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: pet.id,
          petSlug: pet.slug,
          message: finderMessage,
          honeypot: honeypot
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send message.');

      setFormStatus('success');
      setFinderMessage('');
    } catch (err: any) {
      setFormStatus('error');
      setFormErrorMessage(err.message || 'An unknown error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2fbf6] text-[#0b6946]">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-bold tracking-widest uppercase text-sm opacity-70">Accessing Profile...</p>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2fbf6] p-6 text-center">
        <div className="w-20 h-20 bg-[#ffffff] rounded-3xl shadow-sm border border-[#bec9c0]/20 flex items-center justify-center text-[#ba1a1a] mb-6">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-headline font-bold text-[#151d1b] mb-2">Tag Not Found</h1>
        <p className="text-[#3f4942] max-w-sm">{error}</p>
      </div>
    );
  }

  const isLost = pet.is_lost_mode_active === true;
  const cleanPhone = pet.owners?.phone_number ? pet.owners.phone_number.replace(/\D/g, '') : '';
  const mapsLink = pet.owners?.address ? `https://maps.google.com/?q=${encodeURIComponent(pet.owners.address)}` : '#';

  const shortLocation = pet.owners?.address 
    ? pet.owners.address.split(',')[0].substring(0, 15) + (pet.owners.address.split(',')[0].length > 15 ? '...' : '')
    : 'Unknown';

  return (
    <div className="text-[#151d1b] min-h-screen flex flex-col items-center selection:bg-[#a1f4c6] selection:text-[#002112] bg-[#f2fbf6] font-body w-full">
      
      {/* 🔴 RED BANNER FOR LOST STATE */}
      {isLost && (
        <div className="w-full bg-[#ba1a1a] py-3 px-4 text-center relative z-50 flex items-center justify-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </div>
          <span className="text-white font-bold text-xs tracking-widest uppercase">I am lost! Please help me home</span>
        </div>
      )}

      {/* Top Navigation Anchor */}
      <header className="bg-[#f2fbf6]/80 backdrop-blur-md flex justify-between items-center px-8 py-6 w-full sticky top-0 z-40 border-b border-[#bec9c0]/20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[#0b6946] w-8 h-8" />
          <span className="text-xl font-bold text-[#151d1b] font-headline tracking-tight">Lucky Pet Tag</span>
        </div>
        <div className="flex items-center">
          <button 
            onClick={() => router.push('/login')}
            className="text-xs uppercase tracking-widest font-bold text-[#0b6946]/70 hover:text-[#0b6946] transition-all flex items-center gap-2 group cursor-pointer"
          >
            Owner? Edit Profile
            <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl px-6 py-12 md:py-24">
        {/* Exact structural layout from code.html */}
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-16 items-start">
          
          {/* Left Side: Profile Image & Identity */}
          <div className="w-full md:col-span-5 flex flex-col items-center md:items-start sticky md:top-32">
            
            <div className="relative mb-10 group">
              <div className={`w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-8 border-[#ffffff] shadow-[0_32px_64px_-16px_rgba(11,105,70,0.12)] transition-transform duration-500 group-hover:scale-[1.02] flex items-center justify-center ${isLost ? 'bg-[#ffdad6] animate-pulse' : 'bg-[#e1eae5]'}`}>
                {pet.pet_photo_url ? (
                  <img src={pet.pet_photo_url} alt={pet.pet_name} className="w-full h-full object-cover" />
                ) : (
                  <PawPrint className="w-24 h-24 text-[#bec9c0]" />
                )}
              </div>
              <div className={`absolute bottom-4 right-6 md:bottom-8 md:right-10 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl ring-4 ring-[#f2fbf6] ${isLost ? 'bg-[#ba1a1a]' : 'bg-[#0b6946]'}`}>
                {isLost ? <AlertTriangle className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
                <span className="text-[11px] text-white font-bold tracking-widest uppercase">{isLost ? 'Missing' : 'Protected'}</span>
              </div>
            </div>

            <div className="text-center md:text-left mb-10">
              <div className="relative inline-flex items-center">
                <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight mb-4 inline-block">
                  {pet.pet_name}
                </h1>
                {/* Recreación del Status Pulse exacto a tu HTML sin editar el CSS general */}
                {!isLost && (
                  <div className="absolute -right-6 top-1/2 -translate-y-[80%] flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0b6946] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0b6946] shadow-[0_0_12px_#a1f4c6]"></span>
                  </div>
                )}
              </div>
              <p className="text-[#3f4942] text-xl md:text-2xl font-medium leading-relaxed max-w-md">
                {pet.pet_description || "I'm a friendly pet. Please check my tag info."}
              </p>
            </div>

            {/* Profile Details Grid (Exactamente igual a code.html) */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-[#edf6f1] p-6 rounded-2xl flex flex-col justify-between aspect-square md:aspect-auto md:h-32 border border-[#bec9c0]/30">
                <Home className="w-6 h-6 text-[#0b6946] mb-auto" />
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-[#3f4942] font-bold mb-1">Home Base</span>
                  <span className="text-base font-semibold">{shortLocation}</span>
                </div>
              </div>
              <div className="bg-[#edf6f1] p-6 rounded-2xl flex flex-col justify-between aspect-square md:aspect-auto md:h-32 border border-[#bec9c0]/30">
                <PawPrint className="w-6 h-6 text-[#0b6946] mb-auto" />
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-[#3f4942] font-bold mb-1">Pet Type</span>
                  <span className="text-base font-semibold capitalize">{pet.pet_type || "Pet"}</span>
                </div>
              </div>
              <div className="bg-[#edf6f1] p-6 rounded-2xl flex flex-col justify-between aspect-square md:aspect-auto md:h-32 border border-[#bec9c0]/30">
                <Dog className="w-6 h-6 text-[#0b6946] mb-auto" />
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-[#3f4942] font-bold mb-1">Breed</span>
                  <span className="text-base font-semibold text-wrap">{pet.breed || "Mixed"}</span>
                </div>
              </div>
              <div className="bg-[#edf6f1] p-6 rounded-2xl flex flex-col justify-between aspect-square md:aspect-auto md:h-32 border border-[#bec9c0]/30">
                <CalendarDays className="w-6 h-6 text-[#0b6946] mb-auto" />
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-[#3f4942] font-bold mb-1">Age</span>
                  <span className="text-base font-semibold">{pet.age || "Unknown"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Actions & Detailed Info */}
          <div className="w-full md:col-span-7 mt-12 md:mt-0 space-y-10">
            
            {/* Vital Information Card */}
            {pet.allergies && (
              <div className="w-full bg-[#fff4ed] p-8 rounded-2xl border-l-8 border-orange-400 shadow-sm animate-in fade-in">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl shrink-0">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-bold text-orange-950 mb-2">Medical Alert</h3>
                    <p className="text-orange-900 text-lg leading-relaxed">{pet.allergies}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Section */}
            <div className="w-full space-y-6">
              
              {isLost ? (
                /* LOST STATE: EXPOSED CONTACT INFO */
                <div className="bg-[#ffffff] p-8 md:p-12 rounded-3xl border border-[#ba1a1a]/20 shadow-[0_20px_40px_-15px_rgba(186,26,26,0.1)] flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-16 h-16 bg-[#ffdad6] rounded-full flex items-center justify-center mb-6">
                    <Info className="w-8 h-8 text-[#ba1a1a]" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-headline font-bold mb-4 text-[#ba1a1a]">Immediate Contact Required</h2>
                  <p className="text-[#3f4942] text-lg mb-10 max-w-md">My family is looking for me. Please use the options below to reach them immediately.</p>
                  
                  <div className="w-full flex flex-col gap-4 max-w-md">
                    <div className="bg-[#edf6f1] rounded-2xl p-6 mb-4 border border-[#bec9c0]/30 text-left">
                      <div className="mb-4">
                        <p className="text-[10px] uppercase font-bold text-[#0b6946] tracking-widest mb-1">Owner Name</p>
                        <p className="font-bold text-xl text-[#151d1b]">{pet.owners?.full_name || 'Loving Owner'}</p>
                      </div>
                      {pet.owners?.address && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[#0b6946] tracking-widest mb-1">Home Address</p>
                          <p className="font-bold text-[#151d1b]">{pet.owners.address}</p>
                        </div>
                      )}
                    </div>

                    {pet.owners?.phone_number && (
                      <a href={`tel:${cleanPhone}`} className="w-full bg-[#151d1b] text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] active:scale-95 transition-all text-xl cursor-pointer">
                        <Phone className="w-6 h-6" /> Call Owner
                      </a>
                    )}
                    {pet.owners?.has_whatsapp && (
                      <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(37,211,102,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(37,211,102,0.4)] active:scale-95 transition-all text-xl cursor-pointer">
                        <MessageCircle className="w-6 h-6" /> WhatsApp
                      </a>
                    )}
                    {pet.owners?.address && (
                      <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="w-full bg-[#f2fbf6] text-[#0b6946] border border-[#bec9c0]/50 font-bold py-6 rounded-2xl flex items-center justify-center gap-4 hover:bg-[#edf6f1] active:scale-95 transition-all text-lg cursor-pointer mt-2">
                        <MapPin className="w-5 h-5" /> Open Google Maps <ExternalLink className="w-4 h-4"/>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                /* SAFE STATE: THE FINDER FORM (EXACT MATCH TO HTML) */
                <div className="bg-[#ffffff] p-8 md:p-12 rounded-3xl border border-[#bec9c0]/20 shadow-xl flex flex-col items-center text-center transition-all duration-500">
                  
                  {!showFinderForm ? (
                    <>
                      <div className="w-16 h-16 bg-[#0b6946]/10 rounded-full flex items-center justify-center mb-6">
                        <SearchCheck className="w-8 h-8 text-[#0b6946]" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-headline font-bold mb-4 text-[#151d1b]">Did you find {pet.pet_name}?</h2>
                      <p className="text-[#3f4942] text-lg mb-10 max-w-md">Thank you for looking out! Clicking below will allow you to quickly contact the owner and share your current location.</p>
                      <button 
                        onClick={() => setShowFinderForm(true)}
                        className="w-full max-w-md bg-[#0b6946] hover:bg-[#30835d] text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(11,105,70,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(11,105,70,0.4)] active:scale-95 transition-all text-xl cursor-pointer"
                      >
                        <Hand className="w-6 h-6" /> I found this pet wandering
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleSendMessage} className="w-full max-w-md animate-in fade-in duration-300 text-left">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#bec9c0]/20">
                        <h4 className="font-headline font-bold text-2xl text-[#151d1b] flex items-center gap-3">
                          <Mail className="w-6 h-6 text-[#0b6946]"/> Send Secure Alert
                        </h4>
                        <button type="button" onClick={() => setShowFinderForm(false)} className="w-10 h-10 bg-[#f2fbf6] text-[#151d1b] flex items-center justify-center rounded-full font-bold hover:bg-[#edf6f1] transition-colors cursor-pointer">✕</button>
                      </div>
                      
                      {/* 🚨 INVISIBLE HONEPOT */}
                      <input 
                        type="text" 
                        name="contact_me_by_fax_only" 
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        style={{ display: 'none' }} 
                        tabIndex={-1} 
                        autoComplete="off" 
                      />

                      {formStatus === 'success' ? (
                        <div className="bg-[#f2fbf6] text-[#0b6946] p-8 rounded-2xl border border-[#c3ecd4] flex flex-col items-center text-center">
                          <div className="w-16 h-16 bg-[#c3ecd4] rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="w-8 h-8 text-[#0b6946]"/>
                          </div>
                          <p className="font-headline font-bold text-2xl mb-2">Alert Sent Successfully</p>
                          <p className="text-[#3f4942] text-lg">The owner has been notified via email. Thank you for your kindness!</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <textarea 
                            required
                            value={finderMessage}
                            onChange={(e) => setFinderMessage(e.target.value)}
                            placeholder={`Let the owner know where ${pet.pet_name} is and provide your phone number so they can reach you.`}
                            className="w-full bg-[#edf6f1] border-none rounded-2xl p-6 text-[#151d1b] text-lg focus:bg-white focus:ring-2 focus:ring-[#0b6946]/40 transition-all resize-none placeholder:text-[#6f7a72] outline-none" 
                            rows={5}
                            disabled={formStatus === 'sending'}
                          />
                          {formStatus === 'error' && <p className="text-sm text-[#ba1a1a] font-bold px-2">{formErrorMessage}</p>}
                          <button 
                            type="submit" 
                            disabled={formStatus === 'sending' || !finderMessage.trim()}
                            className="w-full bg-[#0b6946] hover:bg-[#30835d] text-white font-bold py-6 rounded-2xl shadow-[0_20px_40px_-10px_rgba(11,105,70,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(11,105,70,0.4)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-xl cursor-pointer"
                          >
                            {formStatus === 'sending' ? <><Loader2 className="w-6 h-6 animate-spin"/> Sending Alert...</> : <><Send className="w-6 h-6"/> Send Alert Now</>}
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-8 py-8 px-4 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#151d1b]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#151d1b]">Secure Profile</span>
              </div>
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-[#151d1b]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#151d1b]">Instant Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Component */}
      <footer className="bg-[#f2fbf6] py-12 w-full mt-auto border-t border-[#bec9c0]/20 flex flex-col items-center justify-center space-y-6">
        <div className="flex gap-8 opacity-60">
          <a className="font-body text-xs uppercase tracking-widest text-[#151d1b] hover:text-[#0b6946] transition-colors" href="#">Privacy Policy</a>
          <a className="font-body text-xs uppercase tracking-widest text-[#151d1b] hover:text-[#0b6946] transition-colors" href="#">Terms of Use</a>
          <a className="font-body text-xs uppercase tracking-widest text-[#151d1b] hover:text-[#0b6946] transition-colors" href="#">Support Center</a>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="font-body text-[10px] uppercase tracking-[0.3em] font-bold text-[#0b6946]">Powered by Lucky Pet Tag</p>
          <p className="text-[10px] text-[#3f4942]/50">© 2024 Lucky Pet Systems Inc.</p>
        </div>
      </footer>

    </div>
  );
}