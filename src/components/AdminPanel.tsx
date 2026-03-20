'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Trash2, Zap, RefreshCw, CheckSquare, Square, X } from 'lucide-react';
import {
  loadAllRegisteredKeys,
  loadCoveredTitles,
  reserveTopic,
  confirmTopic,
  releaseTopic,
  filterAvailableTopics,
} from '@/lib/topicRegistry';
import SchedulerPanel from '@/components/SchedulerPanel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Article {
  id: number;
  title: string;
  summary: string;
  raw_content?: string | null;
  category: string;
  subcategory?: string | null;
  source_name: string;
  score: number | null;
  is_published: boolean | null;
  is_draft: boolean | null;
  admin_notes?: string | null;
  era?: string | null;
  difficulty?: string | null;
}
interface ArticleImage {
  id: number;
  article_id?: number;
  image_url: string;
  alt_text?: string | null;
  photographer?: string | null;
  photographer_url?: string | null;
  image_source?: string | null;
  wiki_attribution?: string | null;
  wiki_license?: string | null;
  wiki_license_url?: string | null;
  position: number;
  width: number;
  height?: number | null;
  size_kb?: number | null;
}
interface GenLog {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'progress';
  ts: string;
}

// ════════════════════════════════════════════════════════════════════════════
// AUTHOR PERSONA
// ════════════════════════════════════════════════════════════════════════════
const AUTHOR = {
  name:    'Arjun Mehta',
  tagline: 'Senior Historian & Correspondent, Signal History',
  bio:
    `Arjun Mehta is a historian and investigative journalist with 11 years of experience ` +
    `covering world history, archaeology, and forgotten civilizations. ` +
    `He writes with a sharp, no-nonsense style — blunt, conversational, occasionally ` +
    `provocative, always grounded in verified historical record. ` +
    `He covers both the famous events everyone knows AND the hidden chapters that were ` +
    `deliberately erased or overlooked. He asks: "Why does this matter today?" and answers it. ` +
    `He uses short punchy sentences mixed with longer analytical ones. ` +
    `He never uses academic jargon without explaining it. He never says "it is worth noting". ` +
    `He calls history as it was. His articles are 100% original writing reconstructed from ` +
    `historical record — never copied from any book, article, or Wikipedia page. ` +
    `He ends every article with a sharp one-liner that sticks in the reader's mind.`,
};

// ════════════════════════════════════════════════════════════════════════════
// 15 HISTORY CATEGORIES — each with topic pools (known + hidden sides)
// ════════════════════════════════════════════════════════════════════════════
const HISTORY_CATEGORIES: Record<string, {
  label: string;
  emoji: string;
  era: string;
  topicPool: string[];
  imageQueries: string[];
}> = {
  'ancient-civilizations': {
    label: 'Ancient Civilizations',
    emoji: '🏛️',
    era: 'ancient',
    topicPool: [
      'the engineering genius behind the Egyptian pyramids that modern architects still cannot replicate',
      'the real reason Rome fell — not barbarians, but something far more internal and surprising',
      'the Mesopotamian city of Uruk — the world\'s first true metropolis 5000 years before New York',
      'the ancient Greek invention of democracy that was actually far more brutal than textbooks admit',
      'the hidden female pharaohs of Egypt that male successors tried to erase from history',
      'the Indus Valley Civilization\'s sewage system that outclassed Rome by 2000 years',
      'the Persian Empire\'s surprisingly tolerant policies that history books credit to others',
      'the real story of Cleopatra — polyglot strategist, not just a romantic figure',
      'the Minoan civilization of Crete whose sudden collapse baffles archaeologists to this day',
      'ancient China\'s Han Dynasty bureaucracy — the world\'s first civil service exam system',
    ],
    imageQueries: [
      'ancient ruins archaeology excavation',
      'Egyptian pyramids Giza desert',
      'ancient Greece Parthenon Athens',
      'Mesopotamia ancient ruins Iraq',
      'ancient Rome Colosseum ruins',
      'Indus Valley Mohenjo-daro ruins',
      'ancient civilization stone carving',
      'archaeological dig ancient artifacts',
    ],
  },
  'medieval-feudal': {
    label: 'Medieval & Feudal',
    emoji: '⚔️',
    era: 'medieval',
    topicPool: [
      'the Black Death\'s hidden silver lining — how the plague accidentally ended feudalism',
      'medieval knights: the brutal reality behind the romantic legend of chivalry',
      'the real Crusades — what actually happened when East met West in the Holy Land',
      'the Mongol Empire\'s postal system that was faster than anything Europe had for 500 more years',
      'the female rulers of medieval Europe who held power while history forgot their names',
      'the Islamic Golden Age — how Baghdad became the world\'s center of science when Europe was in darkness',
      'the hidden history of the medieval peasant revolts that almost toppled European kings',
      'the real Vlad the Impaler — brutal tyrant or misunderstood national hero?',
      'the Silk Road\'s medieval golden era — more than just trade, it was the internet of its day',
      'the Byzantine Empire\'s 1000-year survival strategy that historians rarely teach',
    ],
    imageQueries: [
      'medieval castle ruins stone fortress',
      'knights armor medieval sword',
      'medieval cathedral gothic architecture',
      'crusades middle ages historical',
      'medieval town village reconstruction',
      'Byzantine mosaic Constantinople',
      'Mongol warrior historical artwork',
      'medieval manuscript illuminated',
    ],
  },
  'age-of-exploration': {
    label: 'Age of Exploration',
    emoji: '🧭',
    era: 'early-modern',
    topicPool: [
      'the Chinese explorer Zheng He who reached Africa 70 years before Columbus reached America',
      'what Columbus actually found — and what he thought he found — in 1492',
      'the Polynesian navigators who crossed the Pacific using stars and wave patterns 1000 years before Europeans',
      'the brutal reality of the Portuguese spice trade routes that no travel brochure mentions',
      'Ibn Battuta — the medieval Moroccan traveler who covered more ground than Marco Polo',
      'the maps that preceded European exploration — and the cartographers the West prefers to forget',
      'the real story of Magellan\'s circumnavigation — including who actually finished it (not him)',
      'the Aztec and Inca empires\' own extensive trade networks before European contact',
      'how the Dutch East India Company became the world\'s first multinational corporation',
      'the hidden role of African navigators and coastal traders in shaping exploration routes',
    ],
    imageQueries: [
      'old sailing ship ocean historical',
      'antique map parchment exploration',
      'compass navigation maritime historical',
      'Portuguese caravel historic ship',
      'ancient trade route spice market',
      'explorer navigation stars ocean',
      'colonial era harbor port ships',
      'old world map cartography atlas',
    ],
  },
  'revolutions-politics': {
    label: 'Revolutions & Politics',
    emoji: '✊',
    era: 'modern',
    topicPool: [
      'what the French Revolution actually achieved — and what it destroyed — beyond the guillotine stories',
      'the American Revolution\'s dirty secret: many Founding Fathers owned slaves while writing about freedom',
      'the Russian Revolution\'s first weeks — when it looked like genuine liberation before it turned',
      'the Haitian Revolution — the only successful slave revolt in history that textbooks almost never teach',
      'how the 1848 revolutions across Europe all failed — and why that failure shaped the modern world',
      'the Mexican Revolution\'s Zapata and Villa — what they actually stood for versus the myth',
      'the Iranian Constitutional Revolution of 1906 — the forgotten democratic movement the West ignored',
      'how the Chinese Revolution of 1911 ended 2000 years of imperial rule almost overnight',
      'the Velvet Revolutions of 1989 — how the Soviet bloc collapsed in 6 months without a single major battle',
      'the real reasons behind the Arab Spring — and why Western media fundamentally misread it',
    ],
    imageQueries: [
      'revolution protest historical crowd',
      'French Revolution historical painting',
      'Bastille storming historical artwork',
      'political uprising streets historical',
      'independence movement historical photo',
      'revolution barricades streets historical',
      'political leaders historical meeting',
      'declaration independence historical document',
    ],
  },
  'world-wars-conflicts': {
    label: 'World Wars & Conflicts',
    emoji: '🎖️',
    era: 'modern',
    topicPool: [
      'the real trigger of WWI — not the assassination, but the 40-year alliance system that made it inevitable',
      'the Christmas Truce of 1914 — when soldiers on both sides stopped fighting for a day',
      'the Holocaust\'s lesser-known victims — the Roma, disabled, and Soviet POWs alongside Jewish communities',
      'the Pacific War\'s island hopping strategy — and the ordinary soldiers who bore the cost',
      'the Cold War proxy conflicts that killed millions while superpowers avoided direct confrontation',
      'the Korean War — still technically ongoing — the conflict the world agreed to forget',
      'the role of African and Asian soldiers in WWI and WWII that European history books minimize',
      'the Nanking Massacre — China\'s most traumatic WWII memory and Japan\'s continuing silence',
      'the Berlin Airlift — the Cold War standoff that was resolved without firing a single shot',
      'how WWII\'s ending in 1945 immediately planted the seeds of 50 years of Cold War',
    ],
    imageQueries: [
      'World War memorial cemetery soldiers',
      'World War trench warfare historical',
      'WWII military soldiers historical photo',
      'war memorial monument remembrance',
      'battlefield ruins war historical',
      'military aircraft WWII historical',
      'cold war Berlin wall historical',
      'war veterans soldiers historical portrait',
    ],
  },
  'colonial-imperial': {
    label: 'Colonial & Imperial',
    emoji: '🌐',
    era: 'modern',
    topicPool: [
      'the British Empire at its peak — 24% of the world\'s land surface controlled by an island nation',
      'the Belgian Congo genocide — King Leopold II\'s rubber terror that killed 10 million Africans',
      'India under the East India Company before it became the British Raj',
      'the Berlin Conference of 1884 — how European powers divided Africa in a room without a single African present',
      'the real cost of the transatlantic slave trade — numbers, routes, and the African kingdoms that participated',
      'how the Mughal Empire handled religious diversity compared to contemporary European intolerance',
      'the Ottoman Empire\'s millet system — a functioning pluralist society 400 years before modern multiculturalism',
      'the American colonial era in the Philippines — the forgotten 50-year occupation most Americans don\'t know',
      'how colonialism deliberately destroyed existing economies to create dependency',
      'the independence movements of the 1940s-60s — why 40+ nations got independence in just 20 years',
    ],
    imageQueries: [
      'colonial era architecture building',
      'empire historical map world',
      'colonial port harbor historical ships',
      'independence movement crowd historical',
      'imperial palace historical architecture',
      'colonial era document treaty historical',
      'African independence historical photo',
      'empire ruins archaeological site',
    ],
  },
  'human-rights-movements': {
    label: 'Human Rights Movements',
    emoji: '🕊️',
    era: 'modern',
    topicPool: [
      'the Abolitionist movement\'s hidden heroes — the freed slaves who drove the campaign, not just the white advocates',
      'the Suffragette movement\'s violent tactics that history sanitizes into peaceful marches',
      'Gandhi\'s Salt March — why a walk to the sea changed the political calculus of the British Empire',
      'the Montgomery Bus Boycott\'s 381 days — the economic strategy behind the moral cause',
      'the hidden history of disability rights — the longest civil rights struggle with the least coverage',
      'LGBTQ+ rights before the 20th century — the surprising tolerance (and persecution) across different cultures',
      'the labor movement\'s forgotten martyrs — the Triangle Shirtwaist fire and the rights it created',
      'apartheid\'s financial lifeline — the Western corporations that kept it running while condemning it publicly',
      'the UN Declaration of Human Rights 1948 — what was left out, and who fought to leave it out',
      'child labor: from common practice to criminal act — how the shift happened and how long it took',
    ],
    imageQueries: [
      'civil rights march protest historical',
      'suffragette women protest historical',
      'human rights demonstration historical',
      'Gandhi Salt March historical photo',
      'civil rights movement historical crowd',
      'abolition slavery historical monument',
      'labor movement workers historical strike',
      'peace protest march historical street',
    ],
  },
  'science-technology': {
    label: 'Science & Technology',
    emoji: '🔬',
    era: 'all',
    topicPool: [
      'the Baghdad Battery — a 2000-year-old object that may have been an actual electric cell',
      'Nikola Tesla\'s suppressed inventions and the corporate war that erased him from textbooks for decades',
      'the forgotten women of computing — Ada Lovelace, Grace Hopper, and the Hidden Figures of NASA',
      'ancient Greek Antikythera mechanism — a 2000-year-old analog computer that predates modern calculation by 1500 years',
      'the Arab scholars who preserved Greek science and added algebra, algorithms, and astronomy',
      'the industrial revolution\'s child labor — the human cost behind Britain\'s economic miracle',
      'the Manhattan Project\'s scientists who built the bomb and then spent decades trying to stop its spread',
      'Galileo vs the Church — the real story is more complex than science vs religion',
      'the Green Revolution\'s double edge — how it saved billions from starvation while creating new problems',
      'Charles Darwin\'s hidden years — the 20 years between his voyage and publication of On the Origin of Species',
    ],
    imageQueries: [
      'science laboratory historical vintage',
      'telescope observatory astronomy historical',
      'industrial revolution machinery historical',
      'ancient scientific instrument astrolabe',
      'early aviation Wright brothers historical',
      'scientific discovery laboratory equipment',
      'space exploration rocket launch NASA',
      'ancient clockwork mechanism gears',
    ],
  },
  'religion-philosophy': {
    label: 'Religion & Philosophy',
    emoji: '📿',
    era: 'all',
    topicPool: [
      'the Council of Nicaea 325 AD — how a political meeting decided what Christianity would officially believe',
      'Zoroastrianism\'s enormous influence on Judaism, Christianity, and Islam that few people acknowledge',
      'the Buddhist monasteries of ancient India that functioned as universities 1500 years before Oxford',
      'Socrates\'s trial and execution — the real political reasons behind the philosophical charges',
      'the Sufi tradition\'s profound influence on music, poetry, and tolerance across the Islamic world',
      'why the Spanish Inquisition was both worse and better than popular culture portrays it',
      'Confucianism as state ideology — how one philosopher\'s ethics ran China for 2000 years',
      'the Aztec religion\'s complex cosmology that had more in common with physics than superstition',
      'the Protestant Reformation\'s unintended consequences — capitalism, individualism, and the nation-state',
      'the historical Jesus vs the theological Christ — what historians actually know',
    ],
    imageQueries: [
      'ancient temple religious architecture',
      'philosopher ancient manuscript scroll',
      'cathedral interior gothic architecture',
      'religious ceremony ancient historical',
      'monastery ancient stone building',
      'sacred text ancient manuscript',
      'temple ruins archaeological site',
      'philosophy ancient Greek sculpture',
    ],
  },
  'cultural-social': {
    label: 'Cultural & Social',
    emoji: '🎭',
    era: 'all',
    topicPool: [
      'the history of fashion as political statement — from sumptuary laws to the suit jacket\'s military origins',
      'how the printing press didn\'t just spread literacy — it spread propaganda, heresy, and revolution',
      'the history of coffee houses — the original social media platform that powered the Enlightenment',
      'medieval food culture: what people actually ate (it wasn\'t all brown and grim)',
      'the history of public baths from Rome to the Ottoman hammam to Japanese onsen',
      'how the Renaissance was financed — the Medici bank and the economic engine behind the art',
      'the history of music notation — how humans went from oral tradition to written symphonies',
      'the real story of the samurai — their actual role in Japanese society vs the Hollywood version',
      'ancient Olympic Games vs modern — what was the same, what was dramatically different',
      'the history of language death — how thousands of languages disappeared and what was lost with them',
    ],
    imageQueries: [
      'cultural festival historical celebration',
      'ancient art museum artifact',
      'historical textile fashion costume',
      'ancient theater amphitheater ruins',
      'traditional music instrument historical',
      'cultural heritage craft artisan',
      'ancient market bazaar historical',
      'historical painting renaissance art museum',
    ],
  },
  'economic-trade': {
    label: 'Economic & Trade',
    emoji: '🏺',
    era: 'all',
    topicPool: [
      'the Silk Road\'s true scale — not just silk, but ideas, diseases, religions, and technologies',
      'how the Dutch Tulip Mania of 1637 became the world\'s first documented speculative bubble',
      'the history of banking — from Mesopotamian grain loans to the Medici\'s double-entry bookkeeping',
      'the Black Death\'s economic aftermath — how the plague actually raised wages for surviving workers',
      'the East India Company: the corporation that ruled a subcontinent with its own army and courts',
      'ancient Rome\'s remarkably modern economy — trade networks, inflation, and monetary crises',
      'how the trans-Saharan gold trade made Mali the wealthiest kingdom in the medieval world',
      'the history of debt — from ancient Sumer\'s clay tablets to modern sovereign debt crises',
      'the Hanseatic League — the medieval merchant alliance that dominated Northern European trade for 400 years',
      'how the opium trade funded the British Empire and deliberately addicted millions of Chinese',
    ],
    imageQueries: [
      'Silk Road ancient trade caravan',
      'ancient market trade spices bazaar',
      'historical coins currency ancient',
      'merchant ship trade historical port',
      'ancient ledger accounting book historical',
      'trade route map historical parchment',
      'economic center historical city ruins',
      'ancient gold treasure historical artifact',
    ],
  },
  'military-warfare': {
    label: 'Military & Warfare',
    emoji: '🗡️',
    era: 'all',
    topicPool: [
      'the Battle of Thermopylae: 300 Spartans vs Persia — what actually happened vs the myth',
      'Sun Tzu\'s Art of War: the strategies that still work 2500 years later, and the ones that don\'t',
      'the Mongol siege warfare techniques that made them almost unbeatable across three continents',
      'Napoleon\'s military genius vs Napoleon\'s catastrophic overconfidence — the same man, two stories',
      'the Zulu Army\'s tactics that defeated a professional British force at the Battle of Isandlwana',
      'medieval siege warfare — the engineering, psychology, and 3-year standoffs that shaped kingdoms',
      'espionage in WWII — the double agents, codebreakers, and deceptions that actually won the war',
      'the Peloponnesian War — Athens vs Sparta: the world\'s first great power conflict and its aftermath',
      'guerrilla warfare from ancient Parthia to Vietnam — why superpowers keep losing to insurgents',
      'the arms race in ancient times — from bronze swords to iron to the crossbow to the trebuchet',
    ],
    imageQueries: [
      'ancient battlefield historical warfare',
      'military armor weapons historical museum',
      'siege castle medieval warfare',
      'ancient warrior sword shield historical',
      'military strategy map historical war room',
      'battlefield monument memorial historical',
      'ancient fortification wall ruins',
      'historical military commander portrait',
    ],
  },
  'regional-history': {
    label: 'Regional History',
    emoji: '🗺️',
    era: 'all',
    topicPool: [
      'the Kingdom of Aksum — the African empire that converted to Christianity before Rome and minted its own gold coins',
      'pre-colonial Latin America\'s sophisticated agricultural terracing systems that still work today',
      'the history of Southeast Asia\'s Khmer Empire — Angkor Wat\'s builders and what happened to them',
      'medieval West Africa\'s Mali and Songhai empires — their universities, legal systems, and gold reserves',
      'Japan\'s Edo period isolation policy — how 250 years of sakoku shaped modern Japanese identity',
      'the Byzantine Empire\'s eastern survival after Rome\'s fall — 1000 more years of Roman civilization',
      'the Mughal Empire at its peak under Akbar — religious tolerance, arts, and architecture',
      'Central Asia\'s forgotten role as the world\'s crossroads — the empires that rose and fell in the steppe',
      'Australia\'s 60,000-year Aboriginal history — the world\'s oldest continuous civilization',
      'the Aztec capital Tenochtitlan — the city that was larger than London when Cortés arrived',
    ],
    imageQueries: [
      'ancient Africa kingdom ruins historical',
      'Angkor Wat Cambodia temple ruins',
      'Mughal architecture India historical',
      'ancient Americas ruins civilization',
      'African historical architecture monument',
      'regional heritage temple ancient',
      'ancient city ruins excavation',
      'cultural heritage world site landmark',
    ],
  },
  'archaeology-mysteries': {
    label: 'Archaeology & Mysteries',
    emoji: '🔍',
    era: 'all',
    topicPool: [
      'Göbekli Tepe — the 12,000-year-old temple complex that rewrites the history of civilization',
      'the Nazca Lines of Peru — what we know, what we don\'t, and why aliens are not the answer',
      'the mystery of the Bronze Age Collapse — how a dozen civilizations fell simultaneously around 1200 BC',
      'Pompeii\'s preserved city — what daily Roman life actually looked like frozen in ash',
      'the Voynich Manuscript — an undeciphered book from the 15th century that has beaten every cryptanalyst',
      'Easter Island\'s moai — the real (and surprising) story behind the statues and the population collapse',
      'the Lost City of Z — Colonel Fawcett\'s obsession and what archaeologists actually found in the Amazon',
      'Çatalhöyük — the 9000-year-old egalitarian city with no streets, no rulers, and no hierarchy',
      'the Antikythera shipwreck — the archaeological dive that revealed a 2000-year-old analog computer',
      'Stonehenge\'s real purpose — what 50 years of new archaeology has actually told us',
    ],
    imageQueries: [
      'archaeological excavation dig site ruins',
      'ancient mystery ruins stone circle',
      'archaeological artifact museum display',
      'ancient ruins archaeological site',
      'Stonehenge mystery stone ancient',
      'Pompeii ruins archaeological site',
      'ancient cave painting archaeology',
      'lost city ruins jungle discovery',
    ],
  },
  'famous-figures': {
    label: 'Famous Figures & Leaders',
    emoji: '👑',
    era: 'all',
    topicPool: [
      'Alexander the Great\'s 10-year campaign — the logistics, the battles, and the man behind the myth',
      'Queen Elizabeth I\'s political genius — how a woman survived in a world built to exclude her',
      'Genghis Khan: mass murderer or the man who created the first free-trade zone across Asia?',
      'Marie Curie\'s double Nobel Prize — and the scientific establishment\'s relentless attempt to sideline her',
      'Abraham Lincoln\'s complex, evolving views on race that neither side of modern politics wants to quote accurately',
      'Suleiman the Magnificent — the Ottoman Sultan who nearly conquered Vienna and built a legal code',
      'Harriet Tubman: not just the Underground Railroad — her role as a Union spy during the Civil War',
      'Mao Zedong\'s economic catastrophes — the Great Leap Forward\'s death toll that China still does not officially acknowledge',
      'Julius Caesar: the politician who used military glory to seize power, then paid for it',
      'Nikola Tesla vs Thomas Edison — the current war and what it actually tells us about how innovation works',
    ],
    imageQueries: [
      'historical portrait leader ancient',
      'historical figure sculpture monument',
      'famous leader historical portrait museum',
      'ancient ruler emperor historical artwork',
      'historical biography portrait painting',
      'leader monument memorial historical',
      'ancient king queen historical sculpture',
      'famous historical figure bust museum',
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════════════
const BATCH_SIZE             = 10;
const BATCH_PAUSE_MS         = 5 * 60 * 1000;
const INTER_ARTICLE_PAUSE_MS = 8_000;
const GROQ_TIMEOUT_MS        = 40_000;
const MAX_RETRIES            = 5;
const ARTICLES_PER_CATEGORY  = 2;   // 2 per category × 15 = 30 articles per run
const AUTO_PUBLISH_SCORE     = 7.5;
const TARGET_IMAGES          = 6;
const MIN_IMAGES_TO_PUBLISH  = 2;
const IMAGE_MIN_WIDTH        = 800;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nowTS  = () => new Date().toLocaleTimeString('en-IN', { hour12: false });
const sleep  = (ms: number) => new Promise(r => setTimeout(r, ms));
const clamp  = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// ─── Groq API with key rotation ───────────────────────────────────────────────
async function groqRequest(
  key: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  label: string,
  log: (m: string, t: GenLog['type']) => void,
  allKeys?: string[],
  keyExhaustedRef?: Record<number, number>,
  keyIndexRef?: { value: number },
  pipelineSignal?: AbortSignal
): Promise<string | null> {
  const keys      = allKeys ?? [key];
  const exhausted = keyExhaustedRef ?? {};
  const idxRef    = keyIndexRef ?? { value: 0 };
  const maxTotal  = MAX_RETRIES * keys.length;

  for (let attempt = 1; attempt <= maxTotal; attempt++) {
    if (pipelineSignal?.aborted) return null;

    const now = Date.now();
    for (let i = 0; i < keys.length; i++) {
      const idx = (idxRef.value + i) % keys.length;
      if (!exhausted[idx] || exhausted[idx] < now) { idxRef.value = idx; break; }
    }
    const activeKey = keys[idxRef.value];
    const keyLabel  = keys.length > 1 ? ` [key#${idxRef.value + 1}]` : '';

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), GROQ_TIMEOUT_MS);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens, temperature: 0.75 }),
      });
      clearTimeout(t);

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        const errMsg: string = body?.error?.message ?? '';
        const isTPD = errMsg.includes('tokens per day') || errMsg.includes('TPD');
        if (isTPD) {
          log(`🔴 [${label}]${keyLabel} Daily limit hit — rotating key`, 'warn');
          exhausted[idxRef.value] = Date.now() + 24 * 60 * 60 * 1000;
          if (keys.length === 1) await sleep(60_000);
          continue;
        }
        const ra = parseInt(res.headers.get('retry-after') ?? '0', 10);
        const waitMs = Math.max(ra * 1000, 62_000) + (attempt * 2_000);
        log(`⏳ [${label}]${keyLabel} RPM limit — waiting ${Math.round(waitMs / 1000)}s`, 'warn');
        await sleep(waitMs);
        continue;
      }
      if (!res.ok) {
        log(`⚠️ [${label}]${keyLabel} HTTP ${res.status} — attempt ${attempt}`, 'warn');
        await sleep(6000 * Math.ceil(attempt / keys.length));
        continue;
      }
      clearTimeout(t);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim() ?? null;
      if (!text) { log(`⚠️ [${label}] Empty response — attempt ${attempt}`, 'warn'); await sleep(3000); continue; }
      return text;
    } catch (e: any) {
      clearTimeout(t);
      const msg = e?.name === 'AbortError' ? `Timeout after ${GROQ_TIMEOUT_MS / 1000}s` : (e?.message ?? 'unknown error');
      log(`⚠️ [${label}]${keyLabel} ${msg} — attempt ${attempt}`, 'warn');
      await sleep(4000 * Math.ceil(attempt / keys.length));
    }
  }
  log(`✗ [${label}] All keys and retries exhausted`, 'error');
  return null;
}

// ─── Robust JSON extractor ────────────────────────────────────────────────────
function extractJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^`{1,3}(?:json)?\s*/i, '').replace(/\s*`{1,3}\s*$/g, '').trim();

  function fixControlChars(s: string): string {
    const out: string[] = [];
    let inStr = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]; const prev = i > 0 ? s[i - 1] : '';
      if (ch === '"' && prev !== '\\') inStr = !inStr;
      if (inStr && ch === '\n') { out.push('\\n'); continue; }
      if (inStr && ch === '\r') { out.push('\\r'); continue; }
      if (inStr && ch === '\t') { out.push('\\t'); continue; }
      out.push(ch);
    }
    return out.join('');
  }

  const attempts = [cleaned, fixControlChars(cleaned)];
  const objM = cleaned.match(/\{[\s\S]*\}/);
  if (objM) attempts.push(objM[0], fixControlChars(objM[0]));

  for (const attempt of attempts) {
    try { return JSON.parse(attempt) as T; } catch { /* try next */ }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// IMAGE HANDLING
// ════════════════════════════════════════════════════════════════════════════
const _usedPexelsIds = new Set<string>();
const _usedWikiIds   = new Set<string>();
const _pexelsPageMap = new Map<string, number>();

function getNextPexelsPage(query: string): number {
  const current = _pexelsPageMap.get(query) ?? 1;
  _pexelsPageMap.set(query, current >= 15 ? 1 : current + 1);
  return current;
}

function clearImageCache() {
  _usedPexelsIds.clear();
  _usedWikiIds.clear();
  _pexelsPageMap.clear();
}

function isFreeWikimediaLicense(license: string): boolean {
  if (!license) return false;
  const free = ['cc0', 'cc-by', 'cc by', 'public domain', 'pd', 'cc-sa', 'cc by-sa', 'attribution'];
  return free.some(f => license.toLowerCase().includes(f));
}
function stripHtml(html: string): string {
  return (html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
}

interface HybridPhoto {
  id: string; url: string; alt: string; width: number; height: number;
  source: 'wikimedia' | 'pexels';
  photographer?: string; photographerUrl?: string;
  wikiAttribution?: string; wikiLicense?: string; wikiLicenseUrl?: string;
}

async function fetchPexels(key: string, query: string, count = 2): Promise<HybridPhoto[]> {
  const results: HybridPhoto[] = [];
  const page    = getNextPexelsPage(query);
  const perPage = Math.min(count * 5, 25);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape`,
      { signal: ctrl.signal, headers: { Authorization: key } }
    );
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    for (const p of (data.photos ?? [])) {
      if (results.length >= count) break;
      if (p.width < IMAGE_MIN_WIDTH) continue;
      const pid = `pexels_${p.id}`;
      if (_usedPexelsIds.has(pid)) continue;
      results.push({
        id: pid, url: p.src.large2x || p.src.large, alt: p.alt || query,
        width: p.width, height: p.height, source: 'pexels',
        photographer: p.photographer ?? null, photographerUrl: p.photographer_url ?? null,
      });
    }
  } catch { /* skip */ }
  return results;
}

async function fetchWikimedia(searchTerm: string, count = 2): Promise<HybridPhoto[]> {
  const photos: HybridPhoto[] = [];
  const WIKI_API = 'https://en.wikipedia.org/w/api.php';
  try {
    const ctrl1 = new AbortController(); setTimeout(() => ctrl1.abort(), 8000);
    const sr = await fetch(`${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=${count * 3}&format=json&origin=*`, { signal: ctrl1.signal });
    if (!sr.ok) return photos;
    const sd = await sr.json();
    for (const result of (sd?.query?.search ?? []).slice(0, count * 2)) {
      if (photos.length >= count) break;
      if (!result.title?.startsWith('File:')) continue;
      const ctrl2 = new AbortController(); setTimeout(() => ctrl2.abort(), 6000);
      const ir = await fetch(`${WIKI_API}?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&format=json&origin=*`, { signal: ctrl2.signal });
      if (!ir.ok) continue;
      const id = await ir.json();
      for (const page of Object.values(id?.query?.pages ?? {}) as any[]) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) continue;
        if ((info.thumbwidth || info.width) < IMAGE_MIN_WIDTH) continue;
        const license = info.extmetadata?.LicenseShortName?.value ?? '';
        if (!isFreeWikimediaLicense(license)) continue;
        const wid = `wiki_${page.pageid}`;
        if (_usedWikiIds.has(wid)) continue;
        photos.push({
          id: wid, url: info.thumburl || info.url,
          alt: stripHtml(info.extmetadata?.ImageDescription?.value ?? '') || `${searchTerm} — Wikimedia Commons`,
          width: info.thumbwidth || info.width, height: info.thumbheight || info.height, source: 'wikimedia',
          wikiAttribution: stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Wikimedia Commons contributor',
          wikiLicense: license, wikiLicenseUrl: info.extmetadata?.LicenseUrl?.value ?? '',
        });
        if (photos.length >= count) break;
      }
      await sleep(200);
    }
  } catch { /* skip */ }
  return photos;
}

async function fetchAndSaveImages(
  pexelsKey: string, articleId: number, title: string,
  subcategory: string, imageQueries: string[],
  log: (m: string, t: GenLog['type']) => void
): Promise<number> {
  const catConfig = HISTORY_CATEGORIES[subcategory];
  const allPhotos: HybridPhoto[] = [];
  const seen = new Set<string>();

  const add = (photos: HybridPhoto[]) => {
    photos.forEach(p => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        allPhotos.push(p);
        if (p.source === 'pexels')    _usedPexelsIds.add(p.id);
        if (p.source === 'wikimedia') _usedWikiIds.add(p.id);
      }
    });
  };

  // 1. AI-generated queries first
  for (const q of imageQueries.slice(0, 3)) {
    if (allPhotos.length >= TARGET_IMAGES) break;
    add(await fetchPexels(pexelsKey, q, 2));
    await sleep(300);
  }

  // 2. Wikimedia for historical accuracy
  if (allPhotos.length < TARGET_IMAGES) {
    const wikiQuery = imageQueries[0] ?? catConfig?.imageQueries[0] ?? 'ancient history ruins';
    add(await fetchWikimedia(wikiQuery, 3));
    await sleep(300);
  }

  // 3. Category fallbacks
  if (allPhotos.length < TARGET_IMAGES && catConfig) {
    for (const q of catConfig.imageQueries) {
      if (allPhotos.length >= TARGET_IMAGES) break;
      add(await fetchPexels(pexelsKey, q, 2));
      await sleep(300);
    }
  }

  if (allPhotos.length === 0) { log(`    ✗ No images found for "${title}"`, 'error'); return 0; }

  const toSave = allPhotos.slice(0, TARGET_IMAGES);
  const imageRows = toSave.map((photo, i) => ({
    article_id: articleId, image_url: photo.url, alt_text: photo.alt || title,
    position: i, width: photo.width || 1200, height: photo.height || 800, size_kb: 0,
    photographer: photo.photographer ?? null, photographer_url: photo.photographerUrl ?? null,
    image_source: photo.source,
    wiki_attribution: photo.wikiAttribution ?? null,
    wiki_license: photo.wikiLicense ?? null,
    wiki_license_url: photo.wikiLicenseUrl ?? null,
  }));

  const { error } = await supabase.from('article_images').insert(imageRows);
  if (error) { log(`    ✗ Image save error: ${error.message}`, 'error'); return 0; }
  await supabase.from('articles').update({ image_url: imageRows[0].image_url }).eq('id', articleId);
  log(`    ✅ ${toSave.length} images saved`, 'success');
  return toSave.length;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [articles, setArticles]               = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [images, setImages]                   = useState<ArticleImage[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [generating, setGenerating]           = useState(false);
  const [refetchingImages, setRefetchingImages] = useState(false);
  const [genLogs, setGenLogs]                 = useState<GenLog[]>([]);
  const [genDone, setGenDone]                 = useState(0);
  const [genTotal, setGenTotal]               = useState(0);
  const [batchInfo, setBatchInfo]             = useState('');
  const [adminNotes, setAdminNotes]           = useState('');
  const [filter, setFilter]                   = useState<'draft' | 'published' | 'all'>('draft');
  const [filterCat, setFilterCat]             = useState<string>('all');
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState<string | null>(null);
  const [selectMode, setSelectMode]           = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<number>>(new Set());
  const [deleting, setDeleting]               = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const stopRef         = useRef(false);
  const abortRef        = useRef<AbortController | null>(null);

  useEffect(() => { fetchArticles(); }, [filter, filterCat]);
  useEffect(() => {
    const c = logContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [genLogs]);

  const addLog = useCallback((message: string, type: GenLog['type'] = 'info') => {
    setGenLogs(prev => [...prev.slice(-400), { id: Date.now() + Math.random(), message, type, ts: nowTS() }]);
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let q = supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (filter === 'draft')     q = q.eq('is_draft', true);
      if (filter === 'published') q = q.eq('is_published', true);
      if (filterCat !== 'all')    q = q.eq('subcategory', filterCat);
      const { data, error: e } = await q.limit(200);
      if (e) throw e;
      setArticles(data ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const selectArticle = async (article: Article) => {
    if (selectMode) return;
    setSelectedArticle(article);
    setAdminNotes(article.admin_notes ?? '');
    setError(null); setSuccess(null);
    try {
      const { data, error: e } = await supabase
        .from('article_images').select('*').eq('article_id', article.id).order('position');
      if (e) throw e;
      setImages(data ?? []);
    } catch (e: any) { setError(e.message); }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const deleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} article(s)? Cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = [...selectedIds];
      await supabase.from('article_images').delete().in('article_id', ids);
      const { error: e } = await supabase.from('articles').delete().in('id', ids);
      if (e) throw e;
      if (selectedArticle && selectedIds.has(selectedArticle.id)) { setSelectedArticle(null); setImages([]); }
      setSelectedIds(new Set()); setSelectMode(false);
      setSuccess(`✅ Deleted ${ids.length} article(s).`);
      await fetchArticles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  };

  // ════════════════════════════════════════════════════════════════════════
  // MAIN HISTORY GENERATION PIPELINE
  // ════════════════════════════════════════════════════════════════════════
  const handleGenerate = async () => {
    const groqKeys: string[] = [
      process.env.NEXT_PUBLIC_GROQ_API_KEY,
      process.env.NEXT_PUBLIC_GROQ_API_KEY_2,
      process.env.NEXT_PUBLIC_GROQ_API_KEY_3,
    ].filter(Boolean) as string[];
    const pexelsKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY as string | undefined;

    if (groqKeys.length === 0) { setError('Missing NEXT_PUBLIC_GROQ_API_KEY'); return; }
    if (!pexelsKey)            { setError('Missing NEXT_PUBLIC_PEXELS_API_KEY'); return; }

    setGenerating(true);
    setError(null); setSuccess(null);
    setGenLogs([]); setGenDone(0);
    setBatchInfo(''); stopRef.current = false;
    abortRef.current = new AbortController();
    clearImageCache();

    const log = addLog;
    const keyIndexRef    = { value: 0 };
    const keyExhausted: Record<number, number> = {};
    const categoryKeys   = Object.keys(HISTORY_CATEGORIES);
    const totalArticles  = categoryKeys.length * ARTICLES_PER_CATEGORY;
    setGenTotal(totalArticles);

    log(`🏛️  Starting HISTORY pipeline — ${totalArticles} articles across ${categoryKeys.length} categories`, 'info');
    log(`✍️  Author: ${AUTHOR.name} | 🤖 Groq llama-3.3-70b | 🖼 Pexels + Wikimedia | Auto-publish: score ≥ ${AUTO_PUBLISH_SCORE}`, 'info');
    log(`📚 Coverage: BOTH well-known history AND hidden/overlooked history`, 'info');
    log(`🔒 Deduplication: topic registry (100% — DB-level UNIQUE constraint)`, 'info');

    // ── Load registry in ONE query for all 15 subcategories ─────────────────
    let registeredKeys: Record<string, Set<string>> = {};
    try {
      registeredKeys = await loadAllRegisteredKeys();
      const totalRegistered = Object.values(registeredKeys).reduce((s, v) => s + v.size, 0);
      log(`✅ Registry loaded — ${totalRegistered} topics already covered across all subcategories`, 'success');
    } catch { log('⚠ Could not load registry — dedup may be incomplete', 'warn'); }

    let grandTotal = 0; let autoPublished = 0; let globalIdx = 0;

    try {
      for (let ci = 0; ci < categoryKeys.length; ci++) {
        if (stopRef.current) { log('⛔ Stopped.', 'error'); break; }

        const subcatKey = categoryKeys[ci];
        const catConfig = HISTORY_CATEGORIES[subcatKey];
        const myKeys    = registeredKeys[subcatKey] ?? new Set<string>();

        log(`\n━━━ [${ci + 1}/${categoryKeys.length}] ${catConfig.emoji} ${catConfig.label.toUpperCase()} ━━━`, 'info');
        log(`  📋 ${myKeys.size} topics already covered in this subcategory`, 'info');

        // ── Filter topic pool through registry ───────────────────────────
        const availableTopics = filterAvailableTopics(catConfig.topicPool, myKeys);
        log(`  ✅ ${availableTopics.length} / ${catConfig.topicPool.length} pool topics still available`, 'info');

        // If pool exhausted, log clearly and skip (no silent rotation)
        if (availableTopics.length === 0) {
          log(`  ⏭ Pool fully covered for ${catConfig.label} — skipping (add more topics to the pool)`, 'warn');
          globalIdx += ARTICLES_PER_CATEGORY;
          setGenDone(d => d + ARTICLES_PER_CATEGORY);
          continue;
        }

        // Load covered titles for this subcategory to pass to Groq prompt
        const coveredTitles = await loadCoveredTitles(subcatKey, 30);

        const selectedTopics = availableTopics.slice(0, ARTICLES_PER_CATEGORY);

        for (let ti = 0; ti < selectedTopics.length; ti++) {
          if (stopRef.current) { log('⛔ Stopped.', 'error'); break; }

          globalIdx++;
          const topic = selectedTopics[ti];

          // ── Reserve topic in registry BEFORE writing ─────────────────
          // If another run reserved this exact topic concurrently, skip it.
          const { ok: reserved, key: topicKey } = await reserveTopic(subcatKey, topic);
          if (!reserved) {
            log(`  ⏭ Topic already reserved/covered: "${topic.substring(0, 50)}..." — skipping`, 'warn');
            setGenDone(d => d + 1);
            continue;
          }
          log(`  🔒 Reserved topic key: ${topicKey}`, 'info');

          if (globalIdx > 1 && (globalIdx - 1) % BATCH_SIZE === 0) {
            const pm = Math.round(BATCH_PAUSE_MS / 60000);
            log(`\n⏸️  ${BATCH_SIZE} articles done — taking a ${pm} min break...`, 'warn');
            await sleep(BATCH_PAUSE_MS);
            log(`▶️  Resuming...`, 'info');
          }

          log(`\n  ✍️  [${globalIdx}/${totalArticles}] "${topic}"`, 'progress');
          setBatchInfo(`[${globalIdx}/${totalArticles}] Writing: ${topic.substring(0, 50)}...`);

          // ── WRITE PART 1 ────────────────────────────────────────────────
          await sleep(2000);
          const part1Raw = await groqRequest(
            groqKeys[keyIndexRef.value],
            [
              {
                role: 'system',
                content:
                  `You are ${AUTHOR.name}, ${AUTHOR.tagline}.\n\n${AUTHOR.bio}\n\n` +
                  `Write the FIRST HALF of a gripping history article.\n\n` +
                  `TOPIC: "${topic}"\nCATEGORY: ${catConfig.label}\n\n` +
                  // Pass covered titles so Groq avoids similar angles
                  (coveredTitles.length > 0
                    ? `ALREADY COVERED — do NOT write about these angles:\n${coveredTitles.slice(0, 20).map(t => `- ${t}`).join('\n')}\n\n`
                    : '') +
                  `Structure with ## headings and **bold** key facts:\n\n` +
                  `## [Most surprising fact about this topic as a statement]\n` +
                  `(2-3 sentences) Open with the most surprising, counterintuitive, or little-known fact. **Bold** the key detail.\n\n` +
                  `## What Everyone Knows\n` +
                  `(100-150 words) The popular understanding — what most educated people believe about this. Be fair to the mainstream narrative.\n\n` +
                  `## What History Actually Shows\n` +
                  `(300-400 words) The deeper, more accurate, or less-told version. **Bold** every key fact, number, date, or name. ` +
                  `Include specific details — numbers, dates, names, places. Make it vivid.\n\n` +
                  `RULES:\n` +
                  `- Paragraphs separated by \\n\\n. No bullet points.\n` +
                  `- Write entirely in your own voice. Do NOT reproduce phrasing from any specific book or Wikipedia.\n` +
                  `- If uncertain about a specific detail, say "historians debate" or "estimates vary" rather than inventing it.\n` +
                  `- Return ONLY the article text. No JSON. No preamble. Just the formatted text.`,
              },
              { role: 'user', content: `Write Part 1 for the ${catConfig.label} article: "${topic}"` },
            ],
            1500, `${subcatKey}:p1:${ti + 1}`, log, groqKeys, keyExhausted, keyIndexRef, abortRef.current?.signal
          );

          if (!part1Raw || part1Raw.length < 200) {
            log(`    ✗ Part 1 failed — releasing reservation`, 'error');
            await releaseTopic(subcatKey, topicKey);
            setGenDone(d => d + 1);
            await sleep(INTER_ARTICLE_PAUSE_MS); continue;
          }

          // ── WRITE PART 2 ────────────────────────────────────────────────
          await sleep(4000);
          const part2Raw = await groqRequest(
            groqKeys[keyIndexRef.value],
            [
              {
                role: 'system',
                content:
                  `You are ${AUTHOR.name}, ${AUTHOR.tagline}.\n\n` +
                  `Write the SECOND HALF of the history article about: "${topic}"\n\n` +
                  `Continue with:\n\n` +
                  `## The Part That Got Buried\n` +
                  `(200-250 words) What was deliberately overlooked, suppressed, or forgotten — and by whom. ` +
                  `Be specific and opinionated. **Bold** what was erased or minimized.\n\n` +
                  `## The Ripple Effect\n` +
                  `(150-200 words) How this event/person/era still shapes the world today. ` +
                  `Make a direct connection to something a reader would recognize now.\n\n` +
                  `## The Line That Says It All\n` +
                  `(1 sharp sentence) The most memorable, quotable takeaway from this entire story.\n\n` +
                  `RULES: Same as Part 1. Original voice. No bullet points. Return article text only.`,
              },
              { role: 'user', content: `Write Part 2 for: "${topic}"` },
            ],
            1200, `${subcatKey}:p2:${ti + 1}`, log, groqKeys, keyExhausted, keyIndexRef, abortRef.current?.signal
          );

          const fullContent = [part1Raw.trim(), (part2Raw ?? '').trim()].filter(Boolean).join('\n\n');

          // ── META (title, summary, score, image queries) ──────────────────
          await sleep(3000);
          const metaRaw = await groqRequest(
            groqKeys[keyIndexRef.value],
            [
              {
                role: 'system',
                content: 'Return ONLY raw valid JSON — no markdown, no backticks. Format: { "title": "string", "summary": "string", "score": number, "image_queries": ["q1","q2","q3","q4","q5","q6"] }',
              },
              {
                role: 'user',
                content:
                  `Generate metadata for history article about: "${topic}"\n\n` +
                  `Preview: ${fullContent.substring(0, 400)}\n\n` +
                  `Return:\n` +
                  `- title: 10-18 word compelling headline (not a plain statement — create intrigue)\n` +
                  `- summary: 3 punchy teaser sentences without line breaks\n` +
                  `- score: 0-10 quality rating\n` +
                  `- image_queries: 6 specific Pexels search strings for ${catConfig.label} (ruins, artifacts, paintings, monuments — no person names)\n` +
                  `Raw JSON only.`,
              },
            ],
            500, `${subcatKey}:meta:${ti + 1}`, log, groqKeys, keyExhausted, keyIndexRef, abortRef.current?.signal
          );

          interface HistoryMeta { title: string; summary: string; score: number; image_queries: string[] }
          const meta   = metaRaw ? extractJSON<HistoryMeta>(metaRaw) : null;
          const title  = meta?.title   ?? topic.substring(0, 200);
          const summary = meta?.summary ?? fullContent.substring(0, 300).replace(/\n/g, ' ');
          const score  = clamp(parseFloat(String(meta?.score ?? 8.0)) || 8.0, 0, 10);
          const imgQ   = Array.isArray(meta?.image_queries) ? meta.image_queries : catConfig.imageQueries.slice(0, 6);

          if (stopRef.current) break;

          // ── SAVE TO DB ───────────────────────────────────────────────────
          const { data: saved, error: saveErr } = await supabase.from('articles').insert({
            title:          title.substring(0, 255),
            source_url:     null,
            source_name:    AUTHOR.name,
            summary:        summary.substring(0, 500),
            raw_content:    fullContent,
            category:       'history',
            subcategory:    subcatKey,
            score,
            era:            catConfig.era,
            difficulty:     'both',
            published_date: new Date().toISOString(),
            is_draft:       true,
            is_published:   false,
            image_url:      null,
            admin_notes:    `Topic: "${topic}" | Subcategory: ${catConfig.label}`,
          }).select('id').single();

          if (saveErr) {
            log(`    ✗ DB save failed: ${saveErr.message}`, 'error');
            await releaseTopic(subcatKey, topicKey);
            setGenDone(d => d + 1); await sleep(INTER_ARTICLE_PAUSE_MS); continue;
          }

          grandTotal++;
          const articleId = (saved as any).id;
          log(`    ✅ Article #${articleId} saved | score ${score.toFixed(1)}`, 'success');

          // ── Confirm topic in registry with real title + article ID ───────
          await confirmTopic(subcatKey, topicKey, title, articleId);
          // Also update local key set so subsequent topics in this run
          // don't attempt the same key
          if (!registeredKeys[subcatKey]) registeredKeys[subcatKey] = new Set();
          registeredKeys[subcatKey].add(topicKey);
          log(`    🔒 Registry confirmed: ${topicKey}`, 'info');

          // ── IMAGES ───────────────────────────────────────────────────────
          const imageCount = await fetchAndSaveImages(pexelsKey, articleId, title, subcatKey, imgQ, log);

          // ── AUTO-PUBLISH ─────────────────────────────────────────────────
          const goodScore  = score >= AUTO_PUBLISH_SCORE;
          const hasImages  = imageCount >= MIN_IMAGES_TO_PUBLISH;
          if (goodScore && hasImages) {
            const { data: verify } = await supabase.from('articles').select('raw_content, image_url').eq('id', articleId).single();
            if ((verify as any)?.raw_content?.length > 200 && (verify as any)?.image_url) {
              const { error: pubErr } = await supabase.from('articles')
                .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
                .eq('id', articleId);
              if (!pubErr) {
                autoPublished++;
                log(`    🚀 AUTO-PUBLISHED #${articleId} (${score.toFixed(1)}⭐, ${imageCount} images)`, 'success');
              }
            }
          } else {
            const reason = !hasImages ? `only ${imageCount} images` : `score ${score.toFixed(1)} < ${AUTO_PUBLISH_SCORE}`;
            log(`    📋 Draft (${reason})`, 'info');
          }

          fetchArticles();
          setGenDone(d => d + 1);
          if (ti < selectedTopics.length - 1) await sleep(INTER_ARTICLE_PAUSE_MS);
        }

        if (ci < categoryKeys.length - 1 && !stopRef.current) await sleep(2000);
      }

      log(`\n🎉 HISTORY PIPELINE COMPLETE!`, 'success');
      log(`   📰 Articles written: ${grandTotal}`, 'success');
      log(`   🚀 Auto-published:   ${autoPublished}`, 'success');
      log(`   📋 Left in drafts:   ${grandTotal - autoPublished}`, 'info');
      setSuccess(`✅ Done! ${grandTotal} articles written · ${autoPublished} auto-published · ${grandTotal - autoPublished} in drafts`);
      fetchArticles();

    } catch (e: any) {
      log(`\n❌ Fatal: ${e.message}`, 'error');
      setError('Generation failed: ' + e.message);
    } finally {
      setGenerating(false); abortRef.current = null;
      setBatchInfo('');
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setGenerating(false); setBatchInfo('');
    addLog('⛔ Pipeline stopped.', 'error');
  };

  const handleRefetchImages = async () => {
    if (!selectedArticle) return;
    setRefetchingImages(true); setError(null);
    const pexelsKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY as string | undefined;
    if (!pexelsKey) { setError('NEXT_PUBLIC_PEXELS_API_KEY not set'); setRefetchingImages(false); return; }
    try {
      await supabase.from('article_images').delete().eq('article_id', selectedArticle.id);
      await supabase.from('articles').update({ image_url: null }).eq('id', selectedArticle.id);
      const catConfig = HISTORY_CATEGORIES[selectedArticle.subcategory ?? ''];
      const count = await fetchAndSaveImages(
        pexelsKey, selectedArticle.id, selectedArticle.title,
        selectedArticle.subcategory ?? 'famous-figures',
        catConfig?.imageQueries ?? [], (m) => console.log(m)
      );
      await selectArticle(selectedArticle);
      if (count > 0) { setSuccess(`✅ ${count} images refetched!`); setTimeout(() => setSuccess(null), 3000); }
      else setError('No images found — try uploading manually.');
    } catch (e: any) { setError('Re-fetch failed: ' + e.message); }
    finally { setRefetchingImages(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedArticle || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true); setError(null);
    try {
      const path = `${selectedArticle.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('article-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(path);
      await new Promise<void>((res, rej) => {
        const img = new Image();
        img.onload = async () => {
          try {
            await supabase.from('article_images').insert({
              article_id: selectedArticle.id, image_url: publicUrl,
              position: images.length, width: img.width, height: img.height,
              size_kb: Math.round(file.size / 1024), alt_text: 'Article image', image_source: 'upload',
            });
            await selectArticle(selectedArticle);
            setSuccess('✅ Uploaded!'); setTimeout(() => setSuccess(null), 3000); res();
          } catch (err) { rej(err); }
        };
        img.onerror = () => rej(new Error('Failed to read image'));
        img.src = publicUrl;
      });
    } catch (e: any) { setError('Upload failed: ' + e.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const deleteImage = async (id: number) => {
    if (!confirm('Delete this image?')) return;
    try {
      await supabase.from('article_images').delete().eq('id', id);
      setImages(p => p.filter(i => i.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  const publishArticle = async () => {
    if (!selectedArticle) return;
    if (images.length < MIN_IMAGES_TO_PUBLISH) { setError(`Need at least ${MIN_IMAGES_TO_PUBLISH} images.`); return; }
    try {
      await supabase.from('articles').update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() }).eq('id', selectedArticle.id);
      setSuccess('✅ Article is live!');
      setTimeout(() => { fetchArticles(); setSelectedArticle(null); setImages([]); }, 1500);
    } catch (e: any) { setError(e.message); }
  };

  const deleteArticle = async (article: Article) => {
    if (!confirm(`Delete "${article.title.substring(0, 60)}..."?`)) return;
    try {
      await supabase.from('article_images').delete().eq('article_id', article.id);
      await supabase.from('articles').delete().eq('id', article.id);
      setSuccess('✅ Deleted.'); setSelectedArticle(null); setImages([]);
      setTimeout(() => setSuccess(null), 3000); fetchArticles();
    } catch (e: any) { setError(e.message); }
  };

  const unpublishArticle = async (article: Article) => {
    if (!confirm('Move back to drafts?')) return;
    try {
      await supabase.from('articles').update({ is_published: false, is_draft: true, updated_at: new Date().toISOString() }).eq('id', article.id);
      setSuccess('✅ Moved to drafts.');
      setTimeout(() => { setSuccess(null); fetchArticles(); setSelectedArticle(null); setImages([]); }, 1500);
    } catch (e: any) { setError(e.message); }
  };

  const updateAdminNotes = async () => {
    if (!selectedArticle) return;
    try {
      await supabase.from('articles').update({ admin_notes: adminNotes }).eq('id', selectedArticle.id);
      setSuccess('✅ Saved!'); setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) { setError(e.message); }
  };

  const scoreColor = (s: number | null) =>
    s === null ? 'text-gray-500 bg-gray-100' :
    s >= 8 ? 'text-green-600 bg-green-50' : s >= 7 ? 'text-yellow-600 bg-yellow-50' : 'text-gray-500 bg-gray-100';
  const logColor = (t: GenLog['type']) =>
    t === 'success' ? 'text-green-400' : t === 'error' ? 'text-red-400' :
    t === 'warn' ? 'text-yellow-300' : t === 'progress' ? 'text-blue-300' : 'text-gray-400';
  const pct = genTotal > 0 ? Math.round((genDone / genTotal) * 100) : 0;

  const getImageCredit = (img: ArticleImage): string | null => {
    if (img.image_source === 'pexels' && img.photographer) return `Photo by ${img.photographer} on Pexels`;
    if (img.image_source === 'wikimedia' && img.wiki_attribution) return `${img.wiki_attribution}${img.wiki_license ? ` · ${img.wiki_license}` : ''} · Wikimedia Commons`;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📜 Signal History — Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">
          {Object.keys(HISTORY_CATEGORIES).length} history categories × {ARTICLES_PER_CATEGORY} articles = {Object.keys(HISTORY_CATEGORIES).length * ARTICLES_PER_CATEGORY} per run ·
          Auto-publish score ≥ {AUTO_PUBLISH_SCORE} · Both well-known & hidden history
        </p>
      </div>

      <SchedulerPanel />
     
      {/* ── GENERATE CARD ─────────────────────────────────────────────────── */}
      <Card className="mb-6 overflow-hidden border-2 border-amber-200">
        <div className="p-5 bg-amber-50">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2 mb-1">
                <Zap size={20} className="text-amber-600 shrink-0" />
                Generate All 15 History Categories
              </h2>
              <p className="text-sm text-amber-700 mb-3">
                Writes {ARTICLES_PER_CATEGORY} articles per category — covering both the famous story <em>and</em> the hidden version.
                100% original writing. No copyright risk.
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-amber-700 mb-3">
                {Object.values(HISTORY_CATEGORIES).map(c => (
                  <span key={c.label}>{c.emoji} {c.label}</span>
                ))}
              </div>
              {generating && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-amber-800">
                    <span>{pct}% · {genDone}/{genTotal} articles</span>
                    {batchInfo && <span className="truncate max-w-[60%] text-amber-700">{batchInfo}</span>}
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-3 overflow-hidden">
                    <div className="h-3 rounded-full bg-amber-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0">
              {generating ? (
                <Button onClick={handleStop} size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6">
                  <X size={18} className="mr-1.5" /> Stop
                </Button>
              ) : (
                <Button onClick={handleGenerate} size="lg" className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-8 shadow-md">
                  <Zap size={18} className="mr-1.5" /> Generate History
                </Button>
              )}
            </div>
          </div>
        </div>

        {genLogs.length > 0 && (
          <div ref={logContainerRef} className="bg-gray-950 p-3 max-h-64 overflow-y-auto font-mono text-xs leading-[1.6] border-t border-gray-800">
            {genLogs.map(l => (
              <div key={l.id} className={logColor(l.type)}>
                <span className="text-gray-600 mr-2 select-none">{l.ts}</span>{l.message}
              </div>
            ))}
          </div>
        )}
      </Card>


      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800">
          <div className="flex justify-between gap-4">
            <p className="font-bold">Error</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
          <p className="text-sm whitespace-pre-wrap mt-1">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg text-green-800">
          <p className="font-bold">Success</p>
          <p className="text-sm whitespace-pre-wrap mt-1">{success}</p>
        </div>
      )}

      {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Article list */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Articles ({articles.length})</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
                  className={`text-xs px-2 py-1 rounded font-medium ${selectMode ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                  {selectMode ? '✕ Cancel' : '☑ Select'}
                </button>
                <button onClick={fetchArticles} disabled={loading} className="text-gray-400 hover:text-blue-600">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Status filter */}
            <div className="flex gap-1 mb-2">
              {(['draft', 'published', 'all'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition ${filter === f ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="w-full mb-3 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="all">All categories</option>
              {Object.entries(HISTORY_CATEGORIES).map(([key, c]) => (
                <option key={key} value={key}>{c.emoji} {c.label}</option>
              ))}
            </select>

            {selectMode && selectedIds.size > 0 && (
              <button onClick={deleteSelected} disabled={deleting}
                className="w-full mb-3 flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">
                <Trash2 size={14} /> {deleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
              </button>
            )}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {!loading && articles.length === 0 && (
                <div className="text-center text-gray-400 py-10">
                  <p className="text-3xl mb-2">📜</p>
                  <p className="text-sm">No articles yet. Click Generate History to start.</p>
                </div>
              )}
              {articles.map(article => {
                const catConf = HISTORY_CATEGORIES[article.subcategory ?? ''];
                return (
                  <div key={article.id}
                    onClick={() => selectMode ? toggleSelect(article.id) : selectArticle(article)}
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                      selectedArticle?.id === article.id && !selectMode ? 'border-amber-500 bg-amber-50' :
                      selectedIds.has(article.id) ? 'border-red-300 bg-red-50' :
                      'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    {selectMode && (
                      <div className="mt-0.5 shrink-0">
                        {selectedIds.has(article.id) ? <CheckSquare size={18} className="text-red-500" /> : <Square size={18} className="text-gray-400" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">{article.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {catConf && <span className="text-xs text-amber-700">{catConf.emoji} {catConf.label}</span>}
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreColor(article.score)}`}>⭐ {article.score?.toFixed(1) ?? '—'}</span>
                        {article.is_published && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Live</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {!selectedArticle || selectMode ? (
            <Card className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
              {generating
                ? <><p className="text-5xl mb-3 animate-bounce">📜</p><p className="font-medium text-gray-500">Writing history articles...</p></>
                : <><p className="text-5xl mb-3">👈</p><p className="font-medium text-gray-500">Select an article to manage</p></>
              }
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-start gap-3 mb-2">
                  <h3 className="font-bold text-lg leading-snug flex-1">{selectedArticle.title}</h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-sm font-bold px-2 py-1 rounded ${scoreColor(selectedArticle.score)}`}>⭐ {selectedArticle.score?.toFixed(1)}</span>
                    {selectedArticle.is_published && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">🟢 Live</span>}
                  </div>
                </div>

                {selectedArticle.subcategory && HISTORY_CATEGORIES[selectedArticle.subcategory] && (
                  <p className="text-xs text-amber-700 mb-2 font-medium">
                    {HISTORY_CATEGORIES[selectedArticle.subcategory].emoji} {HISTORY_CATEGORIES[selectedArticle.subcategory].label}
                    {selectedArticle.era && <span className="ml-2 text-gray-400">· {selectedArticle.era}</span>}
                  </p>
                )}

                <p className="text-xs text-gray-400 mb-3">✍️ By <span className="text-amber-700">{selectedArticle.source_name}</span></p>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{selectedArticle.summary}</p>

                {selectedArticle.raw_content && (
                  <details className="mb-4">
                    <summary className="text-sm text-amber-700 cursor-pointer font-medium hover:underline">📄 View full article</summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                      {selectedArticle.raw_content}
                    </div>
                  </details>
                )}

                <div className="grid grid-cols-3 gap-3 mb-5 text-center text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Images</p>
                    <p className={`font-bold ${images.length >= MIN_IMAGES_TO_PUBLISH ? 'text-green-600' : 'text-orange-500'}`}>{images.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Era</p>
                    <p className="font-bold text-xs capitalize">{selectedArticle.era ?? '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Status</p>
                    <p className={`font-bold text-xs ${selectedArticle.is_published ? 'text-green-600' : 'text-orange-500'}`}>
                      {selectedArticle.is_published ? '🟢 Live' : '📋 Draft'}
                    </p>
                  </div>
                </div>

                {!selectedArticle.is_published && (
                  <Button onClick={publishArticle} disabled={images.length < MIN_IMAGES_TO_PUBLISH}
                    className={`w-full font-bold py-3 text-base text-white ${images.length >= MIN_IMAGES_TO_PUBLISH ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                    {images.length >= MIN_IMAGES_TO_PUBLISH ? '🚀 Publish Now' : `📸 Need ${MIN_IMAGES_TO_PUBLISH} images`}
                  </Button>
                )}
                {selectedArticle.is_published && (
                  <div className="space-y-2">
                    <div className="w-full py-2.5 text-center text-green-700 font-bold bg-green-50 rounded-lg border border-green-200 text-sm">🟢 Live on your site</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => unpublishArticle(selectedArticle)} variant="outline" className="text-sm font-semibold border-yellow-400 text-yellow-700">📋 Back to Drafts</Button>
                      <Button onClick={() => deleteArticle(selectedArticle)} className="text-sm font-semibold bg-red-600 hover:bg-red-700 text-white"><Trash2 size={15} className="mr-1.5" /> Delete</Button>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h4 className="font-bold mb-2">📝 Admin Notes</h4>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Private notes..." className="mb-2 min-h-[70px] text-sm" />
                <Button onClick={updateAdminNotes} variant="outline" className="w-full text-sm">Save Notes</Button>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">🖼️ Images ({images.length})</h4>
                  <Button variant="outline" onClick={handleRefetchImages} disabled={refetchingImages} className="text-xs h-7 px-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                    <RefreshCw size={11} className={`mr-1 ${refetchingImages ? 'animate-spin' : ''}`} />
                    {refetchingImages ? 'Fetching...' : 'Re-fetch'}
                  </Button>
                </div>

                {images.length < TARGET_IMAGES && (
                  <label className="block mb-4 cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition ${uploading ? 'border-amber-300 bg-amber-50' : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'}`}>
                      <Upload size={24} className="mx-auto mb-1 text-gray-400" />
                      <p className="text-sm font-medium text-gray-600">{uploading ? '⏳ Uploading...' : 'Upload image'}</p>
                      <p className="text-xs text-gray-400">Min 800×600px · JPG or PNG</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                  </label>
                )}

                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((img, idx) => {
                      const credit = getImageCredit(img);
                      return (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                          <img src={img.image_url} alt={img.alt_text || `Image ${idx + 1}`} className="w-full h-36 object-cover" loading="lazy" />
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">#{idx + 1}</span>
                          {credit && (
                            <div className="px-2 py-1 bg-gray-50 border-t border-gray-100">
                              <p className="text-[10px] text-gray-400 truncate">{credit}</p>
                            </div>
                          )}
                          <button onClick={() => deleteImage(img.id)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Trash2 size={24} className="text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-sm font-bold text-red-600">No images</p>
                    <p className="text-xs text-red-400 mt-1">Use Re-fetch or upload manually.</p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}