'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HISTORY_CATEGORIES } from '@/lib/historyCategories';

// Every UTC hour mapped to its IST equivalent label
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, utcHour) => {
  const istMinutes = utcHour * 60 + 330;
  const h = Math.floor((istMinutes % 1440) / 60);
  const m = istMinutes % 60;
  const period  = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ist     = `${display}:${m.toString().padStart(2, '0')} ${period} IST`;
  return { utcHour, label: `${utcHour.toString().padStart(2, '0')}:00 UTC  =  ${ist}` };
});

const formatDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

function computeNextRun(hourUtc: number): string {
  const now  = new Date();
  const next = new Date();
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

interface ScheduleSettings {
  enabled: boolean; hourUtc: number; articlesPerCat: number;
  status: string; lastRun: string; nextRun: string;
}
interface BulkScheduleSettings {
  enabled: boolean; hourUtc: number;
  status: string; lastRun: string; nextRun: string;
}
interface TriggerLog {
  id: number; message: string; type: 'info' | 'success' | 'error' | 'warn';
}

export default function SchedulerPanel() {
  const savingRef     = useRef(false);
  const bulkSavingRef = useRef(false);

  const [settings, setSettings] = useState<ScheduleSettings>({
    enabled: true, hourUtc: 23, articlesPerCat: 2,
    status: 'idle', lastRun: '', nextRun: '',
  });
  const [saving, setSaving]             = useState(false);
  const [triggering, setTriggering]     = useState(false);
  const [logs, setLogs]                 = useState<TriggerLog[]>([]);
  const [targetSubcat, setTargetSubcat] = useState('');
  const [savedOk, setSavedOk]           = useState(false);

  const [bulk, setBulk] = useState<BulkScheduleSettings>({
    enabled: false, hourUtc: 3, status: 'idle', lastRun: '', nextRun: '',
  });
  const [bulkSaving, setBulkSaving]         = useState(false);
  const [bulkSavedOk, setBulkSavedOk]       = useState(false);
  const [bulkTriggering, setBulkTriggering] = useState(false);
  const [bulkLogs, setBulkLogs]             = useState<TriggerLog[]>([]);
  const bulkTimerRef                        = useRef<NodeJS.Timeout | null>(null);

  const addLog     = (message: string, type: TriggerLog['type'] = 'info') =>
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
  const addBulkLog = (message: string, type: TriggerLog['type'] = 'info') =>
    setBulkLogs(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .or('key.like.schedule_%,key.like.bulk_schedule_%');

    if (!data) return;
    const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));

    if (!savingRef.current) {
      setSettings(prev => ({
        enabled:        map['schedule_enabled'] === 'true',
        hourUtc:        parseInt(map['schedule_hour_utc']         ?? String(prev.hourUtc), 10),
        articlesPerCat: parseInt(map['schedule_articles_per_cat'] ?? String(prev.articlesPerCat), 10),
        status:         map['schedule_status']   ?? 'idle',
        lastRun:        map['schedule_last_run'] ?? '',
        nextRun:        map['schedule_next_run'] ?? '',
      }));
    }

    if (!bulkSavingRef.current) {
      setBulk(prev => ({
        enabled: map['bulk_schedule_enabled'] === 'true',
        hourUtc: parseInt(map['bulk_schedule_hour_utc'] ?? String(prev.hourUtc), 10),
        status:  map['bulk_schedule_status']   ?? 'idle',
        lastRun: map['bulk_schedule_last_run'] ?? '',
        nextRun: map['bulk_schedule_next_run'] ?? '',
      }));
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (settings.status !== 'running') return;
    const interval = setInterval(loadSettings, 30_000);
    return () => clearInterval(interval);
  }, [settings.status, loadSettings]);

  useEffect(() => {
    if (bulkTimerRef.current) clearInterval(bulkTimerRef.current);
    if (!bulk.enabled) return;
    bulkTimerRef.current = setInterval(async () => {
      const now = new Date();
      if (now.getUTCHours() === bulk.hourUtc && now.getUTCMinutes() === 0) {
        const lastRun = bulk.lastRun ? new Date(bulk.lastRun) : null;
        const alreadyRanToday = lastRun &&
          lastRun.getUTCFullYear() === now.getUTCFullYear() &&
          lastRun.getUTCMonth()    === now.getUTCMonth() &&
          lastRun.getUTCDate()     === now.getUTCDate();
        if (!alreadyRanToday) await runBulkGeneration(true);
      }
    }, 60_000);
    return () => { if (bulkTimerRef.current) clearInterval(bulkTimerRef.current); };
  }, [bulk.enabled, bulk.hourUtc, bulk.lastRun]);

  // ── Daily schedule actions ────────────────────────────────────────────────
  const toggleEnabled = async () => {
    const newEnabled = !settings.enabled;
    savingRef.current = true;
    setSettings(s => ({ ...s, enabled: newEnabled }));
    await supabase.from('settings').upsert({
      key: 'schedule_enabled', value: String(newEnabled), updated_at: new Date().toISOString(),
    });
    savingRef.current = false;
    setSavedOk(true); setTimeout(() => setSavedOk(false), 2000);
  };

  const saveSettings = async () => {
    setSaving(true); savingRef.current = true;
    const nextRun = computeNextRun(settings.hourUtc);
    try {
      for (const row of [
        { key: 'schedule_enabled',         value: String(settings.enabled) },
        { key: 'schedule_hour_utc',         value: String(settings.hourUtc) },
        { key: 'schedule_articles_per_cat', value: String(settings.articlesPerCat) },
        { key: 'schedule_next_run',         value: nextRun },
      ]) await supabase.from('settings').upsert({ ...row, updated_at: new Date().toISOString() });
      setSettings(s => ({ ...s, nextRun }));
      setSavedOk(true); setTimeout(() => setSavedOk(false), 2000);
    } finally { setSaving(false); savingRef.current = false; }
  };

  const triggerNow = async () => {
    setTriggering(true); setLogs([]);
    addLog('▶ Triggering generation pipeline...', 'info');
    try {
      const body: any = { manual: true, articlesPerRun: settings.articlesPerCat };
      if (targetSubcat) body.subcategory = targetSubcat;
      addLog(`Sending request${targetSubcat ? ` (subcategory: ${targetSubcat})` : ' (random subcategory)'}...`, 'info');
      const res = await fetch('/api/cron/generate-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { addLog(`❌ Failed: ${data.error ?? res.statusText}`, 'error'); return; }
      addLog(`✅ Done — ${data.total ?? 0} written, ${data.published ?? 0} published, ${data.drafts ?? 0} drafts`, 'success');
      data.details?.forEach((d: any) => {
        const type: TriggerLog['type'] =
          d.status.startsWith('published') ? 'success'
          : d.status.startsWith('error') || d.status.endsWith('_failed') ? 'error'
          : 'info';
        addLog(`  · [${d.subcategory}] ${d.title ? `"${d.title.substring(0, 50)}"` : d.status} — ${d.status}`, type);
      });
      await loadSettings();
    } catch (err: any) { addLog(`❌ Error: ${err.message}`, 'error'); }
    finally { setTriggering(false); }
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const toggleBulkEnabled = async () => {
    const newEnabled = !bulk.enabled;
    bulkSavingRef.current = true;
    setBulk(s => ({ ...s, enabled: newEnabled }));
    await supabase.from('settings').upsert({
      key: 'bulk_schedule_enabled', value: String(newEnabled), updated_at: new Date().toISOString(),
    });
    bulkSavingRef.current = false;
    setBulkSavedOk(true); setTimeout(() => setBulkSavedOk(false), 2000);
  };

  const saveBulkSettings = async () => {
    setBulkSaving(true); bulkSavingRef.current = true;
    const nextRun = computeNextRun(bulk.hourUtc);
    try {
      for (const row of [
        { key: 'bulk_schedule_enabled',  value: String(bulk.enabled) },
        { key: 'bulk_schedule_hour_utc', value: String(bulk.hourUtc) },
        { key: 'bulk_schedule_next_run', value: nextRun },
      ]) await supabase.from('settings').upsert({ ...row, updated_at: new Date().toISOString() });
      setBulk(s => ({ ...s, nextRun }));
      setBulkSavedOk(true); setTimeout(() => setBulkSavedOk(false), 2000);
    } finally { setBulkSaving(false); bulkSavingRef.current = false; }
  };

  const runBulkGeneration = async (isAuto = false) => {
    if (bulkTriggering || bulk.status === 'running') return;
    setBulkTriggering(true); setBulkLogs([]);
    addBulkLog(`${isAuto ? '⏰ Auto-triggered' : '▶ Manually triggered'} — All 15 categories bulk generation`, 'info');
    await supabase.from('settings').upsert({ key: 'bulk_schedule_status',   value: 'running',               updated_at: new Date().toISOString() });
    await supabase.from('settings').upsert({ key: 'bulk_schedule_last_run', value: new Date().toISOString(), updated_at: new Date().toISOString() });
    setBulk(s => ({ ...s, status: 'running', lastRun: new Date().toISOString() }));
    try {
      addBulkLog(`📡 Calling /api/generate-articles (all 15 categories × 1 articles)...`, 'info');
      const res = await fetch('/api/generate-articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`,
        },
        body: JSON.stringify({ articlesPerCategory: 2 }),
      });
      const data = await res.json();
      if (!res.ok) {
        addBulkLog(`❌ Failed: ${data.error ?? res.statusText}`, 'error');
        await supabase.from('settings').upsert({ key: 'bulk_schedule_status', value: 'error', updated_at: new Date().toISOString() });
        setBulk(s => ({ ...s, status: 'error' })); return;
      }
      addBulkLog(`✅ Complete — ${data.total ?? 0} written · ${data.published ?? 0} published · ${data.drafts ?? 0} drafts · ${data.skipped ?? 0} skipped`, 'success');
      data.details?.forEach((d: any) => {
        const cat = HISTORY_CATEGORIES[d.subcategory];
        const type: TriggerLog['type'] =
          d.status.startsWith('published') ? 'success'
          : d.status === 'no_topics_in_pool' ? 'warn'
          : d.status.startsWith('error') || d.status.endsWith('_failed') ? 'error'
          : 'info';
        addBulkLog(`  ${cat?.emoji ?? '📄'} [${d.subcategory}] ${d.title ? `"${d.title.substring(0, 45)}..."` : d.status} — ${d.status}`, type);
      });
      const nextRun = computeNextRun(bulk.hourUtc);
      await supabase.from('settings').upsert({ key: 'bulk_schedule_status',   value: 'idle',    updated_at: new Date().toISOString() });
      await supabase.from('settings').upsert({ key: 'bulk_schedule_next_run', value: nextRun,   updated_at: new Date().toISOString() });
      setBulk(s => ({ ...s, status: 'idle', nextRun }));
    } catch (err: any) {
      addBulkLog(`❌ Error: ${err.message}`, 'error');
      await supabase.from('settings').upsert({ key: 'bulk_schedule_status', value: 'error', updated_at: new Date().toISOString() });
      setBulk(s => ({ ...s, status: 'error' }));
    } finally { setBulkTriggering(false); }
  };

  const statusColor = (s: string) =>
    s === 'running' ? 'text-blue-600' : s === 'error' ? 'text-red-600' : 'text-green-600';
  const logColor = (t: TriggerLog['type']) =>
    t === 'success' ? 'text-green-400' : t === 'error' ? 'text-red-400' :
    t === 'warn' ? 'text-yellow-300' : 'text-gray-400';

  return (
    <div className="mb-6 space-y-4">

      {/* ── SECTION 1 — Daily scheduler ──────────────────────────────────── */}
      <Card className="p-5 border-2 border-amber-200 bg-amber-50/20">
        <h2 className="font-bold text-lg text-amber-900 mb-1 flex items-center gap-2">
          ⏰ Daily Article Generation Schedule
          <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">1 random subcategory/day</span>
        </h2>
        <p className="text-xs text-amber-600 mb-4">
          Select the UTC hour — the IST time is shown next to it so you always know what you're setting.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Auto Generation</label>
            <button
              onClick={toggleEnabled}
              className={`w-full py-2 rounded-lg text-sm font-bold transition ${
                settings.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {settings.enabled ? '⏹ Stop Auto-Gen' : '▶ Resume Auto-Gen'}
            </button>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              {settings.enabled ? 'Click to pause' : 'Auto-gen is paused'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Run Time</label>
            <select
              value={settings.hourUtc}
              onChange={e => setSettings(s => ({ ...s, hourUtc: parseInt(e.target.value, 10) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
            >
              {HOUR_OPTIONS.map(o => (
                <option key={o.utcHour} value={o.utcHour}>{o.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-amber-700 font-semibold mt-1 text-center">
              Currently set: {HOUR_OPTIONS.find(o => o.utcHour === settings.hourUtc)?.label}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Articles per Run</label>
            <select
              value={settings.articlesPerCat}
              onChange={e => setSettings(s => ({ ...s, articlesPerCat: parseInt(e.target.value, 10) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
            >
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} article{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold"
            >
              {saving ? 'Saving...' : savedOk ? '✅ Saved' : 'Save Schedule'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 mb-5 p-3 bg-white rounded-lg border border-gray-100">
          <span>Status: <span className={`font-bold capitalize ${statusColor(settings.status)}`}>{settings.status === 'running' ? '⚡ Running...' : settings.status}</span></span>
          <span>Last run: <span className="text-gray-700">{formatDate(settings.lastRun)}</span></span>
          <span>Next run: <span className="text-gray-700">{formatDate(settings.nextRun)}</span></span>
          <button onClick={loadSettings} className="text-amber-700 hover:underline ml-auto">↻ Refresh</button>
        </div>

        <div className="border-t border-amber-200 pt-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Manual Trigger</p>
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

        {logs.length > 0 && (
          <div className="mt-4 bg-gray-950 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-xs leading-relaxed">
            {logs.map(l => <div key={l.id} className={logColor(l.type)}>{l.message}</div>)}
          </div>
        )}
      </Card>

      {/* ── SECTION 2 — Bulk scheduler ───────────────────────────────────── */}
      <Card className="p-5 border-2 border-purple-200 bg-purple-50/20">
        <h2 className="font-bold text-lg text-purple-900 mb-1 flex items-center gap-2">
          🗂️ Bulk Generation Schedule
          <span className="text-xs font-normal text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">All 15 categories × 1 articles</span>
        </h2>
        <p className="text-xs text-purple-600 mb-4">Runs the full pipeline — picks 1 unused topics from each category, writes 15 articles total, marks topics as used.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Bulk Auto-Gen</label>
            <button
              onClick={toggleBulkEnabled}
              className={`w-full py-2 rounded-lg text-sm font-bold transition ${
                bulk.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {bulk.enabled ? '⏹ Disable Bulk' : '▶ Enable Bulk'}
            </button>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              {bulk.enabled ? 'Runs automatically daily' : 'Bulk auto-gen is off'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Run Time</label>
            <select
              value={bulk.hourUtc}
              onChange={e => setBulk(s => ({ ...s, hourUtc: parseInt(e.target.value, 10) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
            >
              {HOUR_OPTIONS.map(o => (
                <option key={o.utcHour} value={o.utcHour}>{o.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">💡 Set different from daily schedule to avoid conflicts</p>
          </div>

          <div className="flex items-end">
            <Button
              onClick={saveBulkSettings}
              disabled={bulkSaving}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold"
            >
              {bulkSaving ? 'Saving...' : bulkSavedOk ? '✅ Saved' : 'Save Bulk Schedule'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 mb-5 p-3 bg-white rounded-lg border border-gray-100">
          <span>Status: <span className={`font-bold capitalize ${statusColor(bulk.status)}`}>{bulk.status === 'running' ? '⚡ Running...' : bulk.status}</span></span>
          <span>Last run: <span className="text-gray-700">{formatDate(bulk.lastRun)}</span></span>
          <span>Next run: <span className="text-gray-700">{bulk.enabled ? formatDate(bulk.nextRun) : 'Disabled'}</span></span>
          <button onClick={loadSettings} className="text-purple-700 hover:underline ml-auto">↻ Refresh</button>
        </div>

        <div className="border-t border-purple-200 pt-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Manual Trigger — Run All 15 Categories Now</p>
          <Button
            onClick={() => runBulkGeneration(false)}
            disabled={bulkTriggering || bulk.status === 'running'}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3"
          >
            {bulkTriggering ? '⏳ Generating all 15 categories...' : '🗂️ Run Bulk Generation Now'}
          </Button>
          <p className="text-xs text-gray-400 mt-2 text-center">This will write up to 15 articles. Takes 20–40 minutes depending on Groq rate limits.</p>
        </div>

        {bulkLogs.length > 0 && (
          <div className="mt-4 bg-gray-950 rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed">
            {bulkLogs.map(l => <div key={l.id} className={logColor(l.type)}>{l.message}</div>)}
          </div>
        )}
      </Card>
    </div>
  );
}