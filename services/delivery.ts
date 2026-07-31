import {
  deliveryAssignments,
  deliveryZones,
  proofsOfDelivery,
  trackingEvents,
} from "@/data/mock-data";

export function getDeliveryZones() {
  return deliveryZones;
}

export function getActiveDeliveryZones() {
  return deliveryZones.filter((zone) => zone.active);
}

export function getDeliveryZoneById(zoneId: string) {
  return deliveryZones.find((zone) => zone.id === zoneId);
}

export function getDeliveryAssignments() {
  return deliveryAssignments;
}

export function getDeliveryAssignmentByOrder(orderId: string) {
  return deliveryAssignments.find((assignment) => assignment.orderId === orderId);
}

export function getTrackingEvents(orderId: string) {
  return trackingEvents.filter((event) => event.orderId === orderId);
}

export function getProofOfDelivery(orderId: string) {
  return proofsOfDelivery.find((proof) => proof.orderId === orderId);
}
