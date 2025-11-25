// pages/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { db, auth } from "../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  FiSun,
  FiMoon,
  FiShoppingCart,
  FiArrowLeft,
  FiHeart,
  FiSend,
  FiUser,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [theme, setTheme] = useState("dark");

  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState(null);

  // like
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  // title + deskripsi + price expand
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showFullPrice, setShowFullPrice] = useState(false);

  // komentar
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [savingComment, setSavingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});

  // CART STATE
  const [cartCount, setCartCount] = useState(0);
  const [cartAdded, setCartAdded] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  // slider gambar
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  /* AUTH LISTENER */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      if (user) {
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            setUserDoc(data);
            if (!commentName) {
              setCommentName(data.username || "");
            }
          }
        } catch (err) {
          console.error(err);
        }
        await loadCartInfo(user.uid);
      } else {
        setUserDoc(null);
        setCartCount(0);
        setCartAdded(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* LOAD PRODUCT + LIKE COUNT */
  useEffect(() => {
    if (!id) return;
    const loadProduct = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const ref = doc(db, "products", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setNotFound(true);
          setProduct(null);
        } else {
          const data = snap.data();
          const likes = typeof data.likes === "number" ? data.likes : 0;
          const stock = typeof data.stock === "number" ? data.stock : 0;
          const sold = typeof data.sold === "number" ? data.sold : 0;
          setProduct({
            id: snap.id,
            ...data,
            likes,
            stock,
            sold,
          });
          setLikeCount(likes);
          setCurrentImageIndex(0);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  /* CEK APAKAH USER SUDAH LIKE */
  useEffect(() => {
    const checkLiked = async () => {
      if (!id || !currentUser) {
        setLiked(false);
        return;
      }
      try {
        const likeRef = doc(db, "products", id, "likes", currentUser.uid);
        const likeSnap = await getDoc(likeRef);
        setLiked(likeSnap.exists());
      } catch (err) {
        console.error(err);
        setLiked(false);
      }
    };
    checkLiked();
  }, [id, currentUser]);

  /* LOAD KOMENTAR */
  useEffect(() => {
    if (!id) return;
    const loadComments = async () => {
      try {
        const q = query(
          collection(db, "products", id, "comments"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setComments(list);
      } catch (err) {
        console.error(err);
        setComments([]);
      }
    };
    loadComments();
  }, [id]);

  /* LOAD CART INFO */
  const loadCartInfo = async (uid) => {
    try {
      const cartCol = collection(db, "users", uid, "cart");
      const snap = await getDocs(cartCol);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCartCount(list.length);
      if (id) {
        const found = list.some((item) => item.productId === id);
        setCartAdded(found);
      }
    } catch (err) {
      console.error(err);
      setCartCount(0);
      setCartAdded(false);
    }
  };

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // format singkat: 1,2k / 1,5 jt / 2,3M
  const formatCompact = (value) => {
    const num = Number(value || 0);
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(".", ",") + "M";
    }
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(".", ",") + " jt";
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(".", ",") + "k";
    }
    return String(num);
  };

  // stok/terjual versi singkat
  const formatCompactNumber = (value) => {
    const num = Number(value || 0);
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(".", ",") + " jt";
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(".", ",") + " rb";
    }
    return String(num);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
    router.push("/");
  };

  const handleToggleLike = async () => {
    if (!currentUser || !id || !product) return;
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const likeRef = doc(db, "products", id, "likes", currentUser.uid);
      const productRef = doc(db, "products", id);

      const likeSnap = await getDoc(likeRef);
      if (!likeSnap.exists()) {
        await setDoc(likeRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        const newCount = likeCount + 1;
        setLikeCount(newCount);
        setLiked(true);
        await updateDoc(productRef, { likes: newCount });
      } else {
        await deleteDoc(likeRef);
        const newCount = Math.max(0, likeCount - 1);
        setLikeCount(newCount);
        setLiked(false);
        await updateDoc(productRef, { likes: newCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!id) return;
    if (!commentText.trim()) return;
    setSavingComment(true);
    try {
      const name =
        commentName.trim() ||
        userDoc?.username ||
        (currentUser ? "User" : "Anon");
      const commentsCol = collection(db, "products", id, "comments");
      await addDoc(commentsCol, {
        name,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        userId: currentUser?.uid || null,
      });
      setCommentText("");
      if (!commentName.trim()) setCommentName(name);
      const q = query(commentsCol, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setComments(list);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingComment(false);
    }
  };

  const handleToggleCommentExpand = (commentId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleAddToCart = async () => {
    if (!currentUser) {
      alert("Silakan login terlebih dahulu.");
      router.push("/auth/login");
      return;
    }
    if (!id || !product) return;
    if (cartBusy) return;
    setCartBusy(true);
    try {
      const cartCol = collection(db, "users", currentUser.uid, "cart");
      await addDoc(cartCol, {
        productId: id,
        name: product.name,
        price: Number(product.price || 0),
        qty: 1,
        createdAt: serverTimestamp(),
      });
      await loadCartInfo(currentUser.uid);
      setCartAdded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCartBusy(false);
    }
  };

  // slider controls
  const images = Array.isArray(product?.images) ? product.images : [];
  const hasImages = images.length > 0;

  const goPrevImage = () => {
    if (!hasImages) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const goNextImage = () => {
    if (!hasImages) return;
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
        <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
          Loading product...
        </p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
        <p className="text-sm mb-2">Produk tidak ditemukan.</p>
        <Link href="/" className="text-xs underline text-primary">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const price = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  const finalPrice =
    discount > 0 ? Math.round(price - (price * discount) / 100) : price;

  const titleTooLong = (product.name || "").length > 40;
  const descTooLong = (product.description || "").length > 200;

  const categories = Array.isArray(product.categories)
    ? product.categories
    : product.category
    ? [product.category]
    : [];

  const likeDisplay = formatCompact(likeCount);
  const commentDisplay = formatCompact(comments.length);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)] text-sm">
      {/* NAVBAR ATAS (tetap) */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-bg-dark/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark"
              aria-label="Kembali"
            >
              <FiArrowLeft className="text-slate-700 dark:text-[var(--text)]" />
            </button>
            <Link
              href="/"
              className="font-semibold text-base text-slate-900 dark:text-[var(--text)]"
            >
              Shop<span className="text-primary">Lite</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={() => router.push("/cart")}
                className="relative h-8 w-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark"
                aria-label="Lihat keranjang"
              >
                <FiShoppingCart className="text-slate-700 dark:text-[var(--text)]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>
            )}

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

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-8 px-3 inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-card-dark text-xs"
              >
                <FiUser className="text-slate-600 dark:text-[var(--text-secondary)]" />
                <span className="hidden sm:inline text-[11px] max-w-[80px] truncate">
                  {userDoc?.username || currentUser?.email || "Guest"}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white dark:bg-card-dark shadow-lg border border-slate-200/80 dark:border-slate-700 py-1 text-xs z-30">
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
                        Login
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
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        {/* CARD PRODUK */}
        <section className="card p-3 sm:p-3.5 space-y-3">
          {/* gambar + slider + thumb */}
          <div className="space-y-1.5 pb-1">
            {hasImages ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-[4/3]">
                <div
                  className="flex h-full w-full transition-transform duration-300"
                  style={{
                    transform: `translateX(-${currentImageIndex * 100}%)`,
                  }}
                >
                  {images.map((img, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={idx}
                      src={img}
                      alt={`image-${idx}`}
                      className="w-full h-full flex-shrink-0 object-cover"
                    />
                  ))}
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white"
                    >
                      <FiChevronLeft />
                    </button>
                    <button
                      type="button"
                      onClick={goNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white"
                    >
                      <FiChevronRight />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-[4/3] flex items-center justify-center text-xs text-slate-400">
                No image
              </div>
            )}

            {hasImages && (
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`h-11 w-11 rounded-md overflow-hidden flex-shrink-0 border ${
                      idx === currentImageIndex
                        ? "border-primary"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`thumb-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TERJUAL / STOK dibungkus pill + garis atas & bawah, SUPER RAPET */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-[var(--text-secondary)] py-1.5 border-y border-slate-200 dark:border-slate-800">
            <div className="flex-1 flex justify-start">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="opacity-70 mr-1">Terjual</span>
                <span className="font-semibold">
                  {formatCompactNumber(product.sold || 0)}
                </span>
              </span>
            </div>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 flex justify-end">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="opacity-70 mr-1">Stok</span>
                <span className="font-semibold">
                  {formatCompactNumber(product.stock || 0)}
                </span>
              </span>
            </div>
          </div>

          {/* TITLE + HARGA – super rapet, diskon dirapetin & sama ukuran */}
          <div className="space-y-1 py-1.5 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowFullTitle((v) => !v)}
              className="text-left w-full"
            >
              <h1
                className={`text-sm font-semibold text-slate-900 dark:text-[var(--text)] ${
                  showFullTitle ? "" : "line-clamp-1"
                }`}
              >
                {product.name}
              </h1>
            </button>

            {/* PEMBATAS ANTARA TITLE & NOMINAL */}
            <div className="mt-1 pt-1 flex items-center justify-between gap-1.5 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowFullPrice((v) => !v)}
                className="text-left flex-1 cursor-pointer"
              >
                <div
                  className={`text-base font-bold text-primary ${
                    showFullPrice ? "" : "truncate"
                  }`}
                >
                  {formatRupiah(finalPrice)}
                </div>
                {discount > 0 && (
                  <div
                    className={`text-[11px] text-slate-400 line-through ${
                      showFullPrice ? "" : "truncate"
                    }`}
                  >
                    {formatRupiah(price)}
                  </div>
                )}
              </button>

              {discount > 0 && (
                <span className="px-1.5 py-0 rounded-full text-base bg-red-500 text-white font-semibold leading-none flex items-center">
                  -{discount}%
                </span>
              )}
            </div>
          </div>

          {/* DESKRIPSI – tap box untuk expand, rapet */}
          <div className="space-y-1 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-[var(--text-secondary)]">
              Deskripsi Produk
            </div>
            <div
              onClick={() => setShowFullDesc((v) => !v)}
              className={`w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-700 dark:text-[var(--text-secondary)] p-2 whitespace-pre-line break-words ${
                showFullDesc ? "max-h-64" : "max-h-28"
              } overflow-y-auto cursor-pointer`}
            >
              {product.description
                ? product.description
                : "Belum ada deskripsi untuk produk ini."}
            </div>
          </div>

          {/* KATEGORI – slider horizontal, rapet */}
          <div className="space-y-1 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-[var(--text-secondary)]">
              Kategori
            </div>
            {categories.length === 0 ? (
              <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                -
              </div>
            ) : (
              <div className="overflow-x-auto whitespace-nowrap pb-1">
                {categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 mr-1.5 rounded-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[11px]"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TOMBOL KERANJANG */}
          <div className="pt-1">
            <button
              onClick={handleAddToCart}
              disabled={!currentUser || cartBusy || product.stock <= 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white text-[11px] font-semibold py-2 disabled:opacity-60"
            >
              {cartBusy
                ? "Menambahkan..."
                : cartAdded
                ? "Sudah di keranjang"
                : "Tambah ke keranjang"}
            </button>
            {!currentUser && (
              <p className="mt-1 text-[10px] text-slate-500 dark:text-[var(--text-secondary)]">
                Login dulu untuk menambah ke keranjang.
              </p>
            )}
          </div>
        </section>

        {/* ULASAN & RATING + KOMENTAR */}
        <section className="card p-3 sm:p-3.5 space-y-2.5">
          {/* header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold">Ulasan &amp; Rating</h2>
              <p className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                {commentDisplay} komentar dari pengguna
              </p>
            </div>
            <button
              onClick={handleToggleLike}
              disabled={!currentUser || likeBusy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark text-[11px]"
            >
              <FiHeart
                className={
                  liked
                    ? "text-red-500 fill-red-500"
                    : "text-slate-500 dark:text-[var(--text-secondary)]"
                }
              />
              <span>
                {likeDisplay} | {commentDisplay}
              </span>
            </button>
          </div>

          {/* form komentar */}
          <form
            onSubmit={handleAddComment}
            className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-2.5"
          >
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  Nama
                </label>
                <input
                  type="text"
                  placeholder="Nama"
                  className="input text-xs"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  Komentar
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Tulis komentar kamu di sini..."
                    className="input text-xs resize-none pr-10"
                    value={commentText}
                    onChange={(e) =>
                      setCommentText(e.target.value.slice(0, 500))
                    }
                  />
                  <span className="absolute bottom-1 right-2 text-[10px] text-slate-400">
                    {commentText.length}/500
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingComment || !commentText.trim()}
                  className="w-full h-8 flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-semibold disabled:opacity-60"
                >
                  {savingComment ? "Mengirim..." : "Kirim"}
                </button>
              </div>
            </div>
          </form>

          {/* daftar komentar - slider kalau banyak */}
          <div
            className={`space-y-1.5 ${
              comments.length > 4 ? "max-h-60 overflow-y-auto pr-1" : ""
            }`}
          >
            {comments.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                Belum ada komentar.
              </p>
            ) : (
              comments.map((c) => {
                const text = c.text || "";
                const expanded = !!expandedComments[c.id];

                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-[11px]"
                  >
                    {/* header nama + tanggal + garis */}
                    <div className="px-3 pt-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold max-w-[120px] truncate">
                          {c.name || "Anonim"}
                        </span>
                        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                        {c.createdAt?.toDate && (
                          <span className="text-[10px] text-slate-400">
                            {c.createdAt
                              .toDate()
                              .toLocaleDateString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* isi komentar - box scroll, tap untuk expand */}
                    <div className="px-3 pb-2 pt-1">
                      <div
                        onClick={() => handleToggleCommentExpand(c.id)}
                        className={`${
                          expanded ? "max-h-40" : "max-h-20"
                        } overflow-y-auto cursor-pointer`}
                      >
                        <p className="text-slate-600 dark:text-[var(--text-secondary)] whitespace-pre-line break-words">
                          {text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}