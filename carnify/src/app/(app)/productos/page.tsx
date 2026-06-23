import { requirePageAccess } from "@/lib/permissions";
import ProductosContent from "@/components/productos/ProductosContent";

export default async function ProductosPage() {
  await requirePageAccess("productos");
  return <ProductosContent />;
}
