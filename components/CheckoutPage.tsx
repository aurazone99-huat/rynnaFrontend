import React, { useEffect, useRef, useState } from 'react';
import {
  CartSummary,
  checkout,
  formatPrice,
  OrderResponse,
  PickupMethod,
} from '../services/products';
import {
  fetchActivePaymentMethods,
  PaymentMethod,
  PaymentMethodType,
  paymentTypeLabel,
} from '../services/payments';
import { UserResponse } from '../services/auth';
import PaymentPage from './PaymentPage';

type Step = 'form' | 'payment' | 'success';

const NEEDS_PROOF: PaymentMethodType[] = ['bank_transfer', 'ewallet'];

// ------------------------------------------------------------------ //
// Payment type icon                                                   //
// ------------------------------------------------------------------ //

const PaymentTypeIcon: React.FC<{ type: PaymentMethodType }> = ({ type }) => {
  if (type === 'bank_transfer') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  );
  if (type === 'ewallet') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M16 13a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="none"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
  if (type === 'cash') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  );
  // other
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="6" y1="15" x2="10" y2="15"/>
    </svg>
  );
};

// ------------------------------------------------------------------ //
// CheckoutPage                                                        //
// ------------------------------------------------------------------ //

interface CheckoutPageProps {
  cart:      CartSummary;
  user:      UserResponse;
  onBack:    () => void;
  /** Called after the user acknowledges the success screen. */
  onSuccess: (orderId: string) => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cart, user: _user, onBack, onSuccess }) => {
  const [paymentMethods, setPaymentMethods]     = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods]     = useState(true);
  const [methodsError, setMethodsError]         = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [placing, setPlacing]                   = useState(false);
  const [orderError, setOrderError]             = useState<string | null>(null);

  // Pickup / delivery fields
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('shipping');
  const [address, setAddress]           = useState('');
  const [remark, setRemark]             = useState('');

  // Step flow: form → (payment if proof needed) → success
  const [step, setStep]               = useState<Step>('form');
  const [placedOrder, setPlacedOrder] = useState<OrderResponse | null>(null);
  const [proofMethod, setProofMethod] = useState<PaymentMethod | null>(null);
  const [proofUploaded, setProofUploaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadMethods = () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoadingMethods(true);
    setMethodsError(null);
    fetchActivePaymentMethods(ctrl.signal)
      .then(methods => {
        setPaymentMethods(methods);
        if (methods.length > 0) setSelectedMethodId(methods[0].id);
      })
      .catch(err => { if (err?.name !== 'AbortError') setMethodsError('Failed to load payment methods. Please try again.'); })
      .finally(() => { if (!ctrl.signal.aborted) setLoadingMethods(false); });
  };

  useEffect(() => {
    loadMethods();
    return () => abortRef.current?.abort();
  }, []);

  const handlePlaceOrder = async () => {
    if (!selectedMethodId) return;
    const method = paymentMethods.find(m => m.id === selectedMethodId);
    if (!method) return;
    if (!address.trim()) { setOrderError('Please fill in the ' + (pickupMethod === 'shipping' ? 'delivery address' : 'event name') + '.'); return; }

    setPlacing(true);
    setOrderError(null);
    try {
      const order = await checkout({
        items:          cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: method.name,
        payment_type:   'manual',
        pickup_method:  pickupMethod,
        address:        address.trim(),
        remark:         remark.trim() || null,
      });
      setPlacedOrder(order);
      // 3. Route to payment-proof step or straight to success
      if (NEEDS_PROOF.includes(method.type)) {
        setProofMethod(method);
        setStep('payment');
      } else {
        setStep('success');
      }
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        setOrderError(
          'One or more items went out of stock. Please go back and review your cart.',
        );
      } else {
        setOrderError(e.message || 'Failed to place order. Please try again.');
      }
    } finally {
      setPlacing(false);
    }
  };

  // ── Payment proof step ────────────────────────────────────────────
  if (step === 'payment' && placedOrder && proofMethod) {
    return (
      <PaymentPage
        orderId={placedOrder.id}
        orderTotal={cart.total}
        paymentMethod={proofMethod}
        onDone={(uploaded) => { setProofUploaded(uploaded); setStep('success'); }}
      />
    );
  }

  // ── Success screen ────────────────────────────────────────────────
  if (step === 'success' && placedOrder) {
    return (
      <div className="min-h-screen bg-clay-blue pt-24 pb-20 flex items-center justify-center px-6">
        <div
          className="clay-puffy bg-white p-12 max-w-sm w-full text-center"
          style={{ animation: 'pop-out 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
        >
          {/* Checkmark */}
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>

          <h2 className="text-2xl font-black tracking-tighter text-zinc-900 mb-2">
            {proofUploaded ? 'Payment Made!' : 'Order Placed!'}
          </h2>
          <p className="text-xs text-zinc-400 font-medium mb-1">Reference number</p>
          <p className="font-mono text-sm font-black text-purple-700 mb-6 tracking-widest">
            {placedOrder.id.slice(0, 8).toUpperCase()}
          </p>

          {/* Pickup / delivery detail */}
          <div className="clay-inset p-4 text-left space-y-3 mb-8">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest w-20 shrink-0">Method</span>
              <span className="text-xs font-black text-zinc-700 capitalize">
                {placedOrder.pickup_method === 'shipping' ? '🚚 Shipping' : '🎪 Event'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest w-20 shrink-0 pt-0.5">
                {placedOrder.pickup_method === 'shipping' ? 'Address' : 'Event'}
              </span>
              <span className="text-xs font-semibold text-zinc-700 leading-relaxed">{placedOrder.address}</span>
            </div>
            {placedOrder.remark && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest w-20 shrink-0 pt-0.5">Notes</span>
                <span className="text-xs text-zinc-500 leading-relaxed">{placedOrder.remark}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => onSuccess(placedOrder.id)}
            className="clay-button w-full py-3.5 text-xs font-black uppercase tracking-widest text-white bg-purple-500 outline-none"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // ── Main checkout screen ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-clay-blue pt-24 pb-20">
      {/* Top fade */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

      <div className="max-w-3xl mx-auto px-6 relative z-20">

        {/* Page header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={onBack}
            className="clay-button w-10 h-10 flex items-center justify-center text-zinc-500 outline-none shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 3L5 8l5 5"/>
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-blue-900/80">Checkout</h1>
            <p className="text-xs text-blue-500/60 font-medium mt-0.5">Review your order and choose a payment method</p>
          </div>
        </div>

        <div className="space-y-5">

          {/* ── Order Summary ─────────────────────────────────────── */}
          <div className="clay-puffy bg-white p-6">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-5">
              Order Summary
            </p>
            <ul className="space-y-4 mb-5">
              {cart.items.map(item => (
                <li key={item.product_id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-800 leading-tight">{item.product_name}</p>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                      {formatPrice(item.unit_price)} &times; {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-black text-purple-700 shrink-0">
                    {formatPrice(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-zinc-100 pt-4 flex items-center justify-between">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-purple-900">{formatPrice(cart.total)}</span>
            </div>
          </div>

          {/* ── Pickup / Delivery ────────────────────────────────── */}
          <div className="clay-puffy bg-white p-6 space-y-5">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
              Pickup / Delivery
            </p>

            {/* Shipping vs Event toggle */}
            <div className="flex gap-3">
              {(['shipping', 'event'] as PickupMethod[]).map(opt => {
                const selected = pickupMethod === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setPickupMethod(opt); setAddress(''); }}
                    className={`flex-1 clay-inset py-3 text-xs font-black uppercase tracking-widest outline-none transition-all rounded-2xl ${
                      selected ? 'ring-2 ring-purple-400 bg-purple-50/40 text-purple-700' : 'text-zinc-400 hover:bg-zinc-50/60'
                    }`}
                  >
                    {opt === 'shipping' ? '🚚 Shipping' : '🎪 Event'}
                  </button>
                );
              })}
            </div>

            {/* Address / Event name */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                {pickupMethod === 'shipping' ? 'Delivery Address' : 'Event Name'}
              </label>
              <textarea
                rows={3}
                placeholder={pickupMethod === 'shipping' ? 'Enter your full delivery address…' : 'Enter the event name…'}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full clay-inset px-4 py-3 text-sm text-zinc-700 bg-transparent outline-none placeholder:text-zinc-400 font-medium resize-none"
              />
            </div>

            {/* Remark */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                Notes to Seller <span className="normal-case font-medium text-zinc-300">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Any special requests or notes…"
                value={remark}
                onChange={e => setRemark(e.target.value)}
                className="w-full clay-inset px-4 py-3 text-sm text-zinc-700 bg-transparent outline-none placeholder:text-zinc-400 font-medium resize-none"
              />
            </div>
          </div>

          {/* ── Payment Method ────────────────────────────────────── */}
          <div className="clay-puffy bg-white p-6">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-5">
              Payment Method
            </p>

            {/* Loading */}
            {loadingMethods && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {!loadingMethods && methodsError && (
              <div className="clay-inset p-5 text-center">
                <p className="text-xs text-red-500 font-semibold">{methodsError}</p>
                <button
                  onClick={loadMethods}
                  className="clay-button mt-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-purple-500 outline-none"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loadingMethods && !methodsError && paymentMethods.length === 0 && (
              <p className="text-xs text-zinc-400 font-medium text-center py-6">
                No payment methods available — please contact the seller.
              </p>
            )}

            {/* Method list */}
            {!loadingMethods && !methodsError && paymentMethods.length > 0 && (
              <ul className="space-y-3">
                {paymentMethods.map(method => {
                  const selected = selectedMethodId === method.id;
                  return (
                    <li key={method.id}>
                      <button
                        onClick={() => setSelectedMethodId(method.id)}
                        className={`w-full clay-inset px-4 py-4 flex items-center gap-4 text-left outline-none transition-all rounded-2xl ${
                          selected ? 'ring-2 ring-purple-400 bg-purple-50/40' : 'hover:bg-zinc-50/60'
                        }`}
                      >
                        {/* Radio dot */}
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'border-purple-500 bg-purple-500' : 'border-zinc-300 bg-white'
                        }`}>
                          {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>

                        {/* Type icon */}
                        <span className={`shrink-0 transition-colors ${selected ? 'text-purple-500' : 'text-zinc-400'}`}>
                          <PaymentTypeIcon type={method.type} />
                        </span>

                        {/* Name + type label */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black leading-tight truncate ${selected ? 'text-zinc-900' : 'text-zinc-700'}`}>
                            {method.name}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                            {paymentTypeLabel(method.type)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Order error */}
          {orderError && (
            <div className="clay-puffy-sm bg-red-50 px-5 py-4">
              <p className="text-xs text-red-500 font-semibold leading-snug">{orderError}</p>
            </div>
          )}

          {/* Place Order button */}
          <button
            disabled={placing || !selectedMethodId || loadingMethods || paymentMethods.length === 0}
            onClick={handlePlaceOrder}
            className={`clay-button w-full py-4 text-xs font-black uppercase tracking-widest outline-none transition-all ${
              placing || !selectedMethodId || loadingMethods
                ? 'text-zinc-300 cursor-not-allowed'
                : 'text-white bg-purple-500 hover:bg-purple-600'
            } disabled:opacity-60`}
          >
            {placing ? 'Placing Order…' : 'Place Order'}
          </button>

        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
