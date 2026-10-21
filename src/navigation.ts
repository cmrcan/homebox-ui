import {
  LayoutDashboard,
  Package,
  MapPin,
  Tag,
  Layers,
  LayoutTemplate,
  Wrench,
  Users,
  Settings2,
} from "lucide-vue-next";

export const collection = [
  { id: "overview", name: "Genel bakış", icon: LayoutDashboard },
  { id: "inventory", name: "Envanterim", icon: Package },
  { id: "locations", name: "Konumlar", icon: MapPin },
  { id: "tags", name: "Etiketler", icon: Tag },
] as const;
export const configuration = [
  { id: "types", name: "Ürün türleri", icon: Layers },
  { id: "templates", name: "Alan şablonları", icon: LayoutTemplate },
  { id: "maintenance", name: "Bakım", icon: Wrench },
  { id: "users", name: "Kullanıcılar", icon: Users },
  { id: "tools", name: "Araçlar", icon: Settings2 },
] as const;
