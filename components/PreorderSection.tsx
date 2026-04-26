import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addToCart,
  CartSummary,
  checkout,
  fetchProducts,
  formatPrice,
  getCart,
  isComponentAvailable,
  isProductAvailable,
  OrderResponse,
  Product,
  removeCartItem,
  stockLabel,
  updateCartItem,
} from '../services/products';
import { UserResponse } from '../services/auth';
import AuthModal from './AuthModal';

// ------------------------------------------------------------------ //
// Toast                                                                //
// ------------------------------------------------------------------ //

interface Toast {
  id: number;
  message: string;
  type: 'warning' | 'error' | 'success';
}

let _toastId = 0;

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => createPortal(
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        onClick={() => onDismiss(t.id)}
        className={`pointer-events-auto clay-puffy-sm px-5 py-3 flex items-start gap-3 max-w-sm w-full cursor-pointer ${
          t.type === 'error' ? 'bg-red-50' : t.type === 'warning' ? 'bg-orange-50' : 'bg-emerald-50'
        }`}
        style={{ animation: 'pop-out 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        <span className="text-lg leading-none">
          {t.type === 'error' ? '⚠️' : t.type === 'warning' ? '🛒' : '✓'}
        </span>
        <p className={`text-xs font-semibold leading-snug ${
          t.type === 'error' ? 'text-red-600' : t.type === 'warning' ? 'text-orange-700' : 'text-emerald-700'
        }`}>{t.message}</p>
      </div>
    ))}
  </div>,
  document.body,
);

interface Props {
  user: UserResponse | null;
  onUserChange: (user: UserResponse | null) => void;
}

// ------------------------------------------------------------------ //
// Cart Drawer                                                          //
// ------------------------------------------------------------------ //

interface CartDrawerProps {
  cart: CartSummary;
  onClose: () => void;
  onUpdate: (updated: CartSummary) => void;
  onToast: (message: string, type: Toast['type']) => void;
  onOrderComplete: (order: OrderResponse) => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ cart, onClose, onUpdate, onToast, onOrderComplete }) => {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const isEmpty = cart.items.length === 0;

  const handleQty = async (cartItemId: number, qty: number) => {
    setBusyId(cartItemId);
    try {
      const updated = qty < 1
        ? await removeCartItem(cartItemId)
        : await updateCartItem(cartItemId, qty);
      onUpdate(updated);
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const order = await checkout({ payment_method: 'bank_transfer', payment_type: 'manual' });
      onOrderComplete(order);
      onClose();
      onToast(`Order placed! Order ID: ${order.id.slice(0, 8)}…`, 'success');
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        // Race condition — refresh the cart so auto-removed items are cleared
        try {
          const refreshed = await getCart();
          onUpdate(refreshed);
          if (refreshed.removed_items.length > 0) {
            onToast(
              `Removed from cart (out of stock): ${refreshed.removed_items.join(', ')}`,
              'warning',
            );
          } else {
            onToast(e.message || 'Some items are out of stock.', 'error');
          }
        } catch {
          onToast(e.message || 'Some items are out of stock.', 'error');
        }
      } else {
        onToast(e.message || 'Checkout failed. Please try again.', 'error');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-sm z-[120] bg-white shadow-2xl flex flex-col"
        style={{ animation: 'slide-in-right 0.25s ease-out forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-lg font-black tracking-tighter text-purple-900/80">Your Cart</h2>
            <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
              {cart.item_count} {cart.item_count === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="clay-button w-8 h-8 flex items-center justify-center text-zinc-400 outline-none"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-300">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <p className="text-sm font-medium">Your cart is empty</p>
            </div>
          ) : (
            cart.items.map(item => (
              <div key={item.cart_item_id} className="clay-puffy-sm p-4 flex gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-800 truncate">{item.product_name}</p>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">{formatPrice(item.unit_price)} each</p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={busyId === item.cart_item_id}
                    onClick={() => handleQty(item.cart_item_id, item.quantity - 1)}
                    className="clay-button w-7 h-7 flex items-center justify-center text-purple-500 font-black outline-none disabled:opacity-40 text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-black text-zinc-700">
                    {busyId === item.cart_item_id ? '…' : item.quantity}
                  </span>
                  <button
                    disabled={busyId === item.cart_item_id}
                    onClick={() => handleQty(item.cart_item_id, item.quantity + 1)}
                    className="clay-button w-7 h-7 flex items-center justify-center text-purple-500 font-black outline-none disabled:opacity-40 text-lg leading-none"
                  >
                    +
                  </button>
                </div>

                <div className="text-right shrink-0 w-20">
                  <p className="text-sm font-black text-purple-700">{formatPrice(item.subtotal)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-zinc-100 space-y-4">
          {!isEmpty && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Total</span>
              <span className="text-xl font-black text-purple-900">{formatPrice(cart.total)}</span>
            </div>
          )}
          <button
            disabled={isEmpty || checkingOut}
            onClick={handleCheckout}
            className={`clay-button w-full py-3.5 text-xs font-black uppercase tracking-widest outline-none transition-all ${
              isEmpty
                ? 'text-zinc-300 cursor-not-allowed'
                : 'text-white bg-purple-500 hover:bg-purple-600'
            } disabled:opacity-60`}
          >
            {checkingOut ? 'Placing order…' : isEmpty ? 'Your cart is empty' : 'Proceed to Checkout'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
};

// ------------------------------------------------------------------ //
// Bundle Modal                                                         //
// ------------------------------------------------------------------ //

interface BundleModalProps {
  product: Product;
  addingId: string | null;
  cartError: { productId: string; message: string } | null;
  onAddToCart: (productId: string) => void;
  onClose: () => void;
}

const BundleModal: React.FC<BundleModalProps> = ({ product, addingId, cartError, onAddToCart, onClose }) => {
  const available = isProductAvailable(product);
  const busy = addingId === product.id;
  const errorMsg = cartError?.productId === product.id ? cartError.message : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[130] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered card */}
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="clay-puffy bg-white w-full max-w-lg pointer-events-auto overflow-hidden"
          style={{ animation: 'pop-out 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
        >
          {/* Image banner */}
          <div className="relative w-full aspect-video bg-gradient-to-br from-purple-50 to-pink-50">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className={`w-full h-full object-cover ${!available ? 'opacity-50' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-purple-200">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
            )}

            {/* Sold out overlay */}
            {!available && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-zinc-900/75 text-white">
                  Sold Out
                </span>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 clay-button w-8 h-8 flex items-center justify-center text-zinc-500 outline-none bg-white/80"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>

            {/* Bundle pill */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600/90 text-white">
              Bundle
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-black tracking-tighter text-zinc-900">{product.name}</h2>
                {product.description && (
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{product.description}</p>
                )}
              </div>
              <span className="text-2xl font-black text-purple-700 shrink-0">{formatPrice(product.price)}</span>
            </div>

            {/* Components */}
            {product.components.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">
                  What's included
                </p>
                <ul className="space-y-2">
                  {product.components.map(c => {
                    const cAvail = isComponentAvailable(c);
                    const cStock = stockLabel(c.stock_quantity);
                    return (
                      <li
                        key={c.id}
                        className={`clay-inset px-4 py-3 flex items-center gap-3 ${!cAvail ? 'opacity-60' : ''}`}
                      >
                        {/* Availability dot */}
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cAvail ? 'bg-emerald-400' : 'bg-zinc-300'}`} />

                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black leading-tight ${!cAvail ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                            {c.name}
                          </p>
                          {c.description && (
                            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{c.description}</p>
                          )}
                        </div>

                        {/* Right side: stock badge or price */}
                        <div className="shrink-0 text-right">
                          {!cAvail ? (
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">
                              Sold Out
                            </span>
                          ) : cStock ? (
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                              {cStock}
                            </span>
                          ) : (
                            <span className="text-xs font-black text-zinc-400">{formatPrice(c.price)}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <p className="mt-4 text-xs text-red-500 font-semibold leading-snug">{errorMsg}</p>
            )}

            {/* Footer action */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={onClose}
                className="clay-button px-5 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 outline-none"
              >
                Close
              </button>
              <button
                disabled={!available || busy}
                onClick={() => onAddToCart(product.id)}
                className={`clay-button flex-1 py-3 text-xs font-black uppercase tracking-widest outline-none transition-all ${
                  !available
                    ? 'text-zinc-300 cursor-not-allowed'
                    : 'text-white bg-purple-500'
                } disabled:opacity-60`}
              >
                {busy ? 'Adding…' : !available ? 'Sold Out' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

// ------------------------------------------------------------------ //
// Product Card                                                         //
// ------------------------------------------------------------------ //

interface ProductCardProps {
  product: Product;
  addingId: string | null;
  cartError: { productId: string; message: string } | null;
  onAddToCart: (productId: string) => void;
  onOpenBundle: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, addingId, cartError, onAddToCart, onOpenBundle }) => {
  const available = isProductAvailable(product);
  const stock = stockLabel(product.stock_quantity);
  const busy = addingId === product.id;
  const errorMsg = cartError?.productId === product.id ? cartError.message : null;

  return (
    <div
      className={`clay-puffy-sm bg-white flex flex-col overflow-hidden ${product.is_bundle ? 'cursor-pointer' : ''}`}
      onClick={product.is_bundle ? () => onOpenBundle(product) : undefined}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-[20px] m-3 mb-0 bg-gradient-to-br from-purple-50 to-pink-50">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity ${!available ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-200">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
        )}

        {/* Sold Out overlay */}
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-900/75 text-white">
              Sold Out
            </span>
          </div>
        )}

        {/* Low stock nudge */}
        {available && stock && (
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-600">
            {stock}
          </div>
        )}

        {/* Bundle badge */}
        {product.is_bundle && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600/90 text-white">
            Bundle
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <h3 className="font-black text-zinc-800 tracking-tight leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">{product.description}</p>
          )}
          {/* Bundle: show component count hint instead of full list */}
          {product.is_bundle && product.components.length > 0 && (
            <p className="text-[10px] text-purple-400 font-medium mt-1.5">
              {product.components.length} items included — tap to view
            </p>
          )}
        </div>

        {/* 409 error */}
        {errorMsg && (
          <p className="text-[10px] text-red-500 font-semibold leading-snug">{errorMsg}</p>
        )}

        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-lg font-black text-purple-700">{formatPrice(product.price)}</span>
          {product.is_bundle ? (
            /* Bundle cards: click the whole card; button just hints at it */
            <span className="clay-button px-4 py-2 text-[10px] font-black uppercase tracking-widest text-purple-500 flex items-center gap-1">
              View
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 5h6M5 2l3 3-3 3"/>
              </svg>
            </span>
          ) : (
            <button
              disabled={!available || busy}
              onClick={e => { e.stopPropagation(); onAddToCart(product.id); }}
              className={`clay-button px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none transition-all ${
                !available ? 'text-zinc-300 cursor-not-allowed' : 'text-purple-600 hover:bg-purple-50'
              } disabled:opacity-60`}
            >
              {busy ? '…' : !available ? 'Sold Out' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ //
// PreorderSection                                                      //
// ------------------------------------------------------------------ //

const PreorderSection: React.FC<Props> = ({ user, onUserChange }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [cartError, setCartError] = useState<{ productId: string; message: string } | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    const timer = setTimeout(() => dismissToast(id), 5000);
    toastTimers.current.set(id, timer);
  }, []);

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) { clearTimeout(timer); toastTimers.current.delete(id); }
  };

  // Loads cart and fires a warning toast if the backend auto-removed any items.
  const loadCart = useCallback(async () => {
    try {
      const updated = await getCart();
      setCart(updated);
      if (updated.removed_items.length > 0) {
        showToast(
          `Removed from your cart (out of stock): ${updated.removed_items.join(', ')}`,
          'warning',
        );
      }
    } catch {
      setCart(null);
    }
  }, [showToast]);

  // Load products (public — no auth needed)
  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError('Failed to load products. Please try again.'))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Load cart whenever user changes
  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setCart(null);
    }
  }, [user, loadCart]);

  const handleAddToCart = useCallback(async (productId: string) => {
    if (!user) {
      setPendingProductId(productId);
      setShowLogin(true);
      return;
    }
    setAddingId(productId);
    setCartError(null);
    try {
      const updated = await addToCart(productId);
      setCart(updated);
      setCartOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg !== 'add_to_cart_failed' && msg !== 'not_authenticated') {
        setCartError({ productId, message: msg });
      }
    } finally {
      setAddingId(null);
    }
  }, [user]);

  // After a successful login, add the pending product automatically
  const handleLoginSuccess = useCallback(async (loggedInUser: UserResponse) => {
    onUserChange(loggedInUser);
    setShowLogin(false);
    if (pendingProductId) {
      const id = pendingProductId;
      setPendingProductId(null);
      setAddingId(id);
      try {
        const updated = await addToCart(id);
        setCart(updated);
        setCartOpen(true);
      } finally {
        setAddingId(null);
      }
    }
  }, [onUserChange, pendingProductId]);

  const cartItemCount = cart?.item_count ?? 0;

  return (
    <div className="min-h-screen bg-clay-blue pt-24 pb-20 relative">
      {/* Top fade */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

      <div className="max-w-7xl mx-auto px-6 relative z-20">

        {/* Heading */}
        <div className="text-center mb-16">
          <div className="inline-block px-6 py-2 bg-white/60 border-2 border-white/80 rounded-full mb-8 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Limited Drop</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter text-blue-900/80">Preorder</h2>
          <p className="text-blue-700/60 max-w-xl mx-auto text-lg leading-relaxed font-medium">
            Secure your piece before it's gone. All items are made to order.
          </p>
        </div>

        {/* Loading */}
        {loadingProducts && (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto clay-puffy-sm bg-red-50 p-6 text-center">
            <p className="text-sm text-red-500 font-semibold">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loadingProducts && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-blue-300">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
            </svg>
            <p className="text-base font-black tracking-tight text-blue-400">No products yet — check back soon!</p>
          </div>
        )}

        {/* Product grid */}
        {!loadingProducts && products.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                addingId={addingId}
                cartError={cartError}
                onAddToCart={handleAddToCart}
                onOpenBundle={setSelectedBundle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {user && cartItemCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-8 right-8 z-50 clay-button bg-purple-600 text-white px-6 py-4 flex items-center gap-3 outline-none shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <span className="text-xs font-black uppercase tracking-widest">{cartItemCount} in cart</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && cart && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onUpdate={setCart}
          onToast={showToast}
          onOrderComplete={() => { setCart(null); }}
        />
      )}

      {/* Bundle detail modal */}
      {selectedBundle && (
        <BundleModal
          product={selectedBundle}
          addingId={addingId}
          cartError={cartError}
          onAddToCart={id => { handleAddToCart(id); setSelectedBundle(null); }}
          onClose={() => setSelectedBundle(null)}
        />
      )}

      {/* Login modal — triggered when guest tries to add to cart */}
      {showLogin && (
        <AuthModal
          onClose={() => { setShowLogin(false); setPendingProductId(null); }}
          onSuccess={handleLoginSuccess}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default PreorderSection;
