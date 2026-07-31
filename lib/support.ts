import {
  disputes,
  marketplaceReports,
  products,
  refundRequests,
  reviews,
  storeReviews,
  stores,
  supportTickets,
} from "@/data/mock-data";
import type {
  CurrencyCode,
  CustomerNotification,
  Dispute,
  DisputeEvidence,
  MarketplaceReport,
  RefundRequest,
  RefundStatus,
  ReportStatus,
  Review,
  StoreReview,
  SupportMessage,
  SupportEscalationStatus,
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types";

export const LOCAL_REVIEWS_KEY = "maket-lakay-reviews";
export const LOCAL_STORE_REVIEWS_KEY = "maket-lakay-store-reviews";
export const LOCAL_SUPPORT_TICKETS_KEY = "maket-lakay-support-tickets";
export const LOCAL_REFUND_REQUESTS_KEY = "maket-lakay-refund-requests";
export const LOCAL_DISPUTES_KEY = "maket-lakay-disputes";
export const LOCAL_REPORTS_KEY = "maket-lakay-marketplace-reports";

export function createSupportCustomerNotification(input: {
  customerId: string;
  orderId?: string;
  title: string;
  message: string;
}): CustomerNotification {
  const orderId = input.orderId ?? "support";

  return {
    id: `support-notif-${orderId}-${Date.now()}`,
    customerId: input.customerId,
    orderId,
    channel: "in_app",
    title: input.title,
    message: input.message,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

function newestFirst<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeById<T extends { id: string; createdAt: string }>(
  seedItems: T[],
  localItems: T[],
) {
  const merged = new Map<string, T>();

  seedItems.forEach((item) => merged.set(item.id, item));
  localItems.forEach((item) => merged.set(item.id, item));

  return newestFirst(Array.from(merged.values()));
}

export function mergeReviews(localReviews: Review[] = []) {
  return mergeById(reviews, localReviews);
}

export function mergeStoreReviews(localReviews: StoreReview[] = []) {
  return mergeById(storeReviews, localReviews);
}

export function mergeSupportTickets(localTickets: SupportTicket[] = []) {
  return mergeById(supportTickets, localTickets);
}

export function mergeRefundRequests(localRequests: RefundRequest[] = []) {
  return mergeById(refundRequests, localRequests);
}

export function mergeDisputes(localDisputes: Dispute[] = []) {
  return mergeById(disputes, localDisputes);
}

export function mergeMarketplaceReports(localReports: MarketplaceReport[] = []) {
  return mergeById(marketplaceReports, localReports);
}

export function getSlaDueAt(priority: SupportTicketPriority, createdAt = new Date().toISOString()) {
  const hoursByPriority: Record<SupportTicketPriority, number> = {
    urgent: 4,
    high: 12,
    normal: 24,
    low: 48,
  };
  const dueAt = new Date(createdAt);
  dueAt.setHours(dueAt.getHours() + hoursByPriority[priority]);
  return dueAt.toISOString();
}

export function getTicketSlaStatus(ticket: SupportTicket) {
  if (ticket.status === "resolved") return "met";

  const dueAt = ticket.slaDueAt ?? getSlaDueAt(ticket.priority, ticket.createdAt);
  const dueTime = new Date(dueAt).getTime();
  const now = Date.now();
  const warningTime = dueTime - 2 * 60 * 60 * 1000;

  if (now > dueTime) return "breached";
  if (now >= warningTime) return "at_risk";
  return "on_track";
}

export function appendTicketMessage(
  ticket: SupportTicket,
  input: {
    authorType: SupportMessage["authorType"];
    authorName: string;
    body: string;
    visibility?: SupportMessage["visibility"];
  },
): SupportTicket {
  const now = new Date().toISOString();

  return {
    ...ticket,
    updatedAt: now,
    messages: [
      ...ticket.messages,
      {
        id: `ticket-message-${Date.now()}`,
        authorType: input.authorType,
        authorName: input.authorName,
        body: input.body,
        createdAt: now,
        visibility: input.visibility ?? "customer_visible",
      },
    ],
  };
}

export function escalateSupportTicket(
  ticket: SupportTicket,
  input: {
    escalatedByName: string;
    reason: string;
  },
): SupportTicket {
  const now = new Date().toISOString();

  return appendTicketMessage(
    {
      ...ticket,
      priority: "urgent",
      slaDueAt: getSlaDueAt("urgent", now),
      escalationStatus: "pending_admin",
      escalatedAt: now,
      escalatedByName: input.escalatedByName,
      escalationReason: input.reason,
      adminResolution: undefined,
      adminResolvedAt: undefined,
    },
    {
      authorType: "support",
      authorName: input.escalatedByName,
      body: input.reason,
      visibility: "internal",
    },
  );
}

export function resolveTicketEscalation(
  ticket: SupportTicket,
  input: {
    adminName: string;
    resolution: string;
    status: Exclude<SupportEscalationStatus, "pending_admin">;
  },
): SupportTicket {
  const now = new Date().toISOString();

  return appendTicketMessage(
    {
      ...ticket,
      escalationStatus: input.status,
      adminResolution: input.resolution,
      adminResolvedAt: now,
      status: input.status === "resolved" ? "resolved" : ticket.status,
    },
    {
      authorType: "support",
      authorName: input.adminName,
      body: `Admin ${input.status.replaceAll("_", " ")} escalation: ${input.resolution}`,
      visibility: "internal",
    },
  );
}

export function assignSupportTicket(
  ticket: SupportTicket,
  input: { assignedTo: string; assignedToName: string },
): SupportTicket {
  return appendTicketMessage(
    {
      ...ticket,
      assignedTo: input.assignedTo,
      assignedToName: input.assignedToName,
    },
    {
      authorType: "support",
      authorName: "Maket Lakay Support",
      body: `Ticket assigned to ${input.assignedToName}.`,
    },
  );
}

export function updateTicketPriority(
  ticket: SupportTicket,
  priority: SupportTicketPriority,
): SupportTicket {
  return appendTicketMessage(
    {
      ...ticket,
      priority,
      slaDueAt: getSlaDueAt(priority, ticket.createdAt),
    },
    {
      authorType: "support",
      authorName: "Maket Lakay Support",
      body: `Priority changed to ${priority}.`,
    },
  );
}

export function createProductReview(input: {
  productId: string;
  customerId: string;
  orderId?: string;
  rating: number;
  title: string;
  body: string;
}): Review {
  return {
    id: `review-${Date.now()}`,
    productId: input.productId,
    customerId: input.customerId,
    orderId: input.orderId,
    rating: input.rating,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    status: "published",
    helpfulCount: 0,
  };
}

export function createStoreReview(input: {
  storeId: string;
  customerId: string;
  orderId?: string;
  rating: number;
  title: string;
  body: string;
}): StoreReview {
  return {
    id: `store-review-${Date.now()}`,
    storeId: input.storeId,
    customerId: input.customerId,
    orderId: input.orderId,
    rating: input.rating,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    status: "published",
  };
}

export function createSupportTicket(input: {
  customerId: string;
  customerName?: string;
  orderId?: string;
  vendorId?: string;
  storeId?: string;
  subject: string;
  category: SupportTicket["category"];
  message: string;
}): SupportTicket {
  const now = new Date().toISOString();
  const priority: SupportTicketPriority =
    input.category === "payment" || input.category === "refund" ? "high" : "normal";

  return {
    id: `ticket-${Date.now()}`,
    customerId: input.customerId,
    orderId: input.orderId,
    vendorId: input.vendorId,
    storeId: input.storeId,
    subject: input.subject,
    category: input.category,
    priority,
    status: "open",
    slaDueAt: getSlaDueAt(priority, now),
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `ticket-message-${Date.now()}`,
        authorType: "customer",
        authorName: input.customerName ?? "Customer",
        body: input.message,
        createdAt: now,
        visibility: "customer_visible",
      },
    ],
  };
}

export function createRefundRequest(input: {
  orderId: string;
  customerId: string;
  storeId: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
}): RefundRequest {
  return {
    id: `refund-req-${Date.now()}`,
    orderId: input.orderId,
    customerId: input.customerId,
    storeId: input.storeId,
    amount: input.amount,
    currency: input.currency,
    status: "requested",
    reason: input.reason,
    createdAt: new Date().toISOString(),
  };
}

export function createDispute(input: {
  orderId: string;
  customerId: string;
  storeId: string;
  reason: string;
  requestedResolution: string;
}): Dispute {
  const now = new Date().toISOString();

  return {
    id: `dispute-${Date.now()}`,
    orderId: input.orderId,
    customerId: input.customerId,
    storeId: input.storeId,
    status: "open",
    reason: input.reason,
    requestedResolution: input.requestedResolution,
    createdAt: now,
    updatedAt: now,
  };
}

export function appendDisputeEvidence(
  dispute: Dispute,
  input: Omit<DisputeEvidence, "id" | "createdAt">,
): Dispute {
  const now = new Date().toISOString();

  return {
    ...dispute,
    status: dispute.status === "open" ? "under_review" : dispute.status,
    updatedAt: now,
    evidenceRecords: [
      {
        id: `dispute-evidence-${Date.now()}`,
        ...input,
        createdAt: now,
      },
      ...(dispute.evidenceRecords ?? []),
    ],
  };
}

export function createMarketplaceReport(input: {
  reporterCustomerId: string;
  targetType: MarketplaceReport["targetType"];
  targetId: string;
  reason: MarketplaceReport["reason"];
  details: string;
}): MarketplaceReport {
  return {
    id: `report-${Date.now()}`,
    reporterCustomerId: input.reporterCustomerId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    details: input.details,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };
}

export function updateTicketStatus(
  ticket: SupportTicket,
  status: SupportTicketStatus,
): SupportTicket {
  const now = new Date().toISOString();
  const message: SupportMessage = {
    id: `ticket-message-${Date.now()}`,
    authorType: "support",
    authorName: "Maket Lakay Support",
    body: `Status changed to ${status.replaceAll("_", " ")}.`,
    createdAt: now,
  };

  return {
    ...ticket,
    status,
    slaDueAt: ticket.slaDueAt ?? getSlaDueAt(ticket.priority, ticket.createdAt),
    updatedAt: now,
    messages: [...ticket.messages, message],
  };
}

export function updateRefundRequestStatus(
  request: RefundRequest,
  status: RefundStatus,
): RefundRequest {
  return {
    ...request,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function updateReportStatus(
  report: MarketplaceReport,
  status: ReportStatus,
): MarketplaceReport {
  return {
    ...report,
    status,
  };
}

export function getProductReviewSummary(productId: string, localReviews: Review[] = []) {
  const product = products.find((item) => item.id === productId);
  const productReviews = mergeReviews(localReviews).filter(
    (review) => review.productId === productId && review.status !== "flagged",
  );
  const average =
    productReviews.length > 0
      ? productReviews.reduce((sum, review) => sum + review.rating, 0) /
        productReviews.length
      : product?.rating ?? 0;

  return {
    average,
    count: productReviews.length || product?.reviewCount || 0,
    reviews: productReviews,
  };
}

export function getStoreRatingSummary(storeId: string, localStoreReviews: StoreReview[] = []) {
  const store = stores.find((item) => item.id === storeId);
  const ratings = mergeStoreReviews(localStoreReviews).filter(
    (review) => review.storeId === storeId && review.status !== "flagged",
  );
  const average =
    ratings.length > 0
      ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length
      : store?.rating ?? 0;

  return {
    average,
    count: ratings.length || store?.reviewCount || 0,
    reviews: ratings,
  };
}

export function getReportTargetLabel(report: MarketplaceReport) {
  if (report.targetType === "product") {
    return products.find((product) => product.id === report.targetId)?.name ?? report.targetId;
  }

  return stores.find((store) => store.id === report.targetId)?.name ?? report.targetId;
}
