// src/app/article/[slug]/loading.tsx
// Next.js shows this instantly while the article server component fetches data.
// Without this, the browser shows a blank white page during the load delay.
// With this, users see a skeleton that matches the article layout immediately.

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-6 animate-pulse">

          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-3 w-3 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>

          {/* Title skeleton */}
          <div className="space-y-3 mb-6">
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-8 bg-muted rounded w-5/6" />
            <div className="h-8 bg-muted rounded w-4/6" />
          </div>

          {/* Summary skeleton */}
          <div className="space-y-2 mb-6 border-l-4 border-muted pl-4">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-4/5" />
          </div>
        </div>

        {/* Hero image skeleton */}
        <div className="max-w-3xl mx-auto sm:px-6 mb-8">
          <div className="w-full aspect-video bg-muted animate-pulse sm:rounded-xl" />
        </div>

        {/* Body skeleton */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-11/12" />
              <div className="h-4 bg-muted rounded w-10/12" />
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}