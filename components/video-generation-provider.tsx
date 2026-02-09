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
import { Loader2, Play, X, Download, AlertCircle } from 'lucide-react';
import type { Gown } from '@/lib/gowns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TryOnGenerationContext } from '@/components/tryon-generation-provider';

interface VideoGenerationContextValue {
  videoJobGown: Gown | null;
  videoJobTryOnResult: string | null;
  videoUrl: string | null;
  isGeneratingVideo: boolean;
  errorVideo: string | null;
  hasUnsavedVideo: boolean;
  isMinimized: boolean;
  startVideoGeneration: (
    gown: Gown,
    tryOnResult: string,
    devBypassCredits?: boolean
  ) => void;
  dismissVideo: () => void;
  setIsMinimized: (val: boolean) => void;
  markVideoSaved: () => void;
}

const VideoGenerationContext = createContext<VideoGenerationContextValue | null>(
  null
);

export function useVideoGeneration() {
  const ctx = useContext(VideoGenerationContext);
  if (!ctx) {
    throw new Error(
      'useVideoGeneration must be used within a VideoGenerationProvider'
    );
  }
  return ctx;
}

export function VideoGenerationProvider({ children }: { children: ReactNode }) {
  const [videoJobGown, setVideoJobGown] = useState<Gown | null>(null);
  const [videoJobTryOnResult, setVideoJobTryOnResult] = useState<string | null>(
    null
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [errorVideo, setErrorVideo] = useState<string | null>(null);
  const [hasUnsavedVideo, setHasUnsavedVideo] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const isMinimizedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    isMinimizedRef.current = isMinimized;
  }, [isMinimized]);

  // beforeunload warning
  useEffect(() => {
    if (!hasUnsavedVideo) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedVideo]);

  const dismissVideo = useCallback(() => {
    setVideoJobGown(null);
    setVideoJobTryOnResult(null);
    setVideoUrl(null);
    setIsGeneratingVideo(false);
    setErrorVideo(null);
    setHasUnsavedVideo(false);
    setIsMinimized(false);
    setShowOverlay(false);
  }, []);

  const markVideoSaved = useCallback(() => {
    setHasUnsavedVideo(false);
  }, []);

  const startVideoGeneration = useCallback(
    (gown: Gown, tryOnResult: string, devBypassCredits?: boolean) => {
      // Clear previous state
      setVideoJobGown(gown);
      setVideoJobTryOnResult(tryOnResult);
      setVideoUrl(null);
      setErrorVideo(null);
      setHasUnsavedVideo(false);
      setIsGeneratingVideo(true);
      setIsMinimized(true);  // Show the floating widget immediately
      setShowOverlay(false);

      const doGenerate = async () => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (devBypassCredits && process.env.NODE_ENV !== 'production') {
            headers['X-Dev-Bypass-Credits'] = 'true';
          }

          const response = await fetch('/api/generate-video', {
            method: 'POST',
            headers,
            body: JSON.stringify({ image: tryOnResult }),
          });

          const data = await response.json();

          if (data.success && data.videoUrl) {
            setVideoUrl(data.videoUrl);
            setHasUnsavedVideo(true);
            if (isMinimizedRef.current) {
              toast.success('Your video is ready!', {
                description: 'Click the preview to watch.',
              });
            }
          } else {
            if (response.status === 429) {
              setErrorVideo(
                'Video generation limit reached. Upgrade for more!'
              );
            } else {
              setErrorVideo(data.error || 'Failed to generate video');
            }
          }
        } catch {
          setErrorVideo('Failed to generate video. Please try again.');
        } finally {
          setIsGeneratingVideo(false);
        }
      };

      doGenerate();
    },
    []
  );

  // Download helper for overlay
  const handleOverlayDownload = () => {
    if (!videoUrl || !videoJobGown) return;
    const filename = `tryon-video-${videoJobGown.name.replace(/\s+/g, '-').toLowerCase()}.mp4`;
    toast.info('Downloading video...');
    try {
      const link = document.createElement('a');
      link.href = `/api/download-video?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}`;
      link.download = filename;
      link.click();
      setHasUnsavedVideo(false);
    } catch {
      toast.error('Failed to download video.');
    }
  };

  // Handle widget click
  const handleWidgetClick = () => {
    if (videoUrl && !isGeneratingVideo) {
      setShowOverlay(true);
      setIsMinimized(false);
    } else if (!isGeneratingVideo) {
      // No video and not generating — just restore
      setIsMinimized(false);
    }
    // If still generating, keep minimized but do nothing extra
  };

  const contextValue: VideoGenerationContextValue = {
    videoJobGown,
    videoJobTryOnResult,
    videoUrl,
    isGeneratingVideo,
    errorVideo,
    hasUnsavedVideo,
    isMinimized,
    startVideoGeneration,
    dismissVideo,
    setIsMinimized,
    markVideoSaved,
  };

  // Read try-on context directly (safe if not mounted yet)
  // Check if any try-on widgets are visible (jobs not currently being viewed)
  const tryOnCtx = useContext(TryOnGenerationContext);
  const tryOnWidgetVisible =
    tryOnCtx &&
    tryOnCtx.jobs.some(job =>
      job.id !== tryOnCtx.selectedJobId &&
      (job.status === 'generating' || job.status === 'completed' || job.status === 'error')
    );

  return (
    <VideoGenerationContext.Provider value={contextValue}>
      {children}

      {/* Floating minimized widget */}
      {isMinimized && (isGeneratingVideo || videoUrl) && videoJobGown && (
        <button
          onClick={handleWidgetClick}
          className={cn(
            "fixed right-6 z-[80] w-[280px] bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3 hover:shadow-3xl hover:scale-[1.02] transition-all cursor-pointer",
            tryOnWidgetVisible ? "bottom-28" : "bottom-6"
          )}
        >
          <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={videoJobGown.image_url}
              alt={videoJobGown.name}
              width={48}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-foreground text-sm truncate">
              {videoJobGown.name}
            </p>
            {isGeneratingVideo ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">
                  Generating video...
                </span>
              </div>
            ) : videoUrl ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Play className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-600 font-medium">
                  Video Ready!
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Tap to open</span>
            )}
          </div>
        </button>
      )}

      {/* Video overlay (independent of any modal) */}
      {showOverlay && videoUrl && videoJobGown && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-card rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-foreground">Video Preview</h3>
              <button
                onClick={() => setShowOverlay(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unsaved warning */}
            {hasUnsavedVideo && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>This video will be lost if you leave the page.</span>
              </div>
            )}

            {/* Video player */}
            <div className="bg-black">
              <video
                src={videoUrl}
                className="w-full"
                controls
                autoPlay
                loop
                playsInline
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <button
                onClick={() => {
                  dismissVideo();
                }}
                className="px-4 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleOverlayDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Save Video to Device
              </button>
            </div>
          </div>
        </div>
      )}
    </VideoGenerationContext.Provider>
  );
}
