// pages/dasboradmins.js
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiSun, FiMoon, FiUser } from "react-icons/fi";

export default function DasborAdmins() {
  const router = useRouter();
  const [adminData, setAdminData] = useState(null);
  const [checking, setChecking] = useState(true);
  const [theme, setTheme] = useState("dark");

  /* THEME INIT */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") || "dark";
      setTheme(stored);
    }
  }, []);

  /* THEME APPLY */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  /* AUTH CHECK – hanya izinkan role admins */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          router.replace("/auth/login");
          return;
        }
        const data = snap.data();
        if (data.role !== "admins") {
          router.replace("/dasborUser");
          return;
        }
        setAdminData({ ...data, uid: user.uid });
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error(err);
    }
  };

  const createdDate = (() => {
    if (!adminData?.createdAt) return "-";
    try {
      const d = adminData.createdAt.toDate();
      return d.toLocaleDateString("id-ID");
    } catch {
      return "-";
    }
  })();

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-bg-dark text-sm text-slate-900 dark:text-[var(--text)]">
        <p>Memeriksa sesi admin...</p>
      </div>
    );
  }

  if (!adminData) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)] text-sm">
      {/* NAVBAR */}
      <header className="w-full border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-bg-dark/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* LOGO */}
          <div className="font-semibold text-lg tracking-tight text-slate-900 dark:text-[var(--text)]">
            Shop<span className="text-primary">Lite</span> Admin
          </div>

          <div className="flex items-center gap-3">
            {/* BACK TO HOME */}
            <Link
              href="/"
              className="hidden sm:inline-flex px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-bg-dark text-xs text-slate-800 dark:text-[var(--text)]"
            >
              Home
            </Link>

            {/* TOGGLE THEME */}
            <button
              type="button"
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

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-lg border border-red-500 text-xs text-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT – hanya info user/admin */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* AVATAR SIMPLE */}
          <div className="h-12 w-12 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-bg-dark flex items-center justify-center">
            {adminData.photoURL ? (
              <img
                src={adminData.photoURL}
                alt="Avatar"
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <FiUser className="text-slate-500 dark:text-[var(--text-secondary)] h-5 w-5" />
            )}
          </div>

          {/* INFO ADMIN */}
          <div className="flex-1 space-y-1 text-xs text-slate-700 dark:text-[var(--text-secondary)]">
            <h1 className="text-base font-semibold text-slate-900 dark:text-[var(--text)]">
              {adminData.username || "Admin"}
            </h1>

            <p>
              <span className="font-medium">Email:</span>{" "}
              {adminData.email || "-"}
            </p>

            <p>
              <span className="font-medium">UID:</span>{" "}
              <span className="font-mono break-all">{adminData.uid}</span>
            </p>

            <p>
              <span className="font-medium">Role:</span> {adminData.role || "-"}
            </p>

            <p>
              <span className="font-medium">Tanggal bergabung:</span>{" "}
              {createdDate}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}