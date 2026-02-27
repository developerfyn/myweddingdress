'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { createClient } from '@/lib/supabase';
import { Sidebar } from '@/components/sidebar';
import { GownBrowse } from '@/components/gown-browse';
import { TryOnStudio } from '@/components/try-on-studio';
import { TryOnHistory } from '@/components/tryon-history';
import { FavoritesView } from '@/components/favorites-view';
import { SettingsView } from '@/components/settings-view';
import { UploadModal } from '@/components/upload-modal';
import { PaywallModal } from '@/components/paywall-modal';
import { TryOnModal } from '@/components/tryon-modal';
import { PhotoSelectModal } from '@/components/photo-select-modal';
import { GownDetailModal } from '@/components/gown-detail-modal';
import { Onboarding } from '@/components/onboarding';
import { DevTools } from '@/components/dev-tools';
import { useTryOnGeneration } from '@/components/tryon-generation-provider';
import { useVideoGeneration } from '@/components/video-generation-provider';
import { useCredits } from '@/hooks/use-credits';
import { CREDIT_COSTS } from '@/lib/usage-tracking';
import type { Gown } from '@/lib/gowns';
import { fetchUserPhotosWithSignedUrls, deleteUserPhoto, type UserPhoto } from '@/lib/photo-utils';
import { Loader2, Menu } from 'lucide-react';
import { SceneSelector } from '@/components/scene-selector';

type ViewType = 'browse' | 'favorites' | 'studio' | 'history' | 'settings';

export default function TryOnPage() {
  const { user, profile, isSubscribed, isPro, isLoading, signOut } = useAuth();
  const router = useRouter();

  // App State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('browse');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // User Data
  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [historyFavorites, setHistoryFavorites] = useState<string[]>([]);
  const [studioGowns, setStudioGowns] = useState<Gown[]>([]);

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showPhotoSelectModal, setShowPhotoSelectModal] = useState(false);
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [showGownDetailModal, setShowGownDetailModal] = useState(false);
  const [detailGown, setDetailGown] = useState<Gown | null>(null);
  const [tryOnGown, setTryOnGown] = useState<Gown | null>(null);
  const [selectedUserPhoto, setSelectedUserPhoto] = useState<string | null>(null);

  // Browse State - now managed by URL params in GownBrowse

  // Dev Tools State
  const [showDressIds, setShowDressIds] = useState(false);
  const [showImageUrls, setShowImageUrls] = useState(false);
  const [simulateSubscription, setSimulateSubscription] = useState<'none' | 'free' | 'pro'>('none');

  // Scene Selector State
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [pendingVideoGown, setPendingVideoGown] = useState<Gown | null>(null);
  const [pendingVideoTryOnResult, setPendingVideoTryOnResult] = useState<string | null>(null);

  // TryOn Generation Context
  const { registerFavoriteCallbacks, registerVideoCallback, registerPaywallCallback } = useTryOnGeneration();
  const { startVideoGeneration, isGeneratingVideo } = useVideoGeneration();

  // Credits
  const { credits, isLoading: creditsLoading, refetch: refetchCredits, completeOnboarding: markOnboardingComplete } = useCredits();

  // Compute effective credits (with simulation override) - memoized to prevent infinite re-renders
  const effectiveCredits = useMemo(() => {
    if (simulateSubscription === 'none') {
      return credits;
    }

    const now = new Date();
    if (simulateSubscription === 'pro') {
      const resetDate = new Date(now);
      resetDate.setMonth(resetDate.getMonth() + 3);
      return {
        credits_balance: 400,
        credits_purchased: 400,
        plan: 'quarterly' as const,
        is_free_tier: false,
        period_start: now.toISOString(),
        timezone: credits?.timezone || 'UTC',
        can_generate_video: true,
        reset_time: resetDate.toISOString(),
      };
    }

    // simulateSubscription === 'free'
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return {
      credits_balance: 2,
      credits_purchased: 2,
      plan: 'free' as const,
      is_free_tier: true,
      period_start: now.toISOString(),
      timezone: credits?.timezone || 'UTC',
      can_generate_video: false,
      reset_time: midnight.toISOString(),
    };
  }, [simulateSubscription, credits]);

  // Ref to access current effectiveCredits in callbacks without re-registering
  const effectiveCreditsRef = useRef(effectiveCredits);
  useEffect(() => {
    effectiveCreditsRef.current = effectiveCredits;
  }, [effectiveCredits]);

  // Register favorite callbacks for the try-on overlay
  useEffect(() => {
    registerFavoriteCallbacks({
      isFavorite: (gownId: string) => favorites.includes(gownId),
      onToggle: (gownId: string) => {
        const newFavorites = favorites.includes(gownId)
          ? favorites.filter((id) => id !== gownId)
          : [...favorites, gownId];
        setFavorites(newFavorites);
        localStorage.setItem('favorites', JSON.stringify(newFavorites));
      },
    });

    return () => {
      registerFavoriteCallbacks(null);
    };
  }, [favorites, registerFavoriteCallbacks]);

  // Register video generation callback for the try-on overlay
  useEffect(() => {
    registerVideoCallback({
      onGenerateVideo: (gown, tryOnResult) => {
        // Check if user has enough credits for video generation (use ref for current value)
        const currentCredits = effectiveCreditsRef.current;
        const hasEnoughCredits = currentCredits && currentCredits.credits_balance >= CREDIT_COSTS.video_generation;
        const canGenerateVideo = currentCredits?.can_generate_video;

        if (!canGenerateVideo || !hasEnoughCredits) {
          // Show paywall if not enough credits or free user
          setShowPaywallModal(true);
          return;
        }

        // Store pending video data and show scene selector
        setPendingVideoGown(gown);
        setPendingVideoTryOnResult(tryOnResult);
        setShowSceneSelector(true);
      },
      isGeneratingVideo,
    });

    return () => {
      registerVideoCallback(null);
    };
  }, [registerVideoCallback, isGeneratingVideo]);

  // Handle scene selection and start video generation
  const handleSceneSelect = useCallback((sceneId: string) => {
    if (!pendingVideoGown || !pendingVideoTryOnResult) return;
    setShowSceneSelector(false);
    startVideoGeneration(pendingVideoGown, pendingVideoTryOnResult, sceneId, simulateSubscription === 'pro');
    setPendingVideoGown(null);
    setPendingVideoTryOnResult(null);
  }, [pendingVideoGown, pendingVideoTryOnResult, startVideoGeneration, simulateSubscription]);

  // Register paywall callback for upgrade prompts
  useEffect(() => {
    registerPaywallCallback(() => setShowPaywallModal(true));
    return () => {
      registerPaywallCallback(null);
    };
  }, [registerPaywallCallback]);

  // Check onboarding status from database
  useEffect(() => {
    if (credits) {
      // Only show onboarding if user hasn't completed it
      setShowOnboarding(!credits.has_completed_onboarding);
    }
  }, [credits]);

  // Load saved state from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    const savedHistoryFavorites = localStorage.getItem('historyFavorites');
    if (savedHistoryFavorites) {
      setHistoryFavorites(JSON.parse(savedHistoryFavorites));
    }

    // Studio gowns are stored as full objects now (since we fetch from Supabase)
    const savedStudio = localStorage.getItem('studioGowns');
    if (savedStudio) {
      try {
        const gowns = JSON.parse(savedStudio);
        setStudioGowns(gowns);
      } catch (e) {
        console.error('Failed to parse studio gowns:', e);
      }
    }
  }, []);

  // Load user photos with signed URLs from private bucket
  const fetchUserPhotos = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      const photos = await fetchUserPhotosWithSignedUrls(supabase, user.id);
      setUserPhotos(photos);
    } catch (err) {
      console.error('[Photos] Failed to load photos:', err);
    }
  }, [user]);

  // Fetch photos on user change
  useEffect(() => {
    fetchUserPhotos();
  }, [fetchUserPhotos]);


  // Handle Onboarding Complete
  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    // Save to database so it persists across sessions/devices
    await markOnboardingComplete();
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      // Clear localStorage (photos are in Supabase Storage, not localStorage)
      localStorage.removeItem('favorites');
      localStorage.removeItem('historyFavorites');
      localStorage.removeItem('studioGowns');

      // Step 3: Call Supabase signOut
      await signOut();

      // Step 5: Show toast notification
      toast.success('You\'ve been signed out', {
        description: 'Thanks for using My Wedding Dress!',
      });

      // Step 4: Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out', {
        description: 'Please try again.',
      });
    }
  };

  // Handle Photo Upload - refetch to get signed URLs
  const handlePhotoUpload = () => {
    fetchUserPhotos();
  };

  // Handle Photo Remove - delete from table and storage using storage_path
  const handlePhotoRemove = async (index: number) => {
    if (!user) return;

    const photo = userPhotos[index];
    const newPhotos = userPhotos.filter((_, i) => i !== index);
    setUserPhotos(newPhotos);

    try {
      const supabase = createClient();
      await deleteUserPhoto(supabase, user.id, photo.storage_path);
    } catch (err) {
      console.error('[Photos] Failed to delete photo:', err);
    }
  };

  // Handle Toggle Favorite (for gowns)
  const handleToggleFavorite = (gownId: string) => {
    const newFavorites = favorites.includes(gownId)
      ? favorites.filter((id) => id !== gownId)
      : [...favorites, gownId];

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  // Handle Toggle History Favorite (for try-on results)
  const handleToggleHistoryFavorite = (historyId: string) => {
    const newHistoryFavorites = historyFavorites.includes(historyId)
      ? historyFavorites.filter((id) => id !== historyId)
      : [...historyFavorites, historyId];

    setHistoryFavorites(newHistoryFavorites);
    localStorage.setItem('historyFavorites', JSON.stringify(newHistoryFavorites));
  };

  // Handle Try On / Add to Studio
  const handleAddToStudio = (gown: Gown) => {
    // Add to studio if not already there
    if (!studioGowns.some((g) => g.id === gown.id)) {
      const newStudio = [...studioGowns, gown];
      setStudioGowns(newStudio);
      localStorage.setItem('studioGowns', JSON.stringify(newStudio));
    }

    // Always navigate to studio
    setCurrentView('studio');
  };

  // Handle Remove from Studio
  const handleRemoveFromStudio = (gownId: string) => {
    const newStudio = studioGowns.filter((g) => g.id !== gownId);
    setStudioGowns(newStudio);
    localStorage.setItem('studioGowns', JSON.stringify(newStudio));
  };

  // Handle Gown Click (opens detail modal with larger image)
  const handleGownClick = (gown: Gown) => {
    setDetailGown(gown);
    setShowGownDetailModal(true);
  };

  // Handle Try On from Detail Modal
  const handleTryOnFromDetail = () => {
    if (!detailGown) return;
    setShowGownDetailModal(false);
    handleTryOn(detailGown);
  };

  // Handle Try On (opens photo select modal first)
  const handleTryOn = (gown: Gown) => {
    setTryOnGown(gown);
    if (userPhotos.length === 0) {
      // No photos - show upload modal
      setShowUploadModal(true);
    } else {
      // Has photos - show photo select modal
      setShowPhotoSelectModal(true);
    }
  };

  // Handle photo selection from PhotoSelectModal
  const handlePhotoSelected = (photoUrl: string) => {
    setSelectedUserPhoto(photoUrl);
    setShowPhotoSelectModal(false);
    setShowTryOnModal(true);
  };

  // Handle Subscribe
  const handleSubscribe = () => {
    // TODO: Integrate with payment provider
    setShowPaywallModal(false);
  };

  // Dev Tools Handlers
  const handleResetOnboarding = () => {
    localStorage.removeItem('hasSeenOnboarding');
    toast.success('Onboarding reset', { description: 'Reload to see onboarding again' });
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem('hasSeenOnboarding');
    localStorage.removeItem('favorites');
    localStorage.removeItem('historyFavorites');
    localStorage.removeItem('studioGowns');
    setFavorites([]);
    setHistoryFavorites([]);
    setStudioGowns([]);
    setUserPhotos([]);
    toast.success('Local storage cleared', { description: 'App reset to fresh state (photos remain in cloud storage)' });
  };

  // Compute effective subscription state (with simulation override)
  const effectiveIsSubscribed = simulateSubscription === 'none'
    ? (isSubscribed || isPro)
    : simulateSubscription === 'pro';
  const effectiveIsPro = simulateSubscription === 'none'
    ? isPro
    : simulateSubscription === 'pro';

  // Loading state (middleware handles auth redirect server-side)
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  // Show Onboarding
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        isSubscribed={effectiveIsSubscribed}
        onShowPaywall={() => setShowPaywallModal(true)}
        credits={effectiveCredits}
        creditsLoading={creditsLoading}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile Header */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-card border border-border rounded-xl shadow-sm"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'browse' && (
          <GownBrowse
            onGownClick={handleGownClick}
            onAddToStudio={handleTryOn}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            showIds={showDressIds}
            showImageUrls={showImageUrls}
          />
        )}

        {currentView === 'studio' && (
          <TryOnStudio
            studioGowns={studioGowns}
            userPhotos={userPhotos}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onRemoveFromStudio={handleRemoveFromStudio}
            isSubscribed={effectiveIsSubscribed}
            onShowPaywall={() => setShowPaywallModal(true)}
            onAddMoreDresses={() => setCurrentView('browse')}
            onUploadPhoto={() => setShowUploadModal(true)}
          />
        )}

        {currentView === 'history' && (
          <TryOnHistory
            isSubscribed={effectiveIsSubscribed}
            favorites={historyFavorites}
            onToggleFavorite={handleToggleHistoryFavorite}
            credits={effectiveCredits}
            onShowPaywall={() => setShowPaywallModal(true)}
          />
        )}

        {currentView === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onRemoveFavorite={handleToggleFavorite}
            historyFavorites={historyFavorites}
            onRemoveHistoryFavorite={handleToggleHistoryFavorite}
            onGownClick={handleGownClick}
            onAddToStudio={handleAddToStudio}
            onBrowseDresses={() => setCurrentView('browse')}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            userPhotos={userPhotos}
            onUploadPhoto={() => setShowUploadModal(true)}
            onRemovePhoto={handlePhotoRemove}
            onPhotoUploaded={handlePhotoUpload}
            isSubscribed={effectiveIsSubscribed}
            onShowPaywall={() => setShowPaywallModal(true)}
            credits={effectiveCredits}
            creditsLoading={creditsLoading}
          />
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handlePhotoUpload}
        existingPhotosCount={userPhotos.length}
      />

      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onSubscribe={handleSubscribe}
      />

      <GownDetailModal
        isOpen={showGownDetailModal}
        onClose={() => {
          setShowGownDetailModal(false);
          setDetailGown(null);
        }}
        gown={detailGown}
        isFavorite={detailGown ? favorites.includes(detailGown.id) : false}
        onToggleFavorite={() => {
          if (detailGown) {
            handleToggleFavorite(detailGown.id);
          }
        }}
        onTryOn={handleTryOnFromDetail}
      />

      <PhotoSelectModal
        isOpen={showPhotoSelectModal}
        onClose={() => {
          setShowPhotoSelectModal(false);
          setTryOnGown(null);
        }}
        userPhotos={userPhotos}
        onSelectPhoto={handlePhotoSelected}
        onPhotoUploaded={handlePhotoUpload}
        onDeletePhoto={handlePhotoRemove}
        credits={effectiveCredits}
        onShowPaywall={() => setShowPaywallModal(true)}
      />

      <TryOnModal
        isOpen={showTryOnModal}
        onClose={() => {
          setShowTryOnModal(false);
          setTryOnGown(null);
          setSelectedUserPhoto(null);
        }}
        gown={tryOnGown}
        userPhoto={selectedUserPhoto}
        onUploadPhoto={() => {
          setShowTryOnModal(false);
          setShowPhotoSelectModal(true);
        }}
        isSubscribed={effectiveIsSubscribed}
        onShowPaywall={() => setShowPaywallModal(true)}
        isFavorite={tryOnGown ? favorites.includes(tryOnGown.id) : false}
        onToggleFavorite={() => {
          if (tryOnGown) {
            handleToggleFavorite(tryOnGown.id);
          }
        }}
        devBypassCredits={simulateSubscription === 'pro'}
        credits={effectiveCredits}
        onCreditsChange={refetchCredits}
      />

      {/* Scene Selector for Video Generation */}
      <SceneSelector
        open={showSceneSelector}
        onOpenChange={(open) => {
          setShowSceneSelector(open);
          if (!open) {
            setPendingVideoGown(null);
            setPendingVideoTryOnResult(null);
          }
        }}
        onSelectScene={handleSceneSelect}
        isGenerating={isGeneratingVideo}
      />

      {/* Dev Tools */}
      <DevTools
        showDressIds={showDressIds}
        onToggleDressIds={setShowDressIds}
        showImageUrls={showImageUrls}
        onToggleImageUrls={setShowImageUrls}
        simulateSubscription={simulateSubscription}
        onSimulateSubscription={setSimulateSubscription}
        onResetOnboarding={handleResetOnboarding}
        onClearLocalStorage={handleClearLocalStorage}
      />
    </div>
  );
}
