"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getMe, clearToken } from "@/lib/api";
import { useRouter } from "next/navigation";

function fmt(n) {
  return new Intl.NumberFormat("uz-UZ").format(Number(n || 0));
}

export default function POSPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);

  const [cart, setCart] = useState([]); // [{product, qty}]

  const [discount, setDiscount] = useState(0);
  const [payType, setPayType] = useState("cash"); // cash/card/mixed/credit
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);

  // Nasiya (customer)
  const [custSearch, setCustSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(null);

  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  const total = useMemo(() => {
    let t = 0;
    for (const it of cart) {
      t += Number(it.qty || 0) * Number(it.product.salePrice || 0);
    }
    return Math.max(t - Number(discount || 0), 0);
  }, [cart, discount]);

  async function loadProducts(q = "") {
    const list = await api(`/products?search=${encodeURIComponent(q)}`);
    setProducts(list);
  }

  useEffect(() => {
    (async () => {
      try {
        // login tekshirish + userni olish
        const u = await getMe();
        setMe(u);

        // products initial load
        await loadProducts("");
      } catch (e) {
        clearToken();
        router.push("/");
      }
    })();
  }, [router]);

  function addToCart(prod) {
    setCart((prev) => {
      const found = prev.find((x) => x.product.id === prod.id);
      if (found) {
        return prev.map((x) =>
          x.product.id === prod.id ? { ...x, qty: Number(x.qty) + 1 } : x
        );
      }
      return [...prev, { product: prod, qty: 1 }];
    });
  }

  function updateQty(productId, qty) {
    const q = Number(qty);
    setCart((prev) =>
      prev.map((x) => (x.product.id === productId ? { ...x, qty: q } : x))
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((x) => x.product.id !== productId));
  }

  async function searchCustomers() {
    const list = await api(`/customers?search=${encodeURIComponent(custSearch)}`);
    setCustomers(list);
  }

  async function createCustomer() {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert("Mijoz ismi va telefonini kiriting!");
      return;
    }
    const c = await api("/customers", {
      method: "POST",
      body: JSON.stringify({ fullName: newCustName.trim(), phone: newCustPhone.trim() }),
    });
    setCustomers((p) => [c, ...p]);
    setCustomerId(c.id);
    setNewCustName("");
    setNewCustPhone("");
  }

  function resetAfterSale() {
    setCart([]);
    setDiscount(0);
    setPayType("cash");
    setCashAmount(0);
    setCardAmount(0);
    setCustomerId(null);
    setCustomers([]);
    setCustSearch("");
  }

  function openPrintWindow(sale) {
    const storeName = "Eshmat sement sentr";
    const storePhone = "+998 5157748";
    const storeAddress = "Quva, chuqurda";

    const createdAt = sale?.createdAt ? new Date(sale.createdAt) : new Date();
    const receipt = String(sale.receiptNo ?? "").padStart(6, "0");

    const itemsHtml = (sale.items || [])
      .map((it) => {
        const lineTotal = Number(it.qty) * Number(it.salePrice);
        return `
          <div style="margin:6px 0 10px">
            <div>${it.product?.name || ""}</div>
            <div>${it.qty} x ${fmt(it.salePrice)} = ${fmt(lineTotal)}</div>
          </div>
        `;
      })
      .join("");

    const payName =
      sale.paymentType === "cash"
        ? "NAQD"
        : sale.paymentType === "card"
        ? "KARTA"
        : sale.paymentType === "mixed"
        ? "ARALASH"
        : "NASIYA";

    const creditHtml =
      sale.paymentType === "credit"
        ? `<div>Mijoz: ${sale.customer?.fullName || ""} ${sale.customer?.phone || ""}</div>`
        : "";

    const w = window.open("", "_blank");
    w.document.write(`
      <html>
        <head>
          <title>Chek</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: monospace; padding: 10px;">
          <h3 style="margin:0">${storeName}</h3>
          <div>Tel: ${storePhone}</div>
          <div>Manzil: ${storeAddress}</div>
          <hr/>
          <div>Sana: ${createdAt.toLocaleString()}</div>
          <div>Chek: #${receipt}</div>
          <div>Sotuvchi: ${sale.seller?.fullName || ""}</div>
          <hr/>
          ${itemsHtml}
          <hr/>
          <div>Chegirma: ${fmt(sale.discount)}</div>
          <div style="font-size: 16px;"><b>JAMI: ${fmt(sale.total)} so'm</b></div>
          <div>To'lov: ${payName}</div>
          ${creditHtml}
          <hr/>
          <div>Rahmat! Yana keling!</div>
          <script>
            window.print();
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `);
  }

  async function sell() {
    try {
      if (cart.length === 0) {
        alert("Savat bo‘sh!");
        return;
      }

      // Qty validate
      for (const it of cart) {
        const q = Number(it.qty);
        if (!q || q <= 0 || Number.isNaN(q)) {
          alert(`Miqdor xato: ${it.product?.name}`);
          return;
        }
      }

      if (payType === "credit" && !customerId) {
        alert("Nasiya uchun mijoz tanlang!");
        return;
      }

      // mixed validate (ixtiyoriy, lekin yaxshi)
      if (payType === "mixed") {
        const ca = Number(cashAmount || 0);
        const cda = Number(cardAmount || 0);
        if (ca <= 0 && cda <= 0) {
          alert("Aralash to‘lovda naqd yoki karta summasini kiriting!");
          return;
        }
      }

      const payload = {
        paymentType: payType,
        discount: Number(discount || 0),
        cashAmount: payType === "mixed" ? Number(cashAmount || 0) : 0,
        cardAmount: payType === "mixed" ? Number(cardAmount || 0) : 0,
        customerId: payType === "credit" ? Number(customerId) : null,
        items: cart.map((x) => ({
          productId: x.product.id,
          qty: Number(x.qty),
        })),
      };

      const sale = await api("/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // stock update ko‘rinsin
      await loadProducts(search);

      // print
      openPrintWindow(sale);

      resetAfterSale();
    } catch (e) {
      // backend stock error bo'lsa, alert qilamiz
      if (e?.message === "STOCK_NOT_ENOUGH") {
        alert("Qoldiq yetarli emas!");
        return;
      }
      alert(`Xatolik: ${e.message || "SERVER_ERROR"}`);
    }
  }

  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 16,
        padding: 16,
        fontFamily: "system-ui",
      }}
    >
      <section>
        <h2 style={{ margin: 0 }}>Kassa</h2>
        {me ? (
          <div style={{ margin: "6px 0 12px", fontWeight: 600 }}>
            Sotuvchi: {me.fullName} ({me.role})
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            style={{ flex: 1 }}
            placeholder="Tovar qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => loadProducts(search)}>Qidirish</button>
          <button onClick={() => loadProducts("")}>Hammasi</button>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Tovarlar</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 120px 120px",
              gap: 8,
              fontSize: 14,
            }}
          >
            <div><b>Nomi</b></div>
            <div><b>Qoldiq</b></div>
            <div><b>Narx</b></div>
            <div></div>

            {products.map((p) => (
              <div key={p.id} style={{ display: "contents" }}>
                <div>{p.name} ({p.unit})</div>
                <div>{p.stockQty}</div>
                <div>{fmt(p.salePrice)}</div>
                <div><button onClick={() => addToCart(p)}>Qo‘shish</button></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Savat</h3>

        {cart.length === 0 ? (
          <div>Savat bo‘sh</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {cart.map((it) => (
              <div
                key={it.product.id}
                style={{ border: "1px solid #eee", padding: 8, borderRadius: 8 }}
              >
                <div style={{ fontWeight: 700 }}>{it.product.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>Miqdor:</span>
                  <input
                    style={{ width: 100 }}
                    value={it.qty}
                    onChange={(e) => updateQty(it.product.id, e.target.value)}
                  />
                  <button onClick={() => removeItem(it.product.id)}>O‘chirish</button>
                </div>
                <div>Summa: {fmt(Number(it.qty) * Number(it.product.salePrice))}</div>
              </div>
            ))}
          </div>
        )}

        <hr />

        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Chegirma (so‘m):
            <input
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value || 0))}
            />
          </label>

          <label>
            To‘lov turi:
            <select value={payType} onChange={(e) => setPayType(e.target.value)}>
              <option value="cash">Naqd</option>
              <option value="card">Karta</option>
              <option value="mixed">Aralash</option>
              <option value="credit">Nasiya</option>
            </select>
          </label>

          {payType === "mixed" ? (
            <>
              <label>
                Naqd:
                <input
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value || 0))}
                />
              </label>
              <label>
                Karta:
                <input
                  value={cardAmount}
                  onChange={(e) => setCardAmount(Number(e.target.value || 0))}
                />
              </label>
            </>
          ) : null}

          {payType === "credit" ? (
            <div style={{ border: "1px dashed #ccc", padding: 10, borderRadius: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Mijoz (Ism + Telefon)</div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  style={{ flex: 1 }}
                  placeholder="Qidirish (ism/tel)"
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                />
                <button onClick={searchCustomers}>Qidirish</button>
              </div>

              <select
                style={{ width: "100%" }}
                value={customerId || ""}
                onChange={(e) => setCustomerId(Number(e.target.value) || null)}
              >
                <option value="">— Mijoz tanlang —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phone})
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 10, fontWeight: 700 }}>Yangi mijoz</div>
              <input
                placeholder="Ism"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
              />
              <input
                placeholder="Telefon"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
              />
              <button onClick={createCustomer}>Mijoz qo‘shish</button>
            </div>
          ) : null}

          <div style={{ fontSize: 18, fontWeight: 800 }}>Jami: {fmt(total)} so‘m</div>

          <button
            onClick={sell}
            style={{ padding: "10px 12px", fontSize: 16 }}
          >
            SOTISH + CHEK
          </button>
        </div>
      </aside>
    </main>
  );
}


