import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticleBySlug, blogArticles } from '@/lib/blog-data';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article Not Found | My Wedding Dress',
    };
  }

  return {
    title: `${article.title} | My Wedding Dress Blog`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.image],
    },
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function parseContent(content: string): string {
  // Convert markdown-style headers and formatting to HTML
  let html = content
    // Headers
    .replace(/^## (.+)$/gm, '<h2 class="font-serif text-2xl font-semibold text-foreground mt-10 mb-4">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="font-serif text-xl font-semibold text-foreground mt-8 mb-3">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italics
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Paragraphs (lines that aren't already HTML)
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.startsWith('<h') || paragraph.trim() === '') {
        return paragraph;
      }
      return `<p class="text-muted-foreground leading-relaxed mb-4">${paragraph}</p>`;
    })
    .join('\n');

  return html;
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Find related articles (same category, excluding current)
  const relatedArticles = blogArticles
    .filter((a) => a.category === article.category && a.slug !== article.slug)
    .slice(0, 2);

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

          <div className="hidden md:flex items-center gap-10">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/try-on"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Try On
            </Link>
            <Link
              href="/blog"
              className="text-sm text-foreground font-medium"
            >
              Blog
            </Link>
          </div>
        </nav>
      </header>

      {/* Article Header */}
      <article className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-6">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Category & Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="px-3 py-1 bg-primary/10 rounded-full text-primary font-medium">
              {article.category}
            </span>
            <span>{formatDate(article.publishedAt)}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.readingTime} min read
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B9D] to-[#C86DD7] flex items-center justify-center text-white font-medium text-sm">
              ET
            </div>
            <div>
              <p className="font-medium text-foreground">Editorial Team</p>
              <p className="text-sm text-muted-foreground">My Wedding Dress</p>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="max-w-4xl mx-auto px-6 mb-12">
          <div className="aspect-[16/9] relative rounded-2xl overflow-hidden">
            <Image
              src={article.image}
              alt={article.imageAlt}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6">
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: parseContent(article.content) }}
          />
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-8">
              More in {article.category}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group block bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <div className="aspect-[16/10] relative overflow-hidden">
                    <Image
                      src={related.image}
                      alt={related.imageAlt}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {related.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {related.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground mb-4">
            Ready to find your dress?
          </h2>
          <p className="text-muted-foreground mb-8">
            Try on 500+ designer wedding gowns virtually. See how each dress looks on you.
          </p>
          <Link
            href="/try-on"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Start Trying On
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
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
