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
  FiChevronLeft,
  FiChevronRight,
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

  // === DATA UNTUK POSTER / SLIDER (MIRIP SS) ===
  const sliderData = [
    {
      id: 0,
      title: "New Arrivals",
      description: "Produk terbaru hadir setiap minggunya.",
      buttonLabel: "See new items",
      buttonUrl: "#katalog",
      imageUrl:
        "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      id: 1,
      title: "Belanja lebih santai",
      description: "Gunakan DP dan lunasi nanti sesuai kesepakatan.",
      buttonLabel: "Mulai belanja",
      buttonUrl: "#katalog",
      imageUrl:
        "https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      id: 2,
      title: "Best sellers pilihan",
      description: "Lihat produk yang paling sering dibeli dan disukai.",
      buttonLabel: "Lihat best seller",
      buttonUrl: "#katalog",
      imageUrl:
        "https://images.pexels.com/photos/842567/pexels-photo-842567.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
  ];

  // === THEME INIT & APPLY ===
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  // === AUTH ===
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

  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
  };

  // === LOAD PRODUCTS ===
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

  // === AUTO SLIDER ===
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, 5000);
    return () => clearInterval(id);
  }, [sliderData.length]);

  const goPrevSlide = () =>
    setActiveSlide((prev) =>
      prev === 0 ? sliderData.length - 1 : prev - 1
    );
  const goNextSlide = () =>
    setActiveSlide((prev) => (prev + 1) % sliderData.length);

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // === FILTER & SORT PRODUK (SEARCH + DROPDOWN) ===
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
        // sudah desc by createdAt dari Firestore
        break;
    }

    return list;
  }, [products, searchTerm, sortOption]);

  return (
    <div className="min-h-screen bg-[#020817] text-slate-50">
      {/* NAVBAR ATAS (tetap versi baru) */}
      <header className="w-full border-b border-slate-800 bg-[#020817]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="font-semibold text-lg">
            <span className="text-white">Shop</span>
            <span className="text-sky-400">Lite</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* info saldo kecil */}
            {userDoc && (
              <div className="hidden sm:flex flex-col text-[11px] text-right">
                <span className="font-semibold truncate text-slate-50">
                  {userDoc.username}
                </span>
                <span className="text-slate-400">
                  Saldo {formatRupiah(userDoc.saldo || 0)}
                </span>
              </div>
            )}

            <Link
              href="/cart"
              className="relative h-9 w-9 flex items-center justify-center rounded-full bg-[#0b1220] border border-slate-600"
              aria-label="Keranjang"
            >
              <FiShoppingCart className="text-slate-100" />
            </Link>

            {/* THEME TOGGLE */}
            <button
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-[#0b1220] border border-slate-600"
              aria-label="Dark / light mode"
            >
              {theme === "dark" ? (
                <FiSun className="text-yellow-300" />
              ) : (
                <FiMoon className="text-slate-100" />
              )}
            </button>

            {/* USER MENU */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-9 px-3 inline-flex items-center gap-2 rounded-full bg-[#0b1220] border border-slate-600 text-xs"
              >
                <FiUser className="text-slate-100" />
                <span className="hidden sm:inline text-[11px] max-w-[120px] truncate">
                  {userDoc?.username ||
                    currentUser?.email ||
                    "Sign in / Register"}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[#020617] border border-slate-700 shadow-lg py-1 text-xs z-30">
                  {currentUser ? (
                    <>
                      <Link
                        href="/dasborUser"
                        className="block px-3 py-2 hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard user
                      </Link>
                      <Link
                        href="/dasboradmins"
                        className="block px-3 py-2 hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard admin
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-red-400"
                      >
                        <FiLogOut className="w-3 h-3" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/login"
                        className="block px-3 py-2 hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/auth/register"
                        className="block px-3 py-2 hover:bg-slate-800"
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

      {/* MAIN CONTENT */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* POSTER / SLIDER MIRIP SCREENSHOT */}
        <section className="rounded-3xl bg-[#020617] border border-slate-800 p-3 sm:p-4">
          <div className="relative overflow-hidden rounded-3xl bg-[#0b1120]">
            <div className="grid md:grid-cols-[1.3fr_1fr] gap-0">
              {/* Gambar */}
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sliderData[activeSlide].imageUrl}
                  alt={sliderData[activeSlide].title}
                  className="w-full h-full max-h-[260px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent" />

                {/* panah kiri/kanan */}
                <button
                  type="button"
                  onClick={goPrevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-slate-100"
                >
                  <FiChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={goNextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-slate-100"
                >
                  <FiChevronRight />
                </button>

                {/* bullet */}
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                  {sliderData.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === activeSlide
                          ? "w-5 bg-sky-400"
                          : "w-2 bg-slate-500"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* teks kanan */}
              <div className="flex flex-col justify-center px-4 py-4 md:py-6">
                <h1 className="text-xl font-semibold mb-1 text-white">
                  {sliderData[activeSlide].title}
                </h1>
                <p className="text-xs text-slate-300 mb-3">
                  {sliderData[activeSlide].description}
                </p>
                <Link
                  href={sliderData[activeSlide].buttonUrl}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold w-max"
                >
                  {sliderData[activeSlide].buttonLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* OUR PRODUCTS + SEARCH + DROPDOWN (MIRIP SS) */}
        <section className="space-y-4">
          <h2 className="text-center text-base font-semibold text-white">
            Our Products
          </h2>

          {/* search + filter box */}
          <div className="space-y-3 max-w-xl mx-auto">
            {/* search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari produk yang ingin anda cari..."
                className="w-full bg-[#020617] border border-slate-700 rounded-2xl py-2.5 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* dropdown sort */}
            <div>
              <select
                className="w-full bg-[#020617] border border-slate-700 rounded-2xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="latest">Terbaru</option>
                <option value="cheapest">Termurah</option>
                <option value="expensive">Termahal</option>
                <option value="popular">Terlaris</option>
              </select>
            </div>
          </div>
        </section>

        {/* GRID PRODUK – KARTU MIRIP SS */}
        <section id="katalog" className="pb-6">
          {loadingProducts ? (
            <p className="text-xs text-center text-slate-400">
              Loading products...
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-xs text-center text-slate-400">
              Tidak ada produk yang cocok dengan pencarianmu.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((p, idx) => {
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

                // badge kanan (Baru/Populer)
                let rightBadge = "Baru";
                if ((p.sold || 0) > 0) rightBadge = "Populer";

                return (
                  <Link
                    key={p.id}
                    href={`/${p.id}`}
                    className="bg-[#020617] border border-slate-800 rounded-3xl overflow-hidden flex flex-col hover:border-sky-500/60 transition"
                  >
                    {/* Gambar + badge */}
                    <div className="relative w-full aspect-[4/3] bg-[#020617]">
                      {firstImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={firstImage}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-500">
                          No image
                        </div>
                      )}

                      {/* badge diskon kiri */}
                      {discount > 0 && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                          -{discount}%
                        </div>
                      )}

                      {/* badge status kanan */}
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-sky-500 text-white text-[10px] font-semibold">
                        {rightBadge}
                      </div>
                    </div>

                    {/* isi bawah kartu */}
                    <div className="px-3 pt-3 pb-3 flex-1 flex flex-col gap-1">
                      <div className="text-xs font-semibold text-white line-clamp-1">
                        {p.name}
                      </div>

                      <div className="text-[11px] text-slate-400 line-clamp-2">
                        {p.description || "Produk unggulan yang sangat dinantikan."}
                      </div>

                      <div className="mt-1">
                        <div className="text-xs font-semibold text-sky-400">
                          {formatRupiah(finalPrice)}
                        </div>
                        {discount > 0 && (
                          <div className="text-[10px] text-slate-500 line-through">
                            {formatRupiah(price)}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-[10px] text-slate-500">
                        Terjual {p.sold || 0} • Stok {p.stock || 0}
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