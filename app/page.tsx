'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { HeroCarousel } from '@/components/hero-carousel';
import { createClient } from '@/lib/supabase';
import {
  ArrowRight,
  Camera,
  Heart,
  Video,
  Check,
  Star,
  Menu,
  X,
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // Force video play on mobile (iOS Safari workaround)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay was prevented, user interaction needed
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-4 left-0 right-0 z-50 px-6">
        <nav className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between bg-white rounded-full shadow-lg">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/mwd.png"
              alt="My Wedding Dress"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-serif text-xl font-semibold italic bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] bg-clip-text text-transparent">
              My Wedding Dress
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-12">
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {isLoggedIn ? (
              <Button size="sm" asChild>
                <Link href="/try-on">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">
                    Try for Free
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 min-w-11 min-h-11 flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border px-6 py-4">
            <div className="flex flex-col gap-4">
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/blog"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <div className="flex gap-2 pt-2">
                {isLoggedIn ? (
                  <Button size="sm" className="flex-1" asChild>
                    <Link href="/try-on">Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link href="/signup">Try Free</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Centered Hero Content */}
          <div className="flex flex-col items-center text-center gap-6 mb-4">
            <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-tight text-balance max-w-4xl">
              Try 500+ designer wedding dresses
            </h1>

            {/* <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Try on 500+ designer wedding gowns virtually. See how each dress
              looks on you before visiting the boutique. Save time, reduce
              stress, find the one.
            </p> */}

            <Button size="lg" className="gap-4" asChild>
              <Link href="/try-on">
                Start For Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* 3D Carousel */}
          <div className="relative">
            <HeroCarousel />
          </div>

          {/* Social Proof */}
          <div className="flex flex-col items-center gap-8 mt-12">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Image
                    key={i}
                    src={`/assets/headshot-${i}.jpg`}
                    alt={`Happy bride ${i}`}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">4.9</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-primary text-primary"
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Loved by <span className="font-semibold text-foreground">10,000+</span> brides
                </p>
              </div>
            </div>

            {/* Testimonial Marquee */}
            <div className="mt-8 w-screen -mx-6 overflow-hidden">
              {/* Top row - scrolls left */}
              <div className="flex animate-marquee-left mb-4">
                {[...Array(2)].map((_, dupeIndex) => (
                  <div key={dupeIndex} className="flex gap-4 px-2">
                    {[
                      { quote: 'I tried on 50 dresses virtually before visiting the boutique. Walked in knowing exactly what I wanted!', name: 'Sarah Mitchell' },
                      { quote: 'The AI try-on is shockingly realistic. My mom thought the photos were from a real fitting!', name: 'Olivia Martinez' },
                      { quote: 'Found my dream dress in a style I never would have tried in store. This app changed everything.', name: 'Jessica Laurent' },
                      { quote: 'The video animation feature is incredible. Seeing the dress move and flow helped me make my final decision.', name: 'Amanda Chen' },
                    ].map((testimonial, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-[300px] p-4 rounded-xl bg-white/80 border border-border/50 shadow-sm text-center"
                      >
                        <p className="text-sm text-foreground leading-relaxed mb-2">
                          &ldquo;{testimonial.quote}&rdquo;
                        </p>
                        <span className="text-xs text-muted-foreground">
                          — {testimonial.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Bottom row - scrolls right */}
              <div className="flex animate-marquee-right">
                {[...Array(2)].map((_, dupeIndex) => (
                  <div key={dupeIndex} className="flex gap-4 px-2">
                    {[
                      { quote: 'Saved me so much time! I knew exactly which 3 dresses to try on at the boutique.', name: 'Rachel Thompson' },
                      { quote: 'I live in a small town with limited bridal shops. This let me explore hundreds of designer dresses I never would have seen otherwise.', name: 'Emma Wilson' },
                      { quote: 'My bridesmaids and I had so much fun swiping through dresses together. Made the whole experience more special.', name: 'Lauren Davis' },
                      { quote: 'The realistic try-on photos helped my long-distance mom feel included in the dress shopping process.', name: 'Michelle Park' },
                    ].map((testimonial, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-[300px] p-4 rounded-xl bg-white/80 border border-border/50 shadow-sm text-center"
                      >
                        <p className="text-sm text-foreground leading-relaxed mb-2">
                          &ldquo;{testimonial.quote}&rdquo;
                        </p>
                        <span className="text-xs text-muted-foreground">
                          — {testimonial.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section - commented out
      <section id="features" className="pt-6 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
              Everything you need to find the one
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Wedding dress shopping should be effortless and
              enjoyable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                AI Virtual Try-On
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload your photo and see exactly how each dress looks on you.
                Our AI creates realistic visualizations in seconds.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                360° Video Animation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Transform any try-on into a 5-second video. See how the dress
                flows and moves from every angle.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                Save Favorites
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Build your dream dress collection. Save favorites, add notes,
                and share with family and friends.
              </p>
            </div>
          </div>

        </div>
      </section>
      */}

      {/* How It Works */}
      <section id="how-it-works" className="pt-8 pb-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
              Start in 3 simple steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Finding your dream dress has never been easier.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Video */}
            <div className="rounded-2xl overflow-hidden border border-border shadow-lg max-w-xs mx-auto">
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-auto"
              >
                <source src="/assets/home-screen-video.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Steps */}
            <div className="space-y-8">
              {[
                {
                  step: '01',
                  title: 'Upload Your Photo',
                  description:
                    'Take a full-body photo or upload one from your gallery. Our AI works best with clear, well-lit images.',
                },
                {
                  step: '02',
                  title: 'Browse & Try On',
                  description:
                    'Explore 500+ designer gowns across all styles. Tap any dress to instantly see how it looks on you.',
                },
                {
                  step: '03',
                  title: 'Animate & Share',
                  description:
                    'Turn your try-on into stunning videos. See how the dress flows and moves, then share with loved ones.',
                },
              ].map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="text-4xl font-serif font-bold text-primary/20 flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pt-6 pb-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
              Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access to 500+ wedding gowns from the comfort of your home.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl bg-background border border-border">
              <h3 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Free
              </h3>
              <p className="text-muted-foreground mb-6">
                Try for free
              </p>
              <div className="mb-6">
                <span className="text-4xl font-semibold text-foreground">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  'Browse all 500+ dresses',
                  'See yourself in 2 wedding dresses per day',
                  
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/signup">Start for free</Link>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-3xl bg-primary text-primary-foreground relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                Best Value
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-2">
                Quarterly
              </h3>
              <p className="text-primary-foreground/80 mb-4">
                Find your dream wedding dress
              </p>
              <div className="mb-6">
                <span className="text-4xl font-semibold">$13.33</span>
                <span className="text-primary-foreground/80">/month</span>
                <p className="text-sm text-primary-foreground/60 mt-1">
                  $39.99 billed quarterly
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Up to 200 wedding dress try-ons',
                  'Up to 50 video animations in backgrounds you choose',
                  'Unused allowance rolls over',

                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className="w-full bg-white text-primary hover:bg-white/90"
                asChild
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-6 text-balance">
            Ready to find your perfect dress?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of happy brides who found their dream gown. Start your journey today.
          </p>
          <Button size="lg" className="gap-2" asChild>
            <Link href="/signup">
              Try For Free Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/assets/mwd.png"
                alt="My Wedding Dress"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="font-serif text-xl font-semibold italic bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] bg-clip-text text-transparent">
                My Wedding Dress
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              2026 Viral App Brewery Pte Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
