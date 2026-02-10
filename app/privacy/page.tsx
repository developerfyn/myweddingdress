'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
        <h1 className="font-serif text-4xl font-semibold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 2026</p>

        <div className="prose prose-neutral max-w-none">
          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-foreground/80 leading-relaxed">
              Viral App Brewery Pte Ltd ("we," "our," or "us") operates the website myweddingdress.app.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our virtual wedding dress try-on service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Account Information</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Email address (required for registration)</li>
              <li>Name (optional)</li>
              <li>Timezone (for billing calculations)</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Photos & Images</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Full-body photos you upload for virtual try-on</li>
              <li>AI-generated try-on result images</li>
              <li>AI-generated videos of try-on results</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Payment Information</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Processed securely by Stripe</li>
              <li>We store only your Stripe Customer ID, not your card details</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Usage Data</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Credit usage and transaction history</li>
              <li>Feature usage (try-ons, video generations)</li>
              <li>Cache and performance data</li>
            </ul>

            <h3 className="font-semibold text-lg text-foreground mt-6 mb-3">Technical Data</h3>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>IP address (for security and abuse prevention)</li>
              <li>Browser type and device information</li>
              <li>Cookies and session data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>To provide the virtual try-on service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To cache results and improve performance</li>
              <li>To prevent fraud and abuse</li>
              <li>To communicate service updates</li>
              <li>To provide customer support</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">4. Third-Party Services</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We use the following services to operate our platform:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-4 py-2 text-left font-semibold">Service</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Purpose</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Data Shared</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Retention</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr>
                    <td className="border border-border px-4 py-2 font-medium">Supabase</td>
                    <td className="border border-border px-4 py-2">Authentication, database, storage</td>
                    <td className="border border-border px-4 py-2">Account data, photos, usage logs</td>
                    <td className="border border-border px-4 py-2">Until account deletion</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 font-medium">Stripe</td>
                    <td className="border border-border px-4 py-2">Payment processing</td>
                    <td className="border border-border px-4 py-2">Email, payment method</td>
                    <td className="border border-border px-4 py-2">Per Stripe's policy</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 font-medium">FASHN.ai</td>
                    <td className="border border-border px-4 py-2">AI virtual try-on</td>
                    <td className="border border-border px-4 py-2">Photos (base64)</td>
                    <td className="border border-border px-4 py-2">60 minutes</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 font-medium">FAL.ai / Kling</td>
                    <td className="border border-border px-4 py-2">Video generation</td>
                    <td className="border border-border px-4 py-2">Try-on images</td>
                    <td className="border border-border px-4 py-2">24-72 hours</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 font-medium">PostHog</td>
                    <td className="border border-border px-4 py-2">Analytics</td>
                    <td className="border border-border px-4 py-2">Anonymous usage data</td>
                    <td className="border border-border px-4 py-2">Per PostHog policy</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 font-medium">Vercel</td>
                    <td className="border border-border px-4 py-2">Hosting</td>
                    <td className="border border-border px-4 py-2">Server logs</td>
                    <td className="border border-border px-4 py-2">Per Vercel policy</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">5. Data Retention</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li><strong>Try-on cache:</strong> 7 days (automatically deleted)</li>
              <li><strong>Your uploaded photos:</strong> Until you delete them</li>
              <li><strong>Account data:</strong> Until you delete your account</li>
              <li><strong>Usage logs:</strong> Retained for billing and support purposes</li>
              <li><strong>Payment records:</strong> As required by law (typically 7 years)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">6. Data Security</h2>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>All data transmitted via HTTPS encryption</li>
              <li>Photos stored in private storage buckets with signed URLs</li>
              <li>No direct access to storage paths (proxied for security)</li>
              <li>Rate limiting and abuse detection systems</li>
              <li>Row-level security on all database tables</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li><strong>Access</strong> your personal data</li>
              <li><strong>Delete</strong> your account and all associated data</li>
              <li><strong>Export</strong> your data upon request</li>
              <li><strong>Opt-out</strong> of marketing communications</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:fyn@viralappbrewery.com" className="text-primary hover:underline">
                fyn@viralappbrewery.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">8. Children's Privacy</h2>
            <p className="text-foreground/80 leading-relaxed">
              Our service is not intended for users under 13 years of age. We do not knowingly
              collect data from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">9. International Users</h2>
            <p className="text-foreground/80 leading-relaxed">
              Your data may be processed in the United States and Singapore. By using our service,
              you consent to this transfer.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">10. Changes to This Policy</h2>
            <p className="text-foreground/80 leading-relaxed">
              We may update this policy periodically. We will notify you of material changes via
              email or service notification.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">11. Contact Us</h2>
            <p className="text-foreground/80 leading-relaxed">
              For privacy inquiries:{' '}
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
