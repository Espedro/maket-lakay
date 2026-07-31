"use client";

import type {
  AvailabilityFilter,
  ProductDiscoveryContext,
  ProductDiscoveryFilters,
} from "@/lib/product-discovery";

interface FilterPanelProps {
  context: ProductDiscoveryContext;
  brands: string[];
  filters: ProductDiscoveryFilters;
  lockedCategoryId?: string;
  lockedStoreId?: string;
  onChange: (filters: ProductDiscoveryFilters) => void;
  onClear: () => void;
}

const priceOptions = [
  { label: "Any price", minPrice: undefined, maxPrice: undefined },
  { label: "Under $20", minPrice: undefined, maxPrice: 20 },
  { label: "$20 to $50", minPrice: 20, maxPrice: 50 },
  { label: "$50 and above", minPrice: 50, maxPrice: undefined },
];

const availabilityOptions: Array<{ label: string; value: AvailabilityFilter }> = [
  { label: "Any availability", value: "all" },
  { label: "In stock", value: "in-stock" },
  { label: "Out of stock", value: "out-of-stock" },
  { label: "Unavailable", value: "unavailable" },
];

export function FilterPanel({
  context,
  brands,
  filters,
  lockedCategoryId,
  lockedStoreId,
  onChange,
  onClear,
}: FilterPanelProps) {
  const update = (nextFilters: Partial<ProductDiscoveryFilters>) => {
    onChange({ ...filters, ...nextFilters });
  };

  const selectedPriceIndex = priceOptions.findIndex(
    (option) =>
      option.minPrice === filters.minPrice && option.maxPrice === filters.maxPrice,
  );

  return (
    <aside className="space-y-6 bg-white text-sm">
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-base font-black">Filters</h2>
        <button type="button" className="font-semibold text-primary" onClick={onClear}>
          Clear all
        </button>
      </div>

      {!lockedCategoryId ? (
        <fieldset className="space-y-2">
          <legend className="font-bold">Category</legend>
          <select
            value={filters.categoryId ?? ""}
            onChange={(event) =>
              update({ categoryId: event.target.value || undefined })
            }
            className="h-10 w-full border bg-white px-3"
          >
            <option value="">All categories</option>
            {context.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </fieldset>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="font-bold">Price range</legend>
        <div className="space-y-2">
          {priceOptions.map((option, index) => (
            <label key={option.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="price"
                checked={(selectedPriceIndex === -1 ? 0 : selectedPriceIndex) === index}
                onChange={() =>
                  update({
                    minPrice: option.minPrice,
                    maxPrice: option.maxPrice,
                  })
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-bold">Brand</legend>
        <select
          value={filters.brand ?? ""}
          onChange={(event) => update({ brand: event.target.value || undefined })}
          className="h-10 w-full border bg-white px-3"
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </fieldset>

      {!lockedStoreId ? (
        <fieldset className="space-y-2">
          <legend className="font-bold">Vendor</legend>
          <select
            value={filters.storeId ?? ""}
            onChange={(event) => update({ storeId: event.target.value || undefined })}
            className="h-10 w-full border bg-white px-3"
          >
            <option value="">All stores</option>
            {context.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </fieldset>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="font-bold">Rating</legend>
        <select
          value={filters.minRating?.toString() ?? ""}
          onChange={(event) =>
            update({
              minRating: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          className="h-10 w-full border bg-white px-3"
        >
          <option value="">Any rating</option>
          <option value="4.5">4.5 stars and up</option>
          <option value="4">4 stars and up</option>
          <option value="3">3 stars and up</option>
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-bold">Availability</legend>
        <select
          value={filters.availability ?? "all"}
          onChange={(event) =>
            update({ availability: event.target.value as AvailabilityFilter })
          }
          className="h-10 w-full border bg-white px-3"
        >
          {availabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </fieldset>
    </aside>
  );
}
