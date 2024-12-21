import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAppStore } from "@/store/useAppStore";
import { Category, Item } from "@/types/iptv";
import { getCategoryWithItems } from "@/lib/api/iptv";

export default function ItemsPage() {
    const navigate = useNavigate();
    const { categoryId } = useParams<{ categoryId: string }>();
    const { isLoggedIn, credentials } = useAppStore();
    const [category, setCategory] = useState<Category | null>(null);

    const items = useMemo<Item[]>(() => {
        return category?.items || [];
    }, [category]);

    const [loading, setLoading] = useState(true);
    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
        if (!isLoggedIn || !credentials || !categoryId) {
            navigate("/login");
            return;
        }

        const fetchItems = async () => {
            try {
                let result: Category = await getCategoryWithItems(categoryId);

                setCategory(result);
            } catch (error) {
                console.error("Failed to fetch items:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [categoryId, credentials, isLoggedIn, navigate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.max(0, prev - 4));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.min(items.length - 1, prev + 4));
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.max(0, prev - 1));
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.min(items.length - 1, prev + 1));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (items[focusedIndex]) {
                        navigate(`/player/${encodeURIComponent(items[focusedIndex].url)}`);
                    }
                    break;
                case "Backspace":
                    e.preventDefault();
                    navigate(-1);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [focusedIndex, items, navigate]);

    useEffect(() => {
        const element = document.getElementById(`item-${focusedIndex}`);
        if (!element) return;

        element.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [focusedIndex]);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="fixed top-0 left-0 right-0 bg-background z-10 p-8 border-b">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        Back
                    </Button>
                    <h1 className="text-4xl font-bold capitalize">{category?.name}</h1>
                </div>
            </div>

            <div className="mt-[100px] flex-1 p-8 overflow-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
                    {loading
                        ? Array.from({ length: 8 }).map((_, i) => (
                              <Card key={i}>
                                  <CardContent className="p-6">
                                      <AspectRatio ratio={16 / 9}>
                                          <Skeleton className="h-full w-full rounded-lg" />
                                      </AspectRatio>
                                      <Skeleton className="h-4 w-3/4 mt-4" />
                                  </CardContent>
                              </Card>
                          ))
                        : items.map((item, index) => (
                              <Card
                                  key={index}
                                  id={`item-${index}`}
                                  className={`cursor-pointer transition-transform ${
                                      index === focusedIndex ? "ring-2 ring-primary scale-105" : "hover:scale-105"
                                  }`}
                                  onClick={() => navigate(`/player/${encodeURIComponent(item.url)}`)}
                              >
                                  <CardContent className="p-6">
                                      <AspectRatio ratio={16 / 9}>
                                          <div className="w-full h-full rounded-lg overflow-hidden">
                                              <img
                                                  src={item.logo}
                                                  alt={item.name}
                                                  className="w-full h-full object-scale-down"
                                                  onError={(e) => {
                                                      (e.target as HTMLImageElement).src =
                                                          "https://placehold.co/400x225?text=No+Image";
                                                  }}
                                              />
                                          </div>
                                      </AspectRatio>
                                      <h2 className="text-xl font-semibold mt-4 truncate">{item.name}</h2>
                                  </CardContent>
                              </Card>
                          ))}
                </div>
            </div>
        </div>
    );
}
