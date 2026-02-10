'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import { Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import type { Gown } from '@/lib/gowns';
import { toast } from 'sonner';
import { TryOnResultModal } from '@/components/tryon-result-modal';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface FavoriteCallbacks {
  isFavorite: (gownId: string) => boolean;
  onToggle: (gownId: string) => void;
}

interface VideoGenerationCallback {
  onGenerateVideo: (gown: Gown, tryOnResult: string) => void;
  isGeneratingVideo: boolean;
}

export type TryOnJobStatus = 'generating' | 'completed' | 'error';

export interface TryOnJob {
  id: string;
  gown: Gown;
  userPhoto: string;  // The photo URL used for this try-on
  status: TryOnJobStatus;
  result?: string;
  error?: string;
  startedAt: number;
}

// Generate a composite key for job lookup (gown + photo combination)
function getJobKey(gownId: string, userPhoto: string): string {
  return `${gownId}::${userPhoto}`;
}

interface TryOnGenerationContextValue {
  // Job queue
  jobs: TryOnJob[];
  activeJobCount: number;

  // Job lookup
  findJob: (gownId: string, userPhoto: string) => TryOnJob | undefined;
  findJobByGown: (gownId: string) => TryOnJob | undefined;

  // Actions
  startTryOnGeneration: (
    gown: Gown,
    userPhoto: string,
    devBypassCredits?: boolean
  ) => void;
  dismissJob: (jobId: string) => void;
  dismissAllJobs: () => void;

  // UI state
  selectedJobId: string | null;
  setSelectedJobId: (jobId: string | null) => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;

  // Callbacks registration
  registerFavoriteCallbacks: (callbacks: FavoriteCallbacks | null) => void;
  registerVideoCallback: (callback: VideoGenerationCallback | null) => void;
  registerPaywallCallback: (callback: (() => void) | null) => void;

  // Legacy compatibility - returns the most recent job's data
  tryOnJobGown: Gown | null;
  tryOnResult: string | null;
  isGeneratingTryOn: boolean;
  errorTryOn: string | null;
  showOverlay: boolean;
  dismissTryOn: () => void;
}

// =============================================================================
// Context
// =============================================================================

export const TryOnGenerationContext =
  createContext<TryOnGenerationContextValue | null>(null);

export function useTryOnGeneration() {
  const ctx = useContext(TryOnGenerationContext);
  if (!ctx) {
    throw new Error(
      'useTryOnGeneration must be used within a TryOnGenerationProvider'
    );
  }
  return ctx;
}

// =============================================================================
// Helpers
// =============================================================================

function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function imageUrlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url;
  }

  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// =============================================================================
// Provider Component
// =============================================================================

export function TryOnGenerationProvider({ children }: { children: ReactNode }) {
  // Job queue state
  const [jobs, setJobs] = useState<TryOnJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Callback registrations
  const [favoriteCallbacks, setFavoriteCallbacks] = useState<FavoriteCallbacks | null>(null);
  const [videoCallback, setVideoCallback] = useState<VideoGenerationCallback | null>(null);
  const [paywallCallback, setPaywallCallback] = useState<(() => void) | null>(null);

  // Refs for async operations
  const isMinimizedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    isMinimizedRef.current = isMinimized;
  }, [isMinimized]);

  // ---------------------------------------------------------------------------
  // Callback registrations
  // ---------------------------------------------------------------------------

  const registerFavoriteCallbacks = useCallback((callbacks: FavoriteCallbacks | null) => {
    setFavoriteCallbacks(callbacks);
  }, []);

  const registerVideoCallback = useCallback((callback: VideoGenerationCallback | null) => {
    setVideoCallback(callback);
  }, []);

  const registerPaywallCallback = useCallback((callback: (() => void) | null) => {
    // Wrap in arrow function to prevent React from calling it as an updater
    setPaywallCallback(() => callback);
  }, []);

  // ---------------------------------------------------------------------------
  // Job management
  // ---------------------------------------------------------------------------

  const updateJob = useCallback((jobId: string, updates: Partial<TryOnJob>) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, ...updates } : job
      )
    );
  }, []);

  const dismissJob = useCallback((jobId: string) => {
    setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
    // Clear selection if dismissing the selected job
    setSelectedJobId(prev => prev === jobId ? null : prev);
  }, []);

  const dismissAllJobs = useCallback(() => {
    setJobs([]);
    setSelectedJobId(null);
    setIsMinimized(false);
  }, []);

  // Find job by gown + photo combination (exact match)
  const findJob = useCallback(
    (gownId: string, userPhoto: string): TryOnJob | undefined => {
      return jobs.find(j => j.gown.id === gownId && j.userPhoto === userPhoto);
    },
    [jobs]
  );

  // Find any job for a gown (regardless of photo) - useful for checking if gown has any tries
  const findJobByGown = useCallback(
    (gownId: string): TryOnJob | undefined => {
      return jobs.find(j => j.gown.id === gownId);
    },
    [jobs]
  );

  // ---------------------------------------------------------------------------
  // Start try-on generation
  // ---------------------------------------------------------------------------

  const startTryOnGeneration = useCallback(
    (gown: Gown, userPhoto: string, devBypassCredits?: boolean) => {
      // Check if a job already exists for this gown + photo combination
      const existingJob = jobs.find(
        j => j.gown.id === gown.id && j.userPhoto === userPhoto
      );

      if (existingJob) {
        // Job already exists - don't create a duplicate
        console.log(`[TryOn] Job already exists for ${gown.name} with this photo`);
        return;
      }

      const jobId = generateJobId();

      // Create new job with userPhoto
      const newJob: TryOnJob = {
        id: jobId,
        gown,
        userPhoto,
        status: 'generating',
        startedAt: Date.now(),
      };

      // Add job to queue
      setJobs(prevJobs => [...prevJobs, newJob]);

      // Show toast for new job
      toast.info(`Starting try-on for ${gown.name}`, {
        description: 'You can continue browsing while it generates.',
      });

      // Start async generation
      const doGenerate = async () => {
        try {
          // Convert images to base64
          const [personBase64, garmentBase64] = await Promise.all([
            imageUrlToBase64(userPhoto),
            imageUrlToBase64(gown.image_url),
          ]);

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (devBypassCredits && process.env.NODE_ENV !== 'production') {
            headers['X-Dev-Bypass-Credits'] = 'true';
          }

          const response = await fetch('/api/tryon', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              personImage: personBase64,
              garmentImage: garmentBase64,
              dressId: gown.id,
            }),
          });

          const data = await response.json();

          if (data.success && data.image) {
            // Update job with success
            updateJob(jobId, {
              status: 'completed',
              result: data.image,
            });

            // Show toast if minimized
            if (isMinimizedRef.current) {
              toast.success(`${gown.name} try-on is ready!`, {
                description: 'Click the preview to see your look.',
              });
            }
          } else {
            // Handle errors
            let errorMessage = data.error || 'Try-on failed. Please try again.';
            const isLimitError = response.status === 429;

            if (response.status === 401) {
              errorMessage = 'Please log in to use try-on.';
            }

            updateJob(jobId, {
              status: 'error',
              error: errorMessage,
            });

            toast.error(`${gown.name} try-on failed`, {
              description: errorMessage,
              action: isLimitError && paywallCallback ? {
                label: 'Upgrade',
                onClick: () => paywallCallback(),
              } : undefined,
            });
          }
        } catch (err) {
          updateJob(jobId, {
            status: 'error',
            error: 'Failed to generate try-on. Please try again.',
          });

          toast.error(`${gown.name} try-on failed`, {
            description: 'Network error. Please try again.',
          });
        }
      };

      doGenerate();
    },
    [jobs, updateJob]
  );

  // ---------------------------------------------------------------------------
  // Widget click handlers
  // ---------------------------------------------------------------------------

  const handleWidgetClick = useCallback((job: TryOnJob) => {
    if (job.status === 'completed' && job.result) {
      // Open result modal for this job
      // Widget will be hidden automatically (filtered by selectedJobId)
      setSelectedJobId(job.id);
    }
    // If still generating or error, do nothing (keep widget visible)
  }, []);

  // ---------------------------------------------------------------------------
  // Modal handlers
  // ---------------------------------------------------------------------------

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  const showOverlay = selectedJob?.status === 'completed' && !!selectedJob.result;

  const handleOverlayClose = useCallback(() => {
    setSelectedJobId(null);
  }, []);

  const handleOverlayDownload = useCallback(async () => {
    if (!selectedJob?.result || !selectedJob.gown) return;
    const filename = `tryon-${selectedJob.gown.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    try {
      const response = await fetch(selectedJob.result);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      console.error('Failed to download image');
    }
  }, [selectedJob]);

  const handleOverlayShare = useCallback(async () => {
    if (!selectedJob?.result || !selectedJob.gown) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${selectedJob.gown.name} Try-On`,
          text: `Check out how I look in this ${selectedJob.gown.name}!`,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      toast.info('Sharing is not supported on this device');
    }
  }, [selectedJob]);

  const handleOverlayAnimate = useCallback(() => {
    if (!selectedJob?.gown || !selectedJob.result || !videoCallback) return;
    videoCallback.onGenerateVideo(selectedJob.gown, selectedJob.result);
    setSelectedJobId(null);
  }, [selectedJob, videoCallback]);

  // ---------------------------------------------------------------------------
  // Computed values for legacy compatibility
  // ---------------------------------------------------------------------------

  const mostRecentJob = jobs.length > 0 ? jobs[jobs.length - 1] : null;
  const activeJobCount = jobs.filter(j => j.status === 'generating').length;
  const hasAnyActiveJob = jobs.length > 0;

  // Legacy compatibility values (based on most recent job)
  const tryOnJobGown = mostRecentJob?.gown || null;
  const tryOnResult = mostRecentJob?.result || null;
  const isGeneratingTryOn = mostRecentJob?.status === 'generating';
  const errorTryOn = mostRecentJob?.error || null;

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const contextValue: TryOnGenerationContextValue = {
    // Job queue
    jobs,
    activeJobCount,

    // Job lookup
    findJob,
    findJobByGown,

    // Actions
    startTryOnGeneration,
    dismissJob,
    dismissAllJobs,

    // UI state
    selectedJobId,
    setSelectedJobId,
    isMinimized,
    setIsMinimized,

    // Callbacks
    registerFavoriteCallbacks,
    registerVideoCallback,
    registerPaywallCallback,

    // Legacy compatibility
    tryOnJobGown,
    tryOnResult,
    isGeneratingTryOn,
    errorTryOn,
    showOverlay,
    dismissTryOn: dismissAllJobs,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Filter jobs to show in widgets (generating or completed, not selected for viewing)
  const widgetJobs = jobs.filter(job =>
    job.id !== selectedJobId && (job.status === 'generating' || job.status === 'completed' || job.status === 'error')
  );

  return (
    <TryOnGenerationContext.Provider value={contextValue}>
      {children}

      {/* Floating minimized widgets - stacked */}
      {/* Show for all jobs not currently being viewed in modal */}
      {widgetJobs.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[80] flex flex-col-reverse gap-3">
          {widgetJobs.map((job, index) => (
            <button
              key={job.id}
              onClick={() => handleWidgetClick(job)}
              className={cn(
                "w-[280px] bg-card border rounded-2xl shadow-2xl p-4 flex items-center gap-3 transition-all",
                job.status === 'completed'
                  ? "hover:shadow-3xl hover:scale-[1.02] cursor-pointer border-green-200"
                  : job.status === 'error'
                  ? "border-red-200 cursor-default"
                  : "border-border cursor-default"
              )}
              style={{
                // Subtle offset for stacked appearance
                transform: index > 0 ? `translateX(-${index * 4}px)` : undefined,
              }}
            >
              {/* Gown thumbnail */}
              <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={job.gown.image_url}
                  alt={job.gown.name}
                  width={48}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Status info */}
              <div className="flex-1 min-w-0">
                <p className="font-serif text-foreground text-sm truncate">
                  {job.gown.name}
                </p>
                {job.status === 'generating' ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      Creating your look...
                    </span>
                  </div>
                ) : job.status === 'completed' ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">
                      Try-On Ready!
                    </span>
                  </div>
                ) : job.status === 'error' ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs text-red-600 font-medium truncate">
                      {job.error || 'Error'}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Dismiss button */}
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissJob(job.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    dismissJob(job.id);
                  }
                }}
                className="p-1 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </button>
          ))}

          {/* Job count badge if multiple */}
          {widgetJobs.length > 1 && (
            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg">
              {widgetJobs.length}
            </div>
          )}
        </div>
      )}

      {/* Result overlay using unified modal */}
      {selectedJob && (
        <TryOnResultModal
          isOpen={showOverlay}
          onClose={handleOverlayClose}
          imageUrl={selectedJob.result || ''}
          gown={selectedJob.gown}
          isFavorite={favoriteCallbacks ? favoriteCallbacks.isFavorite(selectedJob.gown.id) : false}
          onToggleFavorite={() => {
            if (favoriteCallbacks && selectedJob.gown) {
              favoriteCallbacks.onToggle(selectedJob.gown.id);
            }
          }}
          onShare={handleOverlayShare}
          onAnimate={handleOverlayAnimate}
          onDownload={handleOverlayDownload}
          showDelete={false}
          isGeneratingVideo={videoCallback?.isGeneratingVideo || false}
        />
      )}
    </TryOnGenerationContext.Provider>
  );
}
