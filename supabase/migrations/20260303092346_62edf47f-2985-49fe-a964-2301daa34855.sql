
CREATE TABLE public.grammar_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  sample TEXT NOT NULL
);

ALTER TABLE public.grammar_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read grammar rules" ON public.grammar_rules
  FOR SELECT USING (true);
