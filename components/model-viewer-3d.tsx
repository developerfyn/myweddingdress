'use client';

import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

interface ModelViewer3DProps {
  modelUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ModelViewer3D({ modelUrl, isOpen, onClose }: ModelViewer3DProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const modelViewerRef = useRef<any>(null);

  // Load model-viewer script
  useEffect(() => {
    if (typeof window !== 'undefined' && !scriptLoaded) {
      const existingScript = document.querySelector(
        'script[src*="model-viewer"]'
      );
      if (existingScript) {
        setScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.src =
        'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
      script.onload = () => setScriptLoaded(true);
      document.head.appendChild(script);
    }
  }, [scriptLoaded]);

  // Reset loaded state when model URL changes
  useEffect(() => {
    setIsLoaded(false);
  }, [modelUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl h-[80vh] bg-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <h3 className="text-white font-medium">3D View</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (modelViewerRef.current) {
                  modelViewerRef.current.resetTurntableRotation();
                  modelViewerRef.current.cameraOrbit = '0deg 75deg 105%';
                }
              }}
              className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
              title="Reset view"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-5">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading 3D model...</p>
          </div>
        )}

        {/* 3D Model Viewer */}
        {scriptLoaded && (
          // @ts-expect-error - model-viewer is a custom web component
          <model-viewer
            ref={modelViewerRef}
            src={modelUrl}
            alt="3D Try-On Result"
            camera-controls
            auto-rotate
            auto-rotate-delay="0"
            rotation-per-second="30deg"
            camera-orbit="0deg 75deg 105%"
            min-camera-orbit="auto auto 50%"
            max-camera-orbit="auto auto 200%"
            shadow-intensity="1"
            exposure="1"
            environment-image="neutral"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
            }}
            onLoad={() => setIsLoaded(true)}
          >
            {/* Progress bar */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
              slot="progress-bar"
            />
          {/* @ts-expect-error - model-viewer is a custom web component */}
          </model-viewer>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/80">
            Drag to rotate &bull; Pinch or scroll to zoom
          </div>
        </div>
      </div>
    </div>
  );
}
