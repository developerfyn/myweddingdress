'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart, Sparkles, Trash2, Loader2, Clock, Download, ZoomIn, X, Share2 } from 'lucide-react';
import type { Gown } from '@/lib/gowns';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { dressCategories } from '@/lib/dress-data';

interface HistoryItem {
  id: string;
  dress_id: string;
  person_image_hash: string;
  result_base64: string | null;
  result_url: string | null;
  created_at: string;
  access_count: number;
  last_accessed_at: string;
}

interface FavoritesViewProps {
  favorites: string[];
  onRemoveFavorite: (gownId: string) => void;
  historyFavorites: string[];
  onRemoveHistoryFavorite: (historyId: string) => void;
  onGownClick: (gown: Gown) => void;
  onAddToStudio: (gown: Gown) => void;
  onBrowseDresses: () => void;
}

export function FavoritesView({
  favorites,
  onRemoveFavorite,
  historyFavorites,
  onRemoveHistoryFavorite,
  onGownClick,
  onAddToStudio,
  onBrowseDresses,
}: FavoritesViewProps) {
  const [favoriteGowns, setFavoriteGowns] = useState<Gown[]>([]);
  const [favoriteHistoryItems, setFavoriteHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get dress info from dress_id
  const getDressInfo = (dressId: string) => {
    for (const category of dressCategories) {
      const dress = category.dresses.find(d => d.id === dressId);
      if (dress) {
        return { name: dress.name, category: category.name, image: dress.image };
      }
    }
    return { name: dressId || 'Unknown Dress', category: 'Unknown', image: null };
  };

  // Download result
  const downloadResult = (item: HistoryItem) => {
    const imageData = item.result_base64 || item.result_url;
    if (!imageData) return;

    const dressInfo = getDressInfo(item.dress_id);
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `tryon-${dressInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
  };

  // Delete history item
  const deleteHistoryItem = async (id: string) => {
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
        // Remove from local state
        setFavoriteHistoryItems(prev => prev.filter(item => item.id !== id));
        // Also remove from favorites
        onRemoveHistoryFavorite(id);
        if (selectedHistoryItem?.id === id) {
          setSelectedHistoryItem(null);
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

  // Share result
  const shareResult = async (item: HistoryItem) => {
    const dressInfo = getDressInfo(item.dress_id);

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
      alert('Sharing is not supported on this device');
    }
  };

  // Fetch favorite gowns from Supabase
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteGowns([]);
      setIsLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('gowns')
        .select('*, neckline:necklines(*)')
        .in('id', favorites);

      if (error) {
        console.error('Error fetching favorites:', error);
        setFavoriteGowns([]);
      } else {
        setFavoriteGowns(data || []);
      }
      setIsLoading(false);
    };

    fetchFavorites();
  }, [favorites]);

  // Fetch favorite history items
  useEffect(() => {
    if (historyFavorites.length === 0) {
      setFavoriteHistoryItems([]);
      setIsLoadingHistory(false);
      return;
    }

    const fetchHistoryFavorites = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch('/api/tryon/history');
        const data = await response.json();

        if (data.success) {
          // Filter to only include favorited items
          const favoritedItems = data.history.filter((item: HistoryItem) =>
            historyFavorites.includes(item.id)
          );
          setFavoriteHistoryItems(favoritedItems);
        }
      } catch (err) {
        console.error('Error fetching history favorites:', err);
        setFavoriteHistoryItems([]);
      }
      setIsLoadingHistory(false);
    };

    fetchHistoryFavorites();
  }, [historyFavorites]);

  const stillLoading = isLoading || isLoadingHistory;
  const hasNoFavorites = favoriteGowns.length === 0 && favoriteHistoryItems.length === 0;

  if (stillLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasNoFavorites) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
          <Heart className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-2">No Favorites Yet</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Save gowns you love to compare them later and create your perfect wedding
          look.
        </p>
        <button
          onClick={onBrowseDresses}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Browse Gowns
        </button>
      </div>
    );
  }

  const totalFavorites = favoriteGowns.length + favoriteHistoryItems.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
              Your Favorites
              <Heart className="w-5 h-5 fill-primary text-primary" />
            </h2>
            <p className="text-sm text-muted-foreground">
              {totalFavorites} item
              {totalFavorites !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            onClick={onBrowseDresses}
            className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse More
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Gowns Section */}
        {favoriteGowns.length > 0 && (
          <section>
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Favorite Gowns ({favoriteGowns.length})
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoriteGowns.map((gown) => (
            <div
              key={gown.id}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-card cursor-pointer"
              onClick={() => onGownClick(gown)}
            >
              {/* Image */}
              <Image
                src={gown.image_url || '/placeholder.svg'}
                alt={gown.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFavorite(gown.id);
                }}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>

              {/* Info & Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-serif text-xl text-white drop-shadow-lg mb-1">
                  {gown.name}
                </p>
                <p className="text-white/70 text-sm">{gown.neckline?.name || 'Classic'}</p>

                {/* Try On Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToStudio(gown);
                  }}
                  className={cn(
                    'mt-3 w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2',
                    'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white',
                    'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0',
                    'transition-all duration-300 hover:opacity-90'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  Try On
                </button>
              </div>
            </div>
          ))}
            </div>
          </section>
        )}

        {/* Try-On Results Section */}
        {favoriteHistoryItems.length > 0 && (
          <section>
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Favorite Try-Ons ({favoriteHistoryItems.length})
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoriteHistoryItems.map((item) => {
                const dressInfo = getDressInfo(item.dress_id);
                const imageData = item.result_base64 || item.result_url;

                return (
                  <div
                    key={item.id}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-card cursor-pointer"
                    onClick={() => setSelectedHistoryItem(item)}
                  >
                    {/* Image */}
                    {imageData ? (
                      <img
                        src={imageData}
                        alt={dressInfo.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Clock className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Hover Overlay with Buttons */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHistoryItem(item);
                        }}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <ZoomIn className="w-5 h-5 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistoryFavorite(item.id);
                        }}
                        className="p-2 rounded-full bg-primary/80 hover:bg-primary transition-colors"
                      >
                        <Heart className="w-5 h-5 text-white fill-white" />
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
                          deleteHistoryItem(item.id);
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

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="font-serif text-sm text-white truncate">
                        {dressInfo.name}
                      </p>
                      <p className="text-xs text-white/70">Try-On Result</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Full View Modal for History Items */}
      {selectedHistoryItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedHistoryItem(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedHistoryItem(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Image */}
            <div className="max-h-[70vh] overflow-hidden">
              {(selectedHistoryItem.result_base64 || selectedHistoryItem.result_url) && (
                <img
                  src={selectedHistoryItem.result_base64 || selectedHistoryItem.result_url || ''}
                  alt="Try-on result"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Info Bar */}
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div>
                <p className="font-serif text-lg text-foreground">
                  {getDressInfo(selectedHistoryItem.dress_id).name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Try-On Result
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRemoveHistoryFavorite(selectedHistoryItem.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary transition-colors"
                >
                  <Heart className="w-4 h-4 fill-current" />
                  Saved
                </button>
                <button
                  onClick={() => shareResult(selectedHistoryItem)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={() => downloadResult(selectedHistoryItem)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => deleteHistoryItem(selectedHistoryItem.id)}
                  disabled={deletingId === selectedHistoryItem.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                >
                  {deletingId === selectedHistoryItem.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
