"use client";

import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const newsletterSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type NewsletterInput = z.infer<typeof newsletterSchema>;

export function NewsletterSection() {
  const form = useForm<NewsletterInput>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: NewsletterInput) {
    toast({
      title: "You are on the list",
      description: `Marketplace updates will be sent to ${values.email}.`,
    });
    form.reset();
  }

  return (
    <section className="container pb-12">
      <div className="rounded-lg border bg-white p-6 shadow-soft sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <span className="mb-4 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Mail className="size-5" />
            </span>
            <h2 className="text-2xl font-bold sm:text-3xl">Get marketplace updates</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Hear about new Haitian vendors, seasonal deals, and category drops.
              This is a frontend-only signup interaction.
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row">
            <Input
              {...form.register("email")}
              type="email"
              placeholder="you@example.com"
              className="h-11"
            />
            <Button type="submit" className="h-11 shrink-0">
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
