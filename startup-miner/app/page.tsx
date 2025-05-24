'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { IdeaCard } from "@/components/idea-card";
import { fetchIdeas } from "./actions";

interface Idea {
  id: string;
  title: string;
  thesis: string;
  tech_stack: string;
  monetization: string;
  created_at: string;
}

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  const loadMoreIdeas = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newIdeas = await fetchIdeas(page);
      if (newIdeas && newIdeas.length > 0) {
        // Filter out any ideas that already exist in our state
        setIdeas(prevIdeas => {
          const uniqueNewIdeas = newIdeas.filter(
            newIdea => !prevIdeas.some(existingIdea => existingIdea.id === newIdea.id)
          );

          if (uniqueNewIdeas.length > 0) {
            setPage(prev => prev + 1);
            return [...prevIdeas, ...uniqueNewIdeas];
          } else {
            // If all ideas were duplicates, we've probably reached the end
            setHasMore(false);
            return prevIdeas;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading ideas:', error);
    }
    setLoading(false);
  }, [page, loading, hasMore]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadMoreIdeas();
    }
  }, [loadMoreIdeas]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMoreIdeas();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loading, loadMoreIdeas, hasMore]);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Startup Miner</h1>
      <div className="space-y-6">
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            id={idea.id}
            title={idea.title}
            thesis={idea.thesis}
            techStack={idea.tech_stack}
            monetization={idea.monetization}
          />
        ))}
      </div>
      <div ref={observerTarget} className="h-10 flex items-center justify-center">
        {loading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>}
      </div>
    </main>
  );
}
