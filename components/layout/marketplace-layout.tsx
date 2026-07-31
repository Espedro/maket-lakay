import { AnnouncementBar } from "@/components/marketplace/announcement-bar";
import { CategoryNavigation } from "@/components/marketplace/category-navigation";
import { Footer } from "@/components/marketplace/footer";
import { Header } from "@/components/marketplace/header";
import { MobileBottomNavigation } from "@/components/marketplace/mobile-bottom-navigation";

interface MarketplaceLayoutProps {
  children: React.ReactNode;
}

export function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AnnouncementBar />
      <Header />
      <CategoryNavigation />
      <main>{children}</main>
      <Footer />
      <MobileBottomNavigation />
    </div>
  );
}
