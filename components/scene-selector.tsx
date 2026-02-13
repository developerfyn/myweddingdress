'use client';

import * as React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VIDEO_SCENES, type VideoScene } from '@/lib/video-scenes';
import { cn } from '@/lib/utils';

interface SceneSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectScene: (sceneId: string) => void;
  isGenerating?: boolean;
}

export function SceneSelector({
  open,
  onOpenChange,
  onSelectScene,
  isGenerating = false,
}: SceneSelectorProps) {
  const [selectedScene, setSelectedScene] = React.useState<string | null>(null);

  const handleGenerate = () => {
    if (selectedScene) {
      onSelectScene(selectedScene);
    }
  };

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedScene(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Scene</DialogTitle>
          <DialogDescription>
            Select a romantic backdrop for your video
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
          {VIDEO_SCENES.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isSelected={selectedScene === scene.id}
              onSelect={() => setSelectedScene(scene.id)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedScene || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Video'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SceneCardProps {
  scene: VideoScene;
  isSelected: boolean;
  onSelect: () => void;
}

function SceneCard({ scene, isSelected, onSelect }: SceneCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary ring-2 ring-primary ring-offset-2'
          : 'border-transparent hover:border-muted-foreground/30'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4]">
        <Image
          src={scene.thumbnail}
          alt={scene.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 45vw, 200px"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <Check className="w-4 h-4" />
          </div>
        )}

        {/* Scene info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <h3 className="font-semibold text-sm">{scene.name}</h3>
          <p className="text-xs text-white/80">{scene.description}</p>
        </div>
      </div>
    </button>
  );
}
