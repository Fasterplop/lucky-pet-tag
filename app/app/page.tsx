'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ExternalLink,
  Heart,
  ImagePlus,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Save,
  Shield,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './OwnerPortal.module.css';

type Owner = {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  has_whatsapp: boolean | null;
};

type Pet = {
  id: string;
  slug: string;
  pet_name: string | null;
  pet_type: string | null;
  breed: string | null;
  age: string | null;
  pet_description: string | null;
  allergies: string | null;
  pet_photo_url: string | null;
  is_lost_mode_active: boolean | null;
};

type OwnerFormState = {
  full_name: string;
  phone_number: string;
  address: string;
  has_whatsapp: boolean;
};

type PetFormState = {
  pet_name: string;
  pet_type: string;
  breed: string;
  age: string;
  pet_description: string;
  allergies: string;
};

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

function makeOwnerForm(owner: Owner): OwnerFormState {
  return {
    full_name: owner.full_name ?? '',
    phone_number: owner.phone_number ?? '',
    address: owner.address ?? '',
    has_whatsapp: Boolean(owner.has_whatsapp),
  };
}

function makePetForm(pet: Pet): PetFormState {
  return {
    pet_name: pet.pet_name ?? '',
    pet_type: pet.pet_type ?? '',
    breed: pet.breed ?? '',
    age: pet.age ?? '',
    pet_description: pet.pet_description ?? '',
    allergies: pet.allergies ?? '',
  };
}

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function getStoragePathFromPublicUrl(url: string | null) {
  if (!url) return null;

  const marker = '/storage/v1/object/public/lucky-pet-assets/';
  const index = url.indexOf(marker);

  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length));
}

export default function OwnerPortalPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [ownerForm, setOwnerForm] = useState<OwnerFormState | null>(null);

  const [pets, setPets] = useState<Pet[]>([]);
  const [busyPetId, setBusyPetId] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [petForm, setPetForm] = useState<PetFormState | null>(null);

  const [savingOwner, setSavingOwner] = useState(false);
  const [savingPet, setSavingPet] = useState(false);
  const [uploadingPhotoPetId, setUploadingPhotoPetId] = useState<string | null>(
    null
  );
  const [deletingPhotoPetId, setDeletingPhotoPetId] = useState<string | null>(
    null
  );
  const [banner, setBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const yourPetsRef = useRef<HTMLElement | null>(null);

  const publicBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_PUBLIC_PET_PROFILE_BASE_URL ||
      'https://luckypetag.com/id'
    ).replace(/\/$/, '');
  }, []);

  const ownerDisplayName =
  owner?.full_name?.trim().split(/\s+/)[0] ||
  owner?.email?.split('@')[0] ||
  'Owner';

  useEffect(() => {
    void loadPortal();
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
  if (loading) return;
  if (window.location.hash !== '#your-pets') return;

  useEffect(() => {
  if (loading) return;
  if (pets.length === 0) return;
  if (editingPetId) return;

  const latestPet = pets[0]; // porque created_at está DESC
  setEditingPetId(latestPet.id);
  setPetForm(makePetForm(latestPet));
}, [loading, pets, editingPetId]);

  const timer = window.setTimeout(() => {
    yourPetsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, 120);

  return () => window.clearTimeout(timer);
}, [loading, pets.length]);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
  }

  async function loadPortal() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.replace('https://app.luckypetag.com/login');
      return;
    }

    const { data: ownerData, error: ownerError } = await supabase
      .from('owners')
      .select('id, email, full_name, phone_number, address, has_whatsapp')
      .eq('email', session.user.email)
      .maybeSingle();

    if (ownerError || !ownerData) {
      console.error('Owner lookup failed:', ownerError?.message);
      window.location.replace('https://app.luckypetag.com/login');
      return;
    }

    const typedOwner = ownerData as Owner;
    setOwner(typedOwner);
    setOwnerForm(makeOwnerForm(typedOwner));

    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select(`
        id,
        slug,
        pet_name,
        pet_type,
        breed,
        age,
        pet_description,
        allergies,
        pet_photo_url,
        is_lost_mode_active
      `)
      .eq('owner_id', typedOwner.id)
      .order('created_at', { ascending: false });

    if (petsError) {
      console.error('Pets lookup failed:', petsError.message);
      setPets([]);
      setLoading(false);
      return;
    }

    setPets((petsData as Pet[] | null) ?? []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace('https://app.luckypetag.com/login');
  }

  function startEditingPet(pet: Pet) {
    setEditingPetId(pet.id);
    setPetForm(makePetForm(pet));
  }

  function cancelEditingPet() {
    setEditingPetId(null);
    setPetForm(null);
  }

  async function toggleLostMode(pet: Pet) {
    setBusyPetId(pet.id);

    try {
      const nextValue = !pet.is_lost_mode_active;

      const { data, error } = await supabase
        .from('pets')
        .update({ is_lost_mode_active: nextValue })
        .eq('id', pet.id)
        .select('id, is_lost_mode_active')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setPets((current) =>
        current.map((item) =>
          item.id === pet.id
            ? {
                ...item,
                is_lost_mode_active: data.is_lost_mode_active,
              }
            : item
        )
      );

      setBanner(
        nextValue
          ? `${pet.pet_name || 'Your pet'} is now in Lost Mode.`
          : `${pet.pet_name || 'Your pet'} is back in Safe Mode.`
      );
      showToast(
        'success',
        nextValue ? 'Lost Mode activated.' : 'Lost Mode deactivated.'
      );
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not update Lost Mode.'
      );
    } finally {
      setBusyPetId(null);
    }
  }

  async function handlePetPhotoUpload(pet: Pet, file: File) {
    if (!file) return;

    const maxSizeBytes = 10 * 1024 * 1024;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Only image files are allowed.');
      return;
    }

    if (file.size > maxSizeBytes) {
      showToast('error', 'Image must be 10 MB or smaller.');
      return;
    }

    setUploadingPhotoPetId(pet.id);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `pets/${pet.id}/photo-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('lucky-pet-assets')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('lucky-pet-assets')
        .getPublicUrl(filePath);

      const newPhotoUrl = publicUrlData.publicUrl;

      const { data, error } = await supabase
        .from('pets')
        .update({ pet_photo_url: newPhotoUrl })
        .eq('id', pet.id)
        .select(`
          id,
          slug,
          pet_name,
          pet_type,
          breed,
          age,
          pet_description,
          allergies,
          pet_photo_url,
          is_lost_mode_active
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const oldPath = getStoragePathFromPublicUrl(pet.pet_photo_url);
      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from('lucky-pet-assets').remove([oldPath]);
      }

      setPets((current) =>
        current.map((item) => (item.id === pet.id ? (data as Pet) : item))
      );

      setBanner('Pet photo updated successfully.');
      showToast('success', 'Photo uploaded successfully.');
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not upload pet photo.'
      );
    } finally {
      setUploadingPhotoPetId(null);
    }
  }

  async function handlePetPhotoDelete(pet: Pet) {
    setDeletingPhotoPetId(pet.id);

    try {
      const oldPath = getStoragePathFromPublicUrl(pet.pet_photo_url);

      if (oldPath) {
        const { error: removeError } = await supabase.storage
          .from('lucky-pet-assets')
          .remove([oldPath]);

        if (removeError) {
          throw new Error(removeError.message);
        }
      }

      const { data, error } = await supabase
        .from('pets')
        .update({ pet_photo_url: null })
        .eq('id', pet.id)
        .select(`
          id,
          slug,
          pet_name,
          pet_type,
          breed,
          age,
          pet_description,
          allergies,
          pet_photo_url,
          is_lost_mode_active
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setPets((current) =>
        current.map((item) => (item.id === pet.id ? (data as Pet) : item))
      );

      setBanner('Pet photo removed.');
      showToast('success', 'Photo removed successfully.');
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not remove pet photo.'
      );
    } finally {
      setDeletingPhotoPetId(null);
    }
  }

  async function savePetChanges() {
    if (!editingPetId || !petForm) return;

    setSavingPet(true);

    try {
      const { data, error } = await supabase
        .from('pets')
        .update({
          pet_name: petForm.pet_name.trim(),
          pet_type: petForm.pet_type.trim(),
          breed: petForm.breed.trim(),
          age: petForm.age.trim(),
          pet_description: petForm.pet_description.trim(),
          allergies: petForm.allergies.trim(),
        })
        .eq('id', editingPetId)
        .select(`
          id,
          slug,
          pet_name,
          pet_type,
          breed,
          age,
          pet_description,
          allergies,
          pet_photo_url,
          is_lost_mode_active
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setPets((current) =>
        current.map((pet) => (pet.id === editingPetId ? (data as Pet) : pet))
      );

      setBanner('Your pet profile has been updated.');
      showToast('success', 'Pet profile updated.');
      cancelEditingPet();
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not save pet changes.'
      );
    } finally {
      setSavingPet(false);
    }
  }

  async function saveOwnerSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!owner || !ownerForm) return;

    setSavingOwner(true);

    try {
      const { data, error } = await supabase
        .from('owners')
        .update({
          full_name: ownerForm.full_name.trim(),
          phone_number: ownerForm.phone_number.trim(),
          address: ownerForm.address.trim(),
          has_whatsapp: true,
        })
        .eq('id', owner.id)
        .select('id, email, full_name, phone_number, address, has_whatsapp')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const updatedOwner = data as Owner;
      setOwner(updatedOwner);
      setOwnerForm(makeOwnerForm(updatedOwner));
      setBanner('Your profile has been updated.');
      showToast('success', 'Profile updated successfully.');
    } catch (error) {
      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Could not save owner settings.'
      );
    } finally {
      setSavingOwner(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingWrap}>
          <div className={styles.loadingPill}>
            <Loader2 className={styles.spinIcon} size={18} />
            <span>Loading...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <p className={styles.eyebrow}>Owner Portal</p>
            <h1 className={styles.headerTitle}>Welcome, {ownerDisplayName}</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={styles.signOutButton}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      {banner ? (
        <div className={styles.banner}>
          <div className={styles.bannerInner}>
            <Check size={16} />
            <span>{banner}</span>
          </div>
        </div>
      ) : null}

      <section className={styles.shell}>
        <div className={styles.heroCard}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.heroBadge}>
                <Heart size={16} />
                <span>Pet Gallery</span>
              </div>

              {/* <h2 className={styles.heroTitle}>
                A warmer place for the pets you love most.
              </h2> */}

              <p className={styles.heroText}>
                Keep each profile complete, beautiful, and ready to help your
                companion get back home faster when it matters most.
              </p>

              <div className={styles.heroStats}>
                <StatPill
                  icon={<Heart size={15} />}
                  label={`${pets.length} pet${pets.length === 1 ? '' : 's'} in your gallery`}
                />
                <StatPill
                  icon={<ShieldAlert size={15} />}
                  label={`${
                    pets.filter((pet) => Boolean(pet.is_lost_mode_active)).length
                  } in Lost Mode`}
                />
              </div>
            </div>

            <div className={styles.heroActions}>
              <a href="#owner-profile" className={styles.secondaryAction}>
                <UserRound size={16} />
                Edit My Profile
              </a>

              <a
                href="https://luckypetag.com/collections/all"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryAction}
              >
                <Plus size={16} />
                Add New Pet
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.shell} ref={yourPetsRef}>
        <div className={styles.sectionIntro}>

          <p className={styles.eyebrow}>Your Pets</p>
          {/* <h2 className={styles.sectionTitle}>Pet gallery</h2> */}
          <p className={styles.sectionText}>
            Every profile here helps tell your pet’s story. Update details, open
            the public profile, or turn on Lost Mode when your companion needs
            more visibility.
          </p>
        </div>

        {pets.length === 0 ? (
          <div className={styles.emptyCard}>
            
            <h3 className={styles.emptyTitle}>Your gallery is waiting.</h3>
            <p className={styles.emptyText}>
              Add your first pet and create a profile that helps them come home
              safely.
            </p>
            <a
              href="https://luckypetag.com/collections/all"
              target="_blank"
              rel="noreferrer"
              className={styles.primaryAction}
            >
              <Plus size={16} />
              Add Your First Pet
            </a>
          </div>
        ) : (
          <div className={styles.petGrid}>
            {pets.map((pet) => {
              const publicUrl = `${publicBaseUrl}/${pet.slug}`;
              const isEditing = editingPetId === pet.id;
              const lostMode = Boolean(pet.is_lost_mode_active);

              return (
                <article key={pet.id} className={styles.petCard}>
                  <div className={styles.petImageWrap}>
                    {pet.pet_photo_url ? (
                      <img
                        src={pet.pet_photo_url}
                        alt={pet.pet_name || 'Pet'}
                        className={styles.petImage}
                      />
                    ) : (
                      <div className={styles.petImageFallback}>
                        No photo uploaded
                      </div>
                    )}

                    <div
                      className={joinClassNames(
                        styles.statusPill,
                        lostMode ? styles.statusLost : styles.statusSafe
                      )}
                    >
                      {lostMode ? (
                        <ShieldAlert size={14} />
                      ) : (
                        <Shield size={14} />
                      )}
                      <span>{lostMode ? 'Lost Mode' : 'Safe Mode'}</span>
                    </div>
                  </div>

                  <div className={styles.petBody}>
                    <div className={styles.petTopRow}>
                      <div className={styles.petMainInfo}>
                        <h3 className={styles.petName}>
                          {pet.pet_name || 'Unnamed pet'}
                        </h3>
                        <p className={styles.petMeta}>
                          {[pet.pet_type, pet.breed, pet.age]
                            .filter(Boolean)
                            .join(' • ') || 'Pet details not completed yet'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => startEditingPet(pet)}
                        className={styles.iconRoundButton}
                        aria-label={`Edit ${pet.pet_name || 'pet'}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>

                    <div className={styles.petActions}>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.profileLinkButton}
                      >
                        <span>View public profile</span>
                        <ExternalLink size={16} />
                      </a>

                      <button
                        type="button"
                        disabled={busyPetId === pet.id}
                        onClick={() => toggleLostMode(pet)}
                        className={joinClassNames(
                          styles.lostModeButton,
                          lostMode ? styles.lostModeOff : styles.lostModeOn
                        )}
                      >
                        <span className={styles.lostModeLabel}>
                          {busyPetId === pet.id ? (
                            <Loader2 className={styles.spinIcon} size={16} />
                          ) : lostMode ? (
                            <Shield size={16} />
                          ) : (
                            <ShieldAlert size={16} />
                          )}
                          <span>
                            {lostMode
                              ? 'Deactivate Lost Mode'
                              : 'Activate Lost Mode'}
                          </span>
                        </span>
                      </button>
                    </div>

                    {isEditing && petForm ? (
                      <div className={styles.editorCard}>
                        <div className={styles.photoEditorCard}>
                          <div className={styles.photoEditorPreview}>
                            {pet.pet_photo_url ? (
                              <img
                                src={pet.pet_photo_url}
                                alt={pet.pet_name || 'Pet photo'}
                                className={styles.photoEditorImage}
                              />
                            ) : (
                              <div className={styles.photoEditorFallback}>
                                No photo yet
                              </div>
                            )}
                          </div>

                          <div className={styles.photoEditorActions}>
                            <label className={styles.uploadPhotoButton}>
                              {uploadingPhotoPetId === pet.id ? (
                                <>
                                  <Loader2
                                    className={styles.spinIcon}
                                    size={16}
                                  />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <ImagePlus size={16} />
                                  <span>Change photo</span>
                                </>
                              )}

                              <input
                                type="file"
                                accept="image/*"
                                className={styles.hiddenFileInput}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    void handlePetPhotoUpload(pet, file);
                                  }
                                  e.currentTarget.value = '';
                                }}
                              />
                            </label>

                            {pet.pet_photo_url ? (
                              <button
                                type="button"
                                className={styles.removePhotoButton}
                                disabled={deletingPhotoPetId === pet.id}
                                onClick={() => void handlePetPhotoDelete(pet)}
                              >
                                {deletingPhotoPetId === pet.id ? (
                                  <>
                                    <Loader2
                                      className={styles.spinIcon}
                                      size={16}
                                    />
                                    <span>Removing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 size={16} />
                                    <span>Remove photo</span>
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>

                          <p className={styles.photoEditorNote}>
  <strong>Note:</strong> This photo becomes your pet’s identity. Make sure the
  face is fully visible and centered within the circle. A front-facing image
  works best. If the face isn’t clear or complete, please choose another photo.
  High-quality images ensure a sharper, more precise engraving.
                          </p>

                        </div>

                        <div className={styles.formGrid}>
                          <InputField
                            label="Pet name"
                            value={petForm.pet_name}
                            placeholder="e.g. Bella"
                            onChange={(value) =>
                              setPetForm((current) =>
                                current
                                  ? { ...current, pet_name: value }
                                  : current
                              )
                            }
                          />
                          <InputField
                            label="Pet type"
                            value={petForm.pet_type}
                            placeholder="e.g. Dog"
                            onChange={(value) =>
                              setPetForm((current) =>
                                current
                                  ? { ...current, pet_type: value }
                                  : current
                              )
                            }
                          />
                          <InputField
                            label="Breed"
                            value={petForm.breed}
                            placeholder="e.g. Golden Retriever"
                            onChange={(value) =>
                              setPetForm((current) =>
                                current ? { ...current, breed: value } : current
                              )
                            }
                          />
                          <InputField
                            label="Age"
                            value={petForm.age}
                            placeholder="e.g. 3 years"
                            onChange={(value) =>
                              setPetForm((current) =>
                                current ? { ...current, age: value } : current
                              )
                            }
                          />
                        </div>

                        <div className={styles.formSpacing}>
                          <TextAreaField
                            label="Description"
                            value={petForm.pet_description}
                            placeholder="e.g. Friendly, playful, and loves being around people."
                            onChange={(value) =>
                              setPetForm((current) =>
                                current
                                  ? { ...current, pet_description: value }
                                  : current
                              )
                            }
                          />
                        </div>

                        <div className={styles.formSpacing}>
                          <TextAreaField
                            label="Allergies / Medical notes"
                            value={petForm.allergies}
                            placeholder="e.g. Allergic to chicken. Takes medication every morning."
                            onChange={(value) =>
                              setPetForm((current) =>
                                current
                                  ? { ...current, allergies: value }
                                  : current
                              )
                            }
                          />
                        </div>

                        <div className={styles.editorActions}>
                          <button
                            type="button"
                            disabled={savingPet}
                            onClick={savePetChanges}
                            className={styles.darkButton}
                          >
                            {savingPet ? (
                              <Loader2 className={styles.spinIcon} size={16} />
                            ) : (
                              <Save size={16} />
                            )}
                            <span>Save changes</span>
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditingPet}
                            className={styles.secondarySmallButton}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="owner-profile" className={styles.shell}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Owner Profile</p>
          {/* <h2 className={styles.sectionTitle}>
            Keep your contact details close to home.
          </h2> */}
          <p className={styles.sectionText}>
            Make sure your information is accurate so your pet’s profile can
            help the right person reach you quickly when needed.
          </p>
        </div>

        <form onSubmit={saveOwnerSettings} className={styles.ownerCard}>
          <div className={styles.formGrid}>
            <InputField
              label="Full name"
              value={ownerForm?.full_name || ''}
              placeholder="e.g. Luis Martinez"
              onChange={(value) =>
                setOwnerForm((current) =>
                  current ? { ...current, full_name: value } : current
                )
              }
            />

            <InputField
              label="Phone number *"
              value={ownerForm?.phone_number || ''}
              placeholder="e.g. (123) 456-7890"
              hint="Used for WhatsApp messages and shared location."
              onChange={(value) =>
                setOwnerForm((current) =>
                  current ? { ...current, phone_number: value } : current
                )
              }
            />
          </div>

          <div className={styles.formSpacing}>
            <InputField
              label="Address"
              value={ownerForm?.address || ''}
              placeholder="e.g. 1200 NW 6 Avenue, Miami, FL 33136"
              onChange={(value) =>
                setOwnerForm((current) =>
                  current ? { ...current, address: value } : current
                )
              }
            />
          </div>

          <div className={styles.formSpacing}>
            <InputField
              label="Email"
              value={owner?.email || ''}
              placeholder="e.g. name@email.com"
              onChange={() => {}}
              disabled
            />
          </div>

          {/*
          <label className={styles.checkboxCard}>
            <input
              type="checkbox"
              checked={Boolean(ownerForm?.has_whatsapp)}
              onChange={(e) =>
                setOwnerForm((current) =>
                  current
                    ? { ...current, has_whatsapp: e.target.checked }
                    : current
                )
              }
            />
            <span>I use WhatsApp for Lost Mode contact</span>
          </label>
          */}

          <div className={styles.ownerActions}>
            <button
              type="submit"
              disabled={savingOwner}
              className={styles.primaryAction}
            >
              {savingOwner ? (
                <Loader2 className={styles.spinIcon} size={16} />
              ) : (
                <Save size={16} />
              )}
              <span>Save my profile</span>
            </button>
          </div>
        </form>
      </section>

      {toast ? (
        <div className={styles.toastViewport}>
          <div
            className={joinClassNames(
              styles.toast,
              toast.type === 'success' ? styles.toastSuccess : styles.toastError
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function StatPill({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className={styles.statPill}>
      <span className={styles.statIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = '',
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
      />
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={styles.textarea}
      />
    </label>
  );
}