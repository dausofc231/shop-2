// pages/index.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  FiSun,
  FiMoon,
  FiLogOut,
  FiShoppingCart,
  FiUser,
} from "react-icons/fi";
import { getUserData } from "../lib/db";

export default function HomePage() {
  const router = useRouter();
  const [theme, setTheme] = useState("dark");
  const [menuOpen, setMenuOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProducts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const data = await getUserData(user.uid);
        setUserDoc(data);
      } else {
        setUserDoc(null);
      }
    });
    return () => unsub();
  }, []);

  const toggleTheme = () => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const current = root.classList.contains("dark") ? "dark" : "light";
    if (current === "dark") {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-bg-dark/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-lg tracking-tight">
              Shop<span className="text-primary">Lite</span>
            </div>
            <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-card-dark text-slate-500 dark:text-[var(--text-secondary)]">
              Simple marketplace with DP system
            </span>
          </div>

          <div className="flex items-center gap-2">
            {userDoc && (
              <div className="hidden sm:flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-card-dark">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {(userDoc.username || "U")[0]?.toUpperCase()}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold">{userDoc.username}</span>
                  <span className="text-[10px] text-slate-500 dark:text-[var(--text-secondary)]">
                    Saldo {formatRupiah(userDoc.saldo || 0)}
                  </span>
                </div>
              </div>
            )}

            <Link
              href="/cart"
              className="p-2 rounded-full bg-slate-100 dark:bg-card-dark text-slate-600 dark:text-[var(--text-secondary)]"
            >
              <FiShoppingCart className="w-4 h-4" />
            </Link>

            <button
              onClick={toggleTheme}
              type="button"
              className="p-2 rounded-full bg-slate-100 dark:bg-card-dark"
            >
              {theme === "dark" ? (
                <FiSun className="w-4 h-4" />
              ) : (
                <FiMoon className="w-4 h-4" />
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="p-2 rounded-full bg-slate-100 dark:bg-card-dark"
              >
                <FiUser className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white dark:bg-card-dark shadow-lg border border-slate-200/80 dark:border-slate-700 py-1 text-xs">
                  {currentUser ? (
                    <>
                      <Link
                        href="/dasborUser"
                        className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Dashboard user
                      </Link>
                      <Link
                        href="/dasboradmins"
                        className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Dashboard admin
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-red-500"
                      >
                        <FiLogOut className="w-3 h-3" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/login"
                        className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/auth/register"
                        className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Register
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-lg font-semibold mb-1">
            Pilih barang, bayar pakai DP ✨
          </h1>
          <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
            Kamu bisa checkout dengan DP (30% / 50% / 100%). Sisa pembayaran dicatat
            di riwayat pesananmu.
          </p>
        </div>

        {loadingProducts ? (
          <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
            Loading products...
          </p>
        ) : products.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
            Belum ada produk. Admin bisa menambah dari halaman dasbor.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const price = Number(p.price || 0);
              const discount = Number(p.discount || 0);
              const finalPrice =
                discount > 0
                  ? Math.round(price - (price * discount) / 100)
                  : price;

              const minDp = p.minDpPercent ?? 30;
              const firstImage =
                Array.isArray(p.images) && p.images.length > 0
                  ? p.images[0]
                  : null;

              return (
                <Link
                  key={p.id}
                  href={`/${p.id}`}
                  className="card group flex flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition"
                >
                  <div className="relative w-full aspect-[4/3] mb-3 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                    {firstImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={firstImage}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-600">
                        No image
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">
                        -{discount}%
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-black/60 text-white">
                      DP mulai {minDp}%
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="text-sm font-semibold mb-1 line-clamp-2">
                      {p.name}
                    </div>
                    <div className="mb-1">
                      <div className="text-sm font-bold">
                        {formatRupiah(finalPrice)}
                      </div>
                      {discount > 0 && (
                        <div className="text-[10px] text-slate-400 line-through">
                          {formatRupiah(price)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 text-[10px] text-slate-500 dark:text-[var(--text-secondary)]">
                      <span>Terjual {p.sold || 0}</span>
                      <span>Stok {p.stock || 0}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}