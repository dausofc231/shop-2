// pages/auth/forgot.js
import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const [theme, setTheme] = useState("dark");
  const [gmail, setGmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
    setMessage("");
    setErrorMsg("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, gmail);
      setMessage("Link reset password telah dikirim ke email kamu.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Gagal mengirim email reset.");
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

        <h1 className="text-base font-semibold mb-1">Reset password</h1>
        <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)] mb-4">
          Masukkan email akun kamu, kami akan kirim link reset password.
        </p>

        {message && (
          <div className="mb-3 px-3 py-2 rounded-md bg-emerald-50 text-xs text-emerald-600">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="mb-3 px-3 py-2 rounded-md bg-red-50 text-xs text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
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

          <button
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="text-xs mt-4 text-center text-slate-500 dark:text-[var(--text-secondary)]">
          <Link href="/auth/login" className="underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}