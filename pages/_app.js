// pages/_app.js
import "../styles/globals.css";
import { useEffect, useState } from "react";

function MyApp({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");

    if (!stored) {
      // default: dark
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (stored === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  // biar tidak flicker icon sebelum tahu theme
  if (!mounted) return null;

  return <Component {...pageProps} />;
}

export default MyApp;