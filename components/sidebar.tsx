'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Heart,
  Sparkles,
  Grid3X3,
  Settings,
  Crown,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CreditDisplay } from '@/components/credit-display';
import type { UserCredits } from '@/lib/usage-tracking';

interface SidebarProps {
  currentView: 'browse' | 'favorites' | 'studio' | 'history' | 'settings';
  onViewChange: (view: 'browse' | 'favorites' | 'studio' | 'history' | 'settings') => void;
  onLogout: () => void;
  isSubscribed: boolean;
  onShowPaywall: () => void;
  credits?: UserCredits | null;
  creditsLoading?: boolean;
}

const navItems = [
  { id: 'browse', label: 'Browse', icon: Grid3X3 },
  // { id: 'studio', label: 'Try-On Studio', icon: Sparkles },
  { id: 'history', label: 'Try-On History', icon: Clock },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({
  currentView,
  onViewChange,
  onLogout,
  isSubscribed,
  onShowPaywall,
  credits,
  creditsLoading = false,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center gap-3">
        <Image
          src="/assets/mwd.png"
          alt="My Wedding Dress"
          width={40}
          height={40}
          className="w-10 h-10 rounded-xl flex-shrink-0"
        />
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-serif text-lg text-foreground whitespace-nowrap">My Wedding Dress</h1>
            <p className="text-xs text-muted-foreground">Virtual Try-On</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-[#FF6B9D]/20 to-[#C86DD7]/20 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive && 'text-primary'
                    )}
                  />
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Credits Display */}
      {!isCollapsed && (
        <div className="mx-4 mb-4">
          <CreditDisplay
            credits={credits ?? null}
            isLoading={creditsLoading}
            variant="sidebar"
          />
        </div>
      )}

      {/* PRO Badge */}
      {!isSubscribed && (
        <div className="mx-4 mb-4">
          <button
            onClick={onShowPaywall}
            className={cn(
              'w-full rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]',
              'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7]'
            )}
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-white flex-shrink-0" />
              {!isCollapsed && (
                <div className="text-left">
                  <p className="font-semibold text-white text-sm">Upgrade to PRO</p>
                  <p className="text-white/70 text-xs">Unlimited try-ons + videos</p>
                </div>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Log Out */}
      <div className="p-4 border-t border-border">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </div>
              {!isCollapsed && (
                <div className="text-left overflow-hidden">
                  <p className="font-medium text-foreground text-sm">Log Out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your account</p>
                </div>
              )}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out of your account?</AlertDialogTitle>
              <AlertDialogDescription>
                You will need to sign in again to access your saved photos, favorites, and try-on history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onLogout}
                className="bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] hover:opacity-90"
              >
                Log Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}
