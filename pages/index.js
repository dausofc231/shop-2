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

  // Poster data
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

  // Theme init
  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem("theme") || "dark"
      : "dark";
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

  // AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      if (!user) {
        setUserDoc(null);
        return;
      }

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        setUserDoc(snap.exists() ? snap.data() : null);
      } catch (err) {
        console.error(err);
        setUserDoc(null);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
  };

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  // Slider auto
  useEffect(() => {
    const id = setInterval(
      () => setActiveSlide((p) => (p + 1) % sliderData.length),
      4500
    );
    return () => clearInterval(id);
  }, []);

  const goPrevSlide = () =>
    setActiveSlide((p) => (p === 0 ? sliderData.length - 1 : p - 1));
  const goNextSlide = () => setActiveSlide((p) => (p + 1) % sliderData.length);

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // Filter + sort
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();

    let list = products.filter((p) => {
      if (!term) return true;
      const name = (p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(term) || desc.includes(term);
    });

    if (sortOption === "cheapest") {
      list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === "expensive") {
      list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortOption === "popular") {
      list = [...list].sort((a, b) => (b.sold || 0) - (a.sold || 0));
    }
    // latest sudah dari Firestore

    return list;
  }, [products, searchTerm, sortOption]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#020817] dark:text-slate-50">
      {/* NAVBAR */}
      <header className="w-full bg-white/90 dark:bg-[#020817]/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-lg font-bold">
            Shop<span className="text-sky-500">Lite</span>
          </div>

          <div className="flex items-center gap-2">
            {userDoc && (
              <div className="hidden sm:flex flex-col text-[11px] text-right">
                <span className="font-semibold">{userDoc.username}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Saldo {formatRupiah(userDoc.saldo || 0)}
                </span>
              </div>
            )}

            <Link
              href="/cart"
              className="h-9 w-9 flex items-center justify-center rounded-full 
                bg-white dark:bg-[#0b1220] border border-slate-300 dark:border-slate-700 
                text-slate-700 dark:text-slate-100"
            >
              <FiShoppingCart />
            </Link>

            <button
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-full 
                bg-white dark:bg-[#0b1220] border border-slate-300 dark:border-slate-700 
                text-slate-700 dark:text-slate-100"
            >
              {theme === "dark" ? (
                <FiSun className="text-yellow-300" />
              ) : (
                <FiMoon />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-9 px-3 rounded-full bg-white dark:bg-[#0b1220] border border-slate-300 dark:border-slate-700 flex items-center gap-2 text-xs"
              >
                <FiUser />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {userDoc?.username || currentUser?.email || "Login"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 text-xs rounded-xl shadow-lg p-1 w-44">
                  {!currentUser ? (
                    <>
                      <Link
                        href="/auth/login"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        onClick={() => setMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/auth/register"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        onClick={() => setMenuOpen(false)}
                      >
                        Register
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dasborUser"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard user
                      </Link>
                      <Link
                        href="/dasboradmins"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard admin
                      </Link>
                      <button
                        onClick={async () => {
                          await handleLogout();
                          setMenuOpen(false);
                        }}
                        className="w-full text-left text-red-500 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        <FiLogOut className="inline mr-1" />
                        Logout
                      </button>
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
        {/* POSTER RECTANGLE */}
        <section className="rounded-2xl bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 h-28 sm:h-32 md:h-36 overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sliderData[activeSlide].imageUrl}
            alt={sliderData[activeSlide].title}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
            <h1 className="text-base sm:text-lg font-bold">
              {sliderData[activeSlide].title}
            </h1>
            <p className="text-[11px] sm:text-xs opacity-90">
              {sliderData[activeSlide].description}
            </p>
            <Link
              href={sliderData[activeSlide].buttonUrl}
              className="inline-block mt-2 px-3 py-1.5 bg-sky-500 text-white rounded-full text-[11px]"
            >
              {sliderData[activeSlide].buttonLabel}
            </Link>
          </div>

          <button
            onClick={goPrevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-black/40 rounded-full flex items-center justify-center text-white"
          >
            <FiChevronLeft />
          </button>
          <button
            onClick={goNextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-black/40 rounded-full flex items-center justify-center text-white"
          >
            <FiChevronRight />
          </button>

          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {sliderData.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 rounded-full ${
                  i === activeSlide ? "w-5 bg-sky-400" : "w-2 bg-slate-500"
                }`}
              />
            ))}
          </div>
        </section>

        {/* SEARCH + SORT */}
        <section className="max-w-xl mx-auto space-y-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl text-xs bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50"
          >
            <option value="latest">Terbaru</option>
            <option value="cheapest">Termurah</option>
            <option value="expensive">Termahal</option>
            <option value="popular">Terlaris</option>
          </select>
        </section>

        {/* GRID PRODUK */}
        <section id="katalog">
          {loadingProducts ? (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Loading products...
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Tidak ada produk yang cocok dengan pencarianmu.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
                const sold = Number(p.sold || 0);
                const stock = Number(p.stock || 0);

                return (
                  <Link
                    href={`/${p.id}`}
                    key={p.id}
                    className="bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden hover:border-sky-500/60 transition flex flex-col"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={firstImage || "/noimg.png"}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />

                      {discount > 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      )}

                      <span className="absolute top-1.5 right-1.5 bg-sky-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                        {sold > 0 ? "Populer" : "Baru"}
                      </span>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col gap-1 text-[11px]">
                      <div className="font-semibold line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {p.description ||
                          "Produk unggulan yang sangat dinantikan."}
                      </div>

                      {/* Hanya harga final, truncate jika kepanjangan */}
                      <div className="mt-1 text-sky-500 font-semibold text-[11px] truncate">
                        {formatRupiah(finalPrice)}
                      </div>

                      {/* Terjual + stok juga truncate */}
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Terjual {sold} • Stok {stock}
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