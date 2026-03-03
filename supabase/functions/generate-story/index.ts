import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { theme = "romantic" } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch user learned verbs
    const { data: learnedVerbs } = await supabase
      .from("user_learned_verbs")
      .select("verb_id, usage_count, verbs_master(infinitive, english_meaning)")
      .eq("user_id", MOCK_USER_ID);

    // 2. Fetch all master verbs
    const { data: allVerbs } = await supabase
      .from("verbs_master")
      .select("id, infinitive, english_meaning");

    // 3. Fetch grammar rules names
    const { data: grammarRules } = await supabase
      .from("grammar_rules")
      .select("name");
    const gramList = (grammarRules || []).map((r: any) => r.name).join(", ");

    // 3. Build learned verbs string
    const learnedVerbsList = (learnedVerbs || [])
      .map((lv: any) => `${lv.verbs_master.infinitive} (${lv.verbs_master.english_meaning}) - used ${lv.usage_count} times`)
      .join("\n");

    // 4. Build allowed verbs string
    const allowedVerbsList = (allVerbs || [])
      .map((v: any) => `${v.infinitive} (${v.english_meaning})`)
      .join(", ");

    // 5. Build prompt
    const systemPrompt = `You are a Spanish language pedagogy assistant.

Task:

Write a 5-paragraph story in ${theme} genre in Spanish for A2 learners.

Grammar allowed:
${gramList}

STRICT RULES:

1. Use ONLY verbs from:
   - Learned verbs list
   - Allowed verbs list (500-common-verbs dataset)

2. Reuse learned verbs multiple times.

3. Introduce 3–5 new verbs from allowed verbs list.

4. Do NOT use grammar beyond A2.

5. Keep vocabulary natural but suitable for A2.

After the story, return the following in structured JSON:

1. Spanish story (5 paragraphs)

2. List of grammar rules used in the story from [${gramList}] in a comma separated format

3. Vocabulary list (Spanish → English)

4. 5 comprehension questions

5. List of ALL verbs used with total occurrence count

6. Updated learned verbs list with incremented counts

Already learned verbs list with usage counts:
${learnedVerbsList || "No verbs learned yet."}

Allowed verbs list (500-common-verbs dataset):
${allowedVerbsList}`;

    const userPrompt = `Generate a romantic story now. Return ONLY a valid JSON object with these exact keys:
{
  "story_paragraphs": ["paragraph1", "paragraph2", "paragraph3", "paragraph4", "paragraph5"],
  "grammar_rules_used": "rule1, rule2, rule3",
  "vocabulary": [{"spanish": "word", "english": "meaning"}],
  "comprehension_questions": ["q1", "q2", "q3", "q4", "q5"],
  "verbs_used": [{"infinitive": "verb", "count": 1}]
}`;

    // 6. Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse AI response as JSON");
    }

    const storyText = parsed.story_paragraphs.join("\n\n");

    // 7. Update user_learned_verbs
    const verbsUsed = parsed.verbs_used || [];
    for (const vu of verbsUsed) {
      // Find verb in master
      const masterVerb = (allVerbs || []).find(
        (v: any) => v.infinitive.toLowerCase() === vu.infinitive.toLowerCase()
      );
      if (!masterVerb) continue;

      const existing = (learnedVerbs || []).find((lv: any) => lv.verb_id === masterVerb.id);
      if (existing) {
        await supabase
          .from("user_learned_verbs")
          .update({ usage_count: existing.usage_count + (vu.count || 1) })
          .eq("user_id", MOCK_USER_ID)
          .eq("verb_id", masterVerb.id);
      } else {
        await supabase
          .from("user_learned_verbs")
          .insert({ user_id: MOCK_USER_ID, verb_id: masterVerb.id, usage_count: vu.count || 1 });
      }
    }

    // 8. Store story
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .insert({
        user_id: MOCK_USER_ID,
        theme: theme,
        story_text: storyText,
        vocabulary_json: parsed.vocabulary,
        comprehension_questions_json: parsed.comprehension_questions,
        grammar_questions_json: parsed.grammar_rules_used,
      })
      .select()
      .single();

    if (storyError) {
      console.error("Story insert error:", storyError);
      throw new Error("Failed to save story");
    }

    // 9. Get updated verb count
    const { count: totalVerbs } = await supabase
      .from("user_learned_verbs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", MOCK_USER_ID);

    return new Response(JSON.stringify({
      story: {
        id: story.id,
        paragraphs: parsed.story_paragraphs,
        vocabulary: parsed.vocabulary,
        comprehension_questions: parsed.comprehension_questions,
        grammar_rules_used: parsed.grammar_rules_used,
      },
      total_verbs_learned: totalVerbs || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
