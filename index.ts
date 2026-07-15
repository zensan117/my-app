import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// データベース接続の準備（ .env の URL を使うぞ）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// 一覧を表示するページ
app.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.render("index", { users });
  } catch (error) {
    console.error("ユーザー一覧取得エラー:", error);
    res.status(500).send("データベース接続に失敗しました");
  }
});

// ユーザーを追加する処理
app.post("/users", async (req, res) => {
  try {
    const name = req.body.name;
    if (name) {
      await prisma.user.create({ data: { name } });
    }
    res.redirect("/");
  } catch (error) {
    console.error("ユーザー作成エラー:", error);
    res.status(500).send("ユーザー追加に失敗しました");
  }
});

app.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});

// index.ts の追加イメージ

// GET /api/stats/total : 合計金額を取得するAPI
app.get("/api/stats/total", async (req, res) => {
  try {
    const userId = Number(req.query.userId) || 1;
    
    // Prismaで金額の合計を計算
    const aggregations = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId: userId,
      },
    });

    res.json({
      userId: userId,
      totalAmount: aggregations._sum.amount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: "取得に失敗しました" });
  }
});
