export interface Article {
  id:             number;
  slug:           string | null;   // SEO-friendly URL slug e.g. 'viking-female-warrior-revealed'
  created_at:     string;
  updated_at:     string;
  deleted_at:     string | null;   // soft-delete timestamp — null means active
  title:          string;
  source_url:     string | null;   // nullable — history articles have no source URL
  source_name:    string;
  summary:        string;
  raw_content:    string | null;
  fts:            unknown | null;  // tsvector full-text search — read-only, Postgres-generated
  category:       string;          // always 'history' for this site
  subcategory:    string | null;   // one of the 17 slugs e.g. 'ancient-civilizations'
  era:            string | null;   // 'ancient' | 'medieval' | 'early-modern' | 'modern' | 'all'
  difficulty:     string | null;   // 'known' | 'hidden' | 'both'
  score:          number | null;
  image_url:      string | null;
  published_date: string;
  is_published:   boolean | null;
  is_draft:       boolean | null;
  admin_notes:    string | null;
  scheduled_publish_date: string | null;
}