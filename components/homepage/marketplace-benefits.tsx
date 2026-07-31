import { Headphones, Languages, ShieldCheck, Truck } from "lucide-react";

const benefits = [
  {
    title: "Trusted vendor signals",
    description: "Verification badges, ratings, and store details help customers shop with confidence.",
    icon: ShieldCheck,
  },
  {
    title: "Location-aware shopping",
    description: "The interface is prepared for local delivery and diaspora shopping flows.",
    icon: Truck,
  },
  {
    title: "Built for language expansion",
    description: "English is the default, with structure ready for Haitian Creole and French.",
    icon: Languages,
  },
  {
    title: "Friendly support patterns",
    description: "Clear empty states, confirmations, and toast feedback guide customers through actions.",
    icon: Headphones,
  },
];

export function MarketplaceBenefits() {
  return (
    <section className="border-y bg-white">
      <div className="container grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => (
          <div key={benefit.title} className="space-y-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-secondary/35 text-primary">
              <benefit.icon className="size-5" />
            </span>
            <h3 className="font-semibold">{benefit.title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
