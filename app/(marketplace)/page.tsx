import { FeaturedCategories } from "@/components/homepage/featured-categories";
import { HomepageStates } from "@/components/homepage/homepage-states";
import { MarketplaceBenefits } from "@/components/homepage/marketplace-benefits";
import { NewsletterSection } from "@/components/homepage/newsletter-section";
import { PopularStoresSection } from "@/components/homepage/popular-stores-section";
import { ProductSection } from "@/components/homepage/product-section";
import { PromotionalBanners } from "@/components/homepage/promotional-banners";
import { RetailDealGrid } from "@/components/homepage/retail-deal-grid";
import { RetailShowcase } from "@/components/homepage/retail-showcase";
import { products } from "@/data/mock-data";

export default function MarketplaceHome() {
  const trendingProducts = products.filter((product) => product.isTrending).slice(0, 4);
  const newArrivals = products.filter((product) => product.isNewArrival).slice(0, 4);
  const recommendedProducts = products
    .filter((product) => product.isRecommended)
    .slice(0, 4);

  return (
    <div className="bg-white">
      <RetailShowcase />
      <RetailDealGrid />
      <div className="space-y-12 bg-white py-10">
        <FeaturedCategories />
        <ProductSection
          id="trending-products"
          title="Trending products"
          description="Fast-moving products from trusted Haitian vendors and diaspora-friendly stores."
          products={trendingProducts}
        />
        <PopularStoresSection />
        <ProductSection
          title="New arrivals"
          description="Fresh catalog additions, including active, out-of-stock, and unavailable states."
          products={newArrivals}
        />
        <PromotionalBanners />
        <ProductSection
          id="recommended-products"
          title="Recommended for you"
          description="A mix of local favorites, practical essentials, and products with strong ratings."
          products={recommendedProducts}
        />
        <MarketplaceBenefits />
        <HomepageStates />
        <NewsletterSection />
      </div>
    </div>
  );
}
