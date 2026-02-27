'use client';

import { useState, useCallback, useRef } from 'react';
import { ImageIcon, Loader2, Crown, Trash2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { CreditDisplay } from '@/components/credit-display';
import type { UserCredits } from '@/lib/usage-tracking';
import type { UserPhoto } from '@/lib/photo-utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface SettingsViewProps {
  userPhotos: UserPhoto[];
  onUploadPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onPhotoUploaded: () => void;
  isSubscribed: boolean;
  onShowPaywall: () => void;
  credits?: UserCredits | null;
  creditsLoading?: boolean;
}

export function SettingsView({
  userPhotos,
  onUploadPhoto,
  onRemovePhoto,
  onPhotoUploaded,
  isSubscribed,
  onShowPaywall,
  credits,
  creditsLoading = false,
}: SettingsViewProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload JPG, PNG, WebP, or AVIF images';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Validate photo with Gemini API
  const validatePhotoWithAI = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/validate-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        // If validation service is unavailable, allow upload
        if (response.status === 503) {
          return { valid: true };
        }
        const data = await response.json();
        return { valid: false, error: data.error || 'Validation failed' };
      }

      const data = await response.json();
      return { valid: data.valid, error: data.reason };
    } catch {
      // If validation fails due to network error, allow upload
      console.warn('Photo validation failed, allowing upload');
      return { valid: true };
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!user) {
      setUploadError('Please sign in to upload photos');
      return;
    }

    const availableSlots = MAX_PHOTOS - userPhotos.length;
    if (availableSlots <= 0) {
      setUploadError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // First pass: basic file validation (type, size)
    for (const file of filesToUpload) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors[0]);
    }

    if (validFiles.length === 0) return;

    setIsValidating(true);
    if (errors.length === 0) setUploadError(null);

    // Second pass: AI validation for each photo
    const aiValidatedFiles: File[] = [];
    for (const file of validFiles) {
      const result = await validatePhotoWithAI(file);
      if (result.valid) {
        aiValidatedFiles.push(file);
      } else if (result.error) {
        toast.error('Photo not suitable', {
          description: result.error,
          duration: 5000,
        });
      }
    }

    setIsValidating(false);

    if (aiValidatedFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    const supabase = createClient();

    // Upload all validated files in parallel
    const uploadPromises = aiValidatedFiles.map(async (file, index) => {
      try {
        const fileExt = file.name.split('.').pop();
        // Use index to ensure unique filenames even if uploads happen at same millisecond
        const fileName = `${Date.now()}-${index}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { data, error: uploadErr } = await supabase.storage
          .from('user-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        // Record in user_photos table (storage_path only, no public_url for private bucket)
        const { error: insertError } = await supabase.from('user_photos').insert({
          user_id: user.id,
          storage_path: data.path,
        });

        // If database insert fails, clean up the uploaded file
        if (insertError) {
          console.error('Failed to save photo record:', insertError);
          await supabase.storage.from('user-photos').remove([data.path]);
          throw new Error('Failed to save photo. Please try again.');
        }

        return true;
      } catch (err: any) {
        console.error('Upload error:', err);
        throw err;
      }
    });

    try {
      await Promise.all(uploadPromises);
      // Notify parent to refetch photos with signed URLs
      onPhotoUploaded();
      if (aiValidatedFiles.length > 0) {
        toast.success(`${aiValidatedFiles.length} photo${aiValidatedFiles.length > 1 ? 's' : ''} uploaded`);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload some photos');
    }

    setIsUploading(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      uploadFiles(imageFiles);
    } else {
      setUploadError('Please drop image files');
    }
  }, [user, userPhotos.length]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-serif text-foreground mb-8">Settings</h2>

        {/* Subscription Status */}
        <section className="mb-8">
          <div
            className={cn(
              'rounded-2xl p-6',
              isSubscribed
                ? 'bg-gradient-to-br from-[#FF6B9D]/20 to-[#C86DD7]/20 border border-primary/30'
                : 'bg-card border border-border'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    isSubscribed
                      ? 'bg-gradient-to-br from-[#FF6B9D] to-[#C86DD7]'
                      : 'bg-secondary'
                  )}
                >
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {isSubscribed ? 'PRO Member' : 'Free Plan'}
                  </h3>
                </div>
              </div>
              {!isSubscribed && (
                <button
                  onClick={onShowPaywall}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Upgrade
                </button>
              )}
              {isSubscribed && (
                <div className="flex items-center gap-2 text-primary">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Active</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Credits */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4">Credits & Usage</h3>
          <CreditDisplay
            credits={credits ?? null}
            isLoading={creditsLoading}
            variant="full"
            onUpgradeClick={onShowPaywall}
          />
        </section>

        {/* Your Photos */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
            Your Body Photos
          </h3>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'bg-card rounded-2xl border-2 p-4 transition-all',
              isDragging
                ? 'border-primary border-dashed bg-primary/5'
                : 'border-border'
            )}
          >
            <p className="text-sm text-muted-foreground mb-4">
              Photos used for virtual try-on. Drag & drop photos here or click to upload.
            </p>
            {uploadError && (
              <p className="text-sm text-red-500 mb-4">{uploadError}</p>
            )}
            <div className="flex gap-3 flex-wrap">
              {userPhotos.map((photo, index) => (
                <div key={photo.id} className="relative group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden">
                    <img
                      src={photo.signed_url || ''}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => onRemovePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(isUploading || isValidating) && (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-primary bg-primary/10 flex flex-col items-center justify-center gap-1">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-[10px] text-primary font-medium">
                    {isValidating ? 'Checking' : 'Uploading'}
                  </span>
                </div>
              )}
              {!isUploading && !isValidating && userPhotos.length < MAX_PHOTOS && (
                <button
                  onClick={handleClickUpload}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              )}
            </div>
            {userPhotos.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {userPhotos.length} of {MAX_PHOTOS} photos
              </p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
