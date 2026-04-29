import { CartItem, CartSummary } from './products';

const storageKey = (userId: string) => `rynna-cart:${userId}`;

// ------------------------------------------------------------------ //
// Public API                                                          //
// ------------------------------------------------------------------ //

export function dbSaveCart(cart: CartSummary): Promise<void> {
  localStorage.setItem(storageKey(cart.user_id), JSON.stringify(cart));
  return Promise.resolve();
}

export function dbLoadCart(userId: string): Promise<CartSummary | null> {
  const raw = localStorage.getItem(storageKey(userId));
  return Promise.resolve(raw ? (JSON.parse(raw) as CartSummary) : null);
}

export function dbClearCart(userId: string): Promise<void> {
  localStorage.removeItem(storageKey(userId));
  return Promise.resolve();
}

// ------------------------------------------------------------------ //
// Optimistic builder                                                  //
// ------------------------------------------------------------------ //

export function buildOptimisticCart(
  current:  CartSummary | null,
  product:  { id: string; name: string; price: string },
  userId:   string,
): CartSummary {
  const existing = current?.items.find(i => i.product_id === product.id);
  let items: CartItem[];

  if (existing) {
    const newQty = existing.quantity + 1;
    items = current!.items.map(i =>
      i.product_id === product.id
        ? { ...i, quantity: newQty, subtotal: (Number(i.unit_price) * newQty).toFixed(2) }
        : i,
    );
  } else {
    const newItem: CartItem = {
      cart_item_id: -1,
      product_id:   product.id,
      product_name: product.name,
      unit_price:   product.price,
      quantity:     1,
      subtotal:     product.price,
    };
    items = [...(current?.items ?? []), newItem];
  }

  const total      = items.reduce((s, i) => s + Number(i.subtotal), 0).toFixed(2);
  const item_count = items.reduce((s, i) => s + i.quantity, 0);

  return { user_id: userId, items, total, item_count, removed_items: [] };
}

// ------------------------------------------------------------------ //
// Local cart mutations (no backend calls)                             //
// ------------------------------------------------------------------ //

function rebuildTotals(userId: string, items: CartItem[]): CartSummary {
  const total      = items.reduce((s, i) => s + Number(i.subtotal), 0).toFixed(2);
  const item_count = items.reduce((s, i) => s + i.quantity, 0);
  return { user_id: userId, items, total, item_count, removed_items: [] };
}

export function updateLocalCartItem(
  current:   CartSummary,
  productId: string,
  qty:       number,
): CartSummary {
  const items =
    qty < 1
      ? current.items.filter(i => i.product_id !== productId)
      : current.items.map(i =>
          i.product_id === productId
            ? { ...i, quantity: qty, subtotal: (Number(i.unit_price) * qty).toFixed(2) }
            : i,
        );
  return rebuildTotals(current.user_id, items);
}

export function removeLocalCartItem(current: CartSummary, productId: string): CartSummary {
  return updateLocalCartItem(current, productId, 0);
}
