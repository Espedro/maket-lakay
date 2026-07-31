import { AccountAreaClient } from "@/components/account/account-area-client";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";

export default function AccountProfilePage() {
  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Account", href: "/account" }, { label: "Profile" }]} />
      <AccountAreaClient view="profile" />
    </div>
  );
}
