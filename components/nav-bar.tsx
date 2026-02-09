'use client';

import { Settings, User } from 'lucide-react';
import Image from 'next/image';

interface NavBarProps {
  onSettingsClick: () => void;
  onProfileClick: () => void;
  userPhoto?: string;
}

export function NavBar({ onSettingsClick, onProfileClick, userPhoto }: NavBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/50">
      <h1 className="font-serif text-xl text-white italic">
        My Wedding Dress
      </h1>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <button
          onClick={onProfileClick}
          className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors"
          aria-label="Profile"
        >
          {userPhoto ? (
            <Image
              src={userPhoto || "/placeholder.svg"}
              alt="Profile"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
