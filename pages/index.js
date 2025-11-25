// pages/index.js
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { db, auth } from "../lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  FiSun,
  FiMoon,
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiSearch,
} from "react-icons/fi";

export default function HomePage() {
  const [theme, setTheme] = useState("dark");

  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("latest");

  const [activeSlide, setActiveSlide] = useState(0);

  /* SLIDER DATA (POSTER) */
  const sliderData = [
    {
      id: 0,
      title: "Bayar belanjaan pakai DP dulu ✨",
      description:
        "Pilih produk favoritmu, bayar 30% / 50% dulu, sisa bisa diselesaikan belakangan.",
      buttonLabel: "Mulai belanja",
      buttonUrl: "#katalog",
      imageUrl:
        "https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      id: 1,
      title: "New Arrivals tiap minggu",
      description: "Produk baru terus masuk. Jangan sampai kehabisan stok.",
      buttonLabel: "Lihat yang baru",
      buttonUrl: "#katalog",
      imageUrl:
        "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      id: 2,
      title: "Best sellers pilihan pengguna",
      description: "Lihat produk yang paling sering dibeli dan disukai.",
      buttonLabel: "Lihat best seller",
      buttonUrl: "#katalog",
      imageUrl:
        "https://images.pexels.com/photos/842567/pexels-photo-842567.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
  ];

  /* THEME INIT */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored);
  }, []);

  /* THEME APPLY */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  /* AUTH */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      if (user) {
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) setUserDoc(snap.data());
          else setUserDoc(null);
        } catch (err) {
          console.error(err);
          setUserDoc(null);
        }
      } else {
        setUserDoc(null);
      }
    });
    return () => unsub();
  }, []);

  /* LOAD PRODUCTS */
  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
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
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  /* SLIDER AUTO */
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, 5000);
    return () => clearInterval(id);
  }, [sliderData.length]);

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
  };

  /* FILTER + SORT PRODUK */
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let list = products.filter((p) => {
      if (!term) return true;
      const name = (p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(term) || desc.includes(term);
    });

    switch (sortOption) {
      case "cheapest":
        list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "expensive":
        list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "popular":
        list = [...list].sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
      default: // latest
        // sudah dari Firestore terbaru duluan
        break;
    }

    return list;
  }, [products, searchTerm, sortOption]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)] text-sm">
      {/* NAVBAR */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-bg-dark/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="font-semibold text-lg text-slate-900 dark:text-[var(--text)]">
            Shop<span className="text-primary">Lite</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Info saldo kecil */}
            {userDoc && (
              <div className="hidden sm:flex flex-col text-[11px] text-right">
                <span className="font-semibold truncate">
                  {userDoc.username}
                </span>
                <span className="text-slate-500 dark:text-[var(--text-secondary)]">
                  Saldo {formatRupiah(userDoc.saldo || 0)}
                </span>
              </div>
            )}

            <Link
              href="/cart"
              className="relative h-8 w-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark"
              aria-label="Keranjang"
            >
              <FiShoppingCart className="text-slate-700 dark:text-[var(--text)]" />
            </Link>

            {/* THEME */}
            <button
              onClick={toggleTheme}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark"
              aria-label="Dark / light mode"
            >
              {theme === "dark" ? (
                <FiSun className="text-primary" />
              ) : (
                <FiMoon className="text-slate-700" />
              )}
            </button>

            {/* USER MENU */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-8 px-3 inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark text-xs"
              >
                <FiUser className="text-slate-600 dark:text-[var(--text-secondary)]" />
                <span className="hidden sm:inline text-[11px] max-w-[100px] truncate">
                  {userDoc?.username ||
                    currentUser?.email ||
                    "Sign in / Register"}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-card-dark shadow-lg border border-slate-200/80 dark:border-slate-700 py-1 text-xs z-30">
                  {currentUser ? (
                    <>
                      <Link
                        href="/dasborUser"
                        className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard user
                      </Link>
                      <Link
                        href="/dasboradmins"
                        className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
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
                        onClick={() => setMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/auth/register"
                        className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
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
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* POSTER + SEARCH */}
        <section className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          {/* POSTER / SLIDER */}
          <div className="card overflow-hidden flex flex-col md:flex-row md:items-stretch">
            <div className="relative w-full md:w-1/2 aspect-[4/3] md:aspect-auto rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sliderData[activeSlide].imageUrl}
                alt={sliderData[activeSlide].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>
            <div className="flex-1 px-4 py-3 flex flex-col justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-1">
                  DP system
                </p>
                <h1 className="text-base font-semibold mb-1">
                  {sliderData[activeSlide].title}
                </h1>
                <p className="text-xs text-slate-600 dark:text-[var(--text-secondary)] mb-3">
                  {sliderData[activeSlide].description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2">
                <Link
                  href={sliderData[activeSlide].buttonUrl}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-primary text-white text-[11px] font-semibold"
                >
                  {sliderData[activeSlide].buttonLabel}
                </Link>

                <div className="flex items-center gap-1">
                  {sliderData.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === activeSlide
                          ? "w-5 bg-primary"
                          : "w-2 bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH + FILTER */}
          <div className="card flex flex-col gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-[var(--text-secondary)] mb-1">
                Cari & filter
              </p>
              <h2 className="text-sm font-semibold mb-1">
                Temukan produk yang kamu mau
              </h2>
            </div>

            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Cari nama produk atau deskripsi..."
                className="input w-full pl-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSortOption("latest")}
                className={`px-3 py-1 rounded-full border ${
                  sortOption === "latest"
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                }`}
              >
                Terbaru
              </button>
              <button
                type="button"
                onClick={() => setSortOption("cheapest")}
                className={`px-3 py-1 rounded-full border ${
                  sortOption === "cheapest"
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                }`}
              >
                Termurah
              </button>
              <button
                type="button"
                onClick={() => setSortOption("expensive")}
                className={`px-3 py-1 rounded-full border ${
                  sortOption === "expensive"
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                }`}
              >
                Termahal
              </button>
              <button
                type="button"
                onClick={() => setSortOption("popular")}
                className={`px-3 py-1 rounded-full border ${
                  sortOption === "popular"
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                }`}
              >
                Terlaris
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
              Sistem DP tersedia di semua produk. Kamu bisa pilih bayar 30%, 50%
              atau 100% di halaman keranjang.
            </p>
          </div>
        </section>

        {/* GRID PRODUK */}
        <section id="katalog" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Katalog produk</h2>
            <span className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
              {filteredProducts.length} produk
            </span>
          </div>

          {loadingProducts ? (
            <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
              Loading products...
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
              Tidak ada produk yang cocok dengan pencarianmu.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((p) => {
                const price = Number(p.price || 0);
                const discount = Number(p.discount || 0);
                const finalPrice =
                  discount > 0
                    ? Math.round(price - (price * discount) / 100)
                    : price;
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
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="text-sm font-semibold mb-1 line-clamp-2">
                        {p.name}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-600 dark:text-[var(--text-secondary)] mb-2 line-clamp-2 whitespace-pre-line break-words">
                          {p.description}
                        </p>
                      )}

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
        </section>
      </main>
    </div>
  );
}