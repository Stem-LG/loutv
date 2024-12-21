import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/useAppStore";
import { usePinnedStore } from "@/store/usePinnedStore";
import { Category } from "@/types/iptv";
import { getCategoriesByType } from "@/lib/api/iptv";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Pin, PinOff } from "lucide-react";

export default function CategoriesPage() {
    const navigate = useNavigate();
    const { type } = useParams<{ type: Category["type"] }>();
    const { isLoggedIn, credentials } = useAppStore();
    const { togglePin, isPinned } = usePinnedStore();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
        if (!isLoggedIn || !credentials) {
            navigate("/login");
            return;
        }

        const fetchCategories = async () => {
            try {
                if (!type) {
                    navigate("/");
                    return;
                }

                let result: Category[] = await getCategoriesByType(type);
                setCategories(result);
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [type, credentials, isLoggedIn, navigate]);

    // Sort categories with pinned ones at the top
    const sortedCategories = [...categories].sort((a, b) => {
        if (!type) return 0;

        const aIsPinned = isPinned(a.id!, type);
        const bIsPinned = isPinned(b.id!, type);
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        return 0;
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.max(0, prev - 4));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.min(categories.length - 1, prev + 4));
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.max(0, prev - 1));
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.min(categories.length - 1, prev + 1));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (categories[focusedIndex]) {
                        navigate(`/items/${categories[focusedIndex].id}`);
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
    }, [focusedIndex, categories, navigate, type]);

    useEffect(() => {
        const element = document.getElementById(`category-${focusedIndex}`);
        if (!element) return;

        const elementRect = element.getBoundingClientRect();
        const isNearTop = elementRect.top < 120;

        element.scrollIntoView({
            behavior: "smooth",
            block: isNearTop ? "center" : "nearest",
        });
    }, [focusedIndex]);

    const handlePin = (category: Category, e?: Event) => {
        e?.preventDefault();
        if (!category.id || !type) return;

        togglePin({
            id: category.id,
            name: category.name,
            type: type,
        });
    };

    if (!type) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="fixed top-0 left-0 right-0 bg-background z-10 p-8 border-b">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={() => navigate("/")}>
                        Back
                    </Button>
                    <h1 className="text-4xl font-bold capitalize">{type} Categories</h1>
                </div>
            </div>

            <div className="mt-[100px] flex-1 p-8 overflow-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {loading
                        ? Array.from({ length: 8 }).map((_, i) => (
                              <Card key={i}>
                                  <CardContent className="p-6">
                                      <Skeleton className="h-4 w-3/4 mb-2" />
                                      <Skeleton className="h-4 w-1/2" />
                                  </CardContent>
                              </Card>
                          ))
                        : sortedCategories.map((category, index) => {
                              const isPinnedCategory = isPinned(category.id!, type);
                              return (
                                  <ContextMenu key={category.name}>
                                      <ContextMenuTrigger>
                                          <Card
                                              id={`category-${index}`}
                                              className={`cursor-pointer transition-transform group ${
                                                  index === focusedIndex
                                                      ? "ring-2 ring-primary scale-105"
                                                      : "hover:scale-105"
                                              }`}
                                              onClick={() => navigate(`/items/${category.id}`)}
                                          >
                                              <CardContent className="p-6">
                                                  <div className="flex items-center justify-between">
                                                      <h2 className="text-xl font-semibold">{category.name}</h2>
                                                      {isPinnedCategory && <Pin className="h-4 w-4 text-primary" />}
                                                  </div>
                                              </CardContent>
                                          </Card>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent>
                                          <ContextMenuItem onClick={() => handlePin(category)}>
                                              {isPinnedCategory ? (
                                                  <div className="flex items-center">
                                                      <PinOff className="h-4 w-4 mr-2" />
                                                      Unpin Category
                                                  </div>
                                              ) : (
                                                  <div className="flex items-center">
                                                      <Pin className="h-4 w-4 mr-2" />
                                                      Pin Category
                                                  </div>
                                              )}
                                          </ContextMenuItem>
                                      </ContextMenuContent>
                                  </ContextMenu>
                              );
                          })}
                </div>
            </div>
        </div>
    );
}
