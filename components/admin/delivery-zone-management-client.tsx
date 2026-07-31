"use client";

import * as React from "react";
import { CheckCircle2, Edit3, MapPin, Plus, Search, Truck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { useAdminOperations } from "@/hooks/use-admin-operations";
import type { DeliveryZoneInput, ManagedDeliveryZone } from "@/lib/admin-operations";
import { formatCurrency } from "@/lib/utils";

const emptyZone: DeliveryZoneInput = {
  active: true,
  baseFee: 4,
  city: "",
  country: "Haiti",
  department: "Ouest",
  estimatedDays: 2,
  name: "",
  region: "Ouest",
  zone: "",
};

type ZoneAction = {
  zone: ManagedDeliveryZone;
  active: boolean;
};

function zoneToInput(zone: ManagedDeliveryZone): DeliveryZoneInput {
  return {
    id: zone.id,
    active: zone.active,
    baseFee: zone.baseFee,
    city: zone.city,
    country: zone.country,
    currency: zone.currency,
    department: zone.department,
    estimatedDays: zone.estimatedDays,
    name: zone.name,
    region: zone.region,
    zone: zone.zone,
  };
}

export function DeliveryZoneManagementClient() {
  const { isReady, saveDeliveryZone, setDeliveryZoneActive, state } = useAdminOperations();
  const [query, setQuery] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [formValues, setFormValues] = React.useState<DeliveryZoneInput>(emptyZone);
  const [pendingAction, setPendingAction] = React.useState<ZoneAction | null>(null);

  const zones = state.deliveryZones.filter((zone) => {
    const normalizedQuery = query.toLowerCase();
    return (
      zone.department.toLowerCase().includes(normalizedQuery) ||
      zone.city.toLowerCase().includes(normalizedQuery) ||
      zone.zone.toLowerCase().includes(normalizedQuery)
    );
  });

  function updateField<K extends keyof DeliveryZoneInput>(key: K, value: DeliveryZoneInput[K]) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [key]: value,
      name: key === "zone" ? String(value) : currentValues.name,
      region: key === "department" ? String(value) : currentValues.region,
    }));
  }

  function openAddForm() {
    setFormValues(emptyZone);
    setFormOpen(true);
  }

  function openEditForm(zone: ManagedDeliveryZone) {
    setFormValues(zoneToInput(zone));
    setFormOpen(true);
  }

  function submitZone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveDeliveryZone({
      ...formValues,
      baseFee: Number(formValues.baseFee || 0),
      estimatedDays: Number(formValues.estimatedDays || 1),
      name: formValues.zone,
      region: formValues.department,
    });
    setFormOpen(false);
  }

  function confirmZoneAction() {
    if (!pendingAction) return;
    setDeliveryZoneActive(pendingAction.zone.id, pendingAction.active);
    setPendingAction(null);
  }

  function renderZoneActions(zone: ManagedDeliveryZone) {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(zone)}>
          <Edit3 className="size-4" />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPendingAction({ zone, active: !zone.active })}
        >
          {zone.active ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          {zone.active ? "Disable" : "Enable"}
        </Button>
      </>
    );
  }

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Delivery Zone Management
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Delivery zones</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage departments, cities, zones, delivery fees, ETA windows, and active coverage.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[260px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="rounded-none pl-9 shadow-none"
                placeholder="Search zones..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Button type="button" onClick={openAddForm}>
              <Plus className="size-4" />
              Add zone
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ZoneMetric icon={MapPin} label="Zones" value={state.deliveryZones.length.toString()} />
        <ZoneMetric
          icon={CheckCircle2}
          label="Active zones"
          value={state.deliveryZones.filter((zone) => zone.active).length.toString()}
        />
        <ZoneMetric
          icon={XCircle}
          label="Disabled zones"
          value={state.deliveryZones.filter((zone) => !zone.active).length.toString()}
        />
        <ZoneMetric
          icon={Truck}
          label="Avg ETA"
          value={`${Math.round(
            state.deliveryZones.reduce((sum, zone) => sum + zone.estimatedDays, 0) /
              Math.max(1, state.deliveryZones.length),
          )} days`}
        />
      </section>

      <section className="border bg-white p-5">
        <ResponsiveDataView
          items={zones}
          getKey={(zone) => zone.id}
          cardTitle={(zone) => zone.zone}
          cardDescription={(zone) => `${zone.city}, ${zone.department}, ${zone.country}`}
          cardMeta={(zone) => (
            <Badge variant={zone.active ? "success" : "neutral"}>
              {zone.active ? "Active" : "Disabled"}
            </Badge>
          )}
          cardFields={(zone) => [
            { label: "Fee", value: formatCurrency(zone.baseFee, zone.currency) },
            { label: "ETA", value: `${zone.estimatedDays} day window` },
          ]}
          cardActions={renderZoneActions}
          emptyState={
            <div className="border p-6 text-center text-sm text-muted-foreground">
              No delivery zones match this search.
            </div>
          }
          table={
          <table className="responsive-table min-w-[940px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Department</th>
                <th className="py-3 font-medium">City</th>
                <th className="py-3 font-medium">Zone</th>
                <th className="py-3 font-medium">Delivery fee</th>
                <th className="py-3 font-medium">Estimated time</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b last:border-0">
                  <td className="py-3 font-semibold">{zone.department}</td>
                  <td className="py-3">{zone.city}</td>
                  <td className="py-3 font-black">{zone.zone}</td>
                  <td className="py-3">{formatCurrency(zone.baseFee, zone.currency)}</td>
                  <td className="py-3">{zone.estimatedDays} day window</td>
                  <td className="py-3">
                    <Badge variant={zone.active ? "success" : "neutral"}>
                      {zone.active ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="dashboard-action-row">
                      {renderZoneActions(zone)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          }
        />
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{formValues.id ? "Edit delivery zone" : "Add delivery zone"}</DialogTitle>
            <DialogDescription>Delivery zones are saved locally for this frontend preview.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitZone}>
            <div className="grid gap-3 sm:grid-cols-2">
              <ZoneField label="Department">
                <Input
                  className="rounded-none shadow-none"
                  required
                  value={formValues.department}
                  onChange={(event) => updateField("department", event.target.value)}
                />
              </ZoneField>
              <ZoneField label="City">
                <Input
                  className="rounded-none shadow-none"
                  required
                  value={formValues.city}
                  onChange={(event) => updateField("city", event.target.value)}
                />
              </ZoneField>
              <ZoneField label="Zone">
                <Input
                  className="rounded-none shadow-none"
                  required
                  value={formValues.zone}
                  onChange={(event) => updateField("zone", event.target.value)}
                />
              </ZoneField>
              <ZoneField label="Country">
                <Input
                  className="rounded-none shadow-none"
                  required
                  value={formValues.country}
                  onChange={(event) => updateField("country", event.target.value)}
                />
              </ZoneField>
              <ZoneField label="Delivery fee">
                <Input
                  className="rounded-none shadow-none"
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={formValues.baseFee}
                  onChange={(event) => updateField("baseFee", Number(event.target.value))}
                />
              </ZoneField>
              <ZoneField label="Estimated days">
                <Input
                  className="rounded-none shadow-none"
                  min="1"
                  required
                  type="number"
                  value={formValues.estimatedDays}
                  onChange={(event) => updateField("estimatedDays", Number(event.target.value))}
                />
              </ZoneField>
            </div>
            <label className="flex items-center justify-between border bg-muted/30 p-3 text-sm font-semibold">
              Active status
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={formValues.active}
                onChange={(event) => updateField("active", event.target.checked)}
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <CheckCircle2 className="size-4" />
                Save zone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{pendingAction?.active ? "Enable delivery zone" : "Disable delivery zone"}</DialogTitle>
            <DialogDescription>This only changes local delivery-zone coverage.</DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">
            {pendingAction?.active ? "Enable" : "Disable"} {pendingAction?.zone.zone}?
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmZoneAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ZoneMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border bg-white p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-black">{value}</p>
      </div>
      <Icon className="size-8 text-primary" />
    </div>
  );
}

function ZoneField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}
