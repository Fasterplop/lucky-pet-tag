'use client';

import { useState } from 'react';
import { LoaderCircle, MapPin, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './PublicProfile.module.css';

type FinderContactPanelProps = {
  petName: string;
  whatsappPhone: string;
};

export default function FinderContactPanel({
  petName,
  whatsappPhone,
}: FinderContactPanelProps) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  function openWhatsappMessage() {
    if (!whatsappPhone) {
      setError(t('finderPanel.waNotAvailable'));
      return;
    }

    setError('');

    const text = encodeURIComponent(t('finderPanel.waTemplateBasic', { petName }));
    window.location.href = `https://wa.me/${whatsappPhone}?text=${text}`;
  }

  function openWhatsappLocationFallback() {
    const fallbackText = encodeURIComponent(t('finderPanel.waTemplateFallback', { petName }));
    window.open(`https://wa.me/${whatsappPhone}?text=${fallbackText}`, '_blank');
  }


  function openWhatsappLocation() {
    if (!whatsappPhone) {
      setError(t('finderPanel.waNotAvailable'));
      return;
    }

    if (!navigator.geolocation) {
      openWhatsappLocationFallback();
      return;
    }

    setLoadingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        const text = encodeURIComponent(
          t('finderPanel.waTemplateLocation', { petName, url: googleMapsUrl })
        );

        window.location.href = `https://wa.me/${whatsappPhone}?text=${text}`;
        setLoadingLocation(false);
      },
      () => {
        setLoadingLocation(false);
        openWhatsappLocationFallback();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /*
  // FUTURE OPTION: if you want to bring email back later
  async function sendEmailMessageInFuture() {
    await fetch('/api/notify-owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId: 'ADD_PET_ID_BACK_HERE',
        message: `Hi, I found ${petName} 🐾`,
        website: '',
      }),
    });
  }
  */

  /*
  // FUTURE OPTION: if you want to support SMS or another channel later
  function sendSmsInFuture() {
    const text = encodeURIComponent(`Hi, I found ${petName} 🐾`);
    window.open(`sms:${whatsappPhone}?body=${text}`, '_self');
  }
  */

  return (
    <div className={styles.actionCard}>
      <div className={styles.center}>
        <h2 className={styles.actionTitle}>{t('finderPanel.title')}</h2>
        <p className={styles.actionText}>{t('finderPanel.description')}</p>

        <div className={styles.actionsStack}>
          <button type="button" className={styles.secondaryButton} onClick={openWhatsappMessage}>
            <MessageCircle size={20} />
            {t('finderPanel.msgFamilyBtn')}
          </button>

          <button type="button" className={styles.primaryButton} onClick={openWhatsappLocation} disabled={loadingLocation}>
            {loadingLocation ? (
              <LoaderCircle size={18} className={styles.spinIcon} />
            ) : (
              <MapPin size={20} />
            )}
            {t('finderPanel.sendLocationBtn')}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}