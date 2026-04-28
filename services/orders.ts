const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ------------------------------------------------------------------ //
// Types                                                                //
// ------------------------------------------------------------------ //

export type OrderStatus      = 'pending_payment' | 'paid' | 'cancelled';
export type TransactionStatus =
  | 'pending'
  | 'pending_verification'
  | 'completed'
  | 'expired'
  | 'failed';

export interface OrderItem {
  id:                 number;
  product_id:         string | null;
  product_name:       string | null;
  quantity:           number;
  price_at_purchase:  string;
  subtotal:           string;
}

export interface OrderTransaction {
  id:                     string;
  payment_method:         string;   // name string, e.g. "Maybank"
  payment_type:           string;
  transaction_status:     TransactionStatus;
  external_reference_id:  string | null;
  proof_screenshot_url:   string | null;
  amount_paid:            string;
  expires_at:             string | null;
  created_at:             string;
}

export interface Order {
  id:          string;
  user_id:     string;
  total_price: string;   // Decimal serialised as string
  status:      OrderStatus;
  created_at:  string;
  items:       OrderItem[];
  transaction: OrderTransaction | null;
}

// ------------------------------------------------------------------ //
// Helpers                                                             //
// ------------------------------------------------------------------ //

/** True when the order is still waiting for a payment to be submitted. */
export function canPay(order: Order): boolean {
  if (order.status !== 'pending_payment') return false;
  const tx = order.transaction;
  // No transaction yet, or transaction is still pending (proof not yet uploaded)
  return !tx || tx.transaction_status === 'pending';
}

export function orderStatusLabel(order: Order): string {
  if (order.status === 'paid') return 'Paid';
  if (order.status === 'cancelled') return 'Cancelled';
  const tx = order.transaction;
  if (!tx || tx.transaction_status === 'pending') return 'Awaiting Payment';
  if (tx.transaction_status === 'pending_verification') return 'Proof Submitted';
  if (tx.transaction_status === 'expired') return 'Payment Expired';
  if (tx.transaction_status === 'failed') return 'Payment Failed';
  return 'Processing';
}

type StatusStyle = { bg: string; text: string };

export function orderStatusStyle(order: Order): StatusStyle {
  if (order.status === 'paid') return { bg: 'bg-emerald-50', text: 'text-emerald-600' };
  if (order.status === 'cancelled') return { bg: 'bg-zinc-100', text: 'text-zinc-400' };
  const tx = order.transaction;
  if (!tx || tx.transaction_status === 'pending')
    return { bg: 'bg-orange-50', text: 'text-orange-500' };
  if (tx.transaction_status === 'pending_verification')
    return { bg: 'bg-blue-50', text: 'text-blue-500' };
  if (tx.transaction_status === 'expired' || tx.transaction_status === 'failed')
    return { bg: 'bg-red-50', text: 'text-red-500' };
  return { bg: 'bg-zinc-100', text: 'text-zinc-400' };
}

// ------------------------------------------------------------------ //
// API                                                                 //
// ------------------------------------------------------------------ //

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${API_URL}/orders`, { credentials: 'include' });
  if (res.status === 401) throw new Error('not_authenticated');
  if (!res.ok) throw new Error('fetch_orders_failed');
  return res.json();
}
