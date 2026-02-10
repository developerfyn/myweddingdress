'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Sparkles,
  Video,
  RotateCcw,
  Download,
  Heart,
  Upload,
  Loader2,
  AlertCircle,
  Play,
  Minimize2,
} from 'lucide-react';
import type { Gown } from '@/lib/gowns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useVideoGeneration } from '@/components/video-generation-provider';
import { useTryOnGeneration } from '@/components/tryon-generation-provider';
import { CreditBadge } from '@/components/credit-display';
import { CREDIT_COSTS, type UserCredits } from '@/lib/usage-tracking';

interface TryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  gown: Gown | null;
  userPhoto: string | null;
  onUploadPhoto: () => void;
  isSubscribed: boolean;
  onShowPaywall: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  devBypassCredits?: boolean;
  credits?: UserCredits | null;
  onCreditsChange?: () => void;
}

export function TryOnModal({
  isOpen,
  onClose,
  gown,
  userPhoto,
  onUploadPhoto,
  isSubscribed,
  onShowPaywall,
  isFavorite,
  onToggleFavorite,
  devBypassCredits = false,
  credits,
  onCreditsChange,
}: TryOnModalProps) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    isGeneratingVideo,
    videoUrl,
    hasUnsavedVideo,
    errorVideo,
    videoJobGown,
    startVideoGeneration,
    setIsMinimized: setVideoIsMinimized,
    markVideoSaved,
    dismissVideo,
  } = useVideoGeneration();

  const {
    findJob,
    startTryOnGeneration,
    setIsMinimized: setTryOnIsMinimized,
    dismissJob,
  } = useTryOnGeneration();

  // Find the job for the current gown + photo combination
  const jobForThisGown = (gown && userPhoto) ? findJob(gown.id, userPhoto) : null;

  // Derived state from the job for this gown
  const isLoadingFromContext = jobForThisGown?.status === 'generating';
  const isLoading = hasStartedGeneration || isLoadingFromContext;
  const error = jobForThisGown?.status === 'error' ? jobForThisGown.error : null;
  const currentTryOnResult = jobForThisGown?.status === 'completed' ? jobForThisGown.result : null;

  // Whether the current video belongs to this gown
  const videoIsForThisGown = videoJobGown?.id === gown?.id;

  // Reset states when modal closes or gown changes
  useEffect(() => {
    if (!isOpen) {
      setShowVideoPlayer(false);
      setHasStartedGeneration(false);
    }
  }, [isOpen]);

  // Reset hasStartedGeneration when gown changes
  useEffect(() => {
    setHasStartedGeneration(false);
  }, [gown?.id]);

  // When modal opens for a gown with an existing job, ensure widgets are shown
  useEffect(() => {
    if (isOpen && jobForThisGown) {
      // Job exists for this gown - no special handling needed
      // The user can see the result in the modal
    }
  }, [isOpen, gown?.id, jobForThisGown]);

  // Auto-generate when modal opens with valid photo and no existing job
  useEffect(() => {
    if (
      isOpen &&
      gown &&
      userPhoto &&
      !jobForThisGown && // No existing job for this gown
      !hasStartedGeneration
    ) {
      setHasStartedGeneration(true);
      startTryOnGeneration(gown, userPhoto, devBypassCredits);
    }
  }, [isOpen, gown?.id, userPhoto, hasStartedGeneration, jobForThisGown]);

  // Handle "Generate Video" / "Play Video" button
  const handleVideoButton = () => {
    // If video already generated for this gown, just show it
    if (videoUrl && videoIsForThisGown) {
      setShowVideoPlayer(true);
      return;
    }

    if (!currentTryOnResult || !gown) return;

    startVideoGeneration(gown, currentTryOnResult, devBypassCredits);
  };

  // Download result
  const downloadResult = async () => {
    if (!gown) return;

    if (showVideoPlayer && videoUrl && videoIsForThisGown) {
      const filename = `tryon-video-${gown.name.replace(/\s+/g, '-').toLowerCase()}.mp4`;
      toast.info('Downloading video...');
      try {
        const link = document.createElement('a');
        link.href = `/api/download-video?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}`;
        link.download = filename;
        link.click();
        markVideoSaved();
      } catch {
        toast.error('Failed to download video.');
      }
    } else if (currentTryOnResult) {
      const filename = `tryon-${gown.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      toast.info('Downloading image...');
      try {
        // Fetch as blob to enable cross-origin download
        const response = await fetch(currentTryOnResult);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(blobUrl);
      } catch {
        toast.error('Failed to download image.');
      }
    }
  };

  // Handle try again - dismiss existing job and create new one
  const handleTryAgain = () => {
    if (!gown || !userPhoto) return;

    // Dismiss existing job first (if any) so a new one can be created
    if (jobForThisGown) {
      dismissJob(jobForThisGown.id);
    }

    // Reset local state
    setHasStartedGeneration(true);

    // Use setTimeout to ensure state update before starting new generation
    setTimeout(() => {
      startTryOnGeneration(gown, userPhoto, devBypassCredits);
    }, 0);
  };

  // Handle close — if generating try-on or video, minimize to widget and close modal
  const handleClose = () => {
    // If there's an active job (generating or completed), ensure widgets are shown
    if (jobForThisGown) {
      setTryOnIsMinimized(true);
    }
    if (isGeneratingVideo) {
      setVideoIsMinimized(true);
    }
    onClose();
  };

  if (!isOpen || !gown) return null;

  const needsPhoto = !userPhoto;

  // Determine video button state
  const videoButtonDisabled = !currentTryOnResult || isGeneratingVideo;
  const videoButtonLabel = isGeneratingVideo
    ? 'Generating...'
    : videoUrl && videoIsForThisGown
      ? 'Play Video'
      : 'Generate Video';
  const VideoButtonIcon = isGeneratingVideo
    ? Loader2
    : videoUrl && videoIsForThisGown
      ? Play
      : Video;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-10 lg:inset-20 z-50 flex items-center justify-center">
        <div
          className="relative w-full max-w-2xl bg-card rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-serif text-foreground">
                {showVideoPlayer ? 'VIDEO PREVIEW' : 'TRY-ON RESULT'}
              </h2>
              {credits && !showVideoPlayer && (
                <CreditBadge
                  cost={CREDIT_COSTS.tryon}
                  balance={credits.credits_balance}
                />
              )}
              {credits && showVideoPlayer && (
                <CreditBadge
                  cost={CREDIT_COSTS.video_generation}
                  balance={credits.credits_balance}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {showVideoPlayer && (
                <button
                  onClick={() => setShowVideoPlayer(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Photo
                </button>
              )}
              {isLoading && (
                <button
                  onClick={() => {
                    setHasStartedGeneration(false);
                    setTryOnIsMinimized(true);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  title="Minimize to corner"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Minimize</span>
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative aspect-[3/4] max-h-[60vh] bg-secondary/30">
            {showVideoPlayer && videoUrl && videoIsForThisGown ? (
              /* Video Player State */
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="max-w-full max-h-full object-contain"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              </div>
            ) : needsPhoto ? (
              /* No Photo State */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-serif text-foreground mb-2">Upload Your Photo</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Upload a full-body photo to see how this dress looks on you
                </p>
                <button
                  onClick={onUploadPhoto}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Upload Photo
                </button>
              </div>
            ) : isLoading ? (
              /* Loading State */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="relative w-32 h-48 rounded-xl overflow-hidden mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary animate-pulse" />
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    style={{ animation: 'shimmer 2s infinite' }}
                  />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-foreground font-medium">Creating your look...</span>
                </div>
                <p className="text-muted-foreground text-sm text-center mb-4">
                  This may take up to 20 seconds. You can minimize and keep browsing.
                </p>
                <button
                  onClick={() => {
                    setHasStartedGeneration(false);
                    setTryOnIsMinimized(true);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
                >
                  <Minimize2 className="w-4 h-4" />
                  Continue Browsing
                </button>
                <style jsx>{`
                  @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                `}</style>
              </div>
            ) : error ? (
              /* Error State */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Try-on Failed</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">{error}</p>
                <button
                  onClick={handleTryAgain}
                  className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
              </div>
            ) : currentTryOnResult ? (
              /* Result State */
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={currentTryOnResult}
                  alt={`Try on ${gown.name}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              /* Initial/Pending State */
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-muted-foreground animate-pulse" />
              </div>
            )}
          </div>

          {/* Gown Info */}
          <div className="px-4 py-3 border-t border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={gown.image_url}
                  alt={gown.name}
                  width={48}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-foreground truncate">{gown.name}</p>
                <p className="text-sm text-muted-foreground">{gown.neckline?.name || 'Classic'}</p>
              </div>
              <button
                onClick={onToggleFavorite}
                className={cn(
                  'p-2 rounded-full transition-colors',
                  isFavorite ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-muted-foreground'
                )}
              >
                <Heart className={cn('w-5 h-5', isFavorite && 'fill-current')} />
              </button>
            </div>
          </div>

          {/* Video Error Message */}
          {errorVideo && videoIsForThisGown && (
            <div className="mx-4 mb-0 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-500">{errorVideo}</p>
              </div>
            </div>
          )}

          {/* Video Generating Indicator */}
          {isGeneratingVideo && videoIsForThisGown && (
            <div className="mx-4 mb-0 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">Generating video...</p>
                <p className="text-xs text-muted-foreground">This may take 2-3 minutes.</p>
              </div>
              <button
                onClick={() => {
                  setVideoIsMinimized(true);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Minimize
              </button>
            </div>
          )}

          {/* Unsaved Video Warning */}
          {hasUnsavedVideo && showVideoPlayer && videoIsForThisGown && (
            <div className="flex items-center gap-2 mx-4 mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>This video will be lost if you leave the page.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
            >
              Back
            </button>

            <div className="flex items-center gap-2">
              {/* Generate Video / Play Video Button */}
              <div className="relative group">
                <button
                  onClick={handleVideoButton}
                  disabled={videoButtonDisabled}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-primary text-primary font-medium transition-all',
                    !videoButtonDisabled
                      ? 'hover:bg-primary/10'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isGeneratingVideo ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <VideoButtonIcon className="w-5 h-5" />
                  )}
                  {videoButtonLabel}
                </button>
                {/* Tooltip when disabled due to generating for another dress */}
                {isGeneratingVideo && !videoIsForThisGown && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Video already generating...
                  </div>
                )}
              </div>

              {/* Try Again Button */}
              <button
                onClick={handleTryAgain}
                disabled={!userPhoto || isLoading}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary text-foreground font-medium transition-colors',
                  userPhoto && !isLoading ? 'hover:bg-secondary/80' : 'opacity-50 cursor-not-allowed'
                )}
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>

              {/* Download Button */}
              <button
                onClick={downloadResult}
                disabled={!currentTryOnResult && !(videoUrl && videoIsForThisGown)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium transition-opacity',
                  (currentTryOnResult || (videoUrl && videoIsForThisGown)) ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
                )}
              >
                <Download className="w-5 h-5" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
