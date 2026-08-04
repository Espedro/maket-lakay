import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getProducts } from "@/services/products";
import { cn, formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

const heroTiles = [
  {
    title: "Back-to-school essentials",
    subtitle: "Books, kits, lamps, and supplies",
    tone: "bg-cyan-200",
    products: ["prod-school-kit", "prod-creole-reader", "prod-solar-desk-lamp"],
  },
  {
    title: "Low prices on electronics",
    subtitle: "Phones, solar gear, and accessories",
    tone: "bg-sky-200",
    products: ["prod-solar-lantern", "prod-phone-case", "prod-standing-fan"],
  },
  {
    title: "Trending pantry picks",
    subtitle: "Coffee, mamba, and everyday favorites",
    tone: "bg-rose-300",
    products: ["prod-cafe-rebo", "prod-mamba-spicy", "prod-shea-hair-butter"],
  },
  {
    title: "Home and everywhere",
    subtitle: "Useful goods for family life",
    tone: "bg-amber-200",
    products: ["prod-cast-iron-pot", "prod-standing-fan", "prod-baby-care-bundle"],
  },
  {
    title: "Made close to home",
    subtitle: "Artisan products with local character",
    tone: "bg-emerald-200",
    products: ["prod-artisan-basket", "prod-haitian-flag-shirt", "prod-creole-reader"],
  },
];

function ProductMini({ product }: { product: Product }) {
  return (
    <div className="rounded-md bg-white/75 p-2 shadow-sm">
      <div className="relative aspect-square overflow-hidden rounded-sm bg-white">
        <Image src={product.image} alt={product.name} fill className="object-cover" />
      </div>
      <p className="mt-1 line-clamp-1 text-xs font-semibold">{product.name}</p>
    </div>
  );
}

export async function RetailShowcase() {
  const products = await getProducts();

  function findProduct(productId: string) {
    return products.find((product) => product.id === productId);
  }

  const spotlight = products.find((product) => product.id === "prod-artisan-basket");

  return (
    <section className="bg-white pb-5">
      <div className="container pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {spotlight ? (
            <Link
              href={`/products/${spotlight.slug}`}
              className="relative min-h-[360px] w-[300px] shrink-0 overflow-hidden border bg-white p-4 shadow-card md:w-[330px]"
            >
              <Badge variant="secondary">New release</Badge>
              <h1 className="mt-3 text-3xl font-black leading-none tracking-normal">
                Local artisan goods for gifting
              </h1>
              <p className="mt-3 text-lg font-semibold">Starting at {formatCurrency(spotlight.price, spotlight.currency)}</p>
              <div className="relative mt-8 aspect-square">
                <Image src={spotlight.image} alt={spotlight.name} fill className="object-contain" priority />
              </div>
              <span className="absolute bottom-4 left-4 flex size-8 items-center justify-center rounded-full bg-slate-950 text-white">
                <Play className="size-4 fill-current" />
              </span>
            </Link>
          ) : null}
          {heroTiles.map((tile, index) => {
            const tileProducts = tile.products.map(findProduct).filter(Boolean) as Product[];
            return (
              <Link
                key={tile.title}
                href="#trending-products"
                className={cn(
                  "relative min-h-[360px] w-[300px] shrink-0 overflow-hidden rounded-lg p-4 text-slate-950 shadow-card md:w-[330px]",
                  tile.tone,
                )}
              >
                <p className="text-sm font-semibold">{tile.subtitle}</p>
                <h2 className="mt-1 text-3xl font-black leading-tight tracking-normal">
                  {tile.title}
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {tileProducts.slice(0, 4).map((product) => (
                    <ProductMini key={product.id} product={product} />
                  ))}
                </div>
                <span className="absolute bottom-4 left-4 flex size-8 items-center justify-center rounded-full bg-slate-950 text-white">
                  {index === 1 ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
