'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl font-semibold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 2026</p>

        <div className="prose prose-neutral max-w-none">
          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-foreground/80 leading-relaxed">
              By accessing or using My Wedding Dress (myweddingdress.app), operated by Viral App Brewery Pte Ltd,
              you agree to be bound by these Terms of Service. If you do not agree, do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">My Wedding Dress provides:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>AI-powered virtual wedding dress try-on</li>
              <li>Video generation of try-on results</li>
              <li>Wedding dress catalog browsing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">3. Account Registration</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>You must provide accurate information</li>
              <li>You are responsible for maintaining account security</li>
              <li>One account per person</li>
              <li>You must be at least 13 years old</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">4. Credit System & Pricing</h2>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Free Tier</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>2 credits per day (resets at midnight in your timezone)</li>
              <li>1 try-on costs 2 credits</li>
              <li>Video generation not available</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Quarterly Plan ($39.99/quarter)</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>400 credits per quarter</li>
              <li>Try-on: 2 credits each</li>
              <li>Video generation: 8 credits each</li>
              <li>Unused credits roll over (maximum 2x allocation)</li>
              <li>Cancel anytime</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Important</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Credits are non-refundable</li>
              <li>Subscription renews automatically</li>
              <li>You may cancel at any time via account settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">5. Acceptable Use</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Upload photos of others without their consent</li>
              <li>Use the service for commercial purposes without permission</li>
              <li>Attempt to bypass rate limits or abuse the system</li>
              <li>Reverse engineer or copy our technology</li>
              <li>Upload illegal, harmful, or inappropriate content</li>
              <li>Create multiple accounts to circumvent limits</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">6. Content Ownership</h2>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Your Content</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>You retain ownership of photos you upload</li>
              <li>You grant us a license to process your photos for the service</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Generated Content</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>You own the try-on images and videos generated from your photos</li>
              <li>You may use generated content for personal, non-commercial purposes</li>
              <li>Commercial use requires written permission</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Our Content</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Wedding dress images in our catalog are for try-on purposes only</li>
              <li>You may not redistribute catalog images</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">7. AI-Generated Content Disclaimer</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Try-on results are AI-generated approximations</li>
              <li>Results may not perfectly represent actual garments</li>
              <li>Colors, fit, and details may vary from reality</li>
              <li>We do not guarantee accuracy of AI outputs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">8. Payment Terms</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Payments processed securely by Stripe</li>
              <li>Prices in USD unless otherwise stated</li>
              <li>Subscription auto-renews until canceled</li>
              <li>No refunds for partial periods</li>
              <li>Promotional codes subject to terms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">9. Service Availability</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>We strive for 99.9% uptime</li>
              <li>We may perform maintenance with reasonable notice</li>
              <li>We are not liable for third-party service outages</li>
              <li>We reserve the right to modify or discontinue features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">10. Termination</h2>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">By You</h3>
            <p className="text-foreground/80 leading-relaxed">Cancel anytime via account settings</p>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">By Us</h3>
            <p className="text-foreground/80 leading-relaxed mb-2">We may terminate accounts that:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Violate these terms</li>
              <li>Engage in abusive behavior</li>
              <li>Attempt fraud or exploitation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">11. Limitation of Liability</h2>
            <p className="text-foreground/80 leading-relaxed uppercase text-sm">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2 mt-4">
              <li>Our liability is limited to the amount you paid us in the past 12 months</li>
              <li>We are not liable for indirect, incidental, or consequential damages</li>
              <li>We are not liable for third-party actions or service failures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">12. Indemnification</h2>
            <p className="text-foreground/80 leading-relaxed mb-2">
              You agree to indemnify us against claims arising from:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Your use of the service</li>
              <li>Your violation of these terms</li>
              <li>Your violation of third-party rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">13. Dispute Resolution</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Disputes will be resolved through binding arbitration</li>
              <li>Class action waiver applies</li>
              <li>Governing law: Singapore</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">14. Changes to Terms</h2>
            <p className="text-foreground/80 leading-relaxed">
              We may modify these terms with notice. Continued use constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">15. Contact</h2>
            <p className="text-foreground/80 leading-relaxed">
              Questions about these terms:{' '}
              <a href="mailto:fyn@viralappbrewery.com" className="text-primary hover:underline">
                fyn@viralappbrewery.com
              </a>
            </p>
            <p className="text-foreground/80 leading-relaxed mt-4">
              <strong>Viral App Brewery Pte Ltd</strong><br />
              Singapore
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            2026 Viral App Brewery Pte Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
        </div>
      </footer>
    </div>
  );
}
