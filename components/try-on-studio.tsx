'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Heart,
  Download,
  Share2,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  SplitSquareHorizontal,
  Video,
  Play,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Gown } from '@/lib/gowns';
import type { UserPhoto } from '@/lib/photo-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useVideoGeneration } from '@/components/video-generation-provider';

interface TryOnStudioProps {
  studioGowns: Gown[];
  userPhotos: UserPhoto[];
  favorites: string[];
  onToggleFavorite: (gownId: string) => void;
  onRemoveFromStudio: (gownId: string) => void;
  isSubscribed: boolean;
  onShowPaywall: () => void;
  onAddMoreDresses: () => void;
  onUploadPhoto: () => void;
}

export function TryOnStudio({
  studioGowns,
  userPhotos,
  favorites,
  onToggleFavorite,
  onRemoveFromStudio,
  isSubscribed,
  onShowPaywall,
  onAddMoreDresses,
  onUploadPhoto,
}: TryOnStudioProps) {
  const [selectedDressIndex, setSelectedDressIndex] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');
  const [compareIndex, setCompareIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  // AI Try-on state
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [tryOnError, setTryOnError] = useState<string | null>(null);

  // Use refs for cache and in-flight tracking to avoid dependency issues
  const tryOnCacheRef = useRef<Record<string, string>>({});
  const inFlightRequestRef = useRef<string | null>(null);

  // Video state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [hasUnsavedVideo, setHasUnsavedVideo] = useState(false);

  // Global video generation context — used to disable button when another video is generating
  const { isGeneratingVideo: isGlobalVideoGenerating } = useVideoGeneration();

  const selectedGown = studioGowns[selectedDressIndex];
  const compareGown = studioGowns[compareIndex];

  // Helper to format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Generate try-on when gown or photo changes
  const generateTryOn = useCallback(async () => {
    const selectedPhoto = userPhotos[selectedPhotoIndex];
    if (!selectedGown || !selectedPhoto?.signed_url) return;

    const cacheKey = `${selectedGown.id}-${selectedPhotoIndex}`;
    const requestId = `client-tryon-${Date.now()}`;
    const startTime = performance.now();

    // Check cache first (using ref to avoid dependency issues)
    if (tryOnCacheRef.current[cacheKey]) {
      console.log(`[${requestId}] ⚡ CACHE HIT - returning cached result`);
      setTryOnResult(tryOnCacheRef.current[cacheKey]);
      return;
    }

    // Check if same request is already in-flight
    if (inFlightRequestRef.current === cacheKey) {
      console.log(`[${requestId}] ⏳ Request already in-flight for ${cacheKey}, skipping`);
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`[${requestId}] 🎨 CLIENT: TRY-ON STARTED`);
    console.log(`[${requestId}] 📋 Gown: ${selectedGown.name} (${selectedGown.id})`);
    console.log(`[${requestId}] 📷 Photo index: ${selectedPhotoIndex}`);
    console.log('='.repeat(60));

    // Mark this request as in-flight
    inFlightRequestRef.current = cacheKey;

    console.log(`[${requestId}] 💾 Cache miss - generating new try-on`);
    setIsLoading(true);
    setTryOnError(null);

    try {
      // Step 1: Convert images to base64
      const convertStart = performance.now();
      console.log(`[${requestId}] 🔄 Step 1: Converting images to base64...`);

      const [personBase64, garmentBase64] = await Promise.all([
        imageUrlToBase64(selectedPhoto.signed_url),
        imageUrlToBase64(selectedGown.image_url),
      ]);

      const convertTime = performance.now() - convertStart;
      console.log(`[${requestId}] ✅ Step 1: Images converted in ${formatDuration(convertTime)}`);
      console.log(`[${requestId}]    - Person image: ${(personBase64.length / 1024).toFixed(1)}KB`);
      console.log(`[${requestId}]    - Garment image: ${(garmentBase64.length / 1024).toFixed(1)}KB`);

      // Step 2: Call API
      const apiStart = performance.now();
      console.log(`[${requestId}] 🚀 Step 2: Calling /api/tryon...`);

      const response = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImage: personBase64,
          garmentImage: garmentBase64,
          dressId: selectedGown.id,
          photoIndex: selectedPhotoIndex,
        }),
      });

      const apiTime = performance.now() - apiStart;
      console.log(`[${requestId}] ✅ Step 2: API responded in ${formatDuration(apiTime)}`);
      console.log(`[${requestId}]    - Status: ${response.status}`);

      // Step 3: Parse response
      const parseStart = performance.now();
      const data = await response.json();
      const parseTime = performance.now() - parseStart;
      console.log(`[${requestId}] ✅ Step 3: Response parsed in ${formatDuration(parseTime)}`);

      if (data.success && data.image) {
        setTryOnResult(data.image);
        // Update cache ref
        tryOnCacheRef.current[cacheKey] = data.image;

        const totalTime = performance.now() - startTime;
        console.log('\n' + '-'.repeat(60));
        console.log(`[${requestId}] ✅ CLIENT: TRY-ON COMPLETE`);
        console.log(`[${requestId}] ⏱️  TOTAL CLIENT TIME: ${formatDuration(totalTime)}`);
        console.log(`[${requestId}] 📈 Client breakdown:`);
        console.log(`[${requestId}]    - Image conversion: ${formatDuration(convertTime)}`);
        console.log(`[${requestId}]    - API round-trip: ${formatDuration(apiTime)} ⭐`);
        console.log(`[${requestId}]    - Response parse: ${formatDuration(parseTime)}`);
        if (data.timing) {
          console.log(`[${requestId}] 📈 Server breakdown:`);
          console.log(`[${requestId}]    - Server total: ${formatDuration(data.timing.total)}`);
          console.log(`[${requestId}]    - Gemini API: ${formatDuration(data.timing.apiCall)}`);
        }
        console.log(`[${requestId}]    - Result image: ${(data.image.length / 1024).toFixed(1)}KB`);
        console.log('-'.repeat(60) + '\n');
      } else {
        console.log(`[${requestId}] ❌ API returned error: ${data.error}`);
        // Check for credit limit error
        if (response.status === 429 && data.credits_limit !== undefined) {
          setTryOnError(`Monthly limit reached (${data.credits_used}/${data.credits_limit} try-ons used). Upgrade to PRO for more!`);
        } else if (response.status === 401) {
          setTryOnError('Please log in to use the try-on feature.');
        } else {
          setTryOnError(data.error || 'Try-on failed');
        }
      }
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.log(`[${requestId}] ❌ CLIENT ERROR after ${formatDuration(totalTime)}`);
      console.log(`[${requestId}]    Error: ${error instanceof Error ? error.message : error}`);
      setTryOnError('Failed to generate try-on. Please try again.');
    } finally {
      setIsLoading(false);
      // Clear in-flight marker
      inFlightRequestRef.current = null;
    }
  }, [selectedGown, selectedPhotoIndex, userPhotos]);

  // Generate video
  const generateVideo = async () => {
    if (!tryOnResult) return;

    // If video already generated, just show it
    if (videoUrl) {
      setShowVideoPlayer(true);
      return;
    }

    const requestId = `client-vid-${Date.now()}`;
    const startTime = performance.now();

    console.log('\n' + '='.repeat(60));
    console.log(`[${requestId}] 🎬 CLIENT: VIDEO GENERATION STARTED`);
    console.log(`[${requestId}] 📋 Input image size: ${(tryOnResult.length / 1024).toFixed(1)}KB`);
    console.log('='.repeat(60));

    setIsGeneratingVideo(true);

    try {
      const apiStart = performance.now();
      console.log(`[${requestId}] 🚀 Step 1: Calling /api/generate-video...`);
      console.log(`[${requestId}]    ⏳ This may take 2-3 minutes...`);

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: tryOnResult }),
      });

      const apiTime = performance.now() - apiStart;
      console.log(`[${requestId}] ✅ Step 1: API responded in ${formatDuration(apiTime)}`);
      console.log(`[${requestId}]    - Status: ${response.status}`);

      const data = await response.json();

      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setShowVideoPlayer(true);
        setHasUnsavedVideo(true);

        const totalTime = performance.now() - startTime;
        console.log('\n' + '-'.repeat(60));
        console.log(`[${requestId}] ✅ CLIENT: VIDEO GENERATION COMPLETE`);
        console.log(`[${requestId}] ⏱️  TOTAL CLIENT TIME: ${formatDuration(totalTime)}`);
        console.log(`[${requestId}]    - API round-trip: ${formatDuration(apiTime)}`);
        if (data.timing) {
          console.log(`[${requestId}] 📈 Server breakdown:`);
          console.log(`[${requestId}]    - Server total: ${formatDuration(data.timing.total)}`);
          console.log(`[${requestId}]    - Kling API: ${formatDuration(data.timing.apiCall)}`);
        }
        console.log(`[${requestId}]    - Video URL: ${data.videoUrl.substring(0, 60)}...`);
        console.log('-'.repeat(60) + '\n');
      } else {
        console.log(`[${requestId}] ❌ API returned error: ${data.error}`);
        if (response.status === 429 && data.credits_limit !== undefined) {
          toast.error(`Monthly video generation limit reached (${data.credits_used}/${data.credits_limit} used). Upgrade to PRO for more!`);
        } else if (response.status === 401) {
          toast.error('Please log in to use video generation.');
        } else {
          toast.error(data.error || 'Failed to generate video');
        }
      }
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.log(`[${requestId}] ❌ CLIENT ERROR after ${formatDuration(totalTime)}`);
      console.log(`[${requestId}]    Error: ${error instanceof Error ? error.message : error}`);
      toast.error('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Trigger try-on when dress or photo selection changes
  // Using a ref to track the latest generateTryOn to avoid dependency issues
  const generateTryOnRef = useRef(generateTryOn);
  generateTryOnRef.current = generateTryOn;

  useEffect(() => {
    if (selectedGown && userPhotos[selectedPhotoIndex]?.signed_url) {
      // Use ref to call the latest version without adding it as dependency
      generateTryOnRef.current();
    }
    // Only trigger when the actual data changes, not when the function changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGown?.id, selectedPhotoIndex, userPhotos.length]);

  // Warn before leaving page if there's an unsaved video
  useEffect(() => {
    if (!hasUnsavedVideo) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedVideo]);

  // Empty state
  if (studioGowns.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
          <Sparkles className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-2">Try-On Studio</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Add dresses to your studio to see how they look on you. Compare multiple
          styles side-by-side.
        </p>
        <button
          onClick={onAddMoreDresses}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Browse Gowns
        </button>
      </div>
    );
  }

  // No photos uploaded
  if (userPhotos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
          <Plus className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-2">Upload a Photo</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Upload a full-body photo to try on dresses virtually. Your photos are
          stored privately.
        </p>
        <button
          onClick={onUploadPhoto}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Upload Photo
        </button>
      </div>
    );
  }

  // All gowns are now unlocked - usage limits are handled separately

  // Helper to download the try-on result
  const downloadResult = async () => {
    if (!tryOnResult) return;

    const filename = `tryon-${selectedGown?.name || 'result'}.png`;
    try {
      const response = await fetch(tryOnResult);
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
  };

  // Helper to download/save the video
  const downloadVideo = async () => {
    if (!videoUrl) return;

    const filename = `tryon-video-${selectedGown?.name || 'result'}.mp4`;
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

  return (
    <div className="h-full flex flex-col">
      {/* Studio Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h2 className="text-xl font-serif text-foreground">Try-On Studio</h2>
          <p className="text-sm text-muted-foreground">
            {studioGowns.length} gown{studioGowns.length !== 1 ? 's' : ''} in
            studio
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode('single')}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                viewMode === 'single'
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-4 h-4" />
              Single
            </button>
            <button
              onClick={() => setViewMode('compare')}
              disabled={studioGowns.length < 2}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                viewMode === 'compare'
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                studioGowns.length < 2 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <SplitSquareHorizontal className="w-4 h-4" />
              Compare
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col">
          {/* Controls Bar */}
          <div className="flex items-center justify-end px-6 py-3 bg-card/50">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview Images */}
          <div className="flex-1 flex gap-4 p-6 overflow-hidden">
            {viewMode === 'single' ? (
              <SinglePreview
                gown={selectedGown}
                isLoading={isLoading}
                zoom={zoom}
                tryOnResult={tryOnResult}
                tryOnError={tryOnError}
                onRetry={generateTryOn}
              />
            ) : (
              <ComparePreview
                leftGown={selectedGown}
                rightGown={compareGown}
                isLoading={isLoading}
                zoom={zoom}
              />
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <div className="flex items-center gap-3">
              {selectedGown && (
                <>
                  <button
                    onClick={() => onToggleFavorite(selectedGown.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                      favorites.includes(selectedGown.id)
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5',
                        favorites.includes(selectedGown.id) && 'fill-current'
                      )}
                    />
                    {favorites.includes(selectedGown.id) ? 'Saved' : 'Save'}
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Generate Video Button */}
              <div className="relative group">
                <button
                  onClick={generateVideo}
                  disabled={!tryOnResult || isGeneratingVideo || isGlobalVideoGenerating}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-primary text-primary font-medium transition-all',
                    tryOnResult && !isGeneratingVideo && !isGlobalVideoGenerating
                      ? 'hover:bg-primary/10'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : videoUrl ? (
                    <>
                      <Play className="w-5 h-5" />
                      Play Video
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Generate Video
                    </>
                  )}
                </button>
                {isGlobalVideoGenerating && !isGeneratingVideo && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Video already generating...
                  </div>
                )}
              </div>

              {/* Download Button */}
              <button
                onClick={downloadResult}
                disabled={!tryOnResult}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium transition-opacity',
                  tryOnResult ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
                )}
              >
                <Download className="w-5 h-5" />
                Download Result
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Gown Selection */}
        <div className="w-80 border-l border-border flex flex-col bg-card/30">
          {/* Gown Queue */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Your Gowns</h3>
              <button
                onClick={onAddMoreDresses}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                + Add more
              </button>
            </div>

            <div className="space-y-3">
              {studioGowns.map((gown, index) => (
                <div
                  key={gown.id}
                  onClick={() => {
                    if (viewMode === 'compare' && selectedDressIndex !== index) {
                      setCompareIndex(index);
                    } else {
                      setSelectedDressIndex(index);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                    selectedDressIndex === index
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : viewMode === 'compare' && compareIndex === index
                        ? 'bg-accent/20 ring-2 ring-accent'
                        : 'bg-secondary/50 hover:bg-secondary'
                  )}
                >
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={gown.image_url || '/placeholder.svg'}
                      alt={gown.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-foreground truncate">{gown.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {gown.neckline?.name || 'Classic'}
                    </p>
                    {viewMode === 'compare' && (
                      <p className="text-xs text-primary mt-1">
                        {selectedDressIndex === index
                          ? 'Left'
                          : compareIndex === index
                            ? 'Right'
                            : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromStudio(gown.id);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Selection */}
          <div className="p-4 border-t border-border bg-gradient-to-b from-primary/5 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Your Photo
              </h3>
              <button
                onClick={onUploadPhoto}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                + Upload
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {userPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className={cn(
                    'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all',
                    selectedPhotoIndex === index
                      ? 'border-primary ring-2 ring-primary/30 scale-105'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <Image
                    src={photo.signed_url || "/placeholder.svg"}
                    alt={`Photo ${index + 1}`}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Video Warning Banner */}
      {hasUnsavedVideo && !showVideoPlayer && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Your video will be lost if you leave the page</span>
          <button
            onClick={downloadVideo}
            className="px-4 py-1.5 rounded-lg bg-white text-amber-700 text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Save Video
          </button>
          <button
            onClick={() => setHasUnsavedVideo(false)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Video Player Modal */}
      {videoUrl && showVideoPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-foreground">Video Preview</h3>
              <button
                onClick={() => setShowVideoPlayer(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {hasUnsavedVideo && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>This video will be lost if you leave the page.</span>
              </div>
            )}
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
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={downloadVideo}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Save Video to Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to convert image URL to base64
async function imageUrlToBase64(url: string): Promise<string> {
  // If already base64, return as is
  if (url.startsWith('data:')) {
    return url;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw error;
  }
}

function SinglePreview({
  gown,
  isLoading,
  zoom,
  tryOnResult,
  tryOnError,
  onRetry,
}: {
  gown: Gown | undefined;
  isLoading: boolean;
  zoom: number;
  tryOnResult: string | null;
  tryOnError: string | null;
  onRetry: () => void;
}) {
  if (!gown) return null;

  return (
    <div className="flex-1 relative rounded-2xl overflow-hidden bg-card">
      {isLoading ? (
        <LoadingState />
      ) : tryOnError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-foreground font-medium mb-2">Try-on Failed</p>
          <p className="text-muted-foreground text-sm mb-4 max-w-xs text-center">
            {tryOnError}
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `scale(${zoom})` }}
          >
            {tryOnResult ? (
              <img
                src={tryOnResult}
                alt={`Try on ${gown.name}`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mb-4" />
                <p>Generating your look...</p>
              </div>
            )}
          </div>

          {/* Gown Info Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3">
            <p className="font-serif text-lg text-white">{gown.name}</p>
            <p className="text-sm text-white/70">{gown.neckline?.name || 'Classic'}</p>
          </div>
        </>
      )}
    </div>
  );
}

function ComparePreview({
  leftGown,
  rightGown,
  isLoading,
  zoom,
}: {
  leftGown: Gown | undefined;
  rightGown: Gown | undefined;
  isLoading: boolean;
  zoom: number;
}) {
  return (
    <div className="flex-1 flex gap-4">
      {/* Left Preview */}
      <div className="flex-1 relative rounded-2xl overflow-hidden bg-card">
        {leftGown && (
          <>
            {isLoading ? (
              <LoadingState />
            ) : (
              <>
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <Image
                    src="/tryon-result.jpg"
                    alt={`Try on ${leftGown.name}`}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3">
                  <p className="font-serif text-white">{leftGown.name}</p>
                  <p className="text-xs text-white/70">{leftGown.neckline?.name || 'Classic'}</p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center">
        <div className="w-px h-full bg-border" />
      </div>

      {/* Right Preview */}
      <div className="flex-1 relative rounded-2xl overflow-hidden bg-card">
        {rightGown && (
          <>
            {isLoading ? (
              <LoadingState />
            ) : (
              <>
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <Image
                    src="/tryon-result.jpg"
                    alt={`Try on ${rightGown.name}`}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3">
                  <p className="font-serif text-white">{rightGown.name}</p>
                  <p className="text-xs text-white/70">{rightGown.neckline?.name || 'Classic'}</p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
      <div className="relative w-40 h-64 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-card animate-pulse" />
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{ animation: 'shimmer 2s infinite' }}
        />
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        <span className="text-foreground font-medium">Creating your look...</span>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
