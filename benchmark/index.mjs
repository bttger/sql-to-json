import http from "http";
import { PrismaClient } from "@prisma/client";
import mysql from "mysql2";
import { findUnique, findMany } from "../dist/index.js";

const host = "localhost";
const port = 7744;

const prisma = new PrismaClient();

const client = mysql
  .createPool({
    database: "sakila",
    host: "localhost",
    port: 3306,
    user: "root",
    password: "safe",
  })
  .promise();

const findUniqueQuery = findUnique(
  "customer",
  [
    "customer_id",
    "store_id",
    "first_name",
    "last_name",
    "email",
    "address_id",
    "active",
    "create_date",
    "last_update",
  ],
  "customer.customer_id = ?"
).compile();

async function findUniqueSqlToJson(customerId) {
  const [rows] = await client.query(findUniqueQuery, [customerId]);
  return rows[0]._json;
}

async function findUniquePrisma(customerId) {
  return await prisma.customer.findUnique({
    where: { customer_id: customerId },
  });
}

const server = http.createServer(async (req, res) => {
  const customerId = Math.floor(Math.random() * 25) + 1;
  const body = JSON.stringify(await findUniquePrisma(customerId));
  //const body = JSON.stringify(await findUniqueSqlToJson(customerId));
  res
    .writeHead(200, {
      "Content-Length": Buffer.byteLength(body),
      "Content-Type": "application/json",
    })
    .end(body);
});

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

server.on("close", async () => {
  await prisma.$disconnect();
  await client.end();
});
