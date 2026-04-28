/**
 * cartDb.ts — IndexedDB persistence layer for the shopping cart.
 *
 * Strategy: "local-first"
 *   1. On add-to-cart: write an optimistic snapshot to IndexedDB immediately
 *      (before the backend API call returns).
 *   2. On backend success: overwrite the snapshot with the authoritative
 *      CartSummary returned by the server.
 *   3. On backend error: restore the previous snapshot (rollback).
 *   4. On page load / user login: show the cached snapshot instantly while the
 *      backend fetch is in-flight, then replace with the live data.
 */

import { CartItem, CartSummary } from './products';

const DB_NAME    = 'rynna-cart';
const DB_VERSION = 1;
const STORE      = 'cart-snapshot'; // one record per user, keyed by user_id

// ------------------------------------------------------------------ //
// DB helpers                                                          //
// ------------------------------------------------------------------ //

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // CartSummary already has a user_id field — use it as the key.
        db.createObjectStore(STORE, { keyPath: 'user_id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ------------------------------------------------------------------ //
// Public API                                                          //
// ------------------------------------------------------------------ //

/** Persist (or overwrite) the CartSummary for a user. */
export async function dbSaveCart(cart: CartSummary): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(cart);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Return the last-saved CartSummary for a user, or null if none exists. */
export async function dbLoadCart(userId: string): Promise<CartSummary | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(userId);
    req.onsuccess = () => resolve((req.result as CartSummary) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/** Delete the cart snapshot (call after checkout or logout). */
export async function dbClearCart(userId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(userId);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ------------------------------------------------------------------ //
// Optimistic builder                                                  //
// ------------------------------------------------------------------ //

/**
 * Construct an optimistic CartSummary that reflects adding `product` to
 * `current` cart — used to update IndexedDB and the UI before the backend
 * responds.
 *
 * New items receive `cart_item_id: -1` as a temporary sentinel.  The caller
 * must overwrite this entry once the server returns the real CartSummary.
 */
export function buildOptimisticCart(
  current:  CartSummary | null,
  product:  { id: string; name: string; price: string },
  userId:   string,
): CartSummary {
  const existing = current?.items.find(i => i.product_id === product.id);
  let items: CartItem[];

  if (existing) {
    // Increment quantity of the existing line-item.
    const newQty = existing.quantity + 1;
    items = current!.items.map(i =>
      i.product_id === product.id
        ? { ...i, quantity: newQty, subtotal: (Number(i.unit_price) * newQty).toFixed(2) }
        : i,
    );
  } else {
    // Append a new line-item with a temporary cart_item_id.
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

/** Recompute totals from an item list and return a fresh CartSummary. */
function rebuildTotals(userId: string, items: CartItem[]): CartSummary {
  const total      = items.reduce((s, i) => s + Number(i.subtotal), 0).toFixed(2);
  const item_count = items.reduce((s, i) => s + i.quantity, 0);
  return { user_id: userId, items, total, item_count, removed_items: [] };
}

/**
 * Set the quantity of a line-item in the local cart.
 * Pass qty < 1 to remove the item entirely.
 * Returns the updated CartSummary (does NOT write to IndexedDB — call dbSaveCart yourself).
 */
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

/**
 * Remove a line-item from the local cart by product_id.
 * Shorthand for updateLocalCartItem(current, productId, 0).
 */
export function removeLocalCartItem(current: CartSummary, productId: string): CartSummary {
  return updateLocalCartItem(current, productId, 0);
}
