'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, MessageCircle, Bug, Briefcase } from 'lucide-react';

export default function ContactPage() {
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
        <h1 className="font-serif text-4xl font-semibold text-foreground mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-12">
          We'd love to hear from you! Whether you have questions, feedback, or need support, we're here to help.
        </p>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Email Support */}
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-xl font-semibold text-foreground mb-2">Email Support</h2>
            <p className="text-muted-foreground text-sm mb-4">
              For general inquiries and customer support
            </p>
            <a
              href="mailto:fyn@viralappbrewery.com"
              className="text-primary hover:underline font-medium"
            >
              fyn@viralappbrewery.com
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              Response time: Within 24-48 hours
            </p>
          </div>

          {/* Business Inquiries */}
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-xl font-semibold text-foreground mb-2">Business Inquiries</h2>
            <p className="text-muted-foreground text-sm mb-4">
              For partnerships, press, or commercial licensing
            </p>
            <a
              href="mailto:fyn@viralappbrewery.com"
              className="text-primary hover:underline font-medium"
            >
              fyn@viralappbrewery.com
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">How do I cancel my subscription?</h3>
              <p className="text-foreground/80 text-sm leading-relaxed">
                Go to Settings &gt; Subscription &gt; Cancel. Your access continues until the end of your billing period.
                You won't be charged again after cancellation.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">How do I delete my account?</h3>
              <p className="text-foreground/80 text-sm leading-relaxed">
                Contact us at{' '}
                <a href="mailto:fyn@viralappbrewery.com" className="text-primary hover:underline">
                  fyn@viralappbrewery.com
                </a>
                {' '}with "Account Deletion Request" in the subject line. We'll process your request within 7 days.
                All your data, including photos and try-on results, will be permanently deleted.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Why didn't my try-on work?</h3>
              <p className="text-foreground/80 text-sm leading-relaxed">
                For best results, upload a clear, full-body photo with good lighting. Front-facing poses with
                visible arms work best. Make sure the photo shows you from head to toe, and avoid busy backgrounds.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">How do I get a refund?</h3>
              <p className="text-foreground/80 text-sm leading-relaxed">
                Credits are non-refundable as stated in our Terms of Service. However, if you experience
                technical issues that prevent you from using the service, contact us and we'll work with
                you to resolve the problem or provide credit compensation.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Can I use my try-on photos commercially?</h3>
              <p className="text-foreground/80 text-sm leading-relaxed">
                You own the try-on images generated from your photos and can use them for personal purposes.
                For commercial use, please contact us for licensing arrangements.
              </p>
            </div>
          </div>
        </div>

        {/* Report a Bug */}
        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Bug className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-foreground mb-2">Report a Bug</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Found something broken? We appreciate your help in improving our service.
                Please include as much detail as possible, including screenshots if available.
              </p>
              <a
                href="mailto:fyn@viralappbrewery.com?subject=Bug Report"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-4 h-4" />
                Report a Bug
              </a>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="mt-16 pt-8 border-t border-border">
          <h2 className="font-serif text-xl font-semibold text-foreground mb-4">Company Information</h2>
          <div className="text-foreground/80">
            <p className="font-semibold">Viral App Brewery Pte Ltd</p>
            <p>Singapore</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 mt-12">
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
