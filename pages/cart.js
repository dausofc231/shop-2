// pages/checkout.js
import { useRouter } from "next/router";
import Link from "next/link";
import { useMemo } from "react";
import { FiArrowLeft } from "react-icons/fi";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function CheckoutPage() {
  const router = useRouter();
  const {
    subtotal = "0",
    discountCut = "0",
    afterDiscount = "0",
    fee = "0",
    grandTotal = "0",
  } = router.query;

  const data = useMemo(() => {
    const sub = Number(subtotal || 0);
    const disc = Number(discountCut || 0);
    const after = Number(afterDiscount || 0);
    const admin = Number(fee || 0);
    const total = Number(grandTotal || 0);

    // fallback kalau query kosong / dibuka manual
    const safeAfter = after || sub - disc;
    const safeFee =
      admin || (safeAfter > 0 ? Math.round(safeAfter * 0.007) + 310 : 0);
    const safeTotal = total || safeAfter + safeFee;

    return {
      subtotalBeforeDiscount: sub,
      totalDiscountCut: disc,
      subtotalAfterDiscount: safeAfter,
      adminFee: safeFee,
      grandTotal: safeTotal,
    };
  }, [subtotal, discountCut, afterDiscount, fee, grandTotal]);

  const {
    subtotalBeforeDiscount,
    totalDiscountCut,
    subtotalAfterDiscount,
    adminFee,
    grandTotal: finalTotal,
  } = data;

  const noData =
    !router.isReady ||
    (subtotalBeforeDiscount === 0 &&
      subtotalAfterDiscount === 0 &&
      finalTotal === 0);

  const handleCreateOrder = () => {
    // Di sini nanti bisa diarahkan ke halaman upload bukti / status pesanan.
    alert("Pesanan dibuat (dummy). Integrasi pembayaran QRIS bisa ditambah nanti.");
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)] flex flex-col">
      {/* HEADER */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-[var(--text)] bg-white dark:bg-bg-dark"
          >
            <FiArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold">Checkout</h1>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-3 pb-24 space-y-3">
        {noData ? (
          <div className="card text-xs">
            <p>Data pembayaran tidak ditemukan.</p>
            <Link href="/cart" className="text-primary underline text-[11px] mt-1 inline-block">
              Kembali ke keranjang
            </Link>
          </div>
        ) : (
          <>
            {/* METODE PEMBAYARAN */}
            <section className="card space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold">Metode Pembayaran</h2>
                <span className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  Pilih salah satu
                </span>
              </div>

              {/* QRIS (aktif) */}
              <button
                type="button"
                className="w-full flex items-center justify-between rounded-xl border border-primary bg-primary/5 px-3 py-2 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">QRIS</span>
                  <span className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                    Scan kode QR lewat aplikasi e-wallet / m-banking
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-primary">
                  Dipilih
                </span>
              </button>

              {/* Placeholder metode lain (non-aktif) */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold">Metode lain</span>
                  <span className="text-slate-400">Segera hadir</span>
                </div>
                <div className="grid gap-1.5 text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 opacity-60">
                    Transfer Bank
                  </div>
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 opacity-60">
                    Saldo internal
                  </div>
                </div>
              </div>
            </section>

            {/* RINCIAN PEMBAYARAN */}
            <section className="card space-y-2">
              <h2 className="text-sm font-semibold mb-1">Rincian Pembayaran</h2>

              {/* Subtotal sebelum diskon */}
              <div className="flex items-center justify-between text-xs">
                <span>Subtotal pesanan</span>
                <span className="font-semibold text-slate-400 line-through text-right">
                  {formatRupiah(subtotalBeforeDiscount)}
                </span>
              </div>

              {/* Diskon total */}
              <div className="flex items-center justify-between text-xs">
                <span>Diskon produk</span>
                <span className="font-semibold text-red-500 text-right">
                  {totalDiscountCut > 0
                    ? formatRupiah(totalDiscountCut)
                    : formatRupiah(0)}
                </span>
              </div>

              {/* Pembatas + setelah diskon */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex items-center justify-between text-xs">
                <span>Setelah diskon</span>
                <span className="font-semibold text-right">
                  {formatRupiah(subtotalAfterDiscount)}
                </span>
              </div>

              {/* Fee admin */}
              <div className="flex items-center justify-between text-xs">
                <span>Fee admin QRIS</span>
                <span className="font-semibold text-right">
                  {formatRupiah(adminFee)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[var(--text-secondary)] text-right">
                0,7% dari setelah diskon + Rp 310
              </p>

              {/* Total pembayaran */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold">Total pembayaran</span>
                <span className="text-[13px] font-bold text-primary text-right">
                  {formatRupiah(finalTotal)}
                </span>
              </div>
            </section>
          </>
        )}
      </main>

      {/* BOTTOM BAR TOTAL + BUTTON */}
      {!noData && (
        <div className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-bg-dark/95 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                Total
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-primary">
                  {formatRupiah(finalTotal)}
                </span>
              </div>
              {totalDiscountCut > 0 && (
                <span className="text-[10px] text-emerald-500">
                  Hemat {formatRupiah(totalDiscountCut)}
                </span>
              )}
            </div>

            <button
              onClick={handleCreateOrder}
              className="flex-1 sm:flex-none sm:w-40 h-10 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center justify-center"
            >
              Buat Pesanan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}