import { create } from "zustand";

export type CartMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number; // dollars
  available: boolean;
  categoryId: string | null;
};

export type CartLine = {
  menuItem: CartMenuItem;
  quantity: number;
  specialNote: string;
};

type CartState = {
  tableId: string | null;
  items: CartLine[];

  setTableId: (tableId: string) => void;
  addItem: (menuItem: CartMenuItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNote: (menuItemId: string, note: string) => void;
  clearCart: () => void;

  itemCount: () => number;
  total: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  tableId: null,
  items: [],

  setTableId: (tableId) =>
    set((state) => (state.tableId === tableId ? state : { tableId })),

  addItem: (menuItem) => {
    set((state) => {
      const idx = state.items.findIndex((x) => x.menuItem.id === menuItem.id);
      if (idx >= 0) {
        const copy = state.items.slice();
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return { items: copy };
      }
      return { items: [...state.items, { menuItem, quantity: 1, specialNote: "" }] };
    });
  },

  removeItem: (menuItemId) =>
    set((state) => ({ items: state.items.filter((x) => x.menuItem.id !== menuItemId) })),

  updateQuantity: (menuItemId, quantity) =>
    set((state) => {
      if (quantity <= 0) return { items: state.items.filter((x) => x.menuItem.id !== menuItemId) };
      return {
        items: state.items.map((x) =>
          x.menuItem.id === menuItemId ? { ...x, quantity } : x
        ),
      };
    }),

  updateNote: (menuItemId, note) =>
    set((state) => ({
      items: state.items.map((x) =>
        x.menuItem.id === menuItemId ? { ...x, specialNote: note } : x
      ),
    })),

  clearCart: () => set({ items: [] }),

  itemCount: () => get().items.reduce((acc, x) => acc + x.quantity, 0),
  total: () => get().items.reduce((acc, x) => acc + x.menuItem.price * x.quantity, 0),
}));
