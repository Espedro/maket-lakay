import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground">
              ML
            </span>
            <span className="font-bold">Maket Lakay</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            A friendly marketplace foundation for Haiti and the Haitian diaspora.
          </p>
        </div>
        {[
          {
            title: "Marketplace",
            links: [
              ["Categories", "/categories"],
              ["Stores", "/stores"],
              ["Products", "/products"],
            ],
          },
          {
            title: "Support",
            links: [
              ["Help center", "/support"],
              ["Orders", "/orders"],
              ["Payments", "/payments"],
            ],
          },
          {
            title: "Company",
            links: [
              ["Vendor program", "/sell"],
              ["Admin demo", "/admin"],
              ["Vendor demo", "/vendor"],
            ],
          },
        ].map(({ title, links }) => (
          <div key={title} className="space-y-3">
            <h3 className="text-sm font-semibold">{title}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-4">
        <div className="container text-sm text-muted-foreground">
          Copyright 2026 Maket Lakay.
        </div>
      </div>
    </footer>
  );
}
