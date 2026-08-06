import {
  ChartLineUp,
  ClockCounterClockwise,
  Cube,
  Database,
  Gear,
  ImageSquare,
  Package,
  PaintBrush,
  Plug,
  ShoppingCart,
  Tag,
  UserGear,
  UsersThree,
} from "@phosphor-icons/react";

export const NAVIGATION = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Overview", description: "KPIs and operational signals", icon: ChartLineUp, permission: "dashboard.read" },
      { id: "orders", label: "Orders", description: "Fulfillment and payments", icon: Package, permission: "orders.read" },
      { id: "customers", label: "Customers", description: "Profiles and history", icon: UsersThree, permission: "customers.read" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { id: "products", label: "Products", description: "Catalog and pricing", icon: ShoppingCart, permission: "catalog.read" },
      { id: "inventory", label: "Inventory", description: "Stock and availability", icon: Cube, permission: "catalog.read" },
      { id: "catalog", label: "Catalog operations", description: "Import and normalization", icon: Database, permission: "catalog.import" },
      { id: "promotions", label: "Promotions", description: "Coupons and campaigns", icon: Tag, permission: "promotions.manage" },
    ],
  },
  {
    id: "experience",
    label: "Experience",
    items: [
      { id: "media", label: "Media library", description: "Images, video and attachments", icon: ImageSquare, permission: "media.manage" },
      { id: "customization", label: "Store customization", description: "Brand and checkout settings", icon: PaintBrush, permission: "storefront.manage" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { id: "integrations", label: "Integrations", description: "Connected services", icon: Plug, permission: "integrations.manage" },
      { id: "administrators", label: "Administrators", description: "Users, roles and access", icon: UserGear, permission: "users.manage" },
      { id: "audit", label: "Audit history", description: "Security and change log", icon: ClockCounterClockwise, permission: "audit.read" },
      { id: "system", label: "System settings", description: "Runtime and deployment", icon: Gear, permission: "settings.manage" },
    ],
  },
];

export const NAV_ITEMS = NAVIGATION.flatMap((group) => group.items);
export const VIEW_MAP = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item]));

export function hasPermission(permissions, permission) {
  if (!permission) return true;
  return permissions?.includes("*") || permissions?.includes(permission);
}

export function allowedNavigation(permissions) {
  return NAVIGATION
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(permissions, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}

export function viewFromPath(pathname = window.location.pathname) {
  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return VIEW_MAP[segment] ? segment : "dashboard";
}

export function pathForView(view) {
  return `/admin/${VIEW_MAP[view] ? view : "dashboard"}`;
}
