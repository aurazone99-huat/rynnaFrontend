import React, { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '../services/products';
import {
  canPay,
  fetchOrders,
  Order,
  orderStatusLabel,
  orderStatusStyle,
} from '../services/orders';
import {
  fetchActivePaymentMethods,
  PaymentMethod,
} from '../services/payments';
import { UserResponse } from '../services/auth';
import PaymentPage from './PaymentPage';

// ------------------------------------------------------------------ //
// Props                                                               //
// ------------------------------------------------------------------ //

interface Props {
  user: UserResponse;
}

// ------------------------------------------------------------------ //
// Order card                                                          //
// ------------------------------------------------------------------ //

interface OrderCardProps {
  order:           Order;
  loadingPayment:  boolean;
  onPay:           (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, loadingPayment, onPay }) => {
  const [expanded, setExpanded] = useState(false);
  const statusLabel = orderStatusLabel(order);
  const { bg, text } = orderStatusStyle(order);
  const payable = canPay(order);

  // Format date
  const date = new Date(order.created_at).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const visibleItems  = expanded ? order.items : order.items.slice(0, 2);
  const hiddenCount   = order.items.length - 2;

  return (
    <div className="clay-puffy-sm bg-white p-5 space-y-4">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.15em]">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-[10px] text-zinc-300 font-medium mt-0.5">{date}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black text-purple-700">{formatPrice(order.total_price)}</p>
          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${bg} ${text}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="clay-inset px-4 py-3 space-y-2">
        {visibleItems.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-zinc-700 truncate flex-1">
              {item.product_name ?? 'Unknown item'}
              <span className="text-zinc-400 font-medium"> × {item.quantity}</span>
            </p>
            <span className="text-xs font-black text-zinc-500 shrink-0">
              {formatPrice(item.subtotal)}
            </span>
          </div>
        ))}

        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-[10px] font-black text-purple-400 uppercase tracking-wider hover:text-purple-600 transition-colors outline-none"
          >
            +{hiddenCount} more item{hiddenCount > 1 ? 's' : ''}
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[10px] font-black text-purple-400 uppercase tracking-wider hover:text-purple-600 transition-colors outline-none"
          >
            Show less
          </button>
        )}
      </div>

      {/* Payment method label */}
      {order.transaction && (
        <p className="text-[10px] text-zinc-400 font-medium">
          Payment via <span className="font-black text-zinc-500">{order.transaction.payment_method}</span>
        </p>
      )}

      {/* Complete payment button */}
      {payable && (
        <button
          disabled={loadingPayment}
          onClick={() => onPay(order)}
          className={`clay-button w-full py-3 text-xs font-black uppercase tracking-widest outline-none transition-all ${
            loadingPayment
              ? 'text-zinc-300 cursor-not-allowed'
              : 'text-white bg-purple-500 hover:bg-purple-600'
          } disabled:opacity-60`}
        >
          {loadingPayment ? 'Loading…' : 'Complete Payment'}
        </button>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ //
// OrdersSection                                                       //
// ------------------------------------------------------------------ //

const OrdersSection: React.FC<Props> = ({ user: _user }) => {
  const [orders, setOrders]                   = useState<Order[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  // Payment flow
  const [view, setView]                       = useState<'list' | 'payment'>('list');
  const [paymentOrder, setPaymentOrder]       = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod]     = useState<PaymentMethod | null>(null);
  const [loadingPaymentFor, setLoadingPaymentFor] = useState<string | null>(null);
  const [payError, setPayError]               = useState<string | null>(null);

  // Success banner after proof upload
  const [banner, setBanner]                   = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchOrders()
      .then(setOrders)
      .catch(() => setError('Failed to load orders. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handlePay = async (order: Order) => {
    setLoadingPaymentFor(order.id);
    setPayError(null);
    try {
      const methods = await fetchActivePaymentMethods();
      const methodName = order.transaction?.payment_method;
      const method = methods.find(m => m.name === methodName) ?? methods[0] ?? null;
      if (!method) throw new Error('No payment method available. Please contact the seller.');
      setPaymentOrder(order);
      setPaymentMethod(method);
      setView('payment');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not load payment details.');
    } finally {
      setLoadingPaymentFor(null);
    }
  };

  const handlePaymentDone = (uploaded: boolean) => {
    setView('list');
    setPaymentOrder(null);
    setPaymentMethod(null);
    if (uploaded) {
      setBanner('Payment proof submitted! We\'ll verify it shortly.');
      setTimeout(() => setBanner(null), 6000);
    }
    loadOrders(); // refresh to reflect updated transaction status
  };

  // ── Payment view ─────────────────────────────────────────────────
  if (view === 'payment' && paymentOrder && paymentMethod) {
    return (
      <PaymentPage
        orderId={paymentOrder.id}
        orderTotal={paymentOrder.total_price}
        paymentMethod={paymentMethod}
        onDone={handlePaymentDone}
      />
    );
  }

  // ── Orders list view ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-clay-mint pt-24 pb-20 relative">
      {/* Top fade */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

      <div className="max-w-2xl mx-auto px-6 relative z-20">

        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-block px-6 py-2 bg-white/60 border-2 border-white/80 rounded-full mb-8 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">My Account</span>
          </div>
          <h2 className="text-6xl font-black mb-4 tracking-tighter text-emerald-900/80">My Orders</h2>
          <p className="text-emerald-700/60 max-w-sm mx-auto text-base font-medium">
            Track your orders and complete any pending payments.
          </p>
        </div>

        {/* Success banner */}
        {banner && (
          <div className="clay-puffy-sm bg-emerald-50 px-5 py-4 mb-6 flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 shrink-0">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <p className="text-xs font-semibold text-emerald-700 flex-1">{banner}</p>
            <button onClick={() => setBanner(null)} className="text-emerald-400 hover:text-emerald-600 outline-none shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>
          </div>
        )}

        {/* Pay error */}
        {payError && (
          <div className="clay-puffy-sm bg-red-50 px-5 py-4 mb-6">
            <p className="text-xs font-semibold text-red-500">{payError}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="clay-puffy-sm bg-red-50 p-6 text-center">
            <p className="text-sm text-red-500 font-semibold mb-4">{error}</p>
            <button
              onClick={loadOrders}
              className="clay-button px-5 py-2.5 text-xs font-black uppercase tracking-widest text-purple-500 outline-none"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-emerald-300">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="12" y2="16"/>
            </svg>
            <p className="text-base font-black tracking-tight text-emerald-400">No orders yet</p>
          </div>
        )}

        {/* Order list */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                loadingPayment={loadingPaymentFor === order.id}
                onPay={handlePay}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default OrdersSection;
