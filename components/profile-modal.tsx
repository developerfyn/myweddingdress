'use client';

import { X, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  maxPhotos?: number;
}

export function ProfileModal({
  isOpen,
  onClose,
  photos,
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 5,
}: ProfileModalProps) {
  if (!isOpen) return null;

  const emptySlots = Math.max(0, maxPhotos - photos.length);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="space-y-6 pt-4">
          <div className="text-center">
            <h3 className="font-serif text-2xl text-white mb-2">
              Your Photos
            </h3>
            <p className="text-muted-foreground text-sm">
              Manage your saved body photos
            </p>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-5 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                <Image
                  src={photo || "/placeholder.svg"}
                  alt={`Saved photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => onRemovePhoto(index)}
                  className={cn(
                    'absolute inset-0 bg-black/50 flex items-center justify-center',
                    'opacity-0 group-hover:opacity-100 transition-opacity'
                  )}
                  aria-label="Remove photo"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            ))}
            
            {/* Empty Slots */}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <button
                key={`empty-${index}`}
                onClick={onAddPhoto}
                className={cn(
                  'aspect-square rounded-xl',
                  'border-2 border-dashed border-border',
                  'flex items-center justify-center',
                  'hover:border-primary hover:bg-secondary/30 transition-all'
                )}
                aria-label="Add photo"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>

          {/* Info */}
          <p className="text-center text-muted-foreground text-xs">
            {photos.length} of {maxPhotos} photos saved
          </p>
        </div>
      </div>
    </div>
  );
}
