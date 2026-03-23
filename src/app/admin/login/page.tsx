'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔑 Login: Attempting login');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const expires = Date.now() + 24 * 60 * 60 * 1000;
        
        localStorage.setItem('admin_token', JSON.stringify({ 
          value: 'admin-' + Date.now(), 
          expires 
        }));
        localStorage.setItem('admin_password', password);
        
        console.log('🔑 Login: Success, redirecting');
        router.push('/admin');
      } else {
        setError('Incorrect password. Try again.');
        setPassword('');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Remove the mounted check - just render directly
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
      <h1 className="font-bold text-2xl tracking-tightest text-foreground" suppressHydrationWarning>
        Hidden <span className="font-mono text-[13px] text-muted-foreground tracking-[0.2em] uppercase align-middle ml-1">Facts</span>
      </h1>
        <p className="text-muted-foreground text-sm mt-1">Admin panel</p>
      </div>

      <Card className="w-full max-w-sm p-8">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full"
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold"
            disabled={loading || !password}
          >
            {loading ? 'Verifying...' : 'Login'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Session expires after 24 hours
        </p>
      </Card>
    </div>
  );
}