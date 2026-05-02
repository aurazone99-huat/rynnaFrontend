const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ADMIN_ID = import.meta.env.VITE_ADMIN_ID || '';

// ------------------------------------------------------------------ //
// Types                                                                //
// ------------------------------------------------------------------ //

export type PaymentMethodType = 'bank_transfer' | 'ewallet' | 'cash' | 'other';

export interface PaymentMethod {
  id: string;
  admin_id: string;
  name: string;
  type: PaymentMethodType;
  image_url: string | null;
  account_name: string | null;
  account_number: string | null;
  instructions: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------ //
// Helpers                                                             //
// ------------------------------------------------------------------ //

export function paymentTypeLabel(type: PaymentMethodType): string {
  const map: Record<PaymentMethodType, string> = {
    bank_transfer: 'Bank Transfer',
    ewallet:       'E-Wallet',
    cash:          'Cash',
    other:         'Other',
  };
  return map[type] ?? type;
}

// ------------------------------------------------------------------ //
// API                                                                 //
// ------------------------------------------------------------------ //

export async function fetchActivePaymentMethods(signal?: AbortSignal): Promise<PaymentMethod[]> {
  const res = await fetch(
    `${API_URL}/payment-methods/active?admin_id=${ADMIN_ID}`,
    { credentials: 'include', signal },
  );
  if (!res.ok) throw new Error('fetch_payment_methods_failed');
  return res.json();
}
