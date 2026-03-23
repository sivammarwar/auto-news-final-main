'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const raw = localStorage.getItem('admin_token');
        const pw = localStorage.getItem('admin_password');

        if (!raw || !pw) {
          router.push('/admin/login');
          setLoading(false);
          return;
        }

        const token = JSON.parse(raw);
        if (!token.expires || token.expires < Date.now()) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_password');
          router.push('/admin/login');
          setLoading(false);
          return;
        }

        setAdminPassword(pw);
      } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_password');
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_password');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <span className="font-mono text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!adminPassword) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 bg-gray-900 text-white px-4 sm:px-6 h-11 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight">📜 Hidden Facts</span>
          <span className="text-xs text-gray-400 hidden sm:inline">· Admin panel</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition"
        >
          Logout
        </button>
      </div>

      <AdminPanel adminPassword={adminPassword} />
    </div>
  );
}