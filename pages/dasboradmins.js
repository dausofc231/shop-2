// pages/dasboradmins.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { createProduct, getUserData } from "../lib/db";
import { FiArrowLeft, FiLogOut } from "react-icons/fi";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [adminDoc, setAdminDoc] = useState(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [stockInput, setStockInput] = useState("");
  const [minDpInput, setMinDpInput] = useState("30");
  const [imagesInput, setImagesInput] = useState("");
  const [categoriesInput, setCategoriesInput] = useState("");
  const [requireLogin, setRequireLogin] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const data = await getUserData(user.uid);
      if (data?.role !== "admins") {
        router.replace("/dasborUser");
        return;
      }
      setCurrentUser(user);
      setAdminDoc(data);
      await loadProducts();
    });
    return () => unsub();
  }, [router]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setProducts(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");

    const priceDigits = priceInput.replace(/\D/g, "");
    const stockDigits = stockInput.replace(/\D/g, "");
    const discountNumber = Number(discountInput || 0);
    const priceNumber = priceDigits ? Number(priceDigits) : 0;
    const stockNumber = stockDigits ? Number(stockDigits) : 0;
    const minDp = Number(minDpInput || 30);

    if (!name) {
      setErrorMsg("Nama produk wajib diisi.");
      return;
    }
    if (!priceNumber) {
      setErrorMsg("Harga produk wajib diisi.");
      return;
    }

    const images = imagesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const categories = categoriesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await createProduct({
        name,
        description,
        price: priceNumber,
        discount: discountNumber,
        stock: stockNumber,
        minDpPercent: minDp,
        images,
        categories,
        requireLogin,
        labels: [],
        createdBy: adminDoc?.uid || null,
      });

      setName("");
      setDescription("");
      setPriceInput("");
      setDiscountInput("");
      setStockInput("");
      setMinDpInput("30");
      setImagesInput("");
      setCategoriesInput("");
      setRequireLogin(false);

      setMessage("Produk berhasil dibuat.");
      await loadProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Gagal membuat produk.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-dark text-slate-900 dark:text-[var(--text)]">
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-[var(--text-secondary)] hover:text-primary"
          >
            <FiArrowLeft className="w-4 h-4" />
            Kembali
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-xs text-red-500"
          >
            <FiLogOut className="w-3 h-3" />
            Logout
          </button>
        </div>

        {adminDoc && (
          <div className="card flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                Admin
              </div>
              <div className="font-semibold">{adminDoc.username}</div>
              <div className="text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                {adminDoc.email}
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-[var(--text-secondary)] text-right">
              Kamu bisa mengatur katalog dan aturan DP di sini.
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          {/* Form create product */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-3">Tambah produk baru</h2>

            {message && (
              <div className="mb-2 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
                {message}
              </div>
            )}
            {errorMsg && (
              <div className="mb-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1">Nama produk</label>
                <input
                  type="text"
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Deskripsi</label>
                <textarea
                  className="input w-full h-20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Harga</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Contoh: 150000"
                  />
                </div>
                <div>
                  <label className="block mb-1">Diskon (%)</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Stok</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block mb-1">DP minimal (%)</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={minDpInput}
                    onChange={(e) => setMinDpInput(e.target.value)}
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">
                  URL gambar (pisah koma, optional)
                </label>
                <input
                  type="text"
                  className="input w-full"
                  value={imagesInput}
                  onChange={(e) => setImagesInput(e.target.value)}
                  placeholder="https://..., https://..."
                />
              </div>

              <div>
                <label className="block mb-1">
                  Kategori (pisah koma, optional)
                </label>
                <input
                  type="text"
                  className="input w-full"
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                  placeholder="Elektronik, Aksesoris"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="requireLogin"
                  type="checkbox"
                  className="w-3 h-3"
                  checked={requireLogin}
                  onChange={(e) => setRequireLogin(e.target.checked)}
                />
                <label htmlFor="requireLogin" className="text-xs">
                  Hanya bisa dibeli jika user login
                </label>
              </div>

              <button
                type="submit"
                className="btn-primary w-full mt-2"
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : "Tambah produk"}
              </button>
            </form>
          </div>

          {/* List produk ringkas */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-3">Produk terbaru</h2>
            {loadingProducts ? (
              <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                Loading produk...
              </p>
            ) : products.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                Belum ada produk.
              </p>
            ) : (
              <div className="space-y-2 text-xs max-h-[360px] overflow-y-auto">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-100 dark:border-slate-800 rounded-lg p-2 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold line-clamp-1">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-[var(--text-secondary)]">
                        Stok {p.stock || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[var(--text-secondary)]">
                      <span>
                        {formatRupiah(p.price)}{" "}
                        {p.discount > 0 && `(diskon ${p.discount}%)`}
                      </span>
                      <span>DP min {p.minDpPercent ?? 30}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}