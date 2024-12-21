import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { refreshData } from "@/lib/api/iptv";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const contentTypes = [
    {
        type: "live",
        title: "Live TV",
        icon: "📺",
    },
    {
        type: "movie",
        title: "Movies",
        icon: "🎬",
    },
    {
        type: "series",
        title: "Series",
        icon: "🎭",
    },
] as const;

export default function HomePage() {
    const navigate = useNavigate();
    const { isLoggedIn, lastUpdate, updateLastUpdate, logout, credentials } = useAppStore();
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshProgress, setRefreshProgress] = useState<{ message: string; progress?: number } | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login");
            return;
        }
    }, [isLoggedIn, navigate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowLeft":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.max(0, prev - 1));
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.min(contentTypes.length - 1, prev + 1));
                    break;
                case "Enter":
                    e.preventDefault();
                    navigate(`/categories/${contentTypes[focusedIndex].type}`);
                    break;
                case "r":
                case "R":
                    e.preventDefault();
                    if (!isRefreshing && credentials) {
                        handleRefresh();
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [focusedIndex, navigate, isRefreshing, credentials]);

    const handleRefresh = async () => {
        if (!credentials) return;

        setIsRefreshing(true);
        setRefreshProgress({ message: "Starting refresh..." });

        try {
            const result = await refreshData(credentials, (status) => {
                setRefreshProgress({
                    message: status.message,
                    progress: status.message.includes("%")
                        ? parseInt(status.message.match(/(\d+)%/)?.[1] || "0")
                        : undefined,
                });
            });

            if (result.success) {
                updateLastUpdate();
                toast({
                    title: "Success",
                    description: "Content refreshed successfully",
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to refresh content",
            });
        } finally {
            setIsRefreshing(false);
            setRefreshProgress(null);
        }
    };

    if (!isLoggedIn) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">Welcome to IPTV</h1>
                <div className="space-x-4">
                    <Button variant="outline" onClick={() => navigate("/profile")}>
                        Profile
                    </Button>
                    <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                        {isRefreshing ? "Refreshing..." : "Refresh Content (R)"}
                    </Button>
                    <Button variant="destructive" onClick={logout}>
                        Logout
                    </Button>
                </div>
            </div>

            {isRefreshing && refreshProgress && (
                <div className="mb-8 space-y-2">
                    <Progress value={refreshProgress.progress} className="w-full h-2" />
                    <p className="text-sm text-muted-foreground text-center">{refreshProgress.message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 items-center justify-center">
                {contentTypes.map(({ type, title, icon }, index) => (
                    <Card
                        key={type}
                        className={`h-fit transition-transform bg-muted rounded-lg ${
                            isRefreshing 
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer ' + (index === focusedIndex ? "ring-2 ring-primary scale-105" : "hover:scale-105")
                        }`}
                        onClick={() => !isRefreshing && navigate(`/categories/${type}`)}
                    >
                        <CardContent>
                            <AspectRatio ratio={16 / 9}>
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-6xl">{icon}</div>
                                </div>
                            </AspectRatio>
                            <h2 className="text-2xl font-semibold mt-4 text-center">{title}</h2>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {lastUpdate && (
                <p className="text-sm text-muted-foreground mt-4">
                    Last updated: {new Date(lastUpdate).toLocaleString()}
                </p>
            )}
        </div>
    );
}
