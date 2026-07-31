import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { products } from "@/data/mock-data";
import type { Product } from "@/types";

const dealCards = [
  {
    title: "Save on home essentials",
    productIds: ["prod-cast-iron-pot", "prod-standing-fan", "prod-solar-lantern", "prod-solar-desk-lamp"],
  },
  {
    title: "Shop Haitian pantry favorites",
    productIds: ["prod-cafe-rebo", "prod-mamba-spicy", "prod-school-kit", "prod-baby-care-bundle"],
  },
  {
    title: "Fashion and handmade finds",
    productIds: ["prod-haitian-flag-shirt", "prod-artisan-basket", "prod-creole-reader", "prod-shea-hair-butter"],
  },
  {
    title: "Tech deals for everyday life",
    productIds: ["prod-phone-case", "prod-solar-lantern", "prod-solar-desk-lamp", "prod-standing-fan"],
  },
];

function findProduct(productId: string) {
  return products.find((product) => product.id === productId);
}

function DealProduct({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-sm bg-slate-100">
        <Image src={product.image} alt={product.name} fill className="object-cover transition-transform group-hover:scale-105" />
      </div>
      <p className="mt-2 line-clamp-1 text-xs font-medium">{product.name}</p>
    </Link>
  );
}

export function RetailDealGrid() {
  return (
    <section className="bg-white pb-8">
      <div className="container grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dealCards.map((card) => {
          const cardProducts = card.productIds.map(findProduct).filter(Boolean) as Product[];
          return (
            <div key={card.title} className="rounded-md bg-white p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-xl font-black leading-tight tracking-normal">{card.title}</h2>
                <ArrowRight className="mt-1 size-5 shrink-0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {cardProducts.map((product) => (
                  <DealProduct key={product.id} product={product} />
                ))}
              </div>
              <Link href="#recommended-products" className="mt-4 inline-flex text-sm font-semibold text-primary">
                See more
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
