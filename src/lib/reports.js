import { db } from "./db";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getRangeStart(filter) {
  const now = new Date();
  if (filter === "today") return startOfDay(now);
  if (filter === "7d") {
    const d = startOfDay(now);
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (filter === "30d") {
    const d = startOfDay(now);
    d.setDate(d.getDate() - 29);
    return d;
  }
  if (filter === "month") {
    const d = startOfDay(now);
    d.setDate(1);
    return d;
  }
  return startOfDay(now);
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

export function computeReport(filter = "30d") {
  const start = getRangeStart(filter);
  const sales = db.getSales().filter((s) => new Date(s.createdAt) >= start);
  const repairs = db.getRepairs().filter((r) => new Date(r.createdAt) >= start);

  const revenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const repairRevenue = repairs
    .filter((r) => r.status === "completed" || r.status === "delivered")
    .reduce((sum, r) => sum + Number(r.repairCost || 0), 0);

  const cost = sales.reduce(
    (sum, s) => sum + (s.items || []).reduce((isum, i) => {
      const product = i.productId ? db.findInventoryItem(i.productId) : null;
      return isum + (product ? Number(product.costPrice || 0) * i.qty : 0);
    }, 0),
    0
  );
  const profit = revenue + repairRevenue - cost;

  const outstandingSales = sales
    .filter((s) => s.paymentStatus !== "Paid")
    .reduce((sum, s) => sum + Math.max(0, Number(s.total || 0) - Number(s.amountPaid || 0)), 0);
  const outstandingRepairs = repairs
    .filter((r) => r.paymentStatus !== "Paid")
    .reduce((sum, r) => sum + Number(r.repairCost || 0), 0);
  const outstanding = outstandingSales + outstandingRepairs;

  const completed = repairs.filter((r) => r.status === "completed" || r.status === "delivered").length;

  // daily revenue series
  const days = [];
  const cursor = new Date(start);
  const today = startOfDay(new Date());
  while (cursor <= today) {
    days.push(fmtDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const dailyMap = Object.fromEntries(days.map((d) => [d, { date: d, sales: 0, repairs: 0 }]));
  sales.forEach((s) => {
    const key = fmtDate(startOfDay(new Date(s.createdAt)));
    if (dailyMap[key]) dailyMap[key].sales += Number(s.total || 0);
  });
  repairs.forEach((r) => {
    if (r.status === "completed" || r.status === "delivered") {
      const key = fmtDate(startOfDay(new Date(r.createdAt)));
      if (dailyMap[key]) dailyMap[key].repairs += Number(r.repairCost || 0);
    }
  });
  const dailyRevenue = days.map((d) => dailyMap[d]);

  // top products
  const productMap = {};
  sales.forEach((s) => {
    (s.items || []).forEach((i) => {
      if (!productMap[i.name]) productMap[i.name] = { name: i.name, qty: 0, revenue: 0, cost: 0 };
      productMap[i.name].qty += i.qty;
      productMap[i.name].revenue += i.price * i.qty;
      const product = i.productId ? db.findInventoryItem(i.productId) : null;
      productMap[i.name].cost += product ? Number(product.costPrice || 0) * i.qty : 0;
    });
  });
  const topProducts = Object.values(productMap)
    .map((p) => ({ ...p, profit: p.revenue - p.cost }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // payment methods
  const methodMap = {};
  sales.forEach((s) => {
    const m = (s.paymentMethod || "Cash").toUpperCase();
    if (!methodMap[m]) methodMap[m] = { method: m, sales: 0, total: 0 };
    methodMap[m].sales += 1;
    methodMap[m].total += Number(s.total || 0);
  });
  const paymentMethods = Object.values(methodMap).sort((a, b) => b.total - a.total);

  // repair status breakdown
  const statusMap = {};
  repairs.forEach((r) => {
    statusMap[r.status] = (statusMap[r.status] || 0) + 1;
  });
  const repairStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // staff performance (single "Admin" user for now)
  const staffPerformance = [
    {
      staff: "Admin",
      sales: sales.length,
      revenue,
      repairs: repairs.length,
      done: completed,
    },
  ];

  return {
    revenue,
    repairRevenue,
    profit,
    outstanding,
    salesCount: sales.length,
    repairsCount: repairs.length,
    completed,
    dailyRevenue,
    topProducts,
    paymentMethods,
    repairStatus,
    staffPerformance,
  };
}

export function reportToCsv(report) {
  const lines = [];
  lines.push("TechDesk Report");
  lines.push(`Revenue,${report.revenue}`);
  lines.push(`Profit,${report.profit}`);
  lines.push(`Outstanding,${report.outstanding}`);
  lines.push(`Sales,${report.salesCount}`);
  lines.push(`Repairs,${report.repairsCount}`);
  lines.push(`Completed,${report.completed}`);
  lines.push("");
  lines.push("Date,Sales,Repairs");
  report.dailyRevenue.forEach((d) => lines.push(`${d.date},${d.sales},${d.repairs}`));
  lines.push("");
  lines.push("Product,Qty,Revenue,Profit");
  report.topProducts.forEach((p) => lines.push(`${p.name},${p.qty},${p.revenue},${p.profit}`));
  return lines.join("\n");
}
