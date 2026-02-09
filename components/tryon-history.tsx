'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Clock,
  Download,
  Trash2,
  Loader2,
  ImageIcon,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dressCategories } from '@/lib/dress-data';
import { useVideoGeneration } from '@/components/video-generation-provider';
import { TryOnResultModal } from '@/components/tryon-result-modal';
import { CREDIT_COSTS, type UserCredits } from '@/lib/usage-tracking';
import type { Gown } from '@/lib/gowns';

interface HistoryItem {
  id: string;
  dress_id: string;
  person_image_hash: string;
  result_base64: string | null;
  result_url: string | null;
  created_at: string;
  access_count: number;
  last_accessed_at: string;
  gown_name: string | null;
  gown_image_url: string | null;
}

interface TryOnHistoryProps {
  isSubscribed: boolean;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  credits?: UserCredits | null;
  onShowPaywall?: () => void;
}

export function TryOnHistory({ isSubscribed, favorites, onToggleFavorite, credits, onShowPaywall }: TryOnHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { startVideoGeneration, isGeneratingVideo } = useVideoGeneration();

  const ITEMS_PER_PAGE = 12;

  // Get dress info from history item (uses API-provided gown_name, falls back to local data)
  const getDressInfo = (item: HistoryItem) => {
    // If we have gown info from API, use it
    if (item.gown_name) {
      return { name: item.gown_name, category: 'Gown', image: item.gown_image_url };
    }
    // Fallback to local dress data
    for (const category of dressCategories) {
      const dress = category.dresses.find(d => d.id === item.dress_id);
      if (dress) {
        return { name: dress.name, category: category.name, image: dress.image };
      }
    }
    return { name: 'Unknown Dress', category: 'Unknown', image: null };
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tryon/history?limit=${ITEMS_PER_PAGE}&offset=${page * ITEMS_PER_PAGE}`
      );
      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
        setTotal(data.total);
      } else {
        setError(data.error || 'Failed to load history');
      }
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    if (!confirm('Delete this try-on result? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch('/api/tryon/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        setTotal(prev => prev - 1);
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // Download result
  const downloadResult = (item: HistoryItem) => {
    const imageData = item.result_base64 || item.result_url;
    if (!imageData) return;

    const dressInfo = getDressInfo(item);
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `tryon-${dressInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
  };

  // Share result
  const shareResult = async (item: HistoryItem) => {
    const dressInfo = getDressInfo(item);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${dressInfo.name} Try-On`,
          text: `Check out how I look in this ${dressInfo.name}!`,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy link or show message
      alert('Sharing is not supported on this device');
    }
  };

  // Generate video from history item
  const generateVideo = (item: HistoryItem) => {
    // Check credits before generating video
    const hasEnoughCredits = credits && credits.credits_balance >= CREDIT_COSTS.video_generation;
    const canGenerateVideo = credits?.can_generate_video;

    if (!canGenerateVideo || !hasEnoughCredits) {
      // Show paywall if not enough credits or free user
      if (onShowPaywall) {
        onShowPaywall();
      }
      return;
    }

    const imageData = item.result_base64 || item.result_url;
    if (!imageData) return;

    const dressInfo = getDressInfo(item);

    // Create a minimal gown object for the video generation widget display
    const gown = {
      id: item.dress_id,
      name: dressInfo.name,
      image_url: dressInfo.image || imageData,
    } as Gown;

    startVideoGeneration(gown, imageData);
    setSelectedItem(null); // Close the modal
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Empty state
  if (!isLoading && history.length === 0 && page === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
          <Clock className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-2">No Try-On History</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Your try-on results will appear here. Go to Try-On Studio to create your first virtual try-on!
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h2 className="text-xl font-serif text-foreground">Try-On History</h2>
          <p className="text-sm text-muted-foreground">
            {total} saved result{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchHistory}
              className="px-4 py-2 rounded-lg bg-primary text-white"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.map((item) => {
                const dressInfo = getDressInfo(item);
                const imageData = item.result_base64 || item.result_url;

                // Debug: log what URL we're using
                console.log(`[History] Item ${item.id}: result_base64=${item.result_base64?.substring(0, 30) || 'null'}, result_url=${item.result_url?.substring(0, 80) || 'null'}`);
                console.log(`[History] Using imageData: ${imageData?.substring(0, 100)}...`);

                return (
                  <div
                    key={item.id}
                    className="group relative bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* Result Image */}
                    <div className="aspect-[3/4] relative bg-secondary">
                      {imageData ? (
                        <img
                          src={imageData}
                          alt={dressInfo.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`[History] Image load failed for ${item.id}:`, (e.target as HTMLImageElement).src?.substring(0, 100));
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          <ZoomIn className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item.id);
                          }}
                          className={cn(
                            "p-2 rounded-full transition-colors",
                            favorites.includes(item.id)
                              ? "bg-primary/80 hover:bg-primary"
                              : "bg-white/20 hover:bg-white/30"
                          )}
                        >
                          <Heart className={cn(
                            "w-5 h-5 text-white",
                            favorites.includes(item.id) && "fill-white"
                          )} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadResult(item);
                          }}
                          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          <Download className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item.id);
                          }}
                          disabled={deletingId === item.id}
                          className="p-2 rounded-full bg-white/20 hover:bg-red-500/50 transition-colors"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5 text-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="font-serif text-sm text-foreground truncate">
                        {dressInfo.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </span>
                        {item.access_count > 1 && (
                          <>
                            <Eye className="w-3 h-3 text-muted-foreground ml-2" />
                            <span className="text-xs text-muted-foreground">
                              {item.access_count}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    page === 0
                      ? 'text-muted-foreground cursor-not-allowed'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    page >= totalPages - 1
                      ? 'text-muted-foreground cursor-not-allowed'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  )}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Full View Modal using unified component */}
      {selectedItem && (
        <TryOnResultModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          imageUrl={selectedItem.result_base64 || selectedItem.result_url || ''}
          gown={{
            id: selectedItem.dress_id,
            name: getDressInfo(selectedItem).name,
            image_url: getDressInfo(selectedItem).image || selectedItem.result_base64 || selectedItem.result_url || '',
          }}
          isFavorite={favorites.includes(selectedItem.id)}
          onToggleFavorite={() => onToggleFavorite(selectedItem.id)}
          onShare={() => shareResult(selectedItem)}
          onAnimate={() => generateVideo(selectedItem)}
          onDownload={() => downloadResult(selectedItem)}
          onDelete={() => deleteItem(selectedItem.id)}
          showDelete={true}
          isGeneratingVideo={isGeneratingVideo}
          isDeleting={deletingId === selectedItem.id}
        />
      )}
    </div>
  );
}
