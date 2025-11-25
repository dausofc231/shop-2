// pages/auth/register.js
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { createUserDoc } from "../../lib/db";
import { FiSun, FiMoon } from "react-icons/fi";

export default function RegisterPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("dark");

  const [username, setUsername] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username || !gmail || !password) {
      setErrorMsg("Semua field wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, gmail, password);
      const user = cred.user;

      await createUserDoc(user.uid, {
        email: user.email,
        username,
        role: "users",
      });

      router.push("/auth/login");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Gagal membuat akun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
      <div className="w-full max-w-sm card">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-lg tracking-tight text-slate-900 dark:text-[var(--text)]">
            Shop<span className="text-primary">Lite</span>
          </div>
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-full bg-slate-100 dark:bg-card-dark"
          >
            {theme === "dark" ? <FiSun /> : <FiMoon />}
          </button>
        </div>

        <h1 className="text-base font-semibold mb-1">Create account</h1>
        <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)] mb-4">
          Daftar untuk mulai belanja & pakai sistem DP.
        </p>

        {errorMsg && (
          <div className="mb-3 px-3 py-2 rounded-md bg-red-50 text-xs text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1">Username</label>
            <input
              type="text"
              className="input w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Email</label>
            <input
              type="email"
              className="input w-full"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Password</label>
            <input
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading ? "Membuat akun..." : "Create account"}
          </button>
        </form>

        <p className="text-xs mt-4 text-center text-slate-500 dark:text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link href="/auth/login" className="underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}