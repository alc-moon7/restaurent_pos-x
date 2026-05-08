import "server-only";

import { db } from "@/lib/db";

export type DbRestaurantConfig = {
  id: number;
  name: string | null;
  address: string | null;
  phone: string | null;
  tax_rate: number;
  currency: string;
  logo: string | null;
};

export type DbMenuCategory = {
  id: number;
  name: string;
  sort_order: number;
};

export type DbMenuItem = {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: 0 | 1;
};

export type DbTableStatus = "available" | "occupied" | "reserved";

export type DbTable = {
  id: number;
  name: string;
  capacity: number;
  status: DbTableStatus;
};

export type DbOrderStatus = "new" | "cooking" | "ready" | "completed" | "cancelled";

export type DbOrder = {
  id: number;
  table_id: number | null;
  status: DbOrderStatus;
  total: number | null;
  notes: string | null;
  cooking_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrderItem = {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  quantity: number;
  unit_price: number;
  special_note: string | null;
};

export type MenuCategoryWithItems = DbMenuCategory & {
  items: DbMenuItem[];
};

export type OrderWithDetails = DbOrder & {
  tableName: string | null;
  items: Array<
    DbOrderItem & {
      itemName: string | null;
    }
  >;
};

export type CreateMenuItemInput = {
  categoryId: number | null;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  available?: boolean;
};

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

export type CreateCategoryInput = {
  name: string;
  sortOrder?: number;
};

export type UpdateRestaurantConfigInput = Partial<{
  name: string | null;
  address: string | null;
  phone: string | null;
  tax_rate: number;
  currency: string;
  logo: string | null;
}>;

export type DbPrinterConfig = {
  id: number;
  connection_type: string;
  address: string | null;
  paper_width: number;
};

export type UpdatePrinterConfigInput = Partial<{
  connection_type: string;
  address: string | null;
  paper_width: number;
}>;

function hasOrderColumn(column: string) {
  const columns = db.prepare(`PRAGMA table_info(orders)`).all() as Array<{ name: string }>;
  return columns.some((entry) => entry.name === column);
}

const ORDER_COLUMNS = {
  cooking_at: hasOrderColumn("cooking_at"),
  ready_at: hasOrderColumn("ready_at"),
  completed_at: hasOrderColumn("completed_at"),
  cancelled_at: hasOrderColumn("cancelled_at"),
};

function lifecycleSelect(column: keyof typeof ORDER_COLUMNS) {
  return ORDER_COLUMNS[column] ? `o.${column}` : `NULL as ${column}`;
}

function baseOrderSelect() {
  return `SELECT o.id, o.table_id, o.status, o.total, o.notes,
          ${lifecycleSelect("cooking_at")},
          ${lifecycleSelect("ready_at")},
          ${lifecycleSelect("completed_at")},
          ${lifecycleSelect("cancelled_at")},
          o.created_at, o.updated_at,
          t.name as tableName
   FROM orders o
   LEFT JOIN tables t ON t.id = o.table_id`;
}

export function getMenu(): MenuCategoryWithItems[] {
  const categories = db
    .prepare(`SELECT id, name, sort_order FROM menu_categories ORDER BY sort_order, name`)
    .all() as DbMenuCategory[];

  const items = db
    .prepare(
      `SELECT id, category_id, name, description, price, image, available
       FROM menu_items
       ORDER BY name`
    )
    .all() as DbMenuItem[];

  const itemsByCategory = new Map<number, DbMenuItem[]>();
  for (const it of items) {
    const catId = it.category_id ?? -1;
    const arr = itemsByCategory.get(catId) ?? [];
    arr.push(it);
    itemsByCategory.set(catId, arr);
  }

  return categories.map((c) => ({
    ...c,
    items: itemsByCategory.get(c.id) ?? [],
  }));
}

export function listCategories(): DbMenuCategory[] {
  return db
    .prepare(`SELECT id, name, sort_order FROM menu_categories ORDER BY sort_order, name`)
    .all() as DbMenuCategory[];
}

export function createCategory(input: CreateCategoryInput): DbMenuCategory {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  const sort = input.sortOrder ?? 0;
  const res = db
    .prepare(`INSERT INTO menu_categories (name, sort_order) VALUES (?, ?)`)
    .run(name, sort);
  const id = Number(res.lastInsertRowid);
  return db
    .prepare(`SELECT id, name, sort_order FROM menu_categories WHERE id = ?`)
    .get(id) as DbMenuCategory;
}

export function createMenuItem(input: CreateMenuItemInput): DbMenuItem {
  const name = input.name.trim();
  if (!name) throw new Error("Item name is required.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Invalid price.");
  const available = input.available === false ? 0 : 1;

  const res = db
    .prepare(
      `INSERT INTO menu_items (category_id, name, description, price, image, available)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.categoryId ?? null,
      name,
      input.description ?? null,
      input.price,
      input.image ?? null,
      available
    );

  const id = Number(res.lastInsertRowid);
  return db
    .prepare(
      `SELECT id, category_id, name, description, price, image, available
       FROM menu_items WHERE id = ?`
    )
    .get(id) as DbMenuItem;
}

export function updateMenuItem(id: number, patch: UpdateMenuItemInput): DbMenuItem {
  const existing = db
    .prepare(
      `SELECT id, category_id, name, description, price, image, available
       FROM menu_items WHERE id = ?`
    )
    .get(id) as DbMenuItem | undefined;
  if (!existing) throw new Error("Menu item not found.");

  const next: DbMenuItem = {
    ...existing,
    category_id: patch.categoryId ?? existing.category_id,
    name: patch.name !== undefined ? patch.name.trim() : existing.name,
    description:
      patch.description !== undefined ? patch.description ?? null : existing.description,
    price: patch.price !== undefined ? patch.price : existing.price,
    image: patch.image !== undefined ? patch.image ?? null : existing.image,
    available:
      patch.available !== undefined ? (patch.available ? 1 : 0) : existing.available,
  };

  if (!next.name) throw new Error("Item name is required.");
  if (!Number.isFinite(next.price) || next.price < 0) throw new Error("Invalid price.");

  db.prepare(
    `UPDATE menu_items
     SET category_id = ?, name = ?, description = ?, price = ?, image = ?, available = ?
     WHERE id = ?`
  ).run(
    next.category_id ?? null,
    next.name,
    next.description ?? null,
    next.price,
    next.image ?? null,
    next.available,
    id
  );

  return db
    .prepare(
      `SELECT id, category_id, name, description, price, image, available
       FROM menu_items WHERE id = ?`
    )
    .get(id) as DbMenuItem;
}

export function deleteMenuItem(id: number) {
  db.prepare(`DELETE FROM menu_items WHERE id = ?`).run(id);
}

export function getTables(): DbTable[] {
  return db
    .prepare(`SELECT id, name, capacity, status FROM tables ORDER BY id`)
    .all() as DbTable[];
}

export function getTableById(id: number): DbTable | null {
  const t = db
    .prepare(`SELECT id, name, capacity, status FROM tables WHERE id = ?`)
    .get(id) as DbTable | undefined;
  return t ?? null;
}

export function updateTableStatus(id: number, status: DbTableStatus) {
  db.prepare(`UPDATE tables SET status = ? WHERE id = ?`).run(status, id);
}

export function deleteTable(id: number) {
  const existing = getTableById(id);
  if (!existing) throw new Error("Table not found.");

  db.prepare(`UPDATE orders SET table_id = NULL WHERE table_id = ?`).run(id);
  db.prepare(`DELETE FROM tables WHERE id = ?`).run(id);
}

export function createTable(name: string, capacity = 4, status: DbTableStatus = "available"): DbTable {
  const n = name.trim();
  if (!n) throw new Error("Table name is required.");
  const cap = Math.max(1, Math.floor(capacity));
  const res = db
    .prepare(`INSERT INTO tables (name, capacity, status) VALUES (?, ?, ?)`)
    .run(n, cap, status);
  const id = Number(res.lastInsertRowid);
  return db.prepare(`SELECT id, name, capacity, status FROM tables WHERE id = ?`).get(id) as DbTable;
}

export function getOrders(status?: DbOrderStatus): OrderWithDetails[] {
  const orders = (
    status
      ? db
          .prepare(
            `${baseOrderSelect()}
             WHERE o.status = ?
             ORDER BY o.created_at DESC`
          )
          .all(status)
      : db
          .prepare(
            `${baseOrderSelect()}
             ORDER BY o.created_at DESC`
          )
          .all()
  ) as Array<DbOrder & { tableName: string | null }>;

  const orderIds = orders.map((o) => o.id);
  const itemsByOrder = new Map<number, OrderWithDetails["items"]>();

  if (orderIds.length > 0) {
    const rows = db
      .prepare(
        `SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, oi.unit_price, oi.special_note,
                mi.name as itemName
         FROM order_items oi
         LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE oi.order_id IN (${orderIds.map(() => "?").join(",")})
         ORDER BY oi.id ASC`
      )
      .all(...orderIds) as Array<
      DbOrderItem & { itemName: string | null }
    >;

    for (const r of rows) {
      const arr = itemsByOrder.get(r.order_id) ?? [];
      arr.push(r);
      itemsByOrder.set(r.order_id, arr);
    }
  }

  return orders.map((o) => ({
    ...o,
    tableName: o.tableName ?? null,
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export function getOrderById(id: number): OrderWithDetails | null {
  const order = db
    .prepare(
      `${baseOrderSelect()}
       WHERE o.id = ?`
    )
    .get(id) as (DbOrder & { tableName: string | null }) | undefined;

  if (!order) return null;

  const items = db
    .prepare(
      `SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, oi.unit_price, oi.special_note,
              mi.name as itemName
       FROM order_items oi
       LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`
    )
    .all(id) as Array<DbOrderItem & { itemName: string | null }>;

  return { ...order, tableName: order.tableName ?? null, items };
}

export function createOrder(
  tableId: number,
  items: Array<{
    menuItemId: number;
    quantity: number;
    unitPrice: number;
    specialNote?: string;
  }>,
  notes?: string
): OrderWithDetails {
  const insertOrder = db.prepare(
    `INSERT INTO orders (
        table_id, status, total, notes,
        cooking_at, ready_at, completed_at, cancelled_at,
        created_at, updated_at
      )
     VALUES (?, 'new', ?, ?, NULL, NULL, NULL, NULL, datetime('now'), datetime('now'))`
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, special_note)
     VALUES (?, ?, ?, ?, ?)`
  );
  const markTable = db.prepare(`UPDATE tables SET status = 'occupied' WHERE id = ?`);

  const txn = db.transaction(() => {
    const total = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
    const result = insertOrder.run(tableId, total, notes ?? null);
    const orderId = Number(result.lastInsertRowid);

    for (const it of items) {
      insertItem.run(
        orderId,
        it.menuItemId,
        it.quantity,
        it.unitPrice,
        it.specialNote ?? null
      );
    }

    markTable.run(tableId);
    return orderId;
  });

  const newId = txn();
  const full = getOrderById(newId);
  if (!full) throw new Error("Failed to load newly created order.");
  return full;
}

export function updateOrderStatus(id: number, status: DbOrderStatus) {
  const existing = db
    .prepare(
      `SELECT id, table_id, status, total, notes,
              ${ORDER_COLUMNS.cooking_at ? "cooking_at" : "NULL as cooking_at"},
              ${ORDER_COLUMNS.ready_at ? "ready_at" : "NULL as ready_at"},
              ${ORDER_COLUMNS.completed_at ? "completed_at" : "NULL as completed_at"},
              ${ORDER_COLUMNS.cancelled_at ? "cancelled_at" : "NULL as cancelled_at"},
              created_at, updated_at
       FROM orders
       WHERE id = ?`
    )
    .get(id) as DbOrder | undefined;

  if (!existing) {
    throw new Error("Order not found.");
  }

  const nextCookingAt =
    status === "cooking"
      ? existing.cooking_at ?? new Date().toISOString()
      : existing.cooking_at;
  const nextReadyAt =
    status === "ready"
      ? existing.ready_at ?? new Date().toISOString()
      : existing.ready_at;
  const nextCompletedAt =
    status === "completed"
      ? existing.completed_at ?? new Date().toISOString()
      : existing.completed_at;
  const nextCancelledAt =
    status === "cancelled"
      ? existing.cancelled_at ?? new Date().toISOString()
      : existing.cancelled_at;

  const updates = ["status = ?", "updated_at = datetime('now')"];
  const values: Array<string | null | number> = [status];

  if (ORDER_COLUMNS.cooking_at) {
    updates.push("cooking_at = ?");
    values.push(nextCookingAt);
  }
  if (ORDER_COLUMNS.ready_at) {
    updates.push("ready_at = ?");
    values.push(nextReadyAt);
  }
  if (ORDER_COLUMNS.completed_at) {
    updates.push("completed_at = ?");
    values.push(nextCompletedAt);
  }
  if (ORDER_COLUMNS.cancelled_at) {
    updates.push("cancelled_at = ?");
    values.push(nextCancelledAt);
  }

  values.push(id);

  db.prepare(
    `UPDATE orders
     SET ${updates.join(", ")}
     WHERE id = ?`
  ).run(...values);
}

export function getRestaurantConfig(): DbRestaurantConfig | null {
  const r = db
    .prepare(
      `SELECT id, name, address, phone, tax_rate, currency, logo
       FROM restaurant_config
       WHERE id = 1`
    )
    .get() as DbRestaurantConfig | undefined;
  return r ?? null;
}

export function updateRestaurantConfig(patch: UpdateRestaurantConfigInput): DbRestaurantConfig {
  const existing = getRestaurantConfig();
  const next: DbRestaurantConfig = {
    id: 1,
    name: patch.name !== undefined ? patch.name : existing?.name ?? null,
    address: patch.address !== undefined ? patch.address : existing?.address ?? null,
    phone: patch.phone !== undefined ? patch.phone : existing?.phone ?? null,
    tax_rate: patch.tax_rate !== undefined ? patch.tax_rate : existing?.tax_rate ?? 10,
    currency: patch.currency !== undefined ? patch.currency : existing?.currency ?? "USD",
    logo: patch.logo !== undefined ? patch.logo : existing?.logo ?? null,
  };

  db.prepare(
    `INSERT INTO restaurant_config (id, name, address, phone, tax_rate, currency, logo)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       address=excluded.address,
       phone=excluded.phone,
       tax_rate=excluded.tax_rate,
       currency=excluded.currency,
       logo=excluded.logo`
  ).run(next.name, next.address, next.phone, next.tax_rate, next.currency, next.logo);

  return getRestaurantConfig()!;
}

export function getPrinterConfig(): DbPrinterConfig | null {
  const r = db
    .prepare(
      `SELECT id, connection_type, address, paper_width
       FROM printer_config
       WHERE id = 1`
    )
    .get() as DbPrinterConfig | undefined;
  return r ?? null;
}

export function updatePrinterConfig(patch: UpdatePrinterConfigInput): DbPrinterConfig {
  const existing = getPrinterConfig();
  const next: DbPrinterConfig = {
    id: 1,
    connection_type:
      patch.connection_type !== undefined
        ? patch.connection_type
        : existing?.connection_type ?? "bluetooth",
    address: patch.address !== undefined ? patch.address : existing?.address ?? null,
    paper_width:
      patch.paper_width !== undefined ? patch.paper_width : existing?.paper_width ?? 58,
  };

  db.prepare(
    `INSERT INTO printer_config (id, connection_type, address, paper_width)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       connection_type=excluded.connection_type,
       address=excluded.address,
       paper_width=excluded.paper_width`
  ).run(next.connection_type, next.address, next.paper_width);

  return getPrinterConfig()!;
}
