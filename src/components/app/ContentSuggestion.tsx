"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Film } from "lucide-react";

// Substitua pela sua chave TMDB em variável de ambiente
// Removido acesso direto à API do TMDB por segurança
// Agora usa proxy interno para proteger a API key
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w200";

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  overview?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

const ContentSuggestion: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
         `/api/proxy/tmdb?endpoint=search/multi&language=pt-BR&query=${encodeURIComponent(query)}`
       );
       const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError("Erro ao buscar conteúdos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSuggest(item: TMDBResult) {
    setSuccess("");
    setError("");
    try {
      // Aqui você pode enviar para uma API interna
      // await fetch("/api/suggestions", { method: "POST", body: JSON.stringify(item) });
      setSuccess("Sugestão enviada com sucesso!");
    } catch {
      setError("Erro ao enviar sugestão.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Film className="w-5 h-5 text-primary" /> Indique Filmes ou Séries</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input
            placeholder="Buscar por título, gênero, etc."
            value={query}
            onChange={e => setQuery(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>{loading ? "Buscando..." : "Buscar"}</Button>
        </form>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map(item => (
            <Card key={item.id} className="flex flex-row gap-4 items-start p-2">
              {item.poster_path && (
                <Image src={`${TMDB_IMAGE_URL}${item.poster_path}`} alt={item.title || item.name || "Poster"} width={80} height={112} className="w-20 h-28 rounded object-cover" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold">{item.title || item.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">{item.overview}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.release_date || item.first_air_date} | Avaliação: {item.vote_average}
                </div>
                <Button size="sm" className="mt-2" onClick={() => handleSuggest(item)}>
                  Indicar este conteúdo
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentSuggestion;