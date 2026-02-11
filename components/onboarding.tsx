'use client';

import { useState } from 'react';
import { ChevronRight, Sparkles, Camera, Heart, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    headline: 'Browse 500+ Designer Gowns',
    subtext: 'Explore curated collections from A-line to mermaid, ball gown to bohemian',
    image: '/dresses/aline-1.jpg',
  },
  {
    icon: Camera,
    headline: 'Upload Your Photo',
    subtext: 'See how dresses look on you with our AI-powered virtual try-on technology',
    note: 'Our AI does its best, but it\'s not perfect. Use try-on results as inspiration, not an exact preview.',
    image: '/dresses/ballgown-1.jpg',
  },
  {
    icon: Heart,
    headline: 'Find Your Dream Dress',
    subtext: 'Compare styles side-by-side, save your favorites, and share with loved ones',
    image: '/dresses/mermaid-1.jpg',
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {steps.map((s, index) => (
          <div
            key={index}
            className={cn(
              'absolute inset-0 transition-opacity duration-500',
              index === currentStep ? 'opacity-100' : 'opacity-0'
            )}
          >
            <img
              src={s.image || "/placeholder.svg"}
              alt={s.headline}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
          </div>
        ))}
        
        {/* Logo on Image */}
        <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
          <Image
            src="/assets/mwd.png"
            alt="My Wedding Dress"
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl"
          />
          <div>
            <h1 className="font-serif text-xl text-white">My Wedding Dress</h1>
            <p className="text-sm text-white/70">Virtual Try-On</p>
          </div>
        </div>
      </div>

      {/* Right Side - Content */}
      <div className="flex-1 flex flex-col">
        {/* Skip Button */}
        <div className="flex justify-end p-6">
          <button
            onClick={onComplete}
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-16 max-w-xl mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <Image
              src="/assets/mwd.png"
              alt="My Wedding Dress"
              width={48}
              height={48}
              className="w-12 h-12 rounded-xl"
            />
            <div>
              <h1 className="font-serif text-xl text-foreground">My Wedding Dress</h1>
              <p className="text-sm text-muted-foreground">Virtual Try-On</p>
            </div>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B9D] to-[#C86DD7] flex items-center justify-center mb-8">
            <Icon className="w-10 h-10 text-white" />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  index === currentStep
                    ? 'w-8 bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7]'
                    : index < currentStep
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-secondary'
                )}
              />
            ))}
          </div>

          {/* Text */}
          <h2 className="font-serif text-3xl lg:text-4xl text-foreground text-center mb-4 text-balance">
            {step.headline}
          </h2>
          <p className="text-muted-foreground text-center text-lg max-w-sm">
            {step.subtext}
          </p>
          {step.note && (
            <p className="text-muted-foreground/70 text-center text-sm max-w-sm mt-4 italic">
              {step.note}
            </p>
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-8 max-w-md mx-auto w-full">
          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-4 rounded-xl font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold text-white',
                'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7]',
                'hover:opacity-90 transition-all flex items-center justify-center gap-2'
              )}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
