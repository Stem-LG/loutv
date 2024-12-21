import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PinnedCategory {
    id: string;
    name: string;
    type: string;
}

interface PinnedState {
    pinnedCategories: Record<string, PinnedCategory[]>; // type -> pinned categories
    togglePin: (category: PinnedCategory) => void;
    isPinned: (categoryId: string, type: string) => boolean;
    getPinnedCategories: (type: string) => PinnedCategory[];
}

export const usePinnedStore = create<PinnedState>()(
    persist(
        (set, get) => ({
            pinnedCategories: {},
            togglePin: (category) => {
                set((state) => {
                    const currentPinned = state.pinnedCategories[category.type] || [];
                    const isPinned = currentPinned.some((c) => c.id === category.id);

                    if (isPinned) {
                        // Unpin
                        return {
                            pinnedCategories: {
                                ...state.pinnedCategories,
                                [category.type]: currentPinned.filter((c) => c.id !== category.id),
                            },
                        };
                    } else {
                        // Pin
                        return {
                            pinnedCategories: {
                                ...state.pinnedCategories,
                                [category.type]: [...currentPinned, category],
                            },
                        };
                    }
                });
            },
            isPinned: (categoryId, type) => {
                const pinnedCategories = get().pinnedCategories[type] || [];
                return pinnedCategories.some((c) => c.id === categoryId);
            },
            getPinnedCategories: (type) => {
                return get().pinnedCategories[type] || [];
            },
        }),
        {
            name: "pinned-categories", // name of the item in localStorage
        }
    )
); 