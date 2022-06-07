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

async function findUniquePrisma() {
  const customerId = Math.floor(Math.random() * 599) + 1;
  return await prisma.customer.findUnique({
    where: { customer_id: customerId },
  });
}

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

async function findUniqueSqlToJson() {
  const customerId = Math.floor(Math.random() * 599) + 1;
  const [rows] = await client.query(findUniqueQuery, [customerId]);
  return rows[0]._json;
}

async function findUniquePrismaDepthOne() {
  const storeId = Math.floor(Math.random() * 2) + 1;
  return await prisma.store.findUnique({
    include: {
      inventory: {
        include: { film: {} },
        take: 50,
        orderBy: { film: { length: "desc" } },
      },
      customer: { orderBy: { first_name: "desc" }, take: 50 },
      address: {},
    },
    where: { store_id: storeId },
  });
}

const findUniqueQueryDepthOne = findUnique(
  "store",
  ["store_id", "manager_staff_id", "address_id", "last_update"],
  "store.store_id = ?",
  [
    findMany(
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
      {
        limit: 50,
        orderBy: { column: "first_name", order: "DESC" },
        where: "customer.store_id = store.store_id",
      }
    ),
    findMany(
      ["film", "inventory"],
      [
        "film_id",
        "title",
        "description",
        "release_year",
        "language_id",
        "original_language_id",
        "rental_duration",
        "rental_rate",
        "length",
        "replacement_cost",
        "rating",
        "special_features",
        "last_update",
      ],
      {
        join: ["inventory"],
        where:
          "inventory.store_id = store.store_id AND film.film_id = inventory.film_id",
        limit: 50,
        orderBy: { column: "film.length", order: "DESC" },
      }
    ),
    findUnique(
      "address",
      [
        "address_id",
        "address",
        "address2",
        "district",
        "city_id",
        "postal_code",
        "phone",
        "location",
        "last_update",
      ],
      "store.address_id = address.address_id"
    ),
  ]
).compile();

async function findUniqueSqlToJsonDepthOne() {
  const storeId = Math.floor(Math.random() * 2) + 1;
  const [rows] = await client.query(findUniqueQueryDepthOne, [storeId]);
  return rows[0]._json;
}

const server = http.createServer(async (req, res) => {
  //const body = JSON.stringify(await findUniquePrisma());
  //const body = JSON.stringify(await findUniqueSqlToJson());
  //const body = JSON.stringify(await findUniquePrismaDepthOne());
  const body = JSON.stringify(await findUniqueSqlToJsonDepthOne());
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
