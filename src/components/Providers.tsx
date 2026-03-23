'use client';

// src/components/Providers.tsx
// All client-side providers live here so layout.tsx can stay a server component.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures a new QueryClient is created per-request on the server
  // and not shared between requests (avoids data leaking between users)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 minutes
        retry:     1,
      },
    },
  }));

  // Hide the SSR pre-render logo in layout.tsx once React has hydrated.
  // The CSS rule `body.hydrated [data-prerender-logo] { display: none }`
  // in globals.css removes it so only the real interactive header logo remains.
  useEffect(() => {
    document.body.classList.add('hydrated');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}