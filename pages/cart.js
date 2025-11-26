// pages/cart.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FiArrowLeft, FiTrash2 } from "react-icons/fi";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function CartPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);

  // === AUTH + LOAD USER & CART ===
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setCurrentUser(user);
      try {
        await loadUserDoc(user.uid);
        await loadCart(user.uid);
      } catch (err) {
        console.error(err);
        setErrorMsg("Gagal memuat keranjang.");
      }
    });

    return () => unsub();
  }, [router]);

  const loadUserDoc = async (uid) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setUserDoc({ id: snap.id, ...snap.data() });
    }
  };

  const loadCart = async (uid) => {
    setLoading(true);
    try {
      const cartCol = collection(db, "users", uid, "cart");
      const snap = await getDocs(cartCol);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      console.log("CART ITEMS:", list); // bantu debug kalau masih kosong
      setItems(list);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!currentUser) return;
    setErrorMsg("");
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "cart", id));
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menghapus item.");
    }
  };

  const handleChangeQty = async (item, delta) => {
    if (!currentUser) return;
    const currentQty = Number(item.qty || 1);
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    setErrorMsg("");
    try {
      const ref = doc(db, "users", currentUser.uid, "cart", item.id);
      await updateDoc(ref, { qty: newQty });
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, qty: newQty } : p))
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengubah jumlah.");
    }
  };

  // === HITUNGAN GABUNGAN SEMUA PRODUK & QTY ===
  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.qty || 1), 0),
    [items]
  );

  const {
    subtotalBeforeDiscount,
    totalDiscountCut,
    subtotalAfterDiscount,
  } = useMemo(() => {
    let before = 0;
    let discCut = 0;

    items.forEach((i) => {
      const qty = Number(i.qty || 1);
      const price = Number(i.price || 0);
      const disc = Number(i.discount || 0); // pastikan field discount ada

      const lineBefore = price * qty;
      before += lineBefore;

      if (disc > 0) {
        const perUnitCut = Math.round((price * disc) / 100);
        discCut += perUnitCut * qty;
      }
    });

    const after = before - discCut;

    return {
      subtotalBeforeDiscount: before,
      totalDiscountCut: discCut,
      subtotalAfterDiscount: after,
    };
  }, [items]);

  // Fee admin QRIS: 0.7% + Rp 310 dari subtotal setelah diskon
  const qrisFee = useMemo(
    () =>
      subtotalAfterDiscount > 0
        ? Math.round(subtotalAfterDiscount * 0.007) + 310
        : 0,
    [subtotalAfterDiscount]
  );

  const grandTotal = subtotalAfterDiscount + qrisFee;

  // === ORDER HELPER (untuk saldo) ===
  const createOrderAndClearCart = async ({ method }) => {
    if (!currentUser) return;

    const ordersCol = collection(db, "orders");
    await addDoc(ordersCol, {
      userId: currentUser.uid,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        price: Number(i.price || 0),
        discount: Number(i.discount || 0),
        qty: Number(i.qty || 1),
      })),
      subtotalBeforeDiscount,
      totalDiscountCut,
      subtotalAfterDiscount,
      adminFee: qrisFee,
      grandTotal,
      paymentMethod: method, // "qris" | "saldo"
      status: "pending",
      createdAt: serverTimestamp(),
    });

    await Promise.all(
      items.map((i) =>
        deleteDoc(doc(db, "users", currentUser.uid, "cart", i.id))
      )
    );
    setItems([]);
  };

  // === BAYAR QRIS: ke /checkout ===
  const handlePayWithQRIS = () => {
    if (!currentUser) return;
    if (!items.length) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }

    const params = new URLSearchParams({
      subtotal: String(subtotalBeforeDiscount),
      discountCut: String(totalDiscountCut),
      afterDiscount: String(subtotalAfterDiscount),
      fee: String(qrisFee),
      grandTotal: String(grandTotal),
    }).toString();

    router.push(`/checkout?${params}`);
  };

  // === BAYAR SALDO ===
  const handlePayWithSaldo = async () => {
    if (!currentUser) return;
    if (!items.length) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }

    setProcessing(true);
    setMessage("");
    setErrorMsg("");

    try {
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("User tidak ditemukan");

        const data = userSnap.data();
        const saldo = Number(data.saldo || 0);
        if (saldo < grandTotal) throw new Error("SALDO_TIDAK_CUKUP");

        tx.update(userRef, { saldo: saldo - grandTotal });
      });

      await createOrderAndClearCart({ method: "saldo" });
      setMessage(
        `Pembayaran berhasil menggunakan saldo. Total dipotong: ${formatRupiah(
          grandTotal
        )}.`
      );
      await loadUserDoc(currentUser.uid);
    } catch (err) {
      console.error(err);
      if (err.message === "SALDO_TIDAK_CUKUP") {
        setErrorMsg("Saldo tidak mencukupi untuk membayar total + biaya QRIS.");
      } else {
        setErrorMsg("Checkout dengan saldo gagal.");
      }
    } finally {
      setProcessing(false);
    }
  };

  // === RENDER ===
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
      <div className="max-w-3xl mx-auto px-4 py-4 pb-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-[var(--text-secondary)] hover:text-primary"
          >
            <FiArrowLeft className="w-4 h-4" />
            Kembali belanja
          </Link>
          <Link
            href="/dasborUser"
            className="text-xs underline text-primary font-semibold"
          >
            Dashboard user
          </Link>
        </div>

        <div className="space-y-4">
          {/* KERANJANG BELANJA */}
          <div className="card">
            <h1 className="text-base font-semibold mb-3">
              Keranjang Belanja
            </h1>

            {loading ? (
              <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                Loading cart...
              </p>
            ) : items.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                Keranjang masih kosong.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((i) => {
                  const qty = Number(i.qty || 1);
                  const price = Number(i.price || 0);
                  const disc = Number(i.discount || 0);
                  const finalPerUnit =
                    disc > 0
                      ? Math.round(price - (price * disc) / 100)
                      : price;

                  return (
                    <div
                      key={i.id}
                      className="rounded-2xl bg-slate-900/5 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3"
                    >
                      <div className="flex gap-3">
                        {/* Placeholder gambar */}
                        <div className="h-16 w-16 rounded-xl border border-slate-300 dark:border-slate-700 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {i.name}
                          </p>

                          {disc > 0 ? (
                            <div className="mt-1 text-[11px] space-y-0.5">
                              <p className="text-slate-400 line-through">
                                {formatRupiah(price)}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-primary font-semibold">
                                  {formatRupiah(finalPerUnit)}
                                </span>
                                <span className="px-1.5 py-[2px] rounded-full bg-red-500 text-white text-[10px] font-semibold">
                                  -{disc}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1 text-[11px] text-primary font-semibold">
                              {formatRupiah(price)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <Link
                          href={`/${i.productId}`}
                          className="text-primary underline"
                        >
                          Lihat produk
                        </Link>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleChangeQty(i, -1)}
                            disabled={qty <= 1}
                            className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleChangeQty(i, 1)}
                            className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteItem(i.id)}
                          className="inline-flex items-center gap-1 text-red-500 hover:opacity-80"
                        >
                          <FiTrash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RINGKASAN & PEMBAYARAN */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold">Ringkasan Pembayaran</h2>
              {userDoc && (
                <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  Saldo:{" "}
                  <span className="font-semibold">
                    {formatRupiah(userDoc.saldo || 0)}
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs space-y-1.5">
              {/* Harga gabungan sebelum diskon */}
              <div className="flex items-center justify-between">
                <span>Barang ({totalItems})</span>
                <span className="font-semibold text-slate-400 line-through text-right">
                  {formatRupiah(subtotalBeforeDiscount)}
                </span>
              </div>

              {/* Diskon total */}
              <div className="flex items-center justify-between">
                <span>Diskon</span>
                <span className="font-semibold text-red-500 text-right">
                  {formatRupiah(totalDiscountCut)}
                </span>
              </div>

              {/* Setelah diskon */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex items-center justify-between">
                <span>Setelah diskon</span>
                <span className="font-semibold text-right">
                  {formatRupiah(subtotalAfterDiscount)}
                </span>
              </div>

              {/* Fee admin */}
              <div className="flex items-center justify-between">
                <span>Fee admin</span>
                <span className="font-semibold text-right">
                  {formatRupiah(qrisFee)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[var(--text-secondary)] text-right">
                QRIS 0,7% dari setelah diskon + Rp 310
              </p>

              {/* Total bayar */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold">Total bayar</span>
                <span className="text-[13px] font-bold text-primary text-right">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {message && (
              <div className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
                {message}
              </div>
            )}
            {errorMsg && (
              <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2 mt-1">
              <button
                onClick={handlePayWithQRIS}
                disabled={!items.length}
                className="w-full h-10 rounded-full bg-primary text-white text-[13px] font-semibold disabled:opacity-60"
              >
                Bayar via QRIS
              </button>
              <button
                onClick={handlePayWithSaldo}
                disabled={processing || !items.length}
                className="w-full h-10 rounded-full border border-primary text-primary text-[13px] font-semibold disabled:opacity-60 bg-transparent"
              >
                {processing ? "Memproses..." : "Bayar pakai saldo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}