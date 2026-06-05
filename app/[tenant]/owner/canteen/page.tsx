"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CookingPot,
  CreditCard,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Utensils,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MenuItem = {
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

type InventoryItem = {
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

type Inspection = {
  id: string;
  title: string;
  score: number;
  status: "passed" | "attention" | "failed";
  inspector: string;
  checkedAt: string;
  notes: string;
};

type CanteenPayload = {
  school: { name: string; slug: string; type: string; status: string; currencyCode: string };
  generatedAt: string;
  menu: MenuItem[];
  inventory: InventoryItem[];
  orders: CanteenOrder[];
  inspections: Inspection[];
  settings: {
    dailyBudgetCap: number;
    lowStockAlerts: boolean;
    cashlessOnly: boolean;
    allergenWarnings: boolean;
    managerName: string;
  };
  summary: {
    activeStudents: number;
    canteenStaff: number;
    activeMenu: number;
    totalMenu: number;
    orderRevenue: number;
    recordedTenantPayments: number;
    inventoryValue: number;
    lowStock: number;
    expired: number;
    pendingOrders: number;
    avgInspection: number;
    cashlessRate: number;
  };
};

const emptyMenu = {
  name: "",
  category: "Lunch",
  price: "",
  cost: "",
  status: "active",
  allergens: "",
  nutrition: "",
  servedOn: "Monday, Tuesday, Wednesday, Thursday, Friday",
  stockLinkedItem: "",
};

const emptyInventory = {
  name: "",
  category: "Dry goods",
  unit: "kg",
  quantity: "",
  reorderLevel: "",
  unitCost: "",
  supplier: "",
  expiryDate: "",
};

const emptyOrder = {
  buyerName: "",
  buyerType: "student",
  itemName: "",
  quantity: "1",
  price: "",
  paymentStatus: "pending",
  fulfilmentStatus: "queued",
};

const emptyInspection = {
  title: "",
  score: "90",
  inspector: "",
  notes: "",
};

function money(value: number, currency = "ZAR") {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusClass(status: string) {
  if (["active", "paid", "served", "passed", "in_stock"].includes(status)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["queued", "preparing", "ready", "pending", "low_stock", "attention", "paused"].includes(status)) return "border-primary/25 bg-primary/10 text-primary";
  return "border-destructive/25 bg-destructive/10 text-destructive";
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function OwnerCanteenPage() {
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = params?.tenant || "";
  const [data, setData] = React.useState<CanteenPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [inventoryOpen, setInventoryOpen] = React.useState(false);
  const [orderOpen, setOrderOpen] = React.useState(false);
  const [inspectionOpen, setInspectionOpen] = React.useState(false);
  const [editingMenu, setEditingMenu] = React.useState<MenuItem | null>(null);
  const [editingInventory, setEditingInventory] = React.useState<InventoryItem | null>(null);
  const [menuForm, setMenuForm] = React.useState(emptyMenu);
  const [inventoryForm, setInventoryForm] = React.useState(emptyInventory);
  const [orderForm, setOrderForm] = React.useState(emptyOrder);
  const [inspectionForm, setInspectionForm] = React.useState(emptyInspection);

  const currency = data?.school.currencyCode || "ZAR";

  const fetchData = React.useCallback(async (silent = false) => {
    if (!tenantSlug) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tenant/owner/canteen?tenant=${encodeURIComponent(tenantSlug)}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load owner canteen data");
      setData(payload);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load owner canteen data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function mutate(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
    try {
      const response = await fetch(`/api/tenant/owner/canteen?tenant=${encodeURIComponent(tenantSlug)}`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Canteen update failed");
      setData(payload);
      toast.success(success);
      return true;
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Canteen update failed");
      return false;
    }
  }

  function startEditMenu(item: MenuItem) {
    setEditingMenu(item);
    setMenuForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      cost: String(item.cost),
      status: item.status,
      allergens: item.allergens.join(", "),
      nutrition: item.nutrition,
      servedOn: item.servedOn.join(", "),
      stockLinkedItem: item.stockLinkedItem || "",
    });
    setMenuOpen(true);
  }

  function startEditInventory(item: InventoryItem) {
    setEditingInventory(item);
    setInventoryForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: String(item.quantity),
      reorderLevel: String(item.reorderLevel),
      unitCost: String(item.unitCost),
      supplier: item.supplier,
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
    });
    setInventoryOpen(true);
  }

  const filteredMenu = React.useMemo(() => {
    const query = search.toLowerCase();
    return (data?.menu || []).filter((item) => [item.name, item.category, item.status, item.nutrition].join(" ").toLowerCase().includes(query));
  }, [data?.menu, search]);

  const filteredInventory = React.useMemo(() => {
    const query = search.toLowerCase();
    return (data?.inventory || []).filter((item) => [item.name, item.category, item.supplier, item.status].join(" ").toLowerCase().includes(query));
  }, [data?.inventory, search]);

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Canteen data unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The owner canteen dashboard could not be loaded."}</span>
          <Button variant="outline" onClick={() => fetchData()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const margin = data.summary.orderRevenue ? Math.round(((data.summary.orderRevenue - data.menu.reduce((sum, item) => sum + item.cost, 0)) / data.summary.orderRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px]">
          <div>
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner canteen control</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Canteen operations</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Monitor school meals, stock, cashless sales, compliance checks, and operational risk from the owner dashboard.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Manager</p>
                <p className="mt-2 font-semibold">{data.settings.managerName}</p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Daily cap</p>
                <p className="mt-2 font-semibold">{money(data.settings.dailyBudgetCap, currency)}</p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Generated</p>
                <p className="mt-2 font-semibold">{formatDate(data.generatedAt)}</p>
              </div>
            </div>
          </div>
          <Card className="border-border/70 bg-background/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Health score</CardTitle>
              <CardDescription>Food safety, stock, and order readiness.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold">{data.summary.avgInspection || 0}%</div>
              <Progress value={data.summary.avgInspection || 0} className="mt-4 h-2" />
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border bg-card p-3">
                  <p className="text-muted-foreground">Low stock</p>
                  <p className="text-xl font-semibold">{data.summary.lowStock}</p>
                </div>
                <div className="rounded-2xl border bg-card p-3">
                  <p className="text-muted-foreground">Pending orders</p>
                  <p className="text-xl font-semibold">{data.summary.pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Canteen revenue", value: money(data.summary.orderRevenue, currency), icon: Wallet, detail: `${data.summary.cashlessRate}% cashless completion` },
          { label: "Menu availability", value: `${data.summary.activeMenu}/${data.summary.totalMenu}`, icon: Utensils, detail: "Active menu items" },
          { label: "Inventory value", value: money(data.summary.inventoryValue, currency), icon: Package, detail: `${data.summary.expired} expired item groups` },
          { label: "Eligible learners", value: data.summary.activeStudents.toLocaleString(), icon: CookingPot, detail: `${data.summary.canteenStaff} canteen staff` },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/70 bg-card/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border bg-card/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu, stock, suppliers..." className="rounded-2xl pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
          <Dialog open={menuOpen} onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) {
              setEditingMenu(null);
              setMenuForm(emptyMenu);
            }
          }}>
            <DialogTrigger asChild><Button className="rounded-2xl"><Plus className="mr-2 h-4 w-4" /> Menu item</Button></DialogTrigger>
            <DialogContent className="max-w-2xl rounded-3xl">
              <DialogHeader>
                <DialogTitle>{editingMenu ? "Edit menu item" : "Create menu item"}</DialogTitle>
                <DialogDescription>Maintain owner-approved menu pricing, allergens, days served, and margin controls.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label>Name</Label><Input value={menuForm.name} onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })} /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={menuForm.category} onChange={(event) => setMenuForm({ ...menuForm, category: event.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={menuForm.status} onValueChange={(value) => setMenuForm({ ...menuForm, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="sold_out">Sold out</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Price</Label><Input type="number" value={menuForm.price} onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })} /></div>
                <div className="space-y-2"><Label>Cost</Label><Input type="number" value={menuForm.cost} onChange={(event) => setMenuForm({ ...menuForm, cost: event.target.value })} /></div>
                <div className="space-y-2"><Label>Allergens</Label><Input value={menuForm.allergens} onChange={(event) => setMenuForm({ ...menuForm, allergens: event.target.value })} placeholder="gluten, dairy" /></div>
                <div className="space-y-2"><Label>Served on</Label><Input value={menuForm.servedOn} onChange={(event) => setMenuForm({ ...menuForm, servedOn: event.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Nutrition notes</Label><Textarea value={menuForm.nutrition} onChange={(event) => setMenuForm({ ...menuForm, nutrition: event.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button
                  className="rounded-2xl"
                  onClick={async () => {
                    const ok = await mutate(editingMenu ? "PATCH" : "POST", {
                      entity: "menu",
                      id: editingMenu?.id,
                      ...menuForm,
                      price: Number(menuForm.price),
                      cost: Number(menuForm.cost),
                      allergens: splitList(menuForm.allergens),
                      servedOn: splitList(menuForm.servedOn),
                    }, editingMenu ? "Menu item updated" : "Menu item created");
                    if (ok) setMenuOpen(false);
                  }}
                >
                  Save menu item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {(data.summary.lowStock || data.summary.expired || data.summary.pendingOrders) ? (
        <Alert className="rounded-3xl border-primary/30 bg-primary/5">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <AlertTitle>Owner attention required</AlertTitle>
          <AlertDescription>
            {data.summary.lowStock} low-stock groups, {data.summary.expired} expired groups, and {data.summary.pendingOrders} active orders need monitoring before the next meal service.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex w-fit rounded-full bg-muted/60 p-1">
          {["overview", "menu", "inventory", "orders", "compliance", "settings"].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="rounded-full px-5 capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70 bg-card/80">
            <CardHeader><CardTitle>Operational snapshot</CardTitle><CardDescription>Owner-level canteen activity and risk state.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {data.orders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex flex-col gap-3 rounded-2xl border bg-background/60 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{order.buyerName}</p>
                    <p className="text-sm text-muted-foreground">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusClass(order.paymentStatus)}>{order.paymentStatus}</Badge>
                    <Badge variant="outline" className={statusClass(order.fulfilmentStatus)}>{order.fulfilmentStatus}</Badge>
                    <p className="min-w-24 text-right font-semibold">{money(order.amount, currency)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80">
            <CardHeader><CardTitle>Margin estimate</CardTitle><CardDescription>Simple owner margin indicator from current paid order revenue.</CardDescription></CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold">{margin}%</div>
              <Progress value={Math.max(0, Math.min(100, margin))} className="mt-4 h-2" />
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Paid canteen sales</span><span>{money(data.summary.orderRevenue, currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current stock value</span><span>{money(data.summary.inventoryValue, currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Recorded school payments</span><span>{money(data.summary.recordedTenantPayments, currency)}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="grid gap-4 lg:grid-cols-2">
          {filteredMenu.map((item) => (
            <Card key={item.id} className="border-border/70 bg-card/80">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div><CardTitle>{item.name}</CardTitle><CardDescription>{item.category} · served {item.servedOn.join(", ") || "not scheduled"}</CardDescription></div>
                  <Badge variant="outline" className={statusClass(item.status)}>{item.status.replace("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Price</p><p className="font-semibold">{money(item.price, currency)}</p></div>
                  <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Cost</p><p className="font-semibold">{money(item.cost, currency)}</p></div>
                  <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Margin</p><p className="font-semibold">{item.price ? Math.round(((item.price - item.cost) / item.price) * 100) : 0}%</p></div>
                </div>
                <p className="text-sm text-muted-foreground">{item.nutrition || "No nutrition notes recorded."}</p>
                <div className="flex flex-wrap gap-2">{item.allergens.map((allergen) => <Badge key={allergen} variant="secondary" className="rounded-full">{allergen}</Badge>)}</div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="rounded-2xl" onClick={() => startEditMenu(item)}>Edit</Button>
                  <Button variant="destructive" className="rounded-2xl" onClick={() => mutate("DELETE", { entity: "menu", id: item.id }, "Menu item deleted")}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={inventoryOpen} onOpenChange={(open) => {
              setInventoryOpen(open);
              if (!open) {
                setEditingInventory(null);
                setInventoryForm(emptyInventory);
              }
            }}>
              <DialogTrigger asChild><Button className="rounded-2xl"><Plus className="mr-2 h-4 w-4" /> Stock item</Button></DialogTrigger>
              <DialogContent className="max-w-2xl rounded-3xl">
                <DialogHeader><DialogTitle>{editingInventory ? "Edit stock item" : "Create stock item"}</DialogTitle><DialogDescription>Track quantity, reorder levels, supplier, cost, and expiry.</DialogDescription></DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["name", "Name"], ["category", "Category"], ["unit", "Unit"], ["quantity", "Quantity"], ["reorderLevel", "Reorder level"], ["unitCost", "Unit cost"], ["supplier", "Supplier"], ["expiryDate", "Expiry date"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input type={["quantity", "reorderLevel", "unitCost"].includes(key) ? "number" : key === "expiryDate" ? "date" : "text"} value={(inventoryForm as Record<string, string>)[key]} onChange={(event) => setInventoryForm({ ...inventoryForm, [key]: event.target.value })} />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button className="rounded-2xl" onClick={async () => {
                    const ok = await mutate(editingInventory ? "PATCH" : "POST", {
                      entity: "inventory",
                      id: editingInventory?.id,
                      ...inventoryForm,
                      quantity: Number(inventoryForm.quantity),
                      reorderLevel: Number(inventoryForm.reorderLevel),
                      unitCost: Number(inventoryForm.unitCost),
                    }, editingInventory ? "Stock item updated" : "Stock item created");
                    if (ok) setInventoryOpen(false);
                  }}>Save stock item</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredInventory.map((item) => (
              <Card key={item.id} className="border-border/70 bg-card/80">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="font-semibold">{item.name}</p><p className="text-sm text-muted-foreground">{item.category} · {item.supplier}</p></div>
                    <Badge variant="outline" className={statusClass(item.status)}>{item.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">On hand</p><p className="font-semibold">{item.quantity} {item.unit}</p></div>
                    <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Reorder</p><p className="font-semibold">{item.reorderLevel} {item.unit}</p></div>
                    <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Value</p><p className="font-semibold">{money(item.quantity * item.unitCost, currency)}</p></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Expiry: {formatDate(item.expiryDate)}</span><span>Updated: {formatDate(item.updatedAt)}</span></div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" className="rounded-2xl" onClick={() => startEditInventory(item)}>Edit</Button>
                    <Button variant="destructive" className="rounded-2xl" onClick={() => mutate("DELETE", { entity: "inventory", id: item.id }, "Stock item deleted")}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={orderOpen} onOpenChange={(open) => {
              setOrderOpen(open);
              if (!open) setOrderForm(emptyOrder);
            }}>
              <DialogTrigger asChild><Button className="rounded-2xl"><Plus className="mr-2 h-4 w-4" /> Manual order</Button></DialogTrigger>
              <DialogContent className="max-w-xl rounded-3xl">
                <DialogHeader><DialogTitle>Create manual order</DialogTitle><DialogDescription>Record a canteen order while the full POS module is being rolled out.</DialogDescription></DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2"><Label>Buyer name</Label><Input value={orderForm.buyerName} onChange={(event) => setOrderForm({ ...orderForm, buyerName: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Buyer type</Label><Select value={orderForm.buyerType} onValueChange={(value) => setOrderForm({ ...orderForm, buyerType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="guest">Guest</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Payment</Label><Select value={orderForm.paymentStatus} onValueChange={(value) => setOrderForm({ ...orderForm, paymentStatus: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Item</Label><Input value={orderForm.itemName} onChange={(event) => setOrderForm({ ...orderForm, itemName: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Fulfilment</Label><Select value={orderForm.fulfilmentStatus} onValueChange={(value) => setOrderForm({ ...orderForm, fulfilmentStatus: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="queued">Queued</SelectItem><SelectItem value="preparing">Preparing</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="served">Served</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Price</Label><Input type="number" value={orderForm.price} onChange={(event) => setOrderForm({ ...orderForm, price: event.target.value })} /></div>
                </div>
                <DialogFooter><Button className="rounded-2xl" onClick={async () => {
                  const quantity = Number(orderForm.quantity);
                  const price = Number(orderForm.price);
                  const ok = await mutate("POST", { entity: "order", buyerName: orderForm.buyerName, buyerType: orderForm.buyerType, paymentStatus: orderForm.paymentStatus, fulfilmentStatus: orderForm.fulfilmentStatus, items: [{ name: orderForm.itemName, quantity, price }], amount: quantity * price }, "Order recorded");
                  if (ok) setOrderOpen(false);
                }}>Save order</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {data.orders.map((order) => (
              <Card key={order.id} className="border-border/70 bg-card/80">
                <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div><p className="font-semibold">{order.buyerName}</p><p className="text-sm text-muted-foreground">{order.buyerType} · {formatDate(order.orderedAt)} · {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={statusClass(order.paymentStatus)}>{order.paymentStatus}</Badge>
                    <Select value={order.fulfilmentStatus} onValueChange={(value) => mutate("PATCH", { ...order, entity: "order", fulfilmentStatus: value }, "Order status updated")}>
                      <SelectTrigger className="w-36 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="queued">Queued</SelectItem><SelectItem value="preparing">Preparing</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="served">Served</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                    </Select>
                    <p className="min-w-24 text-right font-semibold">{money(order.amount, currency)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={inspectionOpen} onOpenChange={(open) => {
              setInspectionOpen(open);
              if (!open) setInspectionForm(emptyInspection);
            }}>
              <DialogTrigger asChild><Button className="rounded-2xl"><Plus className="mr-2 h-4 w-4" /> Inspection</Button></DialogTrigger>
              <DialogContent className="max-w-xl rounded-3xl">
                <DialogHeader><DialogTitle>Add inspection</DialogTitle><DialogDescription>Record food safety, hygiene, supplier, or kitchen compliance checks.</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={inspectionForm.title} onChange={(event) => setInspectionForm({ ...inspectionForm, title: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Score</Label><Input type="number" value={inspectionForm.score} onChange={(event) => setInspectionForm({ ...inspectionForm, score: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Inspector</Label><Input value={inspectionForm.inspector} onChange={(event) => setInspectionForm({ ...inspectionForm, inspector: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={inspectionForm.notes} onChange={(event) => setInspectionForm({ ...inspectionForm, notes: event.target.value })} /></div>
                </div>
                <DialogFooter><Button className="rounded-2xl" onClick={async () => {
                  const ok = await mutate("POST", { entity: "inspection", ...inspectionForm, score: Number(inspectionForm.score) }, "Inspection recorded");
                  if (ok) setInspectionOpen(false);
                }}>Save inspection</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.inspections.map((inspection) => (
              <Card key={inspection.id} className="border-border/70 bg-card/80">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{inspection.title}</p><p className="text-sm text-muted-foreground">{inspection.inspector} · {formatDate(inspection.checkedAt)}</p></div><Badge variant="outline" className={statusClass(inspection.status)}>{inspection.status}</Badge></div>
                  <div className="mt-4 flex items-center gap-4"><Progress value={inspection.score} className="h-2" /><span className="font-semibold">{inspection.score}%</span></div>
                  <p className="mt-4 text-sm text-muted-foreground">{inspection.notes}</p>
                  <div className="mt-4 flex justify-end"><Button variant="destructive" className="rounded-2xl" onClick={() => mutate("DELETE", { entity: "inspection", id: inspection.id }, "Inspection deleted")}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-border/70 bg-card/80">
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Canteen controls</CardTitle><CardDescription>Owner controls for operating limits and safety behavior.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Manager name</Label><Input value={data.settings.managerName} onChange={(event) => setData({ ...data, settings: { ...data.settings, managerName: event.target.value } })} /></div>
                <div className="space-y-2"><Label>Daily budget cap</Label><Input type="number" value={String(data.settings.dailyBudgetCap)} onChange={(event) => setData({ ...data, settings: { ...data.settings, dailyBudgetCap: Number(event.target.value) } })} /></div>
              </div>
              {[
                ["lowStockAlerts", "Low stock alerts", "Raise attention warnings when stock reaches reorder level."],
                ["cashlessOnly", "Cashless-only policy", "Require canteen payments to be recorded as cashless/paid."],
                ["allergenWarnings", "Allergen warnings", "Show allergen warnings in menu governance checks."],
              ].map(([key, title, description]) => (
                <div key={key} className="flex items-center justify-between rounded-2xl border bg-background/60 p-4">
                  <div><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{description}</p></div>
                  <Switch checked={Boolean((data.settings as unknown as Record<string, boolean>)[key])} onCheckedChange={(checked) => setData({ ...data, settings: { ...data.settings, [key]: checked } })} />
                </div>
              ))}
              <div className="flex justify-end">
                <Button className="rounded-2xl" onClick={() => mutate("PATCH", { entity: "settings", ...data.settings }, "Canteen settings saved")}><CheckCircle2 className="mr-2 h-4 w-4" /> Save settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
