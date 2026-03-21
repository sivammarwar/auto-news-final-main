'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HISTORY_CATEGORIES } from '@/lib/historyCategories';

interface TriggerLog {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

export default function SchedulerPanel() {
  const [triggering, setTriggering]     = useState(false);
  const [logs, setLogs]                 = useState<TriggerLog[]>([]);
  const [targetSubcat, setTargetSubcat] = useState('');

  const addLog = (message: string, type: TriggerLog['type'] = 'info') =>
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);

  const logColor = (t: TriggerLog['type']) =>
    t === 'success' ? 'text-green-400' : t === 'error' ? 'text-red-400' :
    t === 'warn' ? 'text-yellow-300' : 'text-gray-400';

  const triggerNow = async () => {
    setTriggering(true);
    setLogs([]);
    addLog('▶ Starting generation pipeline...', 'info');
    addLog('📋 Strategy: 1 article × 15 categories = 15 articles', 'info');

    try {
      const body: any = { manual: true };
      if (targetSubcat) body.subcategory = targetSubcat;

      addLog(
        targetSubcat
          ? `📂 Targeting: ${HISTORY_CATEGORIES[targetSubcat]?.label}`
          : '📂 Targeting: All 15 categories',
        'info'
      );

      const res = await fetch('/api/trigger-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        addLog(`❌ Failed: ${data.error ?? res.statusText}`, 'error');
        return;
      }

      addLog('', 'info');
      addLog(
        `✅ Done — ${data.total ?? 0} written · ${data.published ?? 0} published · ${data.drafts ?? 0} drafts · ${data.skipped ?? 0} skipped`,
        'success'
      );

      data.details?.forEach((d: any) => {
        const cat = HISTORY_CATEGORIES[d.subcategory];
        const type: TriggerLog['type'] =
          d.status.startsWith('published') ? 'success'
          : d.status === 'no_topics_in_pool' ? 'warn'
          : d.status.startsWith('error') || d.status.endsWith('_failed') ? 'error'
          : 'info';
        addLog(
          `  ${cat?.emoji ?? '📄'} ${d.title ? `"${d.title.substring(0, 50)}"` : `[${d.subcategory}]`} — ${d.status}`,
          type
        );
      });

    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`, 'error');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Card className="mb-6 p-5 border-2 border-amber-200 bg-amber-50/20">
      <h2 className="font-bold text-lg text-amber-900 mb-1 flex items-center gap-2">
        ⚡ Manual Generation
        <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
          15 categories × 1 article
        </span>
      </h2>
      <p className="text-xs text-amber-600 mb-4">
        Picks 1 unused topic from each category, writes 15 articles, auto-publishes those scoring ≥ 7.5 with 2+ images.
        GitHub Action runs this automatically at 2:00 PM IST daily.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={targetSubcat}
          onChange={e => setTargetSubcat(e.target.value)}
          disabled={triggering}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 disabled:opacity-50"
        >
          <option value="">All 15 categories (recommended)</option>
          {Object.entries(HISTORY_CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.emoji} {cat.label}</option>
          ))}
        </select>

        <Button
          onClick={triggerNow}
          disabled={triggering}
          className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-8 shrink-0"
        >
          {triggering ? '⏳ Generating...' : '▶ Run Now'}
        </Button>
      </div>

      {triggering && (
        <p className="text-xs text-amber-600 mt-2 text-center animate-pulse">
          ⏱ This takes 20–40 minutes. Keep this tab open.
        </p>
      )}

      {logs.length > 0 && (
        <div className="mt-4 bg-gray-950 rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed">
          {logs.map(l => (
            <div key={l.id} className={logColor(l.type)}>{l.message}</div>
          ))}
        </div>
      )}
    </Card>
  );
}