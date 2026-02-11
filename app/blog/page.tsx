import Link from 'next/link';
import Image from 'next/image';
import { blogArticles, getAllCategories, type BlogArticle } from '@/lib/blog-data';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wedding Dress Blog | My Wedding Dress',
  description: 'Expert guides on wedding dress silhouettes, fabrics, shopping tips, and bridal fashion trends.',
};

function BlogCard({ article }: { article: BlogArticle }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
    >
      <div className="aspect-[16/10] relative overflow-hidden">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-foreground">
            {article.category}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
          {article.title}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{article.readingTime} min read</span>
          <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
            Read more <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CategorySection({ category, articles }: { category: string; articles: BlogArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="mb-16">
      <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
        {category}
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {articles.map((article) => (
          <BlogCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

export default function BlogPage() {
  const categories = getAllCategories();

  // Get featured article (most recent)
  const sortedArticles = [...blogArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const featuredArticle = sortedArticles[0];
  const remainingArticles = sortedArticles.slice(1);

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

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4">
            The Wedding Dress Guide
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Expert advice on silhouettes, fabrics, trends, and shopping—everything you need to find your perfect dress.
          </p>
        </div>
      </section>

      {/* Featured Article */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <Link
            href={`/blog/${featuredArticle.slug}`}
            className="group block bg-card rounded-3xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all"
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="aspect-[4/3] md:aspect-auto relative overflow-hidden">
                <Image
                  src={featuredArticle.image}
                  alt={featuredArticle.imageAlt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <span className="inline-block px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary mb-4 w-fit">
                  Featured
                </span>
                <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {featuredArticle.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {featuredArticle.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{featuredArticle.category}</span>
                  <span>·</span>
                  <span>{featuredArticle.readingTime} min read</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Articles by Category */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {categories.map((category) => {
            const categoryArticles = remainingArticles.filter(
              (article) => article.category === category
            );
            return (
              <CategorySection
                key={category}
                category={category}
                articles={categoryArticles}
              />
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground mb-4">
            Ready to start trying on dresses?
          </h2>
          <p className="text-muted-foreground mb-8">
            Put your new knowledge to use. Try on 500+ designer gowns virtually.
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
