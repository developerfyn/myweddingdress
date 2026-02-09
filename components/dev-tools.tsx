'use client';

import { useState, useEffect } from 'react';
import {
  Bug,
  X,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  User,
  Crown,
  Database,
  Image as ImageIcon,
  Hash,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

interface DevToolsProps {
  // Debug display states
  showDressIds: boolean;
  onToggleDressIds: (show: boolean) => void;
  showImageUrls: boolean;
  onToggleImageUrls: (show: boolean) => void;
  // Simulation states
  simulateSubscription: 'none' | 'free' | 'pro';
  onSimulateSubscription: (state: 'none' | 'free' | 'pro') => void;
  // Actions
  onResetOnboarding: () => void;
  onClearLocalStorage: () => void;
}

export function DevTools({
  showDressIds,
  onToggleDressIds,
  showImageUrls,
  onToggleImageUrls,
  simulateSubscription,
  onSimulateSubscription,
  onResetOnboarding,
  onClearLocalStorage,
}: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>('display');
  const { user, profile, subscription, isSubscribed, isPro } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const localStorageKeys = [
    'hasSeenOnboarding',
    'favorites',
    'studioDresses',
    'userPhotos',
  ];

  const getLocalStorageData = () => {
    const data: Record<string, string | null> = {};
    localStorageKeys.forEach((key) => {
      try {
        data[key] = localStorage.getItem(key);
      } catch {
        data[key] = null;
      }
    });
    return data;
  };

  const [localData, setLocalData] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (isOpen) {
      setLocalData(getLocalStorageData());
    }
  }, [isOpen]);

  const sections = [
    { id: 'display', label: 'Display', icon: Eye },
    { id: 'user', label: 'User', icon: User },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'simulate', label: 'Simulate', icon: RefreshCw },
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full',
          'bg-orange-500 hover:bg-orange-600 text-white shadow-lg',
          'flex items-center justify-center transition-all',
          'hover:scale-110 active:scale-95',
          isOpen && 'hidden'
        )}
        title="Open Dev Tools"
      >
        <Bug className="w-5 h-5" />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-zinc-900 text-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">Dev Tools</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex border-b border-zinc-700">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex-1 py-2 px-3 text-xs font-medium flex flex-col items-center gap-1',
                    activeSection === section.id
                      ? 'bg-zinc-800 text-orange-500'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Display Section */}
            {activeSection === 'display' && (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Visual Debugging
                  </h3>

                  <label className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-750">
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm">Show Dress IDs</span>
                    </div>
                    <button
                      onClick={() => onToggleDressIds(!showDressIds)}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        showDressIds ? 'bg-orange-500' : 'bg-zinc-600'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          showDressIds ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-750">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm">Show Image URLs</span>
                    </div>
                    <button
                      onClick={() => onToggleImageUrls(!showImageUrls)}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        showImageUrls ? 'bg-orange-500' : 'bg-zinc-600'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          showImageUrls ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </label>
                </div>
              </>
            )}

            {/* User Section */}
            {activeSection === 'user' && (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Current User
                  </h3>

                  {user ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">User ID</span>
                          <button
                            onClick={() => copyToClipboard(user.id, 'userId')}
                            className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"
                          >
                            {copied === 'userId' ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copied === 'userId' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-xs font-mono text-zinc-300 break-all">
                          {user.id}
                        </p>
                      </div>

                      <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                        <span className="text-xs text-zinc-500">Email</span>
                        <p className="text-sm text-zinc-300">{user.email}</p>
                      </div>

                      <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                        <span className="text-xs text-zinc-500">Subscription</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              isPro
                                ? 'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white'
                                : isSubscribed
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-600 text-zinc-300'
                            )}
                          >
                            {isPro ? 'PRO' : isSubscribed ? 'Subscribed' : 'Free'}
                          </span>
                          {subscription && (
                            <span className="text-xs text-zinc-500">
                              ({subscription.plan} / {subscription.status})
                            </span>
                          )}
                        </div>
                      </div>

                      {profile && (
                        <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                          <span className="text-xs text-zinc-500">Profile</span>
                          <pre className="text-xs font-mono text-zinc-400 overflow-x-auto">
                            {JSON.stringify(profile, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-800 rounded-lg text-center text-zinc-500 text-sm">
                      No user logged in
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Storage Section */}
            {activeSection === 'storage' && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Local Storage
                    </h3>
                    <button
                      onClick={() => setLocalData(getLocalStorageData())}
                      className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>

                  {localStorageKeys.map((key) => (
                    <div key={key} className="p-3 bg-zinc-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">{key}</span>
                        {localData[key] && (
                          <button
                            onClick={() => copyToClipboard(localData[key] || '', key)}
                            className="text-xs text-orange-500 hover:text-orange-400"
                          >
                            {copied === key ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-mono text-zinc-400 break-all max-h-20 overflow-y-auto">
                        {localData[key] || <span className="text-zinc-600">null</span>}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-700">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Actions
                  </h3>

                  <button
                    onClick={() => {
                      onResetOnboarding();
                      setLocalData(getLocalStorageData());
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-750 text-left"
                  >
                    <RotateCcw className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-sm">Reset Onboarding</p>
                      <p className="text-xs text-zinc-500">Show onboarding on next load</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onClearLocalStorage();
                      setLocalData(getLocalStorageData());
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-red-900/30 text-left"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm text-red-400">Clear All Local Storage</p>
                      <p className="text-xs text-zinc-500">Reset app to fresh state</p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Simulate Section */}
            {activeSection === 'simulate' && (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Subscription Override
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Override the subscription state for testing UI
                  </p>

                  <div className="space-y-2">
                    {[
                      { value: 'none', label: 'No Override', desc: 'Use actual subscription' },
                      { value: 'free', label: 'Simulate Free', desc: 'Show as free user' },
                      { value: 'pro', label: 'Simulate PRO', desc: 'Show as PRO subscriber' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onSimulateSubscription(option.value as 'none' | 'free' | 'pro')}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                          simulateSubscription === option.value
                            ? 'bg-orange-500/20 border border-orange-500'
                            : 'bg-zinc-800 hover:bg-zinc-750'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full border-2',
                            simulateSubscription === option.value
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-zinc-500'
                          )}
                        />
                        <div>
                          <p className="text-sm">{option.label}</p>
                          <p className="text-xs text-zinc-500">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-700">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Quick Debug Info
                  </h3>

                  <button
                    onClick={() => {
                      const debugInfo = {
                        timestamp: new Date().toISOString(),
                        user: user?.id,
                        email: user?.email,
                        subscription: subscription?.plan,
                        subscriptionStatus: subscription?.status,
                        localStorage: getLocalStorageData(),
                        userAgent: navigator.userAgent,
                      };
                      copyToClipboard(JSON.stringify(debugInfo, null, 2), 'debug');
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-750 text-left"
                  >
                    <Copy className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm">Copy Debug Info</p>
                      <p className="text-xs text-zinc-500">
                        {copied === 'debug' ? 'Copied to clipboard!' : 'Copy all debug data as JSON'}
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-700 text-center">
            <p className="text-xs text-zinc-600">
              Dev Tools v1.0 • {process.env.NODE_ENV}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
