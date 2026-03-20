'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HISTORY_CATEGORIES } from '@/lib/historyCategories';

function utcToIST(utcHour: number): string {
  const istMinutes = utcHour * 60 + 330;
  const h = Math.floor((istMinutes % 1440) / 60);
  const m = istMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${m.toString().padStart(2, '0')} ${period} IST`;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, utcHour) => ({
  utcHour,
  label: `${utcHour.toString().padStart(2, '0')}:00 UTC — ${utcToIST(utcHour)}`,
}));

interface ScheduleSettings {
  enabled:        boolean;
  hourUtc:        number;
  articlesPerCat: number;
  status:         string;
  lastRun:        string;
  nextRun:        string;
}

interface TriggerLog {
  id:      number;
  message: string;
  type:    'info' | 'success' | 'error' | 'warn';
}

export default function SchedulerPanel() {
  const [settings, setSettings] = useState<ScheduleSettings>({
    enabled: true, hourUtc: 2, articlesPerCat: 2,
    status: 'idle', lastRun: '', nextRun: '',
  });
  const [loading, setSaving]        = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [logs, setLogs]             = useState<TriggerLog[]>([]);
  const [targetSubcat, setTargetSubcat] = useState('');
  const [savedOk, setSavedOk]       = useState(false);

  const addLog = (message: string, type: TriggerLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
  };

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .like('key', 'schedule_%');
    if (!data) return;
    const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
    setSettings({
      enabled:        map['schedule_enabled']          === 'true',
      hourUtc:        parseInt(map['schedule_hour_utc']         ?? '2', 10),
      articlesPerCat: parseInt(map['schedule_articles_per_cat'] ?? '2', 10),
      status:         map['schedule_status']   ?? 'idle',
      lastRun:        map['schedule_last_run'] ?? '',
      nextRun:        map['schedule_next_run'] ?? '',
    });
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (settings.status !== 'running') return;
    const interval = setInterval(loadSettings, 30_000);
    return () => clearInterval(interval);
  }, [settings.status, loadSettings]);

  const toggleEnabled = async () => {
    const newEnabled = !settings.enabled;
    setSettings(s => ({ ...s, enabled: newEnabled }));
    await supabase.from('settings').upsert({
      key:        'schedule_enabled',
      value:      String(newEnabled),
      updated_at: new Date().toISOString(),
    });
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2000);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const rows = [
        { key: 'schedule_enabled',         value: String(settings.enabled) },
        { key: 'schedule_hour_utc',         value: String(settings.hourUtc) },
        { key: 'schedule_articles_per_cat', value: String(settings.articlesPerCat) },
      ];
      for (const row of rows) {
        await supabase.from('settings').upsert({ ...row, updated_at: new Date().toISOString() });
      }
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const triggerNow = async () => {
    setTriggering(true);
    setLogs([]);
    addLog('▶ Triggering generation pipeline...', 'info');
    try {
      const body: any = { manual: true, articlesPerRun: settings.articlesPerCat };
      if (targetSubcat) body.subcategory = targetSubcat;
      addLog(
        `Sending request${targetSubcat ? ` (subcategory: ${targetSubcat})` : ' (random subcategory)'}...`,
        'info'
      );
      const res = await fetch('/api/cron/generate-history', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(`❌ Failed: ${data.error ?? res.statusText}`, 'error');
        return;
      }
      addLog(
        `✅ Done — ${data.total ?? 0} written, ${data.published ?? 0} published, ${data.drafts ?? 0} drafts`,
        'success'
      );
      if (data.details?.length > 0) {
        data.details.forEach((d: any) => {
          const type: TriggerLog['type'] =
            d.status.startsWith('published') ? 'success'
            : d.status.startsWith('error') || d.status.endsWith('_failed') ? 'error'
            : 'info';
          addLog(
            `  · [${d.subcategory}] ${d.title ? `"${d.title.substring(0, 50)}"` : d.status} — ${d.status}`,
            type
          );
        });
      }
      await loadSettings();
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`, 'error');
    } finally {
      setTriggering(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const statusColor =
    settings.status === 'running' ? 'text-blue-600'
    : settings.status === 'error' ? 'text-red-600'
    : 'text-green-600';

  const logColor = (type: TriggerLog['type']) =>
    type === 'success' ? 'text-green-400'
    : type === 'error'  ? 'text-red-400'
    : type === 'warn'   ? 'text-yellow-300'
    : 'text-gray-400';

  return (
    <Card className="p-5 border-2 border-amber-200 bg-amber-50/20 mb-6">
      <h2 className="font-bold text-lg text-amber-900 mb-4 flex items-center gap-2">
        ⏰ Article Generation Schedule
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">

        {/* Stop / Resume */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Auto Generation
          </label>
          <button
            onClick={toggleEnabled}
            className={`w-full py-2 rounded-lg text-sm font-bold transition ${
              settings.enabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {settings.enabled ? '⏹ Stop Auto-Gen' : '▶ Resume Auto-Gen'}
          </button>
          <p className="text-[10px] text-gray-400 mt-1 text-center">
            {settings.enabled ? 'Click to pause for any duration' : 'Auto-gen is paused'}
          </p>
        </div>

        {/* Hour picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Run Time
          </label>
          <select
            value={settings.hourUtc}
            onChange={e => setSettings(s => ({ ...s, hourUtc: parseInt(e.target.value, 10) }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
          >
            {HOUR_OPTIONS.map(o => (
              <option key={o.utcHour} value={o.utcHour}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Articles per run */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Articles per Run
          </label>
          <select
            value={settings.articlesPerCat}
            onChange={e => setSettings(s => ({ ...s, articlesPerCat: parseInt(e.target.value, 10) }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} article{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {/* Save button */}
        <div className="flex items-end">
          <Button
            onClick={saveSettings}
            disabled={loading}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold"
          >
            {loading ? 'Saving...' : savedOk ? '✅ Saved' : 'Save Schedule'}
          </Button>
        </div>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 mb-5 p-3 bg-white rounded-lg border border-gray-100">
        <span>
          Status:{' '}
          <span className={`font-bold capitalize ${statusColor}`}>
            {settings.status === 'running' ? '⚡ Running...' : settings.status}
          </span>
        </span>
        <span>Last run: <span className="text-gray-700">{formatDate(settings.lastRun)}</span></span>
        <span>Next run: <span className="text-gray-700">{formatDate(settings.nextRun)}</span></span>
        <button onClick={loadSettings} className="text-amber-700 hover:underline ml-auto">
          ↻ Refresh
        </button>
      </div>

      {/* Manual trigger */}
      <div className="border-t border-amber-200 pt-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Manual Trigger
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={targetSubcat}
            onChange={e => setTargetSubcat(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
          >
            <option value="">Random subcategory</option>
            {Object.entries(HISTORY_CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.emoji} {cat.label}</option>
            ))}
          </select>
          <Button
            onClick={triggerNow}
            disabled={triggering || settings.status === 'running'}
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 shrink-0"
          >
            {triggering ? '⏳ Running...' : '▶ Run Now'}
          </Button>
        </div>
      </div>

      {/* Live log output */}
      {logs.length > 0 && (
        <div className="mt-4 bg-gray-950 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-xs leading-relaxed">
          {logs.map(l => (
            <div key={l.id} className={logColor(l.type)}>{l.message}</div>
          ))}
        </div>
      )}
    </Card>
  );
}