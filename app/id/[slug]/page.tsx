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
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
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
  const owner =
    lostMode && pet.owner_id
      ? await getOwnerContactById(pet.owner_id)
      : null;

  const petName = pet.pet_name?.trim() || 'Lucky Pet';
  const tagline =
    pet.pet_description?.trim() || "I'm friendly, please check my tag.";

  const phone = digitsOnly(owner?.phone_number);
  const callHref = phone ? `tel:${phone}` : '#';
  const whatsappHref =
    phone && owner?.has_whatsapp ? `https://wa.me/${phone}` : '#';
  const mapsHref = owner?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        owner.address
      )}`
    : '#';

  const ownerPortalUrl = process.env.NEXT_PUBLIC_OWNER_PORTAL_URL || '/app';

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
          <aside className={styles.left}>
            {!lostMode ? (
              <FinderContactPanel petId={pet.id} petName={petName} />
            ) : (
              <div className={styles.actionCard}>
                <div className={styles.center}>
                  <div
                    className={styles.actionIconWrap}
                    style={{ background: '#fee2e2', color: '#dc2626' }}
                  >
                    <AlertTriangle size={28} />
                  </div>

                  <h2 className={styles.actionTitle}>{petName} may be lost</h2>

                  <p className={styles.actionText}>
                    Lost Mode is active. Please contact the owner immediately using
                    one of the direct actions below.
                  </p>

                  <div className={styles.directGrid}>
                    <DirectButton
                      href={callHref}
                      label="Call"
                      icon={<Phone size={17} />}
                      variant="red"
                      disabled={!phone}
                    />
                    <DirectButton
                      href={whatsappHref}
                      label="WhatsApp"
                      icon={<MessageCircle size={17} />}
                      variant="green"
                      disabled={!(phone && owner?.has_whatsapp)}
                      external
                    />
                    <DirectButton
                      href={mapsHref}
                      label="Google Maps"
                      icon={<MapPin size={17} />}
                      variant="dark"
                      disabled={!owner?.address}
                      external
                    />
                  </div>

                  <div className={styles.ownerInfo}>
                    <p className={styles.ownerInfoTitle}>Owner contact</p>
                    <p className={styles.ownerInfoRow}>
                      <strong>Name:</strong> {owner?.full_name || 'Not available'}
                    </p>
                    <p className={styles.ownerInfoRow}>
                      <strong>Phone:</strong> {owner?.phone_number || 'Not available'}
                    </p>
                    <p className={styles.ownerInfoRow}>
                      <strong>Address:</strong> {owner?.address || 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.trustRow}>
              <div className={styles.trustItem}>
                <Shield size={14} />
                <span>Secure Profile</span>
              </div>

              <div className={styles.trustItem}>
                <BellRing size={14} />
                <span>Instant Alerts</span>
              </div>
            </div>
          </aside>

          <div className={styles.right}>
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
                {lostMode ? 'Lost Mode' : 'Protected'}
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
                    <h2 className={styles.allergyTitle}>
                      Allergies / Medical Notes
                    </h2>
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
                icon={<CalendarDays size={20} />}
                label="Age"
                value={pet.age || 'Not listed'}
              />
              <FactCard
                icon={<Info size={20} />}
                label="Type"
                value="Pet Profile"
              />
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
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Lucky Pet Tag</p>
      </footer>
    </main>
  );
}

function FactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.factCard}>
      <div className={styles.factIcon}>{icon}</div>
      <div>
        <span className={styles.factLabel}>{label}</span>
        <span className={styles.factValue}>{value}</span>
      </div>
    </div>
  );
}

function DirectButton({
  href,
  label,
  icon,
  variant,
  disabled,
  external = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  variant: 'red' | 'green' | 'dark';
  disabled?: boolean;
  external?: boolean;
}) {
  const variantClass =
    variant === 'red'
      ? styles.directRed
      : variant === 'green'
      ? styles.directGreen
      : styles.directDark;

  if (disabled) {
    return (
      <div className={`${styles.directButton} ${styles.directDisabled}`}>
        {icon}
        {label}
      </div>
    );
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={`${styles.directButton} ${variantClass}`}
    >
      {icon}
      {label}
    </a>
  );
}