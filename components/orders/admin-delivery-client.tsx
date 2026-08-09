"use client";

import * as React from "react";
import { CheckCircle2, Map as MapIcon, PackageCheck, Route, Truck } from "lucide-react";

import { StatusBadge } from "@/components/marketplace/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deliveryZones, proofsOfDelivery, stores } from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { mergeAssignments, mergeOrders } from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAllRealAssignments, getAllRealProofs } from "@/services/delivery";
import { getAllRealOrders } from "@/services/orders";
import type { DeliveryAssignment, Order, ProofOfDelivery } from "@/types";

function getStoreName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? "Marketplace store";
}

export function AdminDeliveryClient() {
  const { isReady, localAssignments, localOrders, localProofs } = useMarketplaceStorage();
  const [realOrders, setRealOrders] = React.useState<Order[]>([]);
  const [realAssignments, setRealAssignments] = React.useState<DeliveryAssignment[]>([]);
  const [realProofs, setRealProofs] = React.useState<ProofOfDelivery[]>([]);
  const [realDataReady, setRealDataReady] = React.useState(false);

  React.useEffect(() => {
    Promise.all([getAllRealOrders(), getAllRealAssignments(), getAllRealProofs()]).then(
      ([fetchedOrders, fetchedAssignments, fetchedProofs]) => {
        setRealOrders(fetchedOrders);
        setRealAssignments(fetchedAssignments);
        setRealProofs(fetchedProofs);
        setRealDataReady(true);
      },
    );
  }, []);

  const orders = React.useMemo(() => {
    const merged = new Map<string, Order>();
    mergeOrders(localOrders).forEach((order) => merged.set(order.id, order));
    realOrders.forEach((order) => merged.set(order.id, order));
    return Array.from(merged.values());
  }, [localOrders, realOrders]);
  const assignments = [...mergeAssignments(localAssignments), ...realAssignments];
  const proofs = [...localProofs, ...proofsOfDelivery, ...realProofs];
  const inTransitCount = orders.filter((order) =>
    ["ready_for_delivery", "out_for_delivery", "shipped"].includes(order.status),
  ).length;
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;

  if (!isReady || !realDataReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active zones", value: deliveryZones.filter((zone) => zone.active).length, icon: MapIcon },
          { label: "Assignments", value: assignments.length, icon: Truck },
          { label: "In delivery flow", value: inTransitCount, icon: Route },
          { label: "Proof records", value: proofs.length, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-black">{value}</p>
              </div>
              <Icon className="size-8 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Delivery zones</CardTitle>
            <p className="text-sm text-muted-foreground">
              Zone coverage and delivery-fee basis for checkout and assignments.
            </p>
          </CardHeader>
          <CardContent className="responsive-table-wrap">
            <table className="responsive-table min-w-[720px]">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 font-medium">Zone</th>
                  <th className="py-3 font-medium">Coverage</th>
                  <th className="py-3 font-medium">Base fee</th>
                  <th className="py-3 font-medium">ETA</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveryZones.map((zone) => (
                  <tr key={zone.id} className="border-b last:border-0">
                    <td className="py-3 font-black">{zone.name}</td>
                    <td className="py-3">
                      {zone.city}, {zone.region}, {zone.country}
                    </td>
                    <td className="py-3">{formatCurrency(zone.baseFee, zone.currency)}</td>
                    <td className="py-3">{zone.estimatedDays} day window</td>
                    <td className="py-3">
                      <Badge variant={zone.active ? "success" : "neutral"}>
                        {zone.active ? "Active" : "Paused"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proof of delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proofs.map((proof) => (
              <div key={proof.id} className="border p-3 text-sm">
                <p className="font-black">{proof.orderId}</p>
                <p className="mt-1 text-muted-foreground">
                  {proof.method} · {proof.recipientName}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(proof.deliveredAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery assignments</CardTitle>
        </CardHeader>
        <CardContent className="responsive-table-wrap">
          <table className="responsive-table min-w-[860px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Order</th>
                <th className="py-3 font-medium">Store</th>
                <th className="py-3 font-medium">Courier</th>
                <th className="py-3 font-medium">Zone</th>
                <th className="py-3 font-medium">Assigned</th>
                <th className="py-3 font-medium">Order status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => {
                const order = orders.find((item) => item.id === assignment.orderId);
                const zone = deliveryZones.find((item) => item.id === assignment.zoneId);

                return (
                  <tr key={assignment.id} className="border-b last:border-0">
                    <td className="py-3 font-black">{assignment.orderId}</td>
                    <td className="py-3">{order ? getStoreName(order.storeId) : "Unknown"}</td>
                    <td className="py-3">
                      <p className="font-semibold">{assignment.courierName}</p>
                      <p className="text-xs text-muted-foreground">{assignment.courierPhone}</p>
                    </td>
                    <td className="py-3">{zone?.name ?? "Unmapped"}</td>
                    <td className="py-3">{formatDate(assignment.assignedAt)}</td>
                    <td className="py-3">
                      {order ? <StatusBadge status={order.status} /> : <PackageCheck className="size-4" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!assignments.length ? (
            <div className="border p-6 text-center text-sm text-muted-foreground">
              No delivery assignments yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders by delivery state</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {["confirmed", "processing", "ready_for_delivery", "out_for_delivery"].map((status) => (
            <div key={status} className="border p-4">
              <p className="text-sm font-semibold capitalize text-muted-foreground">
                {status.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-3xl font-black">
                {orders.filter((order) => order.status === status).length}
              </p>
            </div>
          ))}
          <div className="border p-4">
            <p className="text-sm font-semibold text-muted-foreground">Delivered</p>
            <p className="mt-2 text-3xl font-black">{deliveredCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
