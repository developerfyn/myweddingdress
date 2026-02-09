'use client';

import { X, Heart, Share2, Video, Download, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CREDIT_COSTS } from '@/lib/usage-tracking';
import type { Gown } from '@/lib/gowns';

interface TryOnResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  gown: Gown | { id: string; name: string; image_url: string } | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onAnimate: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  isGeneratingVideo?: boolean;
  isDeleting?: boolean;
}

export function TryOnResultModal({
  isOpen,
  onClose,
  imageUrl,
  gown,
  isFavorite,
  onToggleFavorite,
  onShare,
  onAnimate,
  onDownload,
  onDelete,
  showDelete = false,
  isGeneratingVideo = false,
  isDeleting = false,
}: TryOnResultModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 z-[70] flex items-center justify-center pointer-events-none">
        <div
          className="relative max-w-4xl max-h-full bg-card rounded-2xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Image */}
          <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/20 p-4">
            <img
              src={imageUrl}
              alt={gown?.name || 'Try-on result'}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border bg-card">
            {/* Favorite */}
            <button
              onClick={onToggleFavorite}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors",
                isFavorite
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
              <span className="hidden sm:inline">Favorite</span>
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Animate */}
            <button
              onClick={onAnimate}
              disabled={isGeneratingVideo}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary text-primary transition-all",
                isGeneratingVideo
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary/10"
              )}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isGeneratingVideo ? 'Generating...' : 'Animate'}
              </span>
              {!isGeneratingVideo && (
                <span className="text-xs text-muted-foreground">
                  -{CREDIT_COSTS.video_generation} credits
                </span>
              )}
            </button>

            {/* Download */}
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Delete (only for history items) */}
            {showDelete && onDelete && (
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
