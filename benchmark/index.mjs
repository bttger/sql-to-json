import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";
import { findUnique, findMany } from "../dist/index.js";

const prisma = new PrismaClient();

console.log(await prisma.customer.findUnique({ where: { customer_id: 15 } }));

const sql = findUnique(
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
  "customer.customer_id = 15"
).compile();

const client = await mysql.createConnection(
  "mysql://root:safe@localhost:3306/sakila"
);

const [rows, fields] = await client.query(sql);
console.log(rows[0]._json);

await client.end();
