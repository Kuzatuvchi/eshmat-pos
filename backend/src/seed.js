import bcrypt from "bcrypt";
import { prisma } from "./db.js";

async function main() {
  const categories = [
    "Xo‘jalik buyumlari",
    "Kraskalar",
    "Elektronika",
    "Santexnika",
    "Otdelka",
    "Stroyka"
  ];

  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const adminLogin = "eshmat_owner_7K";
  const cashier1 = "eshmat_cash_1Q";
  const cashier2 = "eshmat_cash_2R";

  const users = [
    { fullName: "Admin", login: adminLogin, role: "admin", password: "EsH@t-2026!Own#7K" },
    { fullName: "Shodiyor", login: cashier1, role: "cashier", password: "Sh0d!yor_Kassa@1Q" },
    { fullName: "Toshmat", login: cashier2, role: "cashier", password: "T0shm@t_Kassa!2R" }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { login: u.login },
      update: { fullName: u.fullName, role: u.role, passwordHash: hash, isActive: true },
      create: { fullName: u.fullName, login: u.login, role: u.role, passwordHash: hash }
    });
  }

  // Products (10 ta) — narxlarni keyin kiritasiz
  const catMap = new Map((await prisma.category.findMany()).map(c => [c.name, c.id]));
  const items = [
    { name: "Kraska", category: "Kraskalar", unit: "litr" },
    { name: "Sement (50kg)", category: "Stroyka", unit: "qop" },
    { name: "Shpatel", category: "Otdelka", unit: "dona" },
    { name: "Mix", category: "Xo‘jalik buyumlari", unit: "kg" },
    { name: "Gips", category: "Stroyka", unit: "qop" },
    { name: "Shurup", category: "Xo‘jalik buyumlari", unit: "kg" },
    { name: "Lampochka", category: "Elektronika", unit: "dona" },
    { name: "Kabel", category: "Elektronika", unit: "metr" },
    { name: "Ketmon", category: "Xo‘jalik buyumlari", unit: "dona" },
    { name: "Lapatka", category: "Xo‘jalik buyumlari", unit: "dona" }
  ];

  for (const p of items) {
    await prisma.product.create({
      data: {
        name: p.name,
        categoryId: catMap.get(p.category),
        unit: p.unit,
        costPrice: 0,
        salePrice: 0,
        stockQty: 0,
        minStockQty: 0
      }
    }).catch(() => {});
  }

  console.log("Seed done.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
