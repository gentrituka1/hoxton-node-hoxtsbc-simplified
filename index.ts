import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "dotenv";

env.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const port = 4000;

const SECRET = process.env.SECRET!;

function getToken(id: number) {
  return jwt.sign({ id }, SECRET, { expiresIn: "5 minutes" });
}

async function getCurrentUser(token: string) {
  const decodedData = jwt.verify(token, SECRET);
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: decodedData.id },
    include: { transactions: true },
  });
  return user;
}

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({ include: { transactions: true } });
  res.json(users);
});

app.post("/signup", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ username: req.body.username }, { email: req.body.email }],
      },
    });
    if (users.length > 0) {
      res.status(401).send("User already exists");
    } else {
      const user = await prisma.user.create({
        data: {
          email: req.body.email,
          username: req.body.username,
          password: bcrypt.hashSync(req.body.password, 10)
        },
        include: { transactions: true }
      });
      console.log(user);
      res.send({ user, token: getToken(user.id) });
    }
  } catch (error) {
    //@ts-ignore
    res.status(451).send({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { OR: [{ username: req.body.login }, { email: req.body.login }] },
    include: { transactions: true }
  });
  const user = users[0];
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.send({ user, token: getToken(user.id) });
  } else {
    res
      .status(401)
      .send({ error: "Invalid credentials. Email or password is incorrect" });
  }
});

app.get("/transactions", async (req, res) => {
  try {
    // @ts-ignore
    const user = await getCurrentUser(req.headers.authorization);
    res.send(user?.transactions);
  } catch (error) {
    //@ts-ignore
    res.status(451).send({ error: error.message });
  }
});

app.get("/validate", async (req, res) => {
  try {
    if (req.headers.authorization) {
      const user = await getCurrentUser(req.headers.authorization);
      // @ts-ignore
      res.send({ data: { user, token: getToken(user.id) } });
    } else {
      res.status(401).send({ error: "No token provided" });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
