import { create } from "zustand";

export type ApiTable = {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
};

type TableState = {
  tables: ApiTable[];
  loading: boolean;
  error: string | null;
  fetchTables: () => Promise<void>;
  addTable: (input: { name: string; capacity: number; status?: ApiTable["status"] }) => Promise<ApiTable>;
  deleteTable: (id: string) => Promise<void>;
  updateTableStatus: (id: string, status: ApiTable["status"]) => Promise<void>;
};

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: [],
  loading: false,
  error: null,

  fetchTables: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/tables", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load tables (${res.status})`);
      const tables = await readJson<ApiTable[]>(res);
      set({ tables, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  addTable: async (input) => {
    const res = await fetch("/api/tables", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await readJson<ApiTable | { error: string }>(res);
    if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);
    set((state) => ({ tables: [...state.tables, data as ApiTable] }));
    return data as ApiTable;
  },

  deleteTable: async (id) => {
    const res = await fetch(`/api/tables/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await readJson<{ ok: boolean } | { error: string }>(res);
    if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);
    set((state) => ({ tables: state.tables.filter((table) => table.id !== id) }));
  },

  updateTableStatus: async (id, status) => {
    const previous = get().tables.find((table) => table.id === id);
    if (!previous) return;

    set((state) => ({
      tables: state.tables.map((table) =>
        table.id === id ? { ...table, status } : table
      ),
    }));

    const res = await fetch(`/api/tables/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await readJson<{ ok: boolean } | { error: string }>(res);
    if (!res.ok) {
      set((state) => ({
        tables: state.tables.map((table) => (table.id === id ? previous : table)),
      }));
      throw new Error("error" in data ? data.error : `Failed (${res.status})`);
    }
  },
}));
