// pages/dasborUser.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getUserData, changeUserSaldo } from "../lib/db";
import { FiLogOut, FiArrowLeft } from "react-icons/fi";

export default function UserDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setCurrentUser(user);
      const data = await getUserData(user.uid);
      setUserDoc(data);
      await loadOrders(user.uid);
    });
    return () => unsub();
  }, [router]);

  const loadOrders = async (uid) => {
    setLoadingOrders(true);
    try {
      const q = query(
        collection(db, "users", uid, "orders"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setOrders(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const handleDemoTopup = async () => {
    if (!currentUser) return;
    setTopupLoading(true);
    setMessage("");
    try {
      await changeUserSaldo(currentUser.uid, 100000);
      const updated = await getUserData(currentUser.uid);
      setUserDoc(updated);
      setMessage("Demo: Saldo kamu bertambah Rp100.000.");
    } catch (err) {
      console.error(err);
      setMessage("Gagal topup demo.");
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-[var(--text-secondary)] hover:text-primary"
          >
            <FiArrowLeft className="w-4 h-4" />
            Kembali belanja
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-xs text-red-500"
          >
            <FiLogOut className="w-3 h-3" />
            Logout
          </button>
        </div>

        {userDoc && (
          <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                {(userDoc.username || "U")[0]?.toUpperCase()}
              </div>
              <div className="text-sm">
                <div className="font-semibold">{userDoc.username}</div>
                <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  {userDoc.email}
                </div>
              </div>
            </div>

            <div className="text-sm">
              <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                Saldo aktif
              </div>
              <div className="font-semibold text-base">
                {formatRupiah(userDoc.saldo || 0)}
              </div>
            </div>

            <button
              onClick={handleDemoTopup}
              disabled={topupLoading}
              className="btn-primary text-xs whitespace-nowrap"
            >
              {topupLoading ? "Memproses..." : "Demo topup +100K"}
            </button>
          </div>
        )}

        {message && (
          <div className="card text-[11px] text-primary">{message}</div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="text-sm font-semibold mb-3">Riwayat DP terbaru</h2>
            {loadingOrders ? (
              <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                Loading orders...
              </p>
            ) : orders.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                Belum ada pesanan dengan DP.
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="border border-slate-100 dark:border-slate-800 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {o.items?.[0]?.name || "Pesanan"}
                        {o.items && o.items.length > 1
                          ? ` +${o.items.length - 1} item`
                          : ""}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          o.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {o.status === "PAID" ? "LUNAS" : "DP DIBAYAR"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)] space-y-0.5">
                      <div>
                        Total:{" "}
                        <span className="font-semibold">
                          {formatRupiah(o.total)}
                        </span>
                      </div>
                      <div>
                        DP {o.dpPercent}%:{" "}
                        <span className="font-semibold">
                          {formatRupiah(o.dpAmount)}
                        </span>
                      </div>
                      <div>
                        Sisa: {formatRupiah(o.remaining || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3">Quick links</h2>
            <div className="flex flex-col gap-2 text-xs">
              <Link href="/" className="underline">
                Kembali ke beranda
              </Link>
              <Link href="/cart" className="underline">
                Lihat keranjang
              </Link>
              <Link href="/dasboradmins" className="underline">
                Dashboard admin (jika akun admin)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}