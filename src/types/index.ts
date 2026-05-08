export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  price: number; // stored in cents in production; decimals in UI can be derived
  description?: string;
  imageUrl?: string; // image placeholder allowed for now
  isAvailable: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  nameSnapshot: string;
  unitPrice: number; // cents
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId?: string;
  customerName?: string;
  status: OrderStatus;
  items: OrderItem[];

  subtotal: number; // cents
  tax: number; // cents
  total: number; // cents

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  servedAt?: string; // ISO timestamp
}

export interface Table {
  id: string;
  restaurantId: string;
  name: string; // e.g. T1
  seats: number;
  status: "available" | "occupied" | "reserved" | "out_of_service";
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface QRCode {
  id: string;
  restaurantId: string;
  tableId?: string;
  payload: string; // encoded URL or token
  createdAt: string; // ISO timestamp
}

export interface User {
  id: string;
  restaurantId?: string; // platform user may be invited later
  email: string;
  name: string;
  role: "owner" | "manager" | "staff";
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface StaffMember {
  id: string;
  restaurantId: string;
  userId: string;
  displayName: string;
  position: "server" | "chef" | "cashier" | "manager" | "staff";
  isActive: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

