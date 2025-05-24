import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface IdeaCardProps {
    id: string;
    title: string;
    thesis: string;
    techStack: string;
    monetization: string;
}

export function IdeaCard({
    id,
    title,
    thesis,
    techStack,
    monetization,
}: IdeaCardProps) {
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
                </div>
            </CardContent>
        </Card>
    );
} 