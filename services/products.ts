const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ADMIN_ID = import.meta.env.VITE_ADMIN_ID || '';

// ------------------------------------------------------------------ //
// Types                                                                //
// ------------------------------------------------------------------ //

export interface ProductComponent {
  id: string;
  name: string;
  description: string | null;
  price: string; // Decimal serialised as string by Pydantic
  stock_quantity: number;
  image_url: string | null;
  priority: number;
}

export interface Product {
  id: string;
  admin_id: string;
  name: string;
  description: string | null;
  price: string; // Decimal serialised as string by Pydantic
  stock_quantity: number; // -1 = unlimited
  is_bundle: boolean;
  image_url: string | null;
  priority: number;
  components: ProductComponent[];
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  cart_item_id: number;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface CartSummary {
  user_id: string;
  items: CartItem[];
  total: string;
  item_count: number;
  /** Product names auto-removed because they became unavailable since being added. */
  removed_items: string[];
}

// ------------------------------------------------------------------ //
// Helpers                                                              //
// ------------------------------------------------------------------ //

export function formatPrice(value: string | number): string {
  return `RM ${Number(value).toFixed(2)}`;
}

// Mirrors the backend @property logic — is_available is NOT serialised
// in the JSON response, so we derive it client-side from stock_quantity.
export function isComponentAvailable(c: ProductComponent): boolean {
  return c.stock_quantity === -1 || c.stock_quantity > 0;
}

export function isProductAvailable(p: Product): boolean {
  const ownStock = p.stock_quantity === -1 || p.stock_quantity > 0;
  if (!ownStock) return false;
  if (p.is_bundle) return p.components.every(isComponentAvailable);
  return true;
}

// Stock nudge label — only shown when stock is low or zero.
export function stockLabel(qty: number): string | null {
  if (qty === -1) return null;
  if (qty === 0) return 'Sold Out';
  if (qty <= 10) return `${qty} left`;
  return null;
}

// ------------------------------------------------------------------ //
// Products API                                                         //
// ------------------------------------------------------------------ //

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products/public?admin_id=${ADMIN_ID}`, { signal });
  if (!res.ok) throw new Error('fetch_products_failed');
  return res.json();
}


export interface CheckoutItem {
  product_id: string;
  quantity:   number;
}

export interface CheckoutRequest {
  items:                  CheckoutItem[];
  payment_method:         string;
  payment_type?:          'manual' | 'payment_gateway';
  external_reference_id?: string | null;
}

export interface OrderResponse {
  id:          string;
  user_id:     string;
  total_price: string;
  status:      string;
  created_at:  string;
}

/** Returns the created OrderResponse, or throws with a `status` property on 409. */
export async function checkout(payload: CheckoutRequest): Promise<OrderResponse> {
  const res = await fetch(`${API_URL}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (res.status === 401) throw new Error('not_authenticated');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = Object.assign(
      new Error(body.detail ?? 'checkout_failed'),
      { status: res.status },
    );
    throw err;
  }
  return body;
}


/**
 * Upload a payment-proof image for a placed order.
 * Sends multipart/form-data with field `proof_image`.
 * Throws with `.status` on 403 / 404 / 409.
 */
export async function uploadPaymentProof(
  orderId: string,
  file:    File,
): Promise<OrderResponse> {
  const form = new FormData();
  form.append('proof_image', file);

  const res = await fetch(`${API_URL}/orders/${orderId}/payment-proof`, {
    method:      'POST',
    credentials: 'include',
    body:        form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(
      new Error(body.detail ?? 'upload_failed'),
      { status: res.status },
    );
  }
  return body;
}
