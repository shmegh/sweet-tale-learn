import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2, Sparkles, GraduationCap } from "lucide-react";
import { toast } from "sonner";

interface StoryData {
  id: string;
  paragraphs: string[];
  vocabulary: { spanish: string; english: string }[];
  comprehension_questions: string[];
  grammar_description: string;
}

const Index = () => {
  const [story, setStory] = useState<StoryData | null>(null);
  const [totalVerbs, setTotalVerbs] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const generateStory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-story", {
        body: {},
      });

      if (error) {
        console.error("Function error:", error);
        toast.error("Failed to generate story. Please try again.");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setStory(data.story);
      setTotalVerbs(data.total_verbs_learned);
      toast.success("¡Historia generada!");
    } catch (e) {
      console.error("Error:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-4">
              <BookOpen className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-5xl font-bold text-foreground tracking-tight">
              SweetTale Learn
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Learn Spanish through AI-generated stories.
              <br />
              <span className="text-sm">Level A2 · Romantic Theme</span>
            </p>
          </div>

          {totalVerbs > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="w-4 h-4" />
              <span>{totalVerbs} verbs learned so far</span>
            </div>
          )}

          <Button
            onClick={generateStory}
            disabled={loading}
            size="lg"
            className="text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Romantic Story
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Each story takes about 15–30 seconds to generate
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">SweetTale Learn</h1>
          </div>
          <div className="flex items-center gap-4">
            {totalVerbs > 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                {totalVerbs} verbs
              </span>
            )}
            <Button
              onClick={() => { setStory(null); }}
              variant="outline"
              size="sm"
            >
              New Story
            </Button>
          </div>
        </div>

        {/* Story */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="w-5 h-5 text-primary" />
              La Historia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {story.paragraphs.map((p, i) => (
              <p key={i} className="text-foreground leading-relaxed text-[1.05rem]">
                {p}
              </p>
            ))}
          </CardContent>
        </Card>

        <Separator />

        {/* Vocabulary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📚 Vocabulario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {story.vocabulary.map((v, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
                  <span className="font-medium text-foreground">{v.spanish}</span>
                  <span className="text-muted-foreground text-sm">{v.english}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Comprehension */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🤔 Comprensión</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 list-decimal list-inside">
              {story.comprehension_questions.map((q, i) => (
                <li key={i} className="text-foreground leading-relaxed">{q}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Separator />

        {/* Grammar Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📝 Gramática</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{story.grammar_description}</p>
          </CardContent>
        </Card>

        {/* Generate Another */}
        <div className="text-center py-6">
          <Button
            onClick={generateStory}
            disabled={loading}
            size="lg"
            className="rounded-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Another Story
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
