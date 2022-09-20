import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const port = 4000;

app.post("/signup", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email } || { username: req.body.username },
    });
    if (user) {
      res.status(400).send("User already exists");
    } else {
      const newUser = await prisma.user.create({
        data: {
          email: req.body.email,
          username: req.body.username,
          password: bcrypt.hashSync(req.body.password),
        },
      });
    }
  } catch (error) {
    //@ts-ignore
    res.status(451).send({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email } || { username: req.body.username },
  });
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.send(user);
  } else {
    res.status(401).send("Invalid credentials. Email or password is incorrect");
  }
});

app.get("/transactions", async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    include: { user: true },
  });
  res.send(transactions);
});

app.get("/users/:id/transactions", async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: Number(req.params.id) },
    include: { user: true },
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
