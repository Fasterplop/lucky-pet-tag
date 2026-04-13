'use client';

import { useState } from 'react';
import { LoaderCircle, MapPin, MessageCircle } from 'lucide-react';
import styles from './PublicProfile.module.css';

type FinderContactPanelProps = {
  petName: string;
  whatsappPhone: string;
};

export default function FinderContactPanel({
  petName,
  whatsappPhone,
}: FinderContactPanelProps) {
  const [error, setError] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  function openWhatsappMessage() {
    if (!whatsappPhone) {
      setError('WhatsApp contact is not available right now.');
      return;
    }

    setError('');

    const text = encodeURIComponent(
  `Hi, I found ${petName}. I wanted to reach out right away in case this helps bring ${petName} back home safely.`
);
    window.open(`https://wa.me/${whatsappPhone}?text=${text}`, '_blank');
  }

  function openWhatsappLocationFallback() {
    const fallbackText = encodeURIComponent(
      `Hi, I found ${petName}!. My phone couldn't get an automatic map link, please let me know when you see this!`
    );

    window.open(`https://wa.me/${whatsappPhone}?text=${fallbackText}`, '_blank');
  }

  function openWhatsappLocation() {
    if (!whatsappPhone) {
      setError('WhatsApp contact is not available right now.');
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
        const appleMapsUrl = `https://maps.apple.com/?ll=${latitude},${longitude}`;

        const text = encodeURIComponent(
          `Hi, I found ${petName}. I wanted to share the exact location where I found him/her to help bring ${petName} back home safely. I hope this helps you reunite very soon. \n\nGoogle Maps: ${googleMapsUrl}`
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
        <h2 className={styles.actionTitle}>Help me get back to my family</h2>

        <p className={styles.actionText}>
          A quick WhatsApp message can help reunite this pet with the people who
          love them.
        </p>

        <div className={styles.actionsStack}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={openWhatsappMessage}
          >
            <MessageCircle size={20} />
            Message my family
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={openWhatsappLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <LoaderCircle size={18} className={styles.spinIcon} />
            ) : (
              <MapPin size={20} />
            )}
            Send my location to my family
          </button>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </div>
  );
}