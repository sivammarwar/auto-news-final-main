// Admin API helper with built-in authentication
export async function adminPost(action: string, payload: unknown, adminPassword: string) {
    if (!adminPassword) {
      console.error('❌ adminPost: No password provided');
      return { error: { message: 'Not authenticated - missing password' } };
    }
  
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword 
        },
        body: JSON.stringify({ action, payload }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`❌ adminPost failed: ${res.status}`, text);
        return { error: { message: `HTTP ${res.status}: ${text}` } };
      }
      
      return await res.json();
    } catch (err: any) {
      console.error('❌ adminPost error:', err);
      return { error: { message: err.message } };
    }
  }
  
  export async function adminGet(params: Record<string, string>, adminPassword: string) {
    if (!adminPassword) {
      console.error('❌ adminGet: No password provided');
      return { error: { message: 'Not authenticated - missing password' } };
    }
  
    const qs = new URLSearchParams(params).toString();
    const url = `/api/admin?${qs}`;
    
    try {
      const res = await fetch(url, {
        headers: { 'x-admin-password': adminPassword },
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`❌ adminGet failed: ${res.status}`, text);
        return { error: { message: `HTTP ${res.status}: ${text}` } };
      }
      
      return await res.json();
    } catch (err: any) {
      console.error('❌ adminGet error:', err);
      return { error: { message: err.message } };
    }
  }