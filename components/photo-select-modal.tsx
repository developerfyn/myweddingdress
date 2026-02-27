'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Plus, Check, Upload, Loader2, AlertCircle, Trash2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { CREDIT_COSTS, type UserCredits } from '@/lib/usage-tracking';
import type { UserPhoto } from '@/lib/photo-utils';

interface PhotoSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhotos: UserPhoto[];
  onSelectPhoto: (photoUrl: string) => void;
  onPhotoUploaded: () => void;
  onDeletePhoto: (index: number) => void;
  credits?: UserCredits | null;
  onShowPaywall?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export function PhotoSelectModal({
  isOpen,
  onClose,
  userPhotos,
  onSelectPhoto,
  onPhotoUploaded,
  onDeletePhoto,
  credits,
  onShowPaywall,
}: PhotoSelectModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(true);

  const canUploadMore = userPhotos.length < MAX_PHOTOS;
  const availableSlots = MAX_PHOTOS - userPhotos.length;

  const handlePhotoClick = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setError(null);
  };

  const handleConfirm = () => {
    if (selectedPhoto) {
      // Check if user has enough credits for try-on
      const hasEnoughCredits = credits && credits.credits_balance >= CREDIT_COSTS.tryon;

      if (!hasEnoughCredits) {
        // Show paywall if not enough credits
        if (onShowPaywall) {
          onShowPaywall();
        }
        return;
      }

      // Reset local state before calling onSelectPhoto
      setSelectedPhoto(null);
      setError(null);
      // Call the select handler - this will close this modal and open TryOnModal
      // Do NOT call handleClose/onClose here as that would clear tryOnGown
      onSelectPhoto(selectedPhoto);
    }
  };

  const handleClose = () => {
    setSelectedPhoto(null);
    setError(null);
    onClose();
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload a JPG, PNG, WebP, or AVIF image';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  // Upload multiple files
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!user || files.length === 0) return;

    // Limit to available slots
    const filesToUpload = files.slice(0, availableSlots);

    if (files.length > availableSlots) {
      setError(`Only ${availableSlots} more photo(s) can be added (max ${MAX_PHOTOS} total)`);
    }

    // Validate all files first
    const validFiles: File[] = [];
    for (const file of filesToUpload) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });
    setError(null);

    try {
      const supabase = createClient();

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress({ current: i + 1, total: validFiles.length });

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { data, error: uploadErr } = await supabase.storage
          .from('user-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        // Record in user_photos table (storage_path only, no public_url for private bucket)
        await supabase.from('user_photos').insert({
          user_id: user.id,
          storage_path: data.path,
        });
      }

      // Notify parent to refetch photos with signed URLs
      onPhotoUploaded();
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [user, onPhotoUploaded, availableSlots]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await uploadFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFiles]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUploadMore && !isUploading) {
      setIsDragging(true);
    }
  }, [canUploadMore, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canUploadMore || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      await uploadFiles(imageFiles);
    } else {
      setError('Please drop image files');
    }
  }, [canUploadMore, isUploading, uploadFiles]);

  const handleUploadClick = () => {
    if (canUploadMore) {
      fileInputRef.current?.click();
    }
  };

  const handleDeletePhoto = async (index: number, photoUrl: string) => {
    setDeletingIndex(index);

    // If the deleted photo was selected, clear selection
    if (selectedPhoto === photoUrl) {
      setSelectedPhoto(null);
    }

    // Call parent handler to delete
    await onDeletePhoto(index);

    setDeletingIndex(null);
  };

  if (!isOpen) return null;

  const hasPhotos = userPhotos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-lg bg-card rounded-2xl animate-in zoom-in-95 fade-in duration-200",
          isDragging && "ring-2 ring-primary ring-offset-2"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="font-serif text-2xl text-foreground mb-2">
              Select Your Photo
            </h3>
            <p className="text-muted-foreground text-sm">
              Choose which photo to use for this try-on
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Photo Tips */}
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
            <button
              onClick={() => setShowTips(!showTips)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-amber-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-amber-700">
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm font-medium">Tips for best results</span>
              </div>
              {showTips ? (
                <ChevronUp className="w-4 h-4 text-amber-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-600" />
              )}
            </button>
            {showTips && (
              <div className="px-3 pb-3 flex gap-3">
                {/* Sample Image */}
                <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-white border border-amber-200 relative">
                  <Image
                    src="/assets/casual.png"
                    alt="Ideal photo example"
                    fill
                    className="object-cover"
                  />
                </div>
                {/* Tips List */}
                <ul className="text-xs text-amber-800 space-y-1 flex-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">✓</span>
                    <span><strong>Portrait orientation</strong> (vertical photo)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">✓</span>
                    <span>Full body from head to feet</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">✓</span>
                    <span>Front-facing, arms visible</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">✓</span>
                    <span>Simple background, good lighting</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Existing Photos */}
            {userPhotos.map((photo, index) => {
              const photoUrl = photo.signed_url || '';
              return (
                <div
                  key={photo.id}
                  className={cn(
                    'group relative aspect-[3/4] rounded-xl overflow-hidden transition-all cursor-pointer',
                    'ring-2 ring-offset-2 ring-offset-background',
                    selectedPhoto === photoUrl
                      ? 'ring-primary'
                      : 'ring-transparent hover:ring-primary/50'
                  )}
                  onClick={() => handlePhotoClick(photoUrl)}
                >
                  {photoUrl && (
                    <Image
                      src={photoUrl}
                      alt={`Your photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  )}
                  {/* Selection indicator */}
                  {selectedPhoto === photoUrl && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(index, photoUrl);
                    }}
                    disabled={deletingIndex === index}
                    className={cn(
                      'absolute top-1 right-1 p-1.5 rounded-full transition-all',
                      'bg-black/50 hover:bg-red-500',
                      'opacity-0 group-hover:opacity-100',
                      deletingIndex === index && 'opacity-100'
                    )}
                  >
                    {deletingIndex === index ? (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3 text-white" />
                    )}
                  </button>
                </div>
              );
            })}

            {/* Upload New Photo Button */}
            {canUploadMore && (
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className={cn(
                  'aspect-[3/4] rounded-xl border-2 border-dashed transition-all',
                  'flex flex-col items-center justify-center gap-2 text-center',
                  isUploading
                    ? 'border-primary bg-primary/10 cursor-wait'
                    : isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary hover:bg-secondary/30'
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      {uploadProgress
                        ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                        : 'Uploading...'}
                    </span>
                  </>
                ) : isDragging ? (
                  <>
                    <Upload className="w-6 h-6 text-primary" />
                    <span className="text-xs text-primary font-medium">Drop here</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground px-1">
                      Upload{availableSlots > 1 ? ` (up to ${availableSlots})` : ''}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* No Photos State */}
          {!hasPhotos && !isUploading && (
            <div className="text-center py-4 mb-4">
              <p className="text-muted-foreground text-sm">
                No photos yet. Upload a photo to get started!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-6 rounded-xl font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPhoto || isUploading}
              className={cn(
                'flex-1 py-3 px-6 rounded-xl font-medium',
                'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white',
                'flex items-center justify-center gap-2',
                'transition-opacity',
                (!selectedPhoto || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              )}
            >
              Try On This Photo
              <span className="text-white/80 text-sm">({CREDIT_COSTS.tryon} credits)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
