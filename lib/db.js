// lib/db.js
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  runTransaction,
  collection,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Buat dokumen user baru di /users/{uid}
 * Dipanggil sekali saat register.
 */
export async function createUserDoc(uid, { email, username, role = "users" }) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    uid,
    email,
    username,
    role,
    saldo: 0,
    avatar: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Ambil data user sekali.
 */
export async function getUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Ubah saldo user (+/-)
 */
export async function changeUserSaldo(uid, amount) {
  const ref = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("User tidak ditemukan.");

    const data = snap.data();
    const saldoNow = Number(data.saldo || 0);
    const newSaldo = saldoNow + Number(amount || 0);
    if (newSaldo < 0) throw new Error("Saldo tidak cukup.");

    tx.update(ref, {
      saldo: newSaldo,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Update avatar / profile kecil
 */
export async function updateUserProfile(uid, payload) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Buat produk di /products
 */
export async function createProduct({
  name,
  description,
  price,
  discount = 0,
  stock = 0,
  requireLogin = false,
  categories = [],
  images = [],
  minDpPercent = 30,
  labels = [],
  createdBy = null,
}) {
  if (!name) throw new Error("Nama produk wajib diisi.");
  if (!price) throw new Error("Harga produk wajib diisi.");

  const priceNum = Number(price);
  const discountNum = Number(discount || 0);
  const stockNum = Number(stock || 0);
  const minDp = Math.min(100, Math.max(0, Number(minDpPercent || 0)));

  const productsRef = collection(db, "products");
  const productRef = doc(productsRef);

  await setDoc(productRef, {
    name,
    description: description || null,
    price: priceNum,
    discount: discountNum,
    stock: stockNum,
    sold: 0,
    requireLogin,
    categories,
    images,
    labels,
    minDpPercent: minDp, // DP minimal
    isActive: true,
    createdBy,
    createdAt: serverTimestamp(),
  });

  return productRef;
}

/**
 * Checkout dengan DP
 * - dpPercent: 30 / 50 / 100
 * - items: array { id (cartDocId), productId, price, qty, name }
 */
export async function checkoutWithDP({
  userId,
  items,
  dpPercent,
}) {
  if (!userId) throw new Error("User tidak valid.");
  if (!items || !items.length) throw new Error("Keranjang kosong.");

  const dp = Math.min(100, Math.max(0, Number(dpPercent || 100)));

  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("User tidak ditemukan.");

    const userData = userSnap.data();
    const saldoNow = Number(userData.saldo || 0);

    let total = 0;
    const byProduct = new Map();

    for (const item of items) {
      const qty = Number(item.qty || 1);
      if (qty <= 0) continue;
      const priceNum = Number(item.price || 0);
      const lineTotal = priceNum * qty;
      total += lineTotal;

      const productId = item.productId;
      if (!productId) throw new Error("Item cart tidak valid.");

      if (!byProduct.has(productId)) {
        byProduct.set(productId, {
          productRef: doc(db, "products", productId),
          totalQty: 0,
          cartRefs: [],
        });
      }
      const entry = byProduct.get(productId);
      entry.totalQty += qty;
      entry.cartRefs.push(
        doc(db, "users", userId, "cart", item.id)
      );
    }

    if (total <= 0) throw new Error("Total belanja tidak valid.");

    const dpAmount = Math.round((total * dp) / 100);
    const remaining = total - dpAmount;

    if (saldoNow < dpAmount) {
      throw new Error("Saldo tidak cukup untuk membayar DP.");
    }

    // Cek & update stok
    for (const { productRef, totalQty, cartRefs } of byProduct.values()) {
      const pSnap = await tx.get(productRef);
      if (!pSnap.exists()) {
        throw new Error("Salah satu produk sudah tidak tersedia.");
      }
      const pData = pSnap.data();
      const stockNow = Number(pData.stock || 0);
      const soldNow = Number(pData.sold || 0);
      const nama = pData.name || "Produk";

      if (stockNow < totalQty) {
        throw new Error(
          `Stok "${nama}" tidak cukup. Sisa: ${stockNow}, diminta: ${totalQty}.`
        );
      }

      tx.update(productRef, {
        stock: stockNow - totalQty,
        sold: soldNow + totalQty,
      });

      // Hapus cart item
      for (const cartRef of cartRefs) {
        tx.delete(cartRef);
      }
    }

    // Kurangi saldo user
    tx.update(userRef, {
      saldo: saldoNow - dpAmount,
      updatedAt: serverTimestamp(),
    });

    // Buat dokumen order (top-level + subcollection user)
    const ordersCol = collection(db, "orders");
    const orderRef = doc(ordersCol);
    const userOrderRef = doc(
      collection(db, "users", userId, "orders"),
      orderRef.id
    );

    const orderData = {
      userId,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: Number(i.price || 0),
        qty: Number(i.qty || 1),
      })),
      total,
      dpPercent: dp,
      dpAmount,
      remaining,
      status: dp === 100 ? "PAID" : "DP_PAID",
      createdAt: serverTimestamp(),
    };

    tx.set(orderRef, orderData);
    tx.set(userOrderRef, orderData);
  });
}