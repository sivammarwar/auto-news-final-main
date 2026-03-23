import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('admin_token');
        const password = localStorage.getItem('admin_password');
        
        console.log('🔐 useAdminAuth - Token:', !!token);
        console.log('🔐 useAdminAuth - Password:', !!password);
        
        if (!token || !password) {
          setIsAuthenticated(false);
          setAdminPassword(null);
          setIsLoading(false);
          return;
        }
        
        const parsedToken = JSON.parse(token);
        const isValid = parsedToken.expires && parsedToken.expires > Date.now();
        
        console.log('🔐 useAdminAuth - Token valid:', isValid);
        
        if (isValid) {
          setIsAuthenticated(true);
          setAdminPassword(password);
        } else {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_password');
          setIsAuthenticated(false);
          setAdminPassword(null);
        }
      } catch (err) {
        console.error('🔐 useAdminAuth - Error:', err);
        setIsAuthenticated(false);
        setAdminPassword(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_password');
    setIsAuthenticated(false);
    setAdminPassword(null);
  };

  return { adminPassword, isLoading, isAuthenticated, logout };
}