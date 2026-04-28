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

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products/public?admin_id=${ADMIN_ID}`);
  if (!res.ok) throw new Error('fetch_products_failed');
  return res.json();
}

// ------------------------------------------------------------------ //
// Cart API (all require session_id cookie)                            //
// ------------------------------------------------------------------ //

export async function getCart(): Promise<CartSummary> {
  const res = await fetch(`${API_URL}/cart`, { credentials: 'include' });
  if (res.status === 401) throw new Error('not_authenticated');
  if (!res.ok) throw new Error('get_cart_failed');
  return res.json();
}

export async function addToCart(productId: string, quantity = 1): Promise<CartSummary> {
  const res = await fetch(`${API_URL}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ product_id: productId, quantity }),
  });
  if (res.status === 401) throw new Error('not_authenticated');
  if (res.status === 409) {
    // Backend returns {"detail": "..."} naming the sold-out product/component.
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'out_of_stock');
  }
  if (!res.ok) throw new Error('add_to_cart_failed');
  return res.json();
}

export async function updateCartItem(cartItemId: number, quantity: number): Promise<CartSummary> {
  const res = await fetch(`${API_URL}/cart/items/${cartItemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('update_cart_failed');
  return res.json();
}

export async function removeCartItem(cartItemId: number): Promise<CartSummary> {
  const res = await fetch(`${API_URL}/cart/items/${cartItemId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('remove_cart_failed');
  return res.json();
}

export interface CheckoutRequest {
  payment_method: string;
  payment_type?: 'manual' | 'payment_gateway';
  external_reference_id?: string | null;
}

export interface OrderResponse {
  id: string;
  user_id: string;
  total: string;
  status: string;
  payment_method: string;
  created_at: string;
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

// ------------------------------------------------------------------ //
// Local-first cart helpers                                            //
// ------------------------------------------------------------------ //

/**
 * Delete every item from the backend cart (best-effort cleanup).
 * Called when the local cart becomes empty, so the backend stays in sync.
 */
export async function clearBackendCart(): Promise<void> {
  try {
    const cart = await getCart();
    if (cart.items.length === 0) return;
    await Promise.all(cart.items.map(i => removeCartItem(i.cart_item_id)));
  } catch {
    // Silently ignore — backend cart cleanup is best-effort
  }
}

/**
 * Sync the IndexedDB cart to the backend right before checkout:
 *   1. Wipe any stale backend cart items.
 *   2. Re-add every local item with its current quantity.
 * Returns the final CartSummary from the backend.
 * Throws (with `.status`) on 409 if any item is out of stock.
 */
export async function syncCartToBackend(localCart: CartSummary): Promise<CartSummary> {
  await clearBackendCart();
  let last: CartSummary | null = null;
  for (const item of localCart.items) {
    // addToCart throws 409 with the item name if that product is sold out
    last = await addToCart(item.product_id, item.quantity);
  }
  if (!last) throw new Error('cart_empty');
  return last;
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
