'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BadgeCheck, BellRing, CalendarDays, HeartPulse, Info, LogIn, PawPrint, Shield, Tag } from 'lucide-react';
import FinderContactPanel from './FinderContactPanel';
import styles from './PublicProfile.module.css';

// Recibimos las variables ya procesadas desde el servidor
export default function PublicProfileUI({ 
  pet, 
  lostMode, 
  petName, 
  tagline, 
  phone, 
  ownerPortalUrl, 
  fonts 
}: any) {
  const { t } = useTranslation();

  return (
    <main className={`${styles.page} ${fonts.inter} ${fonts.jakarta}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="https://luckypetag.com" className={styles.brand} aria-label="Lucky Pet Tag home">
            <img src="/logo.webp" alt="Lucky Pet Tag" className={styles.brandLogo} />
          </Link>
          <Link href={ownerPortalUrl} className={styles.ownerLink}>
            {t('publicProfile.editProfile')}
            <LogIn size={16} />
          </Link>
        </div>
      </header>

      <section className={styles.shell}>
        <div className={styles.layout}>
          <section className={styles.heroBlock}>
            <div className={styles.photoWrap}>
              <div className={styles.photoFrame}>
                {pet.pet_photo_url ? (
                  <img src={pet.pet_photo_url} alt={petName} className={styles.photo} />
                ) : (
                  <div className={styles.photoFallback}>{t('publicProfile.noPhoto')}</div>
                )}
              </div>
              <div className={`${styles.modePill} ${lostMode ? styles.modeLost : styles.modeProtected}`}>
                {lostMode ? <AlertTriangle size={14} /> : <BadgeCheck size={14} />}
                {lostMode ? t('publicProfile.lost') : t('publicProfile.protected')}
              </div>
            </div>

            <div className={styles.identity}>
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{petName}</h1>
              </div>
              <p className={styles.tagline}>{tagline}</p>
            </div>
          </section>

          <section className={styles.bottomGrid}>
            <div className={styles.detailsColumn}>
              <div className={styles.detailsGrid}>
                {pet.allergies?.trim() && (
                  <div className={`${styles.allergyCard} ${styles.detailsSpan}`}>
                    <div className={styles.allergyInner}>
                      <div className={styles.allergyIconWrap}>
                        <HeartPulse size={22} />
                      </div>
                      <div>
                        <h2 className={styles.allergyTitle}>{t('publicProfile.allergiesTitle')}</h2>
                        <p className={styles.allergyText}>{t('publicProfile.medicalNotes')}: {pet.allergies}</p>
                      </div>
                    </div>
                  </div>
                )}

                <FactCard icon={<Tag size={18} />} label={t('publicProfile.petType')} value={pet.pet_type || t('publicProfile.notListed')} />
                <FactCard icon={<PawPrint size={18} />} label={t('publicProfile.breed')} value={pet.breed || t('publicProfile.notListed')} />
                <FactCard className={styles.desktopOnlyCard} icon={<CalendarDays size={18} />} label={t('publicProfile.age')} value={pet.age || t('publicProfile.notListed')} />
                <FactCard className={styles.desktopOnlyCard} icon={<Info size={18} />} label={t('publicProfile.type')} value={t('publicProfile.petProfile')} />
              </div>
            </div>

            <aside className={styles.contactColumn}>
              <FinderContactPanel petName={petName} whatsappPhone={phone || ""} />

              <div className={styles.trustRow}>
                <div className={styles.trustItem}>
                  <Shield size={14} />
                  <span>{t('publicProfile.secure')}</span>
                </div>
                <div className={styles.trustItem}>
                  <BellRing size={14} />
                  <span>{t('publicProfile.fastAlerts')}</span>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a href="/privacy" target="_blank" rel="noreferrer" className={styles.footerLink}>{t('publicProfile.privacy')}</a>
          <a href="/terms" target="_blank" rel="noreferrer" className={styles.footerLink}>{t('publicProfile.terms')}</a>
          <a href="/help" target="_blank" rel="noreferrer" className={styles.footerLink}>{t('publicProfile.support')}</a>
        </div>
        <p className={styles.footerBrand}>{t('publicProfile.poweredBy')}</p>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Lucky Pet Tag</p>
      </footer>
    </main>
  );
}

function FactCard({ icon, label, value, className }: any) {
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