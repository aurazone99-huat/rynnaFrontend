import React, { useRef, useState } from 'react';
import { formatPrice, uploadPaymentProof } from '../services/products';
import { PaymentMethod, paymentTypeLabel } from '../services/payments';

// ------------------------------------------------------------------ //
// Constants                                                           //
// ------------------------------------------------------------------ //

const MAX_BYTES = 1_048_576; // 1 MB

// ------------------------------------------------------------------ //
// Props                                                               //
// ------------------------------------------------------------------ //

interface PaymentPageProps {
  orderId:       string;
  orderTotal:    string;            // formatted total from OrderResponse
  paymentMethod: PaymentMethod;
  /** Called after a successful upload (`true`) or when user skips (`false`). */
  onDone: (proofUploaded: boolean) => void;
}

// ------------------------------------------------------------------ //
// Component                                                           //
// ------------------------------------------------------------------ //

const PaymentPage: React.FC<PaymentPageProps> = ({
  orderId,
  orderTotal,
  paymentMethod: method,
  onDone,
}) => {
  const [file, setFile]           = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File handling ─────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setFileError('File exceeds 1 MB. Please compress or choose a smaller image.');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFileError(null);
    setUploadError(null);
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadPaymentProof(orderId, file);
      onDone(true);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        setUploadError('This order has already been processed or has expired.');
      } else if (e.status === 403) {
        setUploadError('You are not authorised to update this order.');
      } else {
        setUploadError(e.message || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-clay-blue pt-24 pb-20">
      {/* Top fade */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

      <div className="max-w-lg mx-auto px-6 relative z-20">

        {/* Page header */}
        <div className="text-center mb-10">
          <div className="inline-block px-6 py-2 bg-white/60 border-2 border-white/80 rounded-full mb-6 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em]">Order Confirmed</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-900/80">Complete Payment</h1>
          <p className="text-sm text-blue-500/60 font-medium mt-2">
            Transfer the amount below then upload your proof of payment.
          </p>
        </div>

        <div className="space-y-5">

          {/* ── Payment details ──────────────────────────────────── */}
          <div className="clay-puffy bg-white overflow-hidden">

            {/* Method image — full picture, no crop */}
            {method.image_url && (
              <div className="w-full bg-gradient-to-br from-purple-50 to-pink-50">
                <img
                  src={method.image_url}
                  alt={method.name}
                  className="w-full h-auto block"
                />
              </div>
            )}

            <div className="p-6 space-y-4">

              {/* Name + type */}
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black tracking-tight text-zinc-900 flex-1">{method.name}</h2>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-600">
                  {paymentTypeLabel(method.type)}
                </span>
              </div>

              {/* Account details */}
              {(method.account_name || method.account_number) && (
                <div className="clay-inset p-4 space-y-2">
                  {method.account_name && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Account Name</span>
                      <span className="text-sm font-black text-zinc-800 text-right">{method.account_name}</span>
                    </div>
                  )}
                  {method.account_number && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Account No.</span>
                      <span className="text-sm font-black text-zinc-800 tracking-widest text-right">{method.account_number}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              {method.instructions && (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Instructions</p>
                  <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">{method.instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Amount to pay ─────────────────────────────────────── */}
          <div className="clay-puffy bg-white p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Amount to Transfer</p>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">Order #{orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className="text-3xl font-black text-purple-700 shrink-0">{formatPrice(orderTotal)}</span>
          </div>

          {/* ── Upload proof ──────────────────────────────────────── */}
          <div className="clay-puffy bg-white p-6">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-5">
              Upload Payment Proof
            </p>

            {/* Drop zone / click to upload */}
            {!file && (
              <label
                htmlFor="proof-file"
                className="clay-inset flex flex-col items-center gap-3 py-10 px-6 cursor-pointer hover:bg-purple-50/30 transition-colors rounded-2xl"
              >
                <input
                  ref={inputRef}
                  id="proof-file"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {/* Upload icon */}
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-purple-400">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-zinc-700">Click to upload screenshot</p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-1 uppercase tracking-wider">
                    JPG · PNG · GIF · PDF &nbsp;·&nbsp; Max 1 MB
                  </p>
                </div>
              </label>
            )}

            {/* File too large error */}
            {fileError && (
              <div className="mt-3 clay-inset bg-red-50 px-4 py-3">
                <p className="text-xs text-red-500 font-semibold">{fileError}</p>
                <button
                  onClick={() => { setFileError(null); inputRef.current?.click(); }}
                  className="clay-button mt-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-500 outline-none"
                >
                  Choose again
                </button>
              </div>
            )}

            {/* Selected file preview */}
            {file && (
              <div className="clay-inset px-4 py-3 flex items-center gap-3">
                {/* Thumbnail or file icon */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-purple-50 flex items-center justify-center shrink-0">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt="proof"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-purple-400">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-800 truncate">{file.name}</p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                    {file.size < 1024
                      ? `${file.size} B`
                      : file.size < 1_048_576
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / 1_048_576).toFixed(2)} MB`}
                  </p>
                </div>
                <button
                  onClick={clearFile}
                  className="clay-button w-8 h-8 flex items-center justify-center text-zinc-400 outline-none shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 1l10 10M11 1L1 11"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Upload error */}
          {uploadError && (
            <div className="clay-puffy-sm bg-red-50 px-5 py-4">
              <p className="text-xs text-red-500 font-semibold leading-snug">{uploadError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            disabled={!file || uploading}
            onClick={handleSubmit}
            className={`clay-button w-full py-4 text-xs font-black uppercase tracking-widest outline-none transition-all ${
              !file || uploading
                ? 'text-zinc-300 cursor-not-allowed'
                : 'text-white bg-purple-500 hover:bg-purple-600'
            } disabled:opacity-60`}
          >
            {uploading ? 'Uploading…' : 'Submit Payment Proof'}
          </button>

          {/* Skip / pay later */}
          <button
            disabled={uploading}
            onClick={() => onDone(false)}
            className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-40 outline-none"
          >
            I&apos;ll pay later — skip for now
          </button>

        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
