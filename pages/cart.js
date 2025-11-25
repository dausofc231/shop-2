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
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FiArrowLeft, FiTrash2 } from "react-icons/fi";
import { checkoutWithDP, getUserData } from "../lib/db";

export default function CartPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dpPercent, setDpPercent] = useState(30);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setCurrentUser(user);
      const data = await getUserData(user.uid);
      setUserDoc(data);
      await loadCart(user.uid);
    });
    return () => unsub();
  }, [router]);

  const loadCart = async (uid) => {
    setLoading(true);
    try {
      const cartCol = collection(db, "users", uid, "cart");
      const snap = await getDocs(cartCol);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setItems(list);
    } catch (err) {
      console.error(err);
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

  const totalPrice = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + Number(i.price || 0) * Number(i.qty || 1),
        0
      ),
    [items]
  );

  const dpAmount = useMemo(
    () => Math.round((totalPrice * dpPercent) / 100),
    [totalPrice, dpPercent]
  );

  const remainingAmount = totalPrice - dpAmount;

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const handleCheckout = async () => {
    if (!currentUser) return;
    setMessage("");
    setErrorMsg("");
    if (!items.length) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }
    setProcessing(true);
    try {
      await checkoutWithDP({
        userId: currentUser.uid,
        items: items.map((i) => ({
          id: i.id,
          productId: i.productId,
          price: i.price,
          qty: i.qty,
          name: i.name,
        })),
        dpPercent,
      });
      setMessage(
        `Checkout berhasil! Kamu membayar DP ${dpPercent}% sebesar ${formatRupiah(
          dpAmount
        )}. Sisa ${formatRupiah(remainingAmount)} dicatat sebagai tagihan.`
      );
      setItems([]);
      const updatedUser = await getUserData(currentUser.uid);
      setUserDoc(updatedUser);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Checkout gagal.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
      <div className="max-w-3xl mx-auto px-4 py-4">
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

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          {/* List item */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base font-semibold">Keranjang</h1>
              {userDoc && (
                <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  Saldo:{" "}
                  <span className="font-semibold">
                    {formatRupiah(userDoc.saldo || 0)}
                  </span>
                </div>
              )}
            </div>

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
                {items.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-semibold mb-1">
                        {i.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                        {formatRupiah(i.price)} x {i.qty} ={" "}
                        <span className="font-semibold">
                          {formatRupiah(
                            Number(i.price || 0) * Number(i.qty || 1)
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(i.id)}
                      className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50/60 dark:hover:bg-slate-800"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ringkasan + DP */}
          <div className="card flex flex-col gap-3">
            <h2 className="text-sm font-semibold mb-1">Ringkasan & DP</h2>

            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span>Total harga</span>
                <span className="font-semibold">
                  {formatRupiah(totalPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>DP ({dpPercent}%)</span>
                <span className="font-semibold">
                  {formatRupiah(dpAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                <span>Sisa pembayaran</span>
                <span>{formatRupiah(remainingAmount)}</span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-[11px] mb-1">
                Pilih besaran DP yang ingin kamu bayarkan:
              </p>
              <div className="flex items-center gap-2 text-[11px]">
                {[30, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDpPercent(val)}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      dpPercent === val
                        ? "bg-primary text-white border-primary"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-[var(--text-secondary)]"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[var(--text-secondary)] mt-1">
                DP akan langsung dipotong dari saldo kamu. Sisa pembayaran
                tercatat di riwayat pesanan dan bisa diselesaikan secara offline.
              </p>
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

            <button
              onClick={handleCheckout}
              disabled={processing || !items.length}
              className="btn-primary w-full mt-2"
            >
              {processing ? "Memproses..." : "Bayar DP & Checkout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}