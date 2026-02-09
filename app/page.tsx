'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { HeroCarousel } from '@/components/hero-carousel';
import {
  ArrowRight,
  Sparkles,
  Camera,
  Heart,
  LayoutGrid,
  Check,
  Star,
  Play,
  Menu,
  X,
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold text-foreground">
              My Wedding Dress
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
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
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">
                Try for Free
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2"
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
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link href="/signup">Try Free</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Centered Hero Content */}
          <div className="flex flex-col items-center text-center gap-6 mb-12">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground leading-tight text-balance max-w-4xl">
              Try 500+ designer wedding dresses
            </h1>

            {/* <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Try on 500+ designer wedding gowns virtually. See how each dress
              looks on you before visiting the boutique. Save time, reduce
              stress, find the one.
            </p> */}
          </div>

          {/* 3D Carousel */}
          <div className="relative">
            <HeroCarousel />
          </div>

          {/* CTA Buttons & Social Proof */}
          <div className="flex flex-col items-center gap-8 mt-12">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/try-on">
                  Start Trying On
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                <Play className="w-4 h-4" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Loved by <span className="font-semibold text-foreground">10,000+</span> brides
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Strip */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Featured dresses from leading bridal designers
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {['Vera Wang', 'Monique Lhuillier', 'Oscar de la Renta', 'Pronovias', 'Jenny Packham'].map(
              (brand) => (
                <span
                  key={brand}
                  className="font-serif text-lg text-muted-foreground/60"
                >
                  {brand}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
              Everything you need to find the one
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered platform makes wedding dress shopping effortless and
              enjoyable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
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

            {/* Feature 2 */}
            <div className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <LayoutGrid className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                Side-by-Side Compare
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Compare your favorite dresses side-by-side to make confident
                decisions. See all the details at once.
              </p>
            </div>

            {/* Feature 3 */}
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

          {/* Feature Image */}
          <div className="mt-16 rounded-3xl overflow-hidden bg-muted border border-border">
            <div className="relative aspect-[2/1]">
              <Image
                src="/feature-tryon.jpg"
                alt="Virtual try-on comparison feature"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
              Start in 3 simple steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Finding your dream dress has never been easier.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
                title: 'Save & Compare',
                description:
                  'Save your favorites and compare them side-by-side. Share with loved ones to get their opinions.',
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-7xl font-serif font-bold text-primary/10 mb-4">
                  {item.step}
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
              Brides love DressAI
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  'I tried on 50 dresses virtually before visiting the boutique. Walked in knowing exactly what I wanted!',
                name: 'Sarah M.',
                location: 'New York, NY',
              },
              {
                quote:
                  'The compare feature saved me so much time. I could finally see all my favorites next to each other.',
                name: 'Emily R.',
                location: 'Los Angeles, CA',
              },
              {
                quote:
                  'Found my dream dress in a style I never would have tried in store. This app changed everything.',
                name: 'Jessica L.',
                location: 'Chicago, IL',
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="p-8 rounded-3xl bg-card border border-border"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
              Beautifully You
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
                Try before you commit
              </p>
              <div className="mb-6">
                <span className="text-4xl font-semibold text-foreground">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  'Browse all 500+ dresses',
                  '1 try-on per day',
                  'Unlimited favorites',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/try-on">Start for free</Link>
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
                Find your dream dress
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
                  'Up to 200 dress try-ons',
                  'Up to 50 video animations',
                  'Unused allowance rolls over',
                  'Unlimited favorites',
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
                <Link href="/try-on">Get Started</Link>
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
            Join thousands of happy brides who found their dream gown with
            My Wedding Dress. Start your journey today.
          </p>
          <Button size="lg" className="gap-2" asChild>
            <Link href="/try-on">
              Start Trying On Now
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
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-semibold text-foreground">
                My Wedding Dress
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              2026 My Wedding Dress. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
