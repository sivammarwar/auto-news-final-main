import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

const CATEGORY_SEO: Record<string, {
  title:       string;
  description: string;
  keywords:    string[];
}> = {
  'history': {
    title:       'History Articles | Hidden Facts',
    description: 'Explore world history — from ancient civilizations to modern conflicts. The stories they taught you and the ones they buried.',
    keywords:    ['world history', 'history articles', 'ancient civilizations', 'modern history'],
  },
  'ancient-civilizations': {
    title:       'Ancient Civilizations | Hidden Facts',
    description: 'Discover the engineering genius of Egypt, the real fall of Rome, the first cities of Mesopotamia, and the secrets ancient history buried.',
    keywords:    ['ancient civilizations', 'ancient Egypt', 'Roman Empire', 'Mesopotamia', 'ancient Greece', 'Indus Valley'],
  },
  'medieval-feudal': {
    title:       'Medieval & Feudal History | Hidden Facts',
    description: 'The Black Death, the Crusades, medieval knights, and the peasant revolts that almost toppled European kings.',
    keywords:    ['medieval history', 'feudal system', 'Black Death', 'Crusades', 'medieval Europe', 'Byzantine Empire'],
  },
  'age-of-exploration': {
    title:       'Age of Exploration | Hidden Facts',
    description: 'Columbus, Zheng He, Magellan — the explorers who remade the world, and the ones history forgot to credit.',
    keywords:    ['age of exploration', 'Columbus', 'Zheng He', 'Magellan', 'Silk Road', 'spice trade', 'Polynesian navigation'],
  },
  'revolutions-politics': {
    title:       'Revolutions & Politics | Hidden Facts',
    description: 'The French Revolution, the Haitian Revolution, the Arab Spring — what they achieved, what they destroyed, and what history got wrong.',
    keywords:    ['French Revolution', 'American Revolution', 'Russian Revolution', 'Haitian Revolution', 'political history'],
  },
  'world-wars-conflicts': {
    title:       'World Wars & Conflicts | Hidden Facts',
    description: 'WWI, WWII, the Cold War, and the forgotten soldiers whose stories never made it into the textbooks.',
    keywords:    ['World War 1', 'World War 2', 'Cold War', 'Korean War', 'military history', 'WWII soldiers'],
  },
  'colonial-imperial': {
    title:       'Colonial & Imperial History | Hidden Facts',
    description: 'The British Empire, the Congo genocide, the Berlin Conference — the full story of colonialism that textbooks skip over.',
    keywords:    ['colonialism', 'British Empire', 'colonial history', 'imperialism', 'independence movements', 'East India Company'],
  },
  'human-rights-movements': {
    title:       'Human Rights Movements | Hidden Facts',
    description: "Gandhi's Salt March, the Suffragettes, the civil rights movement — the real tactics, the forgotten heroes, the unfinished stories.",
    keywords:    ['civil rights', 'human rights history', 'Gandhi', 'suffragette', 'abolition', 'labor movement'],
  },
  'science-technology': {
    title:       'History of Science & Technology | Hidden Facts',
    description: 'Nikola Tesla, Ada Lovelace, the Antikythera mechanism — the inventors history buried and the discoveries that changed everything.',
    keywords:    ['history of science', 'scientific discoveries', 'technology history', 'Tesla', 'industrial revolution', 'Ada Lovelace'],
  },
  'religion-philosophy': {
    title:       'Religion & Philosophy History | Hidden Facts',
    description: 'The Council of Nicaea, Zoroastrianism, Socrates — the ideas that moved civilizations and the ones that were deliberately suppressed.',
    keywords:    ['history of religion', 'philosophy history', 'Council of Nicaea', 'Zoroastrianism', 'Confucianism', 'Reformation'],
  },
  'cultural-social': {
    title:       'Cultural & Social History | Hidden Facts',
    description: 'Fashion as politics, coffee houses as social media, the real samurai — the texture of lives lived across the centuries.',
    keywords:    ['cultural history', 'social history', 'fashion history', 'history of food', 'Renaissance', 'samurai history'],
  },
  'economic-trade': {
    title:       'Economic & Trade History | Hidden Facts',
    description: 'The Silk Road, the Dutch Tulip Mania, the history of banking — the commercial forces that shaped every civilization.',
    keywords:    ['Silk Road', 'economic history', 'trade history', 'banking history', 'East India Company', 'Mali Empire gold'],
  },
  'military-warfare': {
    title:       'Military & Warfare History | Hidden Facts',
    description: 'Thermopylae, Sun Tzu, Napoleon, the Mongol siege machines — the strategies that won and lost empires.',
    keywords:    ['military history', 'Battle of Thermopylae', 'Sun Tzu', 'Napoleon', 'Mongol Empire', 'guerrilla warfare'],
  },
  'regional-history': {
    title:       'Regional History | Hidden Facts',
    description: 'The Kingdom of Aksum, the Aztec capital, the Mughal Empire — world history beyond the Western narrative.',
    keywords:    ['African history', 'Asian history', 'Mughal Empire', 'Aztec civilization', 'regional history', 'Khmer Empire'],
  },
  'archaeology-mysteries': {
    title:       'Archaeology & Mysteries | Hidden Facts',
    description: "Göbekli Tepe, the Nazca Lines, Stonehenge — the buried cities and unsolved mysteries that rewrite what we know about human history.",
    keywords:    ['archaeology', 'Göbekli Tepe', 'Stonehenge', 'Nazca Lines', 'ancient mysteries', 'lost civilizations', 'Pompeii'],
  },
  'famous-figures': {
    title:       'Famous Figures & Leaders | Hidden Facts',
    description: 'Alexander the Great, Marie Curie, Genghis Khan — the real people behind the legends, including the parts history chose to hide.',
    keywords:    ['famous historical figures', 'Alexander the Great', 'Marie Curie', 'Genghis Khan', 'historical leaders'],
  },
};

// ─── generateMetadata for category pages ─────────────────────────────────────
export function buildCategoryMetadata(slug: string): Metadata {
  const seo = CATEGORY_SEO[slug] ?? {
    title:       `${slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} | Hidden Facts`,
    description: 'Explore history articles on Hidden Facts.',
    keywords:    ['history', slug],
  };

  const url      = `${BASE_URL}/category/${slug}`;
  const imageUrl = `${BASE_URL}/og-default.jpg`;

  return {
    title:       seo.title,
    description: seo.description,
    keywords:    seo.keywords,

    openGraph: {
      type:        'website',
      url,
      title:       seo.title,
      description: seo.description,
      siteName:    'Hidden Facts',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: seo.title }],
    },

    twitter: {
      card:        'summary_large_image',
      title:       seo.title,
      description: seo.description,
      images:      [imageUrl],
    },

    alternates: {
      canonical: url,
    },

    robots: {
      index:  true,
      follow: true,
    },
  };
}

// ─── ISR config for category pages ───────────────────────────────────────────
// Category pages update when new articles are published
export const CATEGORY_REVALIDATE_SECONDS = 3600; // 1 hour