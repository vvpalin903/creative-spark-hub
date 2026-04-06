import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Document() {
  const { slug } = useParams<{ slug: string }>();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_documents")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Документ не найден</p>
        </div>
      </Layout>
    );
  }

  // Simple markdown-like rendering: split by newlines, handle headers and paragraphs
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold text-foreground mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-foreground mt-8 mb-3">{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold text-foreground mt-8 mb-4">{line.slice(2)}</h1>;
      if (line.startsWith("- ")) return <li key={i} className="text-muted-foreground ml-4">{line.slice(2)}</li>;
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-muted-foreground mb-2">{line}</p>;
    });
  };

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{doc.title}</h1>
        <div className="prose prose-sm max-w-none">
          {renderContent(doc.content)}
        </div>
        <p className="text-xs text-muted-foreground mt-8">
          Версия {doc.version} • Обновлено {new Date(doc.updated_at).toLocaleDateString("ru-RU")}
        </p>
      </div>
    </Layout>
  );
}
