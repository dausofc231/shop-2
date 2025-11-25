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

  // title + deskripsi expand
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // komentar
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});

  // CART STATE
  const [cartCount, setCartCount] = useState(0);
  const [cartAdded, setCartAdded] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

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
        // load user profile
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
        // load cart summary
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
      // reload comments
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

  const firstImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null;

  const titleTooLong = (product.name || "").length > 40;
  const descTooLong = (product.description || "").length > 120;

  const visibleComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)] text-sm">
      {/* NAVBAR ATAS */}
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
            {/* CART ICON ATAS – hanya muncul kalau sudah login */}
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

            {/* THEME TOGGLE */}
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
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          {/* GAMBAR + INFO UTAMA */}
          <div className="card flex flex-col gap-3">
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
              {firstImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  No image
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
              <span>Terjual {product.sold || 0}</span>
              <span>Stok {product.stock || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleToggleLike}
                disabled={!currentUser || likeBusy}
                className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark"
              >
                <FiHeart
                  className={
                    liked
                      ? "text-red-500 fill-red-500"
                      : "text-slate-500 dark:text-[var(--text-secondary)]"
                  }
                />
                <span>{likeCount} suka</span>
              </button>
              <span className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                ID: {product.id}
              </span>
            </div>
          </div>

          {/* DETAIL + KOMENTAR */}
          <div className="card flex flex-col gap-3">
            {/* TITLE + HARGA */}
            <div>
              <h1 className="text-base font-semibold mb-1">
                {showFullTitle || !titleTooLong
                  ? product.name
                  : (product.name || "").slice(0, 40) + "..."}
              </h1>
              {titleTooLong && (
                <button
                  type="button"
                  onClick={() => setShowFullTitle((v) => !v)}
                  className="text-[11px] text-primary underline"
                >
                  {showFullTitle ? "Tampilkan lebih sedikit" : "Lihat judul lengkap"}
                </button>
              )}

              <div className="mt-2 mb-1">
                <div className="text-lg font-bold">
                  {formatRupiah(finalPrice)}
                </div>
                {discount > 0 && (
                  <div className="text-[11px] text-slate-400 line-through">
                    {formatRupiah(price)}
                  </div>
                )}
              </div>
            </div>

            {/* DESKRIPSI SLIDER (expand) */}
            {product.description && (
              <div className="text-xs text-slate-600 dark:text-[var(--text-secondary)]">
                <p className="whitespace-pre-line break-words">
                  {showFullDesc || !descTooLong
                    ? product.description
                    : (product.description || "").slice(0, 120) + "..."}
                </p>
                {descTooLong && (
                  <button
                    type="button"
                    onClick={() => setShowFullDesc((v) => !v)}
                    className="mt-1 text-[11px] text-primary underline"
                  >
                    {showFullDesc
                      ? "Sembunyikan sebagian"
                      : "Lihat deskripsi lengkap"}
                  </button>
                )}
              </div>
            )}

            {/* KOMENTAR */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold">Komentar</h2>
                <span className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                  {comments.length} komentar
                </span>
              </div>

              <form
                onSubmit={handleAddComment}
                className="flex flex-col gap-2 text-xs"
              >
                <div className="grid grid-cols-[1.1fr_2fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Nama"
                    className="input text-xs"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Tulis komentar..."
                    className="input text-xs"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={savingComment || !commentText.trim()}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-60"
                    aria-label="Kirim komentar"
                  >
                    <FiSend className="w-3 h-3" />
                  </button>
                </div>
              </form>

              <div className="space-y-2 max-h-[220px] overflow-y-auto mt-1">
                {visibleComments.length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                    Belum ada komentar.
                  </p>
                ) : (
                  visibleComments.map((c) => {
                    const text = c.text || "";
                    const isLong = text.length > 120;
                    const expanded = !!expandedComments[c.id];

                    return (
                      <div
                        key={c.id}
                        className="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 text-[11px]"
                      >
                        <div className="font-semibold mb-0.5">
                          {c.name || "Anon"}
                        </div>
                        <p className="text-slate-600 dark:text-[var(--text-secondary)] whitespace-pre-line break-words">
                          {expanded || !isLong
                            ? text
                            : text.slice(0, 120) + "..."}
                        </p>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => handleToggleCommentExpand(c.id)}
                            className="mt-1 text-[10px] text-primary underline"
                          >
                            {expanded ? "Sembunyikan" : "Lihat selengkapnya"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {comments.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllComments((v) => !v)}
                  className="text-[11px] text-primary underline"
                >
                  {showAllComments ? "Tampilkan sedikit" : "Lihat semua komentar"}
                </button>
              )}
            </div>

            {/* TOMBOL BAWAH */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                onClick={handleAddToCart}
                disabled={!currentUser || cartBusy || product.stock <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white text-[11px] font-semibold py-2 disabled:opacity-60"
              >
                {cartBusy
                  ? "Menambahkan..."
                  : cartAdded
                  ? "Sudah di keranjang"
                  : "Tambah ke keranjang"}
              </button>

              {!currentUser && (
                <p className="text-[10px] text-slate-500 dark:text-[var(--text-secondary)]">
                  Login dulu untuk menambah ke keranjang.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}