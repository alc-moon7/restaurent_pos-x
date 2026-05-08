import type Database from "better-sqlite3";

type Db = Database.Database;

export function runSeed(db: Db) {
  const row = db.prepare(`SELECT COUNT(1) as count FROM menu_categories`).get() as {
    count: number;
  };

  if ((row?.count ?? 0) > 0) return;

  const insertCategory = db.prepare(
    `INSERT INTO menu_categories (name, sort_order) VALUES (?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO menu_items (category_id, name, description, price, image, available)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertTable = db.prepare(
    `INSERT INTO tables (name, capacity, status) VALUES (?, ?, ?)`
  );

  const insertRestaurantConfig = db.prepare(
    `INSERT OR IGNORE INTO restaurant_config (id, name, address, phone, tax_rate, currency, logo)
     VALUES (1, ?, ?, ?, ?, ?, ?)`
  );

  const insertPrinterConfig = db.prepare(
    `INSERT OR IGNORE INTO printer_config (id, connection_type, address, paper_width)
     VALUES (1, ?, ?, ?)`
  );

  const seedTxn = db.transaction(() => {
    // Categories
    const categories = [
      { name: "Appetizers", sort: 1 },
      { name: "Main Course", sort: 2 },
      { name: "Beverages", sort: 3 },
      { name: "Desserts", sort: 4 },
    ];

    for (const c of categories) insertCategory.run(c.name, c.sort);

    const catId = (name: string) => {
      const r = db
        .prepare(`SELECT id FROM menu_categories WHERE name = ?`)
        .get(name) as { id: number } | undefined;
      return r?.id ?? 0;
    };

    // Menu items (12)
    const items = [
      // Appetizers
      {
        category: "Appetizers",
        name: "Crispy Calamari",
        description: "Lightly battered rings, lemon zest, marinara.",
        price: 17.99,
        image: null,
        available: 1,
      },
      {
        category: "Appetizers",
        name: "Bruschetta Trio",
        description: "Tomato basil, olive tapenade, roasted pepper.",
        price: 12.99,
        image: null,
        available: 1,
      },
      {
        category: "Appetizers",
        name: "Garlic Parmesan Fries",
        description: "Crispy fries tossed in garlic butter & parmesan.",
        price: 10.99,
        image: null,
        available: 1,
      },

      // Main Course
      {
        category: "Main Course",
        name: "Margherita Pizza",
        description: "Fresh mozzarella, basil, crushed tomatoes, thin crust.",
        price: 18.99,
        image: null,
        available: 1,
      },
      {
        category: "Main Course",
        name: "Classic Cheeseburger",
        description: "Smash patty, cheddar, house sauce, pickles, onions.",
        price: 12.99,
        image: null,
        available: 1,
      },
      {
        category: "Main Course",
        name: "Baja Fish Tacos",
        description: "Crispy fish, cabbage, lime crema, pico de gallo.",
        price: 14.99,
        image: null,
        available: 1,
      },

      // Beverages
      {
        category: "Beverages",
        name: "House Lemonade",
        description: "Fresh-squeezed lemonade, lightly sweetened.",
        price: 4.99,
        image: null,
        available: 1,
      },
      {
        category: "Beverages",
        name: "Cold Brew Coffee",
        description: "Slow-steeped coffee with a smooth finish.",
        price: 5.99,
        image: null,
        available: 1,
      },
      {
        category: "Beverages",
        name: "Sparkling Citrus Soda",
        description: "Bright citrus bubbles with a crisp finish.",
        price: 4.49,
        image: null,
        available: 1,
      },

      // Desserts
      {
        category: "Desserts",
        name: "Chocolate Lava Cake",
        description: "Warm molten center with vanilla bean ice cream.",
        price: 8.99,
        image: null,
        available: 1,
      },
      {
        category: "Desserts",
        name: "Crème Brûlée",
        description: "Silky custard with caramelized sugar crackle.",
        price: 10.99,
        image: null,
        available: 1,
      },
      {
        category: "Desserts",
        name: "Strawberry Shortcake",
        description: "Fresh strawberries, whipped cream, vanilla sponge.",
        price: 9.49,
        image: null,
        available: 1,
      },
    ];

    for (const it of items) {
      insertItem.run(
        catId(it.category),
        it.name,
        it.description,
        it.price,
        it.image,
        it.available
      );
    }

    // Tables (8)
    for (let i = 1; i <= 8; i++) {
      insertTable.run(`Table ${i}`, i <= 2 ? 2 : i <= 6 ? 4 : 6, "available");
    }

    // Default config rows
    insertRestaurantConfig.run("My Restaurant", "", "", 10, "USD", null);
    insertPrinterConfig.run("bluetooth", null, 58);
  });

  seedTxn();
}

