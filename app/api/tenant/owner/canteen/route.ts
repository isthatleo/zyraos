import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

type CanteenMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  status: "active" | "paused" | "sold_out";
  allergens: string[];
  nutrition: string;
  servedOn: string[];
  stockLinkedItem?: string;
  createdAt: string;
  updatedAt: string;
};

type CanteenInventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string;
  expiryDate: string | null;
  status: "in_stock" | "low_stock" | "expired";
  updatedAt: string;
};

type CanteenOrder = {
  id: string;
  buyerName: string;
  buyerType: "student" | "staff" | "guest";
  items: Array<{ name: string; quantity: number; price: number }>;
  amount: number;
  paymentStatus: "paid" | "pending" | "refunded";
  fulfilmentStatus: "queued" | "preparing" | "ready" | "served" | "cancelled";
  orderedAt: string;
};

type CanteenInspection = {
  id: string;
  title: string;
  score: number;
  status: "passed" | "attention" | "failed";
  inspector: string;
  checkedAt: string;
  notes: string;
};

type CanteenSettings = {
  dailyBudgetCap: number;
  lowStockAlerts: boolean;
  cashlessOnly: boolean;
  allergenWarnings: boolean;
  managerName: string;
};

type CanteenState = {
  menu: CanteenMenuItem[];
  inventory: CanteenInventoryItem[];
  orders: CanteenOrder[];
  inspections: CanteenInspection[];
  settings: CanteenSettings;
};

const SETTINGS_KEY = "owner_canteen_operations";

const defaultSettings: CanteenSettings = {
  dailyBudgetCap: 15000,
  lowStockAlerts: true,
  cashlessOnly: false,
  allergenWarnings: true,
  managerName: "Canteen Manager",
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner canteen ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({
      id: schoolsTable.id,
      name: schoolsTable.name,
      slug: schoolsTable.slug,
      type: schoolsTable.type,
      status: schoolsTable.status,
      currencyCode: schoolsTable.currencyCode,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function seedState(currency = "ZAR"): CanteenState {
  const now = new Date().toISOString();
  const basePrice = currency === "UGX" ? 6500 : currency === "USD" ? 2 : 35;
  return {
    menu: [
      {
        id: crypto.randomUUID(),
        name: "Balanced Lunch Plate",
        category: "Lunch",
        price: basePrice,
        cost: Math.round(basePrice * 0.58),
        status: "active",
        allergens: ["gluten"],
        nutrition: "Protein, vegetables, whole-grain starch",
        servedOn: ["Monday", "Wednesday", "Friday"],
        stockLinkedItem: "Rice",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: "Fresh Fruit & Yoghurt Cup",
        category: "Snack",
        price: Math.max(1, Math.round(basePrice * 0.45)),
        cost: Math.max(1, Math.round(basePrice * 0.25)),
        status: "active",
        allergens: ["dairy"],
        nutrition: "Calcium, fruit sugars, probiotics",
        servedOn: ["Tuesday", "Thursday"],
        stockLinkedItem: "Yoghurt",
        createdAt: now,
        updatedAt: now,
      },
    ],
    inventory: [
      {
        id: crypto.randomUUID(),
        name: "Rice",
        category: "Dry goods",
        unit: "kg",
        quantity: 42,
        reorderLevel: 20,
        unitCost: Math.max(1, Math.round(basePrice * 0.08)),
        supplier: "Approved Local Supplier",
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
        status: "in_stock",
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: "Yoghurt",
        category: "Dairy",
        unit: "litres",
        quantity: 8,
        reorderLevel: 10,
        unitCost: Math.max(1, Math.round(basePrice * 0.12)),
        supplier: "Dairy Partner",
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
        status: "low_stock",
        updatedAt: now,
      },
    ],
    orders: [
      {
        id: crypto.randomUUID(),
        buyerName: "Walk-in student order",
        buyerType: "student",
        items: [{ name: "Balanced Lunch Plate", quantity: 12, price: basePrice }],
        amount: basePrice * 12,
        paymentStatus: "paid",
        fulfilmentStatus: "served",
        orderedAt: now,
      },
      {
        id: crypto.randomUUID(),
        buyerName: "Staff tea break",
        buyerType: "staff",
        items: [{ name: "Fresh Fruit & Yoghurt Cup", quantity: 8, price: Math.max(1, Math.round(basePrice * 0.45)) }],
        amount: Math.max(1, Math.round(basePrice * 0.45)) * 8,
        paymentStatus: "pending",
        fulfilmentStatus: "ready",
        orderedAt: now,
      },
    ],
    inspections: [
      {
        id: crypto.randomUUID(),
        title: "Kitchen hygiene inspection",
        score: 92,
        status: "passed",
        inspector: "Operations Lead",
        checkedAt: now,
        notes: "Storage, handwashing, and preparation areas are compliant.",
      },
    ],
    settings: defaultSettings,
  };
}

function normalizeState(value: unknown, currency?: string | null): CanteenState {
  const fallback = seedState(currency || "ZAR");
  const raw = value && typeof value === "object" ? (value as Partial<CanteenState>) : {};
  return {
    menu: Array.isArray(raw.menu) ? raw.menu.map(normalizeMenuItem).filter(Boolean) as CanteenMenuItem[] : fallback.menu,
    inventory: Array.isArray(raw.inventory) ? raw.inventory.map(normalizeInventoryItem).filter(Boolean) as CanteenInventoryItem[] : fallback.inventory,
    orders: Array.isArray(raw.orders) ? raw.orders.map(normalizeOrder).filter(Boolean) as CanteenOrder[] : fallback.orders,
    inspections: Array.isArray(raw.inspections) ? raw.inspections.map(normalizeInspection).filter(Boolean) as CanteenInspection[] : fallback.inspections,
    settings: { ...defaultSettings, ...(raw.settings && typeof raw.settings === "object" ? raw.settings : {}) },
  };
}

function normalizeMenuItem(value: unknown): CanteenMenuItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Row;
  const id = asString(row.id, crypto.randomUUID());
  const name = asString(row.name);
  if (!name) return null;
  const status = ["active", "paused", "sold_out"].includes(asString(row.status)) ? asString(row.status) as CanteenMenuItem["status"] : "active";
  return {
    id,
    name,
    category: asString(row.category, "Meal"),
    price: asNumber(row.price),
    cost: asNumber(row.cost),
    status,
    allergens: asArray(row.allergens),
    nutrition: asString(row.nutrition),
    servedOn: asArray(row.servedOn),
    stockLinkedItem: asString(row.stockLinkedItem),
    createdAt: asString(row.createdAt, new Date().toISOString()),
    updatedAt: asString(row.updatedAt, new Date().toISOString()),
  };
}

function normalizeInventoryItem(value: unknown): CanteenInventoryItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Row;
  const id = asString(row.id, crypto.randomUUID());
  const name = asString(row.name);
  if (!name) return null;
  const status = ["in_stock", "low_stock", "expired"].includes(asString(row.status)) ? asString(row.status) as CanteenInventoryItem["status"] : inventoryStatus(asNumber(row.quantity), asNumber(row.reorderLevel), asString(row.expiryDate));
  return {
    id,
    name,
    category: asString(row.category, "Stock"),
    unit: asString(row.unit, "units"),
    quantity: asNumber(row.quantity),
    reorderLevel: asNumber(row.reorderLevel),
    unitCost: asNumber(row.unitCost),
    supplier: asString(row.supplier, "Not assigned"),
    expiryDate: asString(row.expiryDate) || null,
    status,
    updatedAt: asString(row.updatedAt, new Date().toISOString()),
  };
}

function normalizeOrder(value: unknown): CanteenOrder | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Row;
  const id = asString(row.id, crypto.randomUUID());
  const buyerName = asString(row.buyerName);
  if (!buyerName) return null;
  const buyerType = ["student", "staff", "guest"].includes(asString(row.buyerType)) ? asString(row.buyerType) as CanteenOrder["buyerType"] : "student";
  const paymentStatus = ["paid", "pending", "refunded"].includes(asString(row.paymentStatus)) ? asString(row.paymentStatus) as CanteenOrder["paymentStatus"] : "pending";
  const fulfilmentStatus = ["queued", "preparing", "ready", "served", "cancelled"].includes(asString(row.fulfilmentStatus)) ? asString(row.fulfilmentStatus) as CanteenOrder["fulfilmentStatus"] : "queued";
  const items = Array.isArray(row.items)
    ? row.items.map((item) => item && typeof item === "object" ? ({ name: asString((item as Row).name, "Item"), quantity: asNumber((item as Row).quantity, 1), price: asNumber((item as Row).price) }) : null).filter(Boolean) as CanteenOrder["items"]
    : [];
  const amount = asNumber(row.amount, items.reduce((sum, item) => sum + item.quantity * item.price, 0));
  return { id, buyerName, buyerType, items, amount, paymentStatus, fulfilmentStatus, orderedAt: asString(row.orderedAt, new Date().toISOString()) };
}

function normalizeInspection(value: unknown): CanteenInspection | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Row;
  const title = asString(row.title);
  if (!title) return null;
  const score = Math.max(0, Math.min(100, asNumber(row.score)));
  const status = score >= 80 ? "passed" : score >= 60 ? "attention" : "failed";
  return {
    id: asString(row.id, crypto.randomUUID()),
    title,
    score,
    status,
    inspector: asString(row.inspector, "Owner"),
    checkedAt: asString(row.checkedAt, new Date().toISOString()),
    notes: asString(row.notes),
  };
}

function inventoryStatus(quantity: number, reorderLevel: number, expiryDate?: string | null): CanteenInventoryItem["status"] {
  if (expiryDate) {
    const date = new Date(expiryDate);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now()) return "expired";
  }
  return quantity <= reorderLevel ? "low_stock" : "in_stock";
}

async function readState(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, currency?: string | null) {
  const rows = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key = ${SETTINGS_KEY} limit 1`), "settings");
  return normalizeState(rows[0]?.value, currency);
}

async function writeState(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, state: CanteenState) {
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, updated_at)
    values (${crypto.randomUUID()}, ${SETTINGS_KEY}, ${JSON.stringify(state)}::jsonb, 'canteen', 'Owner canteen operations state', now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
}

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  const [state, studentRows, userRows, paymentRows] = await Promise.all([
    readState(tenantDb, school.currencyCode),
    safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total from students where lower(status) = 'active'`), "students"),
    safeRows<Row>(() => tenantDb.execute(sql`select role_id, count(*)::int total from users where is_active = true group by role_id`), "users"),
    safeRows<Row>(() => tenantDb.execute(sql`select amount, status, created_at from payments where created_at >= now() - interval '30 days'`), "payments"),
  ]);

  const orderRevenue = state.orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.amount, 0);
  const recordedPayments = paymentRows.filter((row) => ["paid", "completed", "success"].includes(asString(row.status).toLowerCase())).reduce((sum, row) => sum + asNumber(row.amount), 0);
  const inventoryValue = state.inventory.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const lowStock = state.inventory.filter((item) => item.status === "low_stock").length;
  const expired = state.inventory.filter((item) => item.status === "expired").length;
  const activeMenu = state.menu.filter((item) => item.status === "active").length;
  const pendingOrders = state.orders.filter((order) => order.fulfilmentStatus !== "served" && order.fulfilmentStatus !== "cancelled").length;
  const canteenStaff = userRows.filter((row) => ["canteen", "cafeteria", "kitchen"].includes(asString(row.role_id).toLowerCase())).reduce((sum, row) => sum + asNumber(row.total), 0);
  const avgInspection = state.inspections.length ? Math.round(state.inspections.reduce((sum, item) => sum + item.score, 0) / state.inspections.length) : 0;

  return {
    school: { name: school.name, slug: school.slug, type: school.type, status: school.status, currencyCode: school.currencyCode || "ZAR" },
    generatedAt: new Date().toISOString(),
    menu: state.menu,
    inventory: state.inventory,
    orders: state.orders,
    inspections: state.inspections,
    settings: state.settings,
    summary: {
      activeStudents: asNumber(studentRows[0]?.total),
      canteenStaff,
      activeMenu,
      totalMenu: state.menu.length,
      orderRevenue,
      recordedTenantPayments: recordedPayments,
      inventoryValue,
      lowStock,
      expired,
      pendingOrders,
      avgInspection,
      cashlessRate: state.orders.length ? Math.round((state.orders.filter((order) => order.paymentStatus === "paid").length / state.orders.length) * 100) : 0,
    },
  };
}

function sanitizeMenuItem(body: Row, current?: CanteenMenuItem): CanteenMenuItem {
  const now = new Date().toISOString();
  const name = asString(body.name, current?.name || "").slice(0, 120);
  if (!name) throw new Error("Menu item name is required");
  const status = ["active", "paused", "sold_out"].includes(asString(body.status)) ? asString(body.status) as CanteenMenuItem["status"] : current?.status || "active";
  return {
    id: current?.id || crypto.randomUUID(),
    name,
    category: asString(body.category, current?.category || "Meal").slice(0, 80),
    price: Math.max(0, asNumber(body.price, current?.price || 0)),
    cost: Math.max(0, asNumber(body.cost, current?.cost || 0)),
    status,
    allergens: asArray(body.allergens).slice(0, 12),
    nutrition: asString(body.nutrition, current?.nutrition || "").slice(0, 300),
    servedOn: asArray(body.servedOn).slice(0, 7),
    stockLinkedItem: asString(body.stockLinkedItem, current?.stockLinkedItem || "").slice(0, 120),
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
}

function sanitizeInventoryItem(body: Row, current?: CanteenInventoryItem): CanteenInventoryItem {
  const name = asString(body.name, current?.name || "").slice(0, 120);
  if (!name) throw new Error("Inventory item name is required");
  const quantity = Math.max(0, asNumber(body.quantity, current?.quantity || 0));
  const reorderLevel = Math.max(0, asNumber(body.reorderLevel, current?.reorderLevel || 0));
  const expiryDate = asString(body.expiryDate, current?.expiryDate || "") || null;
  return {
    id: current?.id || crypto.randomUUID(),
    name,
    category: asString(body.category, current?.category || "Stock").slice(0, 80),
    unit: asString(body.unit, current?.unit || "units").slice(0, 30),
    quantity,
    reorderLevel,
    unitCost: Math.max(0, asNumber(body.unitCost, current?.unitCost || 0)),
    supplier: asString(body.supplier, current?.supplier || "Not assigned").slice(0, 120),
    expiryDate,
    status: inventoryStatus(quantity, reorderLevel, expiryDate),
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeOrder(body: Row, current?: CanteenOrder): CanteenOrder {
  const buyerName = asString(body.buyerName, current?.buyerName || "").slice(0, 120);
  if (!buyerName) throw new Error("Buyer name is required");
  const buyerType = ["student", "staff", "guest"].includes(asString(body.buyerType)) ? asString(body.buyerType) as CanteenOrder["buyerType"] : current?.buyerType || "student";
  const paymentStatus = ["paid", "pending", "refunded"].includes(asString(body.paymentStatus)) ? asString(body.paymentStatus) as CanteenOrder["paymentStatus"] : current?.paymentStatus || "pending";
  const fulfilmentStatus = ["queued", "preparing", "ready", "served", "cancelled"].includes(asString(body.fulfilmentStatus)) ? asString(body.fulfilmentStatus) as CanteenOrder["fulfilmentStatus"] : current?.fulfilmentStatus || "queued";
  const items = Array.isArray(body.items)
    ? body.items.map((item) => item && typeof item === "object" ? ({ name: asString((item as Row).name, "Item").slice(0, 100), quantity: Math.max(1, asNumber((item as Row).quantity, 1)), price: Math.max(0, asNumber((item as Row).price)) }) : null).filter(Boolean) as CanteenOrder["items"]
    : current?.items || [];
  const amount = Math.max(0, asNumber(body.amount, items.reduce((sum, item) => sum + item.quantity * item.price, 0)));
  return { id: current?.id || crypto.randomUUID(), buyerName, buyerType, items, amount, paymentStatus, fulfilmentStatus, orderedAt: current?.orderedAt || new Date().toISOString() };
}

function sanitizeInspection(body: Row, current?: CanteenInspection): CanteenInspection {
  return normalizeInspection({
    id: current?.id || body.id || crypto.randomUUID(),
    title: asString(body.title, current?.title || "").slice(0, 140),
    score: asNumber(body.score, current?.score || 0),
    inspector: asString(body.inspector, current?.inspector || "Owner").slice(0, 120),
    checkedAt: asString(body.checkedAt, current?.checkedAt || new Date().toISOString()),
    notes: asString(body.notes, current?.notes || "").slice(0, 600),
  })!;
}

function sanitizeSettings(body: Row, current: CanteenSettings): CanteenSettings {
  return {
    dailyBudgetCap: Math.max(0, asNumber(body.dailyBudgetCap, current.dailyBudgetCap)),
    lowStockAlerts: asBoolean(body.lowStockAlerts, current.lowStockAlerts),
    cashlessOnly: asBoolean(body.cashlessOnly, current.cashlessOnly),
    allergenWarnings: asBoolean(body.allergenWarnings, current.allergenWarnings),
    managerName: asString(body.managerName, current.managerName).slice(0, 120),
  };
}

async function mutate(request: NextRequest, method: "POST" | "PATCH" | "DELETE") {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;
  if (currentUser.role !== "owner") return NextResponse.json({ error: "Only owners can manage canteen operations" }, { status: 403 });

  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const school = await getSchool(slug);
  if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const tenantDb = await getTenantDbBySlug(slug);
  const state = await readState(tenantDb, school.currencyCode);
  const body = (await request.json().catch(() => ({}))) as Row;
  const entity = asString(body.entity);
  const id = asString(body.id);

  try {
    if (method === "DELETE") {
      if (!id) return NextResponse.json({ error: "Record id is required" }, { status: 400 });
      if (entity === "menu") state.menu = state.menu.filter((item) => item.id !== id);
      else if (entity === "inventory") state.inventory = state.inventory.filter((item) => item.id !== id);
      else if (entity === "order") state.orders = state.orders.filter((item) => item.id !== id);
      else if (entity === "inspection") state.inspections = state.inspections.filter((item) => item.id !== id);
      else return NextResponse.json({ error: "Unsupported canteen entity" }, { status: 400 });
    } else if (entity === "menu") {
      const index = state.menu.findIndex((item) => item.id === id);
      const next = sanitizeMenuItem(body, index >= 0 ? state.menu[index] : undefined);
      if (index >= 0) state.menu[index] = next;
      else state.menu.unshift(next);
    } else if (entity === "inventory") {
      const index = state.inventory.findIndex((item) => item.id === id);
      const next = sanitizeInventoryItem(body, index >= 0 ? state.inventory[index] : undefined);
      if (index >= 0) state.inventory[index] = next;
      else state.inventory.unshift(next);
    } else if (entity === "order") {
      const index = state.orders.findIndex((item) => item.id === id);
      const next = sanitizeOrder(body, index >= 0 ? state.orders[index] : undefined);
      if (index >= 0) state.orders[index] = next;
      else state.orders.unshift(next);
    } else if (entity === "inspection") {
      const index = state.inspections.findIndex((item) => item.id === id);
      const next = sanitizeInspection(body, index >= 0 ? state.inspections[index] : undefined);
      if (index >= 0) state.inspections[index] = next;
      else state.inspections.unshift(next);
    } else if (entity === "settings") {
      state.settings = sanitizeSettings(body, state.settings);
    } else {
      return NextResponse.json({ error: "Unsupported canteen entity" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid canteen payload" }, { status: 400 });
  }

  await writeState(tenantDb, state);
  return NextResponse.json(await buildPayload(slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const payload = await buildPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner canteen GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner canteen data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return mutate(request, "POST");
}

export async function PATCH(request: NextRequest) {
  return mutate(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return mutate(request, "DELETE");
}
