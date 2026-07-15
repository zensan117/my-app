import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { normalizeTransactionInput } from "./transactionForm.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;
const chartColors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#14B8A6", "#F97316", "#6366F1", "#EC4899", "#84CC16"];

const buildChartData = (transactions, isIncome) => {
  const groups = new Map();

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const isPositive = amount > 0;

    if ((isIncome && isPositive) || (!isIncome && amount < 0)) {
      const label = transaction.category?.name || "その他";
      const value = Math.abs(amount);
      groups.set(label, (groups.get(label) || 0) + value);
    }
  }

  return Array.from(groups.entries()).map(([label, value], index) => ({
    label,
    value,
    color: chartColors[index % chartColors.length],
  }));
};

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 一覧と合計金額を表示するページ
app.get("/", async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    const aggregation = await prisma.transaction.aggregate({
      _sum: { amount: true },
    });
    const totalAmount = aggregation._sum.amount || 0;

    const viewTransactions = transactions.map((transaction) => ({
      ...transaction,
      title: transaction.category?.name || "その他",
      type: transaction.amount >= 0 ? "収入" : "支出",
      displayAmount: Math.abs(transaction.amount),
    }));

    const expenseChartData = buildChartData(transactions, false);
    const incomeChartData = buildChartData(transactions, true);

    res.render("index", {
      transactions: viewTransactions,
      totalAmount,
      expenseChartData,
      incomeChartData,
    });
  } catch (error) {
    console.error("データ取得エラー:", error);
    res.status(500).send("データベース接続に失敗しました");
  }
});

// 家計簿データを追加する処理
app.post("/transactions", async (req, res) => {
  try {
    const entry = normalizeTransactionInput({
      title: req.body.title,
      amount: req.body.amount,
      entryType: req.body.entryType,
    });
    console.log('transaction entry', entry, req.body);

    if (entry.amount !== 0) {
      let category = await prisma.category.findFirst({ where: { name: entry.title } });
      if (!category) {
        category = await prisma.category.create({ data: { name: entry.title } });
      }

      let user = await prisma.user.findFirst({ where: { id: 1 } });
      if (!user) {
        user = await prisma.user.create({ data: { name: "guest" } });
      }

      await prisma.transaction.create({
        data: {
          amount: entry.amount,
          userId: user.id,
          categoryId: category.id,
        },
      });
    }
    res.redirect("/");
  } catch (error) {
    console.error("データ追加エラー:", error);
    res.status(500).send("家計簿データの追加に失敗しました");
  }
});

app.post("/transactions/delete", async (req, res) => {
  try {
    const id = Number(req.body.id);
    if (!isNaN(id)) {
      await prisma.transaction.deleteMany({ where: { id } });
    }

    const aggregation = await prisma.transaction.aggregate({
      _sum: { amount: true },
    });
    const totalAmount = aggregation._sum.amount || 0;

    if (req.headers.accept?.includes("application/json")) {
      return res.json({ success: true, totalAmount });
    }

    res.redirect("/");
  } catch (error) {
    console.error("取り消しエラー:", error);
    if (req.headers.accept?.includes("application/json")) {
      return res.status(500).json({ success: false });
    }
    res.status(500).send("取引の取り消しに失敗しました");
  }
});

app.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});
