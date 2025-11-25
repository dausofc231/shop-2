// pages/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FiArrowLeft } from "react-icons/fi";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [loadingAdd, setLoadingAdd] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      const ref = doc(db, "products", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setProduct(null);
      } else {
        setProduct({ id: snap.id, ...snap.data() });
      }
    };
    fetchProduct();
  }, [id]);

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const handleAddToCart = async () => {
    setMessage("");
    if (!currentUser) {
      setMessage("Silakan login terlebih dahulu.");
      return;
    }
    if (!product) return;

    setLoadingAdd(true);
    try {
      const cartCol = collection(db, "users", currentUser.uid, "cart");
      await addDoc(cartCol, {
        productId: product.id,
        name: product.name,
        price: Number(product.price || 0),
        qty: Number(qty || 1),
        createdAt: new Date(),
      });
      setMessage("Berhasil ditambahkan ke keranjang.");
    } catch (err) {
      console.error(err);
      setMessage("Gagal menambahkan ke keranjang.");
    } finally {
      setLoadingAdd(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
        <div className="card w-full max-w-md text-center">
          <p className="text-sm">Memuat produk / produk tidak ditemukan.</p>
          <Link href="/" className="text-xs underline mt-2 inline-block">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  const finalPrice =
    discount > 0 ? Math.round(price - (price * discount) / 100) : price;
  const minDp = product.minDpPercent ?? 30;
  const firstImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-[var(--text-secondary)] hover:text-primary"
          >
            <FiArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          <Link
            href="/cart"
            className="text-xs underline text-primary font-semibold"
          >
            Lihat keranjang
          </Link>
        </div>

        <div className="card grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 mb-3">
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
            <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
              Terjual {product.sold || 0} • Stok {product.stock || 0}
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-base md:text-lg font-semibold mb-1">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-xs text-slate-600 dark:text-[var(--text-secondary)] mb-3">
                {product.description}
              </p>
            )}

            <div className="mb-3">
              <div className="text-lg font-bold">
                {formatRupiah(finalPrice)}
              </div>
              {discount > 0 && (
                <div className="text-[11px] text-slate-400 line-through">
                  {formatRupiah(price)}
                </div>
              )}
            </div>

            <div className="mb-3 text-xs">
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-[var(--text-secondary)]">
                DP minimal {minDp}% • Sisa dicatat sebagai tagihan
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs">Jumlah</span>
              <input
                type="number"
                min={1}
                className="input w-20 text-xs"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

            {message && (
              <div className="mb-2 text-[11px] text-primary">{message}</div>
            )}

            {product.requireLogin && !currentUser && (
              <p className="text-[11px] text-red-500 mb-2">
                Produk ini hanya bisa dibeli oleh pengguna yang login.
              </p>
            )}

            <button
              onClick={handleAddToCart}
              disabled={loadingAdd || (product.requireLogin && !currentUser)}
              className="btn-primary w-full mt-auto"
            >
              {loadingAdd ? "Menambahkan..." : "Tambah ke keranjang"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}