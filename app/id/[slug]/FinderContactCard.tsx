// No se esta usando este Archivo, es opcional para futuras actualizaciones con formulario con Resend (notify-owner)

'use client';

import { useRef, useState } from 'react';
import { LoaderCircle, MapPin, MessageCircle, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type FinderContactCardProps = {
  petId: string;
  petName: string;
};

export default function FinderContactCard({
  petId,
  petName,
}: FinderContactCardProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const focusMessage = () => {
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 120);
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError(t('finderCard.errNoLocation'));
      return;
    }

    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`https://www.google.com/maps?q=${latitude},${longitude}`);
      },
      () => {
        setError(t('finderCard.errLocDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFoundClick = () => {
    setOpen(true);
    if (!message.trim()) {
      setMessage(t('finderCard.defaultMsg', { petName }));
    }
    captureLocation();
    setTimeout(() => textareaRef.current?.focus(), 120);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) {
      setError(t('finderCard.errEmptyMsg'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/notify-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petId,
          message: message.trim(),
          location: location.trim(),
          website: honeypot, // honeypot
        }),
      });

      if (!response.ok) {
        throw new Error(t('finderCard.errSend'));
      }

      setSuccess(t('finderCard.success'));
      setMessage('');
      setLocation('');
      setHoneypot('');
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('finderCard.errGeneric'));
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="rounded-[2rem] bg-white px-6 py-7 shadow-[0_20px_40px_rgba(11,105,70,0.08)] sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0b6946]/10">
          <SearchMark />
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-[#151d1b] [font-family:var(--font-headline)]">
          {t('finderCard.title', { petName })}
        </h2>

        <p className="mt-4 max-w-md text-lg leading-8 text-[#3f4942]">
          {t('finderCard.description')}
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-4">
          <button type="button" onClick={handleFoundClick} className="inline-flex items-center justify-center gap-3 rounded-[1.4rem] bg-gradient-to-r from-[#0b6946] to-[#30835d] px-6 py-5 text-lg font-bold text-white transition hover:scale-[1.01] active:scale-[0.99]">
            <MapPin className="h-5 w-5" />
            {t('finderCard.foundBtn')}
          </button>

          <button type="button" onClick={focusMessage} className="inline-flex items-center justify-center gap-3 rounded-[1.4rem] bg-[#f2fbf6] px-6 py-5 text-lg font-bold text-[#0b6946] transition hover:bg-[#e7f0eb]">
            <MessageCircle className="h-5 w-5" />
            {t('finderCard.msgBtn')}
          </button>
        </div>

        {open && (
          <form onSubmit={handleSubmit} className="mt-8 w-full max-w-md rounded-[1.75rem] bg-[#edf6f1] p-5 text-left">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#486c59]">
              {t('finderCard.msgLabel')}
            </label>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={t('finderCard.msgPlaceholder')}
              className="w-full rounded-[1.25rem] bg-white px-4 py-3 text-sm text-[#151d1b] outline-none ring-0 placeholder:text-[#6f7a72]"
            />

            <div className="mt-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#486c59]">
                {t('finderCard.locLabel')}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('finderCard.locPlaceholder')}
                className="w-full rounded-[1.25rem] bg-white px-4 py-3 text-sm text-[#151d1b] outline-none placeholder:text-[#6f7a72]"
              />
            </div>

            <div className="mt-3">
              <button type="button" onClick={captureLocation} className="text-sm font-semibold text-[#0b6946] underline underline-offset-4">
                {t('finderCard.useMyLocBtn')}
              </button>
            </div>

            <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

            {error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}
            {success && <p className="mt-4 text-sm font-medium text-[#0b6946]">{success}</p>}

            <button type="submit" disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#151d1b] px-5 py-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('finderCard.sendBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SearchMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="h-8 w-8 text-[#0b6946]"
      fill="none"
    >
      <circle cx="28" cy="28" r="12" stroke="currentColor" strokeWidth="4" />
      <path
        d="M37 37L48 48"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M24 28l3 3 6-7"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}