import { notFound } from 'next/navigation';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { supabasePublic } from '../../../lib/supabase-public';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import PublicProfileUI from './PublicProfileUI';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-headline' });

export const dynamic = 'force-dynamic';

type Owner = { full_name: string | null; phone_number: string | null; address: string | null; has_whatsapp: boolean | null; };
type PetRecord = { id: string; slug: string; owner_id: string | null; pet_name: string | null; pet_type: string | null; breed: string | null; age: string | null; pet_description: string | null; allergies: string | null; pet_photo_url: string | null; is_lost_mode_active: boolean | null; };

function digitsOnly(value?: string | null) { return (value ?? '').replace(/\D/g, ''); }

async function getPublicPetBySlug(slug: string): Promise<PetRecord | null> {
  const { data, error } = await supabasePublic.from('pets').select('*').eq('slug', slug).maybeSingle();
  if (error) return null;
  return data as PetRecord | null;
}

async function getOwnerContactById(ownerId: string): Promise<Owner | null> {
  const { data, error } = await supabaseAdmin.from('owners').select('*').eq('id', ownerId).maybeSingle();
  if (error) return null;
  return (data as Owner | null) ?? null;
}

export default async function PublicPetProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pet = await getPublicPetBySlug(slug);

  if (!pet) notFound();

  const lostMode = Boolean(pet.is_lost_mode_active);
  const owner = pet.owner_id ? await getOwnerContactById(pet.owner_id) : null;

  const petName = pet.pet_name?.trim() || 'Lucky Pet';
  const tagline = pet.pet_description?.trim() || "I'm friendly, please help me get back home.";
  const phone = digitsOnly(owner?.phone_number);
  const ownerPortalUrl = process.env.NEXT_PUBLIC_OWNER_PORTAL_URL || 'https://app.luckypetag.com';

  return (
    <PublicProfileUI 
      pet={pet}
      lostMode={lostMode}
      petName={petName}
      tagline={tagline}
      phone={phone}
      ownerPortalUrl={ownerPortalUrl}
      fonts={{ inter: inter.variable, jakarta: jakarta.variable }}
    />
  );
}