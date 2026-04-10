'use client';

import { useRef, useState } from 'react';
import { LoaderCircle, MapPin, MessageCircle, SearchCheck, Send } from 'lucide-react';
import styles from './PublicProfile.module.css';

type FinderContactPanelProps = {
  petId: string;
  petName: string;
};

export default function FinderContactPanel({
  petId,
  petName,
}: FinderContactPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function openComposer(prefill?: string) {
    setOpen(true);
    setSuccess('');
    setError('');

    if (prefill && !message.trim()) {
      setMessage(prefill);
    }

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 80);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!message.trim()) {
      setError('Please write a short message before sending.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/notify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          message: message.trim(),
          website,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not send the alert.');
      }

      setSuccess('Your alert was sent to the owner.');
      setMessage('');
      setWebsite('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.actionCard}>
      <div className={styles.center}>
        <div className={styles.actionIconWrap}>
          <SearchCheck size={30} />
        </div>

        <h2 className={styles.actionTitle}>Did you find {petName}?</h2>

        <p className={styles.actionText}>
          Thank you for looking out. Use the options below to safely notify the owner
          without exposing private information.
        </p>

        <div className={styles.actionsStack}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() =>
              openComposer(`Hi, I found ${petName} and wanted to report it.`)
            }
          >
            <MapPin size={20} />
            I found this pet wandering
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => openComposer()}
          >
            <MessageCircle size={20} />
            Message Owner Directly
          </button>
        </div>

        {open ? (
          <form className={styles.formCard} onSubmit={handleSubmit}>
            <label className={styles.label}>Message</label>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Tell the owner what happened..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className={styles.hiddenTrap}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            {error ? <p className={styles.error}>{error}</p> : null}
            {success ? <p className={styles.success}>{success}</p> : null}

            <button className={styles.submitButton} disabled={loading} type="submit">
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              Send alert to owner
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}