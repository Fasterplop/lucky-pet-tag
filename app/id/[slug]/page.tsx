import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  CalendarDays,
  HeartPulse,
  Info,
  LogIn,
  PawPrint,
  Shield,
  Tag,
} from 'lucide-react';
import { supabasePublic } from '../../../lib/supabase-public';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import FinderContactPanel from './FinderContactPanel';
import styles from './PublicProfile.module.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const dynamic = 'force-dynamic';

type Owner = {
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  has_whatsapp: boolean | null;
};

type PetRecord = {
  id: string;
  slug: string;
  owner_id: string | null;
  pet_name: string | null;
  pet_type: string | null;
  breed: string | null;
  age: string | null;
  pet_description: string | null;
  allergies: string | null;
  pet_photo_url: string | null;
  is_lost_mode_active: boolean | null;
};

function digitsOnly(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

async function getPublicPetBySlug(slug: string): Promise<PetRecord | null> {
  const { data, error } = await supabasePublic
    .from('pets')
    .select(`
      id,
      slug,
      owner_id,
      pet_name,
      pet_type,
      breed,
      age,
      pet_description,
      allergies,
      pet_photo_url,
      is_lost_mode_active
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error loading public pet profile:', error.message);
    return null;
  }

  return data as PetRecord | null;
}

async function getOwnerContactById(ownerId: string): Promise<Owner | null> {
  const { data, error } = await supabaseAdmin
    .from('owners')
    .select(`
      full_name,
      phone_number,
      address,
      has_whatsapp
    `)
    .eq('id', ownerId)
    .maybeSingle();

  if (error) {
    console.error('Error loading owner contact:', error.message);
    return null;
  }

  return (data as Owner | null) ?? null;
}

export default async function PublicPetProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pet = await getPublicPetBySlug(slug);

  if (!pet) {
    notFound();
  }

  const lostMode = Boolean(pet.is_lost_mode_active);
  const owner = pet.owner_id ? await getOwnerContactById(pet.owner_id) : null;

  const petName = pet.pet_name?.trim() || 'Lucky Pet';
  const tagline =
    pet.pet_description?.trim() || "I'm friendly, please help me get back home.";
  const phone = digitsOnly(owner?.phone_number);
  const canShareLocation = Boolean(phone && owner?.has_whatsapp);

  const ownerPortalUrl = process.env.NEXT_PUBLIC_OWNER_PORTAL_URL || 'https://app.luckypetag.com';

  return (
    <main className={`${styles.page} ${inter.variable} ${jakarta.variable}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="Lucky Pet Tag home">
            <img
              src="/logo.webp"
              alt="Lucky Pet Tag"
              className={styles.brandLogo}
            />
          </Link>

          <Link href={ownerPortalUrl} className={styles.ownerLink}>
            Owner? Edit Profile
            <LogIn size={16} />
          </Link>
        </div>
      </header>

      <section className={styles.shell}>
        <div className={styles.grid}>
          <aside className={styles.profileColumn}>
            <div className={styles.photoWrap}>
              <div className={styles.photoFrame}>
                {pet.pet_photo_url ? (
                  <img
                    src={pet.pet_photo_url}
                    alt={petName}
                    className={styles.photo}
                  />
                ) : (
                  <div className={styles.photoFallback}>No photo uploaded yet</div>
                )}
              </div>

              <div
                className={`${styles.modePill} ${
                  lostMode ? styles.modeLost : styles.modeProtected
                }`}
              >
                {lostMode ? <AlertTriangle size={14} /> : <BadgeCheck size={14} />}
                {lostMode ? "I'm lost" : 'Protected'}
              </div>
            </div>

            <div className={styles.identity}>
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{petName}</h1>
              </div>

              <p className={styles.tagline}>{tagline}</p>
            </div>

            {pet.allergies?.trim() ? (
              <div className={styles.allergyCard}>
                <div className={styles.allergyInner}>
                  <div className={styles.allergyIconWrap}>
                    <HeartPulse size={26} />
                  </div>

                  <div>
                    <h2 className={styles.allergyTitle}>Allergies / Medical Notes</h2>
                    <p className={styles.allergyText}>
                      Medical notes: {pet.allergies}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.factGridRight}>
              <FactCard
                icon={<Tag size={20} />}
                label="Pet Type"
                value={pet.pet_type || 'Not listed'}
              />
              <FactCard
                icon={<PawPrint size={20} />}
                label="Breed"
                value={pet.breed || 'Not listed'}
              />
              <FactCard
                className={styles.desktopOnlyCard}
                icon={<CalendarDays size={20} />}
                label="Age"
                value={pet.age || 'Not listed'}
              />
              <FactCard
                className={styles.desktopOnlyCard}
                icon={<Info size={20} />}
                label="Type"
                value="Pet Profile"
              />
            </div>
          </aside>

          <div className={styles.actionColumn}>
            <FinderContactPanel
  petName={petName}
  whatsappPhone={phone || ''}
/>

            <div className={styles.trustRow}>
              <div className={styles.trustItem}>
                <Shield size={14} />
                <span>Secure Profile</span>
              </div>

              <div className={styles.trustItem}>
                <BellRing size={14} />
                <span>Fast Family Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a
            href="/privacy"
            target="_blank"
            rel="noreferrer"
            className={styles.footerLink}
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className={styles.footerLink}
          >
            Terms of Use
          </a>
          <a
            href="/help"
            target="_blank"
            rel="noreferrer"
            className={styles.footerLink}
          >
            Support Center
          </a>
        </div>

        <p className={styles.footerBrand}>Powered by Lucky Pet Tag</p>
        <p className={styles.footerMadeBy}>
          Designed by{' '}
          <a
            href="https://hikevodesign.com"
            target="_blank"
            rel="noreferrer"
            className={styles.footerMadeByLink}
          >
            Hikevo Design
          </a>
        </p>
        <p className={styles.footerCopy}>
  © {new Date().getFullYear()} Lucky Pet Tag
        </p>
      </footer>
    </main>
  );
}

function FactCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`${styles.factCard} ${className || ''}`}>
      <div className={styles.factIcon}>{icon}</div>
      <div>
        <span className={styles.factLabel}>{label}</span>
        <span className={styles.factValue}>{value}</span>
      </div>
    </div>
  );
}