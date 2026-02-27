'use client';

import React, { useCallback, useState, useRef } from 'react';
import { X, Upload, CheckCircle, ImagePlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
  existingPhotosCount?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

type ValidationStatus = 'pending' | 'validating' | 'valid' | 'invalid';

interface FileWithPreview {
  file: File;
  preview: string;
  validationStatus: ValidationStatus;
  validationError?: string;
}

export function UploadModal({ isOpen, onClose, onUpload, existingPhotosCount = 0 }: UploadModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);

  // Calculate total available slots considering existing photos
  const totalAvailableSlots = MAX_FILES - existingPhotosCount;
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);


  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name}: Please upload a JPG, PNG, WebP, or AVIF image`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be less than 5MB`;
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

  // Validate photo with Google Vision API
  const validatePhotoWithVision = async (
    file: File,
    index: number
  ): Promise<{ valid: boolean; error?: string }> => {
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

  const handleFiles = useCallback(async (files: File[]) => {
    setError(null);

    const availableSlots = totalAvailableSlots - selectedFiles.length;

    if (availableSlots <= 0) {
      setError(`Maximum ${MAX_FILES} photos allowed (you have ${existingPhotosCount} uploaded)`);
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    filesToAdd.forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
      } else {
        const preview = URL.createObjectURL(file);
        validFiles.push({ file, preview, validationStatus: 'pending' });
      }
    });

    if (errors.length > 0) {
      setError(errors[0]);
    }

    if (files.length > availableSlots) {
      setError(`Only ${availableSlots} more photo(s) can be added (max ${MAX_FILES} total)`);
    }

    if (validFiles.length === 0) return;

    // Add files with pending status first
    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Then validate each file with Vision API
    setIsValidating(true);
    const startIndex = selectedFiles.length;

    for (let i = 0; i < validFiles.length; i++) {
      const fileIndex = startIndex + i;
      const fileItem = validFiles[i];

      // Update status to validating
      setSelectedFiles((prev) => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex] = { ...updated[fileIndex], validationStatus: 'validating' };
        }
        return updated;
      });

      const result = await validatePhotoWithVision(fileItem.file, fileIndex);

      // Update with validation result
      setSelectedFiles((prev) => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex] = {
            ...updated[fileIndex],
            validationStatus: result.valid ? 'valid' : 'invalid',
            validationError: result.error,
          };
        }
        return updated;
      });

      // Show error for invalid photos
      if (!result.valid && result.error) {
        setError(result.error);
      }
    }

    setIsValidating(false);
  }, [totalAvailableSlots, existingPhotosCount, selectedFiles.length]);

  const handleUpload = async () => {
    // Filter to only valid photos
    const validPhotos = selectedFiles.filter((f) => f.validationStatus === 'valid');

    if (validPhotos.length === 0) {
      // Check if there are photos still validating
      const validatingCount = selectedFiles.filter((f) => f.validationStatus === 'validating' || f.validationStatus === 'pending').length;
      if (validatingCount > 0) {
        setError('Please wait for photo validation to complete');
        return;
      }
      setError('Please select at least one valid photo');
      return;
    }

    if (!user) {
      setError('Please sign in to upload photos');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const supabase = createClient();

    try {
      for (let i = 0; i < validPhotos.length; i++) {
        const { file } = validPhotos[i];

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

        setUploadProgress(Math.round(((i + 1) / validPhotos.length) * 100));
      }

      // Notify parent to refetch photos with signed URLs
      onUpload();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload photos. Please try again.');
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    selectedFiles.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setSelectedFiles([]);
    setError(null);
    setIsDragging(false);
    setUploadProgress(0);
    setIsUploading(false);
    onClose();
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

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      handleFiles(imageFiles);
    } else {
      setError('Please drop image files');
    }
  }, [handleFiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickUploadArea = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      // Revoke the URL being removed
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-card rounded-2xl flex flex-col animate-in zoom-in-95 fade-in duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="text-center">
            <h3 className="font-serif text-2xl text-foreground mb-2">
              Upload Your Photo
            </h3>
            <p className="text-muted-foreground text-sm">
              Upload a full-body photo to try on dresses. Your photos are stored
              securely.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Upload Area */}
          {totalAvailableSlots <= 0 ? (
            <div className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 bg-secondary/30">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">
                  Photo limit reached
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  You already have {existingPhotosCount} photos (max {MAX_FILES})
                </p>
              </div>
            </div>
          ) : selectedFiles.length > 0 ? (
            <div
              className={cn(
                "space-y-3 rounded-xl p-2 -m-2 transition-all duration-200",
                isDragging && selectedFiles.length < totalAvailableSlots && "bg-primary/10 ring-2 ring-primary ring-dashed"
              )}
              onDragOver={selectedFiles.length < totalAvailableSlots ? handleDragOver : undefined}
              onDragLeave={selectedFiles.length < totalAvailableSlots ? handleDragLeave : undefined}
              onDrop={selectedFiles.length < totalAvailableSlots ? handleDrop : undefined}
            >
              {/* Preview Grid */}
              <div className="grid grid-cols-3 gap-3">
                {selectedFiles.map((item, index) => (
                  <div key={index} className="relative aspect-[3/4]">
                    <img
                      src={item.preview}
                      alt={`Preview ${index + 1}`}
                      className={cn(
                        "w-full h-full object-cover rounded-xl",
                        item.validationStatus === 'invalid' && "opacity-50"
                      )}
                    />
                    {/* Validation status overlay */}
                    {item.validationStatus === 'validating' && (
                      <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                        <div className="bg-white rounded-lg px-2 py-1 flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          <span className="text-xs font-medium text-gray-700">Checking...</span>
                        </div>
                      </div>
                    )}
                    {item.validationStatus === 'valid' && (
                      <div className="absolute bottom-1 left-1 p-1 rounded-full bg-green-500">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {item.validationStatus === 'invalid' && (
                      <div className="absolute inset-0 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <div className="bg-white rounded-lg px-2 py-1 max-w-[90%] text-center">
                          <AlertCircle className="w-3 h-3 text-red-500 mx-auto mb-0.5" />
                          <span className="text-xs text-red-600 line-clamp-2">
                            {item.validationError || 'Invalid photo'}
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Add More Button */}
                {selectedFiles.length < totalAvailableSlots && (
                  <button
                    onClick={handleClickUploadArea}
                    className={cn(
                      "aspect-[3/4] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2",
                      isDragging
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary hover:bg-secondary/30"
                    )}
                  >
                    <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {isDragging ? "Drop here" : "Add more"}
                    </span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {selectedFiles.length} selected ({existingPhotosCount + selectedFiles.length} of {MAX_FILES} total)
              </p>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUploadArea}
              className={cn(
                'w-full aspect-video rounded-xl cursor-pointer',
                'border-2 border-dashed transition-all duration-200',
                'flex flex-col items-center justify-center gap-4',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary hover:bg-secondary/30'
              )}
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">
                  Drop your photos here
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  or click to browse (up to {totalAvailableSlots} more photo{totalAvailableSlots !== 1 ? 's' : ''})
                </p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-secondary/50 rounded-xl p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              Tips for best results:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                Stand facing the camera with arms slightly away from body
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                Use good lighting and a plain background
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                Wear fitted clothing for accurate try-on
              </li>
            </ul>
          </div>

        </div>

        {/* Action Buttons — pinned to bottom */}
        <div className="flex gap-3 p-8 pt-4 border-t border-border">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const validCount = selectedFiles.filter((f) => f.validationStatus === 'valid').length;
              if (validCount > 0) {
                handleUpload();
              } else if (selectedFiles.length > 0) {
                // Has files but none valid yet - either validating or invalid
                return;
              } else {
                handleClickUploadArea();
              }
            }}
            disabled={isUploading || isValidating || totalAvailableSlots <= 0}
            className={cn(
              'flex-1 py-3 rounded-xl font-medium',
              'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white',
              'flex items-center justify-center gap-2',
              'hover:opacity-90 transition-opacity',
              (isUploading || isValidating) && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading {uploadProgress}%
              </>
            ) : isValidating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Checking photo...
              </>
            ) : selectedFiles.length > 0 ? (
              (() => {
                const validCount = selectedFiles.filter((f) => f.validationStatus === 'valid').length;
                const invalidCount = selectedFiles.filter((f) => f.validationStatus === 'invalid').length;
                if (validCount > 0) {
                  return (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload {validCount} Photo{validCount > 1 ? 's' : ''}
                    </>
                  );
                } else if (invalidCount > 0) {
                  return (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      No valid photos
                    </>
                  );
                } else {
                  return (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking...
                    </>
                  );
                }
              })()
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                Choose Photos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
