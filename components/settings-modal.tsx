'use client';

import { X, Images, RefreshCw, Shield, FileText, Mail, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManagePhotos: () => void;
}

const settingsItems = [
  { icon: Images, label: 'Manage Photos', action: 'photos' },
  { icon: RefreshCw, label: 'Restore Purchases', action: 'restore' },
  { icon: Shield, label: 'Privacy Policy', action: 'privacy' },
  { icon: FileText, label: 'Terms of Service', action: 'terms' },
  { icon: Mail, label: 'Contact Support', action: 'support' },
];

export function SettingsModal({ isOpen, onClose, onManagePhotos }: SettingsModalProps) {
  if (!isOpen) return null;

  const handleItemClick = (action: string) => {
    if (action === 'photos') {
      onManagePhotos();
    }
    // Other actions would be implemented here
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="space-y-4 pt-4">
          <h3 className="font-serif text-2xl text-white text-center mb-6">
            Settings
          </h3>

          {/* Settings List */}
          <div className="space-y-1">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.action}
                  onClick={() => handleItemClick(item.action)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3.5 rounded-xl',
                    'hover:bg-secondary transition-colors'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-white font-sans">{item.label}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>

          {/* Version */}
          <p className="text-center text-muted-foreground text-xs pt-4">
            Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
