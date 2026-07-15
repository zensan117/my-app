import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

app.set("view engine", "ejs");
app.set("views", "./views");
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
