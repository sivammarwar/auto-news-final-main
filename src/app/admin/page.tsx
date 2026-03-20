'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]                 = useState(true);
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('admin_token');
    if (!raw) {
      router.push('/admin/login');
      setLoading(false);
      return;
    }
    try {
      const token = JSON.parse(raw);
      if (!token.expires || token.expires < Date.now()) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('admin_token');
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="font-mono text-sm text-gray-400 animate-pulse">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin top bar */}
      <div className="sticky top-0 z-50 bg-gray-900 text-white px-4 sm:px-6 h-11 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight">
            📜 Signal History
          </span>
          <span className="text-xs text-gray-400 hidden sm:inline">
            · Admin panel
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition"
        >
          Logout
        </button>
      </div>

      <AdminPanel />
    </div>
  );
}