import { create } from "zustand";

export type ApiMenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: number; // 0/1
};

export type ApiMenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  items: ApiMenuItem[];
};

type MenuState = {
  categories: ApiMenuCategory[];
  items: ApiMenuItem[];
  loading: boolean;
  error: string | null;

  fetchMenu: () => Promise<void>;
  addItem: (input: {
    categoryId: string | null;
    name: string;
    description?: string | null;
    price: number;
    image?: string | null;
    available?: boolean;
  }) => Promise<ApiMenuItem>;
  addCategory: (input: { name: string; sortOrder?: number }) => Promise<ApiMenuCategory>;
  updateItem: (
    id: string,
    patch: Partial<{
      categoryId: string | null;
      name: string;
      description: string | null;
      price: number;
      image: string | null;
      available: boolean;
    }>
  ) => Promise<ApiMenuItem>;
  deleteItem: (id: string) => Promise<void>;
  toggleAvailability: (id: string, available: boolean) => Promise<void>;
};

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function setMenuData(
  set: (partial: Partial<MenuState> | ((state: MenuState) => Partial<MenuState>)) => void,
  categories: ApiMenuCategory[]
) {
  const items = categories.flatMap((category) => category.items ?? []);
  set({ categories, items });
}

export const useMenuStore = create<MenuState>((set, get) => ({
  categories: [],
  items: [],
  loading: false,
  error: null,

  fetchMenu: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/menu", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load menu (${res.status})`);
      const categories = await readJson<ApiMenuCategory[]>(res);
      setMenuData(set, categories);
      set({ loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  addItem: async (input) => {
    const res = await fetch("/api/menu/items", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await readJson<ApiMenuItem | { error: string }>(res);
    if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);

    set((state) => ({
      items: [...state.items, data as ApiMenuItem],
      categories: state.categories.map((category) =>
        category.id === (data as ApiMenuItem).category_id
          ? { ...category, items: [...category.items, data as ApiMenuItem] }
          : category
      ),
    }));

    return data as ApiMenuItem;
  },

  addCategory: async (input) => {
    const res = await fetch("/api/menu/categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await readJson<ApiMenuCategory | { error: string }>(res);
    if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);

    const nextCategory: ApiMenuCategory = { ...(data as ApiMenuCategory), items: [] };
    set((state) => ({
      categories: [...state.categories, nextCategory].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      ),
    }));

    return nextCategory;
  },

  updateItem: async (id, patch) => {
    const res = await fetch(`/api/menu/items/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await readJson<ApiMenuItem | { error: string }>(res);
    if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);

    const updated = data as ApiMenuItem;
    set((state) => {
      const nextItems = state.items.map((item) => (item.id === id ? updated : item));
      const nextCategories = state.categories.map((category) => ({
        ...category,
        items: nextItems.filter((item) => item.category_id === category.id),
      }));
      return { items: nextItems, categories: nextCategories };
    });

    return data as ApiMenuItem;
  },

  deleteItem: async (id) => {
    const res = await fetch(`/api/menu/items/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await readJson<{ ok: boolean } | { error: string }>(res);
    if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);

    set((state) => {
      const nextItems = state.items.filter((item) => item.id !== id);
      const nextCategories = state.categories.map((category) => ({
        ...category,
        items: category.items.filter((item) => item.id !== id),
      }));
      return { items: nextItems, categories: nextCategories };
    });
  },

  toggleAvailability: async (id, available) => {
    const previous = get().items.find((item) => item.id === id);
    if (!previous) return;

    set((state) => {
      const nextItems = state.items.map((item) =>
        item.id === id ? { ...item, available: available ? 1 : 0 } : item
      );
      const nextCategories = state.categories.map((category) => ({
        ...category,
        items: category.items.map((item) =>
          item.id === id ? { ...item, available: available ? 1 : 0 } : item
        ),
      }));
      return { items: nextItems, categories: nextCategories };
    });

    try {
      await get().updateItem(id, { available });
    } catch (error) {
      set((state) => {
        const nextItems = state.items.map((item) =>
          item.id === id ? previous : item
        );
        const nextCategories = state.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => (item.id === id ? previous : item)),
        }));
        return { items: nextItems, categories: nextCategories };
      });
      throw error;
    }
  },
}));
