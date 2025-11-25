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
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored);
  }, []);

  useEffect(() => {
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
      if (!user) return setUserDoc(null);

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      setUserDoc(snap.exists() ? snap.data() : null);
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
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingProducts(false);
    };
    loadProducts();
  }, []);

  // Slider auto
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((p) => (p + 1) % sliderData.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const goPrevSlide = () =>
    setActiveSlide((p) => (p === 0 ? sliderData.length - 1 : p - 1));
  const goNextSlide = () => setActiveSlide((p) => (p + 1) % sliderData.length);

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(value || 0);

  // Filter + sort
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let list = products.filter((p) => {
      return (
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    });

    if (sortOption === "cheapest")
      list = list.sort((a, b) => a.price - b.price);
    else if (sortOption === "expensive")
      list = list.sort((a, b) => b.price - a.price);
    else if (sortOption === "popular")
      list = list.sort((a, b) => (b.sold || 0) - (a.sold || 0));

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
            {/* saldo */}
            {userDoc && (
              <div className="hidden sm:flex flex-col text-[11px] text-right">
                <span className="font-semibold">{userDoc.username}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Saldo {formatRupiah(userDoc.saldo || 0)}
                </span>
              </div>
            )}

            {/* cart */}
            <Link
              href="/cart"
              className="h-9 w-9 flex items-center justify-center rounded-full 
                bg-white dark:bg-[#0b1220] border border-slate-300 dark:border-slate-700 
                text-slate-700 dark:text-slate-100"
            >
              <FiShoppingCart />
            </Link>

            {/* theme */}
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

            {/* profile */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-9 px-3 rounded-full bg-white dark:bg-[#0b1220] border border-slate-300 dark:border-slate-700 flex items-center gap-2 text-xs"
              >
                <FiUser />
                <span className="hidden sm:inline">
                  {userDoc?.username || currentUser?.email || "Login"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 text-xs rounded-xl shadow-lg p-1 w-40">
                  {!currentUser ? (
                    <>
                      <Link
                        href="/auth/login"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/auth/register"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Register
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dasborUser"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Dashboard user
                      </Link>
                      <Link
                        href="/dasboradmins"
                        className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Dashboard admin
                      </Link>
                      <button
                        onClick={handleLogout}
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
          {/* image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sliderData[activeSlide].imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

          {/* text */}
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

          {/* arrows */}
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

          {/* bullets */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {sliderData.map((_, i) => (
              <div
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 rounded-full cursor-pointer ${
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
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700"
            />
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl text-xs bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700"
          >
            <option value="latest">Terbaru</option>
            <option value="cheapest">Termurah</option>
            <option value="expensive">Termahal</option>
            <option value="popular">Terlaris</option>
          </select>
        </section>

        {/* PRODUK GRID 2 / 3 / 4 */}
        <section id="katalog">
          {loadingProducts ? (
            <p className="text-center text-xs text-slate-500">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const price = p.price || 0;
                const discount = p.discount || 0;
                const finalPrice =
                  discount > 0
                    ? price - (price * discount) / 100
                    : price;
                const firstImage =
                  p.images?.length > 0 ? p.images[0] : null;
                return (
                  <Link
                    href={`/${p.id}`}
                    key={p.id}
                    className="bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden hover:border-sky-500/50 transition flex flex-col"
                  >
                    <div className="relative aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={firstImage || "/noimg.png"}
                        className="w-full h-full object-cover"
                      />
                      {discount > 0 && (
                        <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      )}
                      <span className="absolute top-1 right-1 bg-sky-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {p.sold > 0 ? "Populer" : "Baru"}
                      </span>
                    </div>

                    <div className="p-2.5 text-[11px]">
                      <div className="font-semibold line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[10px]">
                        {p.description}
                      </div>

                      <div className="mt-1 text-sky-500 font-semibold">
                        {formatRupiah(finalPrice)}
                      </div>
                      {discount > 0 && (
                        <div className="line-through text-[10px] text-slate-500">
                          {formatRupiah(price)}
                        </div>
                      )}

                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
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