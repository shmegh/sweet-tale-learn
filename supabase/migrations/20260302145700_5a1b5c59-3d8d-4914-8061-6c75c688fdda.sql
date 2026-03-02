
-- verbs_master: 500 common Spanish verbs (static)
CREATE TABLE public.verbs_master (
  id SERIAL PRIMARY KEY,
  infinitive TEXT NOT NULL UNIQUE,
  english_meaning TEXT NOT NULL
);

-- user_learned_verbs: per-user verb reinforcement
CREATE TABLE public.user_learned_verbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  verb_id INTEGER NOT NULL REFERENCES public.verbs_master(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, verb_id)
);

-- stories: generated stories
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  theme TEXT NOT NULL DEFAULT 'romantic',
  story_text TEXT NOT NULL,
  vocabulary_json JSONB,
  comprehension_questions_json JSONB,
  grammar_questions_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verbs_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learned_verbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- verbs_master: readable by everyone (static data)
CREATE POLICY "Anyone can read verbs" ON public.verbs_master FOR SELECT USING (true);

-- user_learned_verbs: full access for mock user (no auth)
CREATE POLICY "Anyone can read learned verbs" ON public.user_learned_verbs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert learned verbs" ON public.user_learned_verbs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update learned verbs" ON public.user_learned_verbs FOR UPDATE USING (true);

-- stories: full access for mock user (no auth)
CREATE POLICY "Anyone can read stories" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stories" ON public.stories FOR INSERT WITH CHECK (true);
