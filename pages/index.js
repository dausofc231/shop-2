// pages/index.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { db, auth } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  FiSun,
  FiMoon,
  FiMenu,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

// DATA SLIDER – bebas kamu ganti imageUrl + teks + url
const sliderData = [
  {
    id: 0,
    title: "Special Discount",
    description: "Get up to 50% off on selected items.",
    buttonLabel: "Shop",
    buttonUrl: "#",
    imageUrl:
      "https://images.pexels.com/photos/842567/pexels-photo-842567.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 1,
    title: "New Arrivals",
    description: "Produk terbaru hadir setiap minggunya.",
    buttonLabel: "See new items",
    buttonUrl: "#",
    imageUrl:
      "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 2,
    title: "Best Sellers",
    description: "Lihat produk paling populer di ShopLite.",
    buttonLabel: "View best sellers",
    buttonUrl: "#",
    imageUrl:
      "https://images.pexels.com/photos/7679879/pexels-photo-7679879.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

export default function Home() {
  // THEME
  const [theme, setTheme] = useState("dark");

  // MENU
  const [menuOpen, setMenuOpen] = useState(false);

  // AUTH + USER DOC
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);

  // SLIDER
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  /* THEME - LOAD DARI LOCALSTORAGE */
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

  /* SLIDER AUTO */
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, 5000); // 5 detik
    return () => clearInterval(id);
  }, []);

  const goNextSlide = () =>
    setActiveSlide((prev) => (prev + 1) % sliderData.length);
  const goPrevSlide = () =>
    setActiveSlide((prev) => (prev - 1 + sliderData.length) % sliderData.length);

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) goNextSlide();
      else goPrevSlide();
    }
    setTouchStartX(null);
  };

  /* AUTH USER + FIRESTORE USERS */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setUserDoc(null);

      if (!user) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setUserDoc(snap.data());
        }
      } catch (err) {
        console.error(err);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const createdDate = (() => {
    if (!userDoc?.createdAt) return "-";
    try {
      const d = userDoc.createdAt.toDate();
      return d.toLocaleDateString("id-ID");
    } catch {
      return "-";
    }
  })();

  const dashboardPath =
    userDoc?.role === "admins" ? "/dasboradmins" : "/dasborUser";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)] text-sm">
      {/* NAVBAR */}
      <header className="w-full border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-bg-dark/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* LOGO */}
          <div className="font-semibold text-lg text-slate-900 dark:text-[var(--text)]">
            Shop<span className="text-primary">Lite</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark / light */}
            <button
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark"
              aria-label="Dark / light mode"
            >
              {theme === "dark" ? (
                <FiSun className="text-primary" />
              ) : (
                <FiMoon className="text-slate-700" />
              )}
            </button>

            {/* Garis 3 (menu) */}
            <button
              onClick={() => setMenuOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark"
              aria-label="Menu"
            >
              <FiMenu className="text-slate-700 dark:text-[var(--text)]" />
            </button>
          </div>
        </div>
      </header>

      {/* PANEL MENU (KANAN) */}
      {menuOpen && (
        <div className="fixed inset-0 z-40">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />

          {/* panel */}
          <div className="absolute right-0 top-0 h-full w-64 bg-white dark:bg-card-dark shadow-xl p-4 flex flex-col gap-3">
            {/* PROFIL SINGKAT */}
            {userDoc ? (
              <div className="flex items-center gap-3 text-xs text-slate-800 dark:text-[var(--text)]">
                <div className="h-10 w-10 rounded-full border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-bg-dark flex items-center justify-center flex-shrink-0">
                  {userDoc.photoURL ? (
                    <img
                      src={userDoc.photoURL}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FiUser className="text-slate-500 dark:text-[var(--text-secondary)] h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {userDoc.username || "User"}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-[var(--text-secondary)]">
                    Akun: <span className="font-medium">{userDoc.role || "-"}</span>
                    {createdDate !== "-" && ` • ${createdDate}`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                Belum login
              </p>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700" />

            {/* MENU: PROFIL + LOGIN/LOGOUT */}
            <nav className="flex flex-col gap-2 text-sm">
              {userDoc && (
                <>
                  {/* PROFIL */}
                  <Link
                    href={dashboardPath}
                    className="hover:underline text-slate-800 dark:text-[var(--text)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profil
                  </Link>

                  {/* LOGOUT */}
                  <button
                    onClick={handleLogout}
                    className="text-left text-red-500 mt-1"
                  >
                    Logout
                  </button>
                </>
              )}

              {!userDoc && (
                <Link
                  href="/auth/login"
                  className="hover:underline text-slate-800 dark:text-[var(--text)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* MAIN CONTENT – hanya poster slider */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* HERO SLIDER */}
        <section className="mb-6">
          <div
            className="relative overflow-hidden rounded-2xl h-44 sm:h-52 bg-slate-900"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="absolute inset-0 flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {sliderData.map((slide) => (
                <div
                  key={slide.id}
                  className="relative w-full h-full flex-shrink-0"
                >
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6">
                    <h1 className="text-base sm:text-lg font-semibold text-white mb-1">
                      {slide.title}
                    </h1>
                    <p className="text-[11px] sm:text-xs text-slate-100 mb-3 max-w-[70%]">
                      {slide.description}
                    </p>
                    <Link
                      href={slide.buttonUrl}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-xs sm:text-sm font-medium text-white shadow-md w-max"
                    >
                      {slide.buttonLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* tombol prev/next */}
            <button
              onClick={goPrevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center text-white text-xs"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={goNextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center text-white text-xs"
            >
              <FiChevronRight />
            </button>

            {/* indikator dot */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
              {sliderData.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    idx === activeSlide
                      ? "bg-primary scale-110"
                      : "bg-slate-300/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}