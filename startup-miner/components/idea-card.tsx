import { createClient } from "@/utils/supabase/client";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useEffect, useState } from "react";

interface IdeaCardProps {
    id: string;
    title: string;
    thesis: string;
    techStack: string;
    monetization: string;
    rating: number;
    onVote: (id: string, increment: number) => Promise<void>;
}

export function IdeaCard({
    id,
    title,
    thesis,
    techStack,
    monetization,
    rating,
    onVote,
}: IdeaCardProps) {
    const [userVote, setUserVote] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkUserVote = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data } = await supabase
                    .from('user_votes')
                    .select('vote_type')
                    .eq('user_id', user.id)
                    .eq('idea_id', id)
                    .single();

                if (data) {
                    setUserVote(data.vote_type);
                }
            }
        };

        checkUserVote();
    }, [id]);

    const handleVote = async (increment: number) => {
        setIsLoading(true);
        try {
            await onVote(id, increment);
            // If user clicks the same vote button again, remove their vote
            if (userVote === increment) {
                setUserVote(null);
            } else {
                setUserVote(increment);
            }
        } catch (error) {
            console.error('Error voting:', error);
        }
        setIsLoading(false);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto mb-4 hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="text-xl font-bold">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-sm text-gray-500">Thesis</h3>
                        <p className="mt-1">{thesis}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-gray-500">Tech Stack</h3>
                        <p className="mt-1">{techStack}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-gray-500">Monetization</h3>
                        <p className="mt-1">{monetization}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <Button
                            variant={userVote === 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleVote(1)}
                            disabled={isLoading}
                            className="flex items-center gap-1"
                        >
                            <ThumbsUp className="h-4 w-4" />
                            <span>{rating}</span>
                        </Button>
                        <Button
                            variant={userVote === -1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleVote(-1)}
                            disabled={isLoading}
                            className="flex items-center gap-1"
                        >
                            <ThumbsDown className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 