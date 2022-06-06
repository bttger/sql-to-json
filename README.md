# upstream-json-aggregate

Usually, we have two options when we want to retrieve data from a relational database. The first one is simply joining all the tables we need data from, and then mapping the rows to objects. But if we query one-to-many and many-to-many relations, we are joining every row of one table with every row of other joined tables. This leads to the **Cartesian product and lots of redundant data being transmitted between the database and client**. The overhead of mapping all these rows can be huge, and the reason ORM tools are so slow for queries with joined tables.

The second option tries to solve this problem by making an extra query for each joined table. An example would be querying employers and their job postings. Instead of joining these two tables, we first make one database query to retrieve all employers and then an extra query for each employer to retrieve their job postings. The responses are easily mapped. The performance issue is solved, but now we face high latency because we need to make 1+N (or better known as **N+1 problem**) queries.

**This project solves both issues efficiently and even makes it unnecessary to map database responses to objects. It compiles SQL queries that use built-in database functions to aggregate your data to JSON strings directly on the upstream database.** The responses are scalar, meaning they only contain a single row and column called `_json`.

## Install

```sh
$ npm install upstream-json-aggregate
```

## Features
- [x] Simple, structured query building (exports only two functions)
- [x] Compiles efficient scalar SQL queries for you that return a JSON string when executed
- [x] Can be used as JIT or AOT compiler in your API server
- [x] Supports prepared statements (by maintaining the parameter order)
- [x] (Nested) JSON array aggregation of tables
- [x] (Nested) JSON object building of a single row
- [x] WHERE conditions
- [x] ORDER BY of array items
- [x] Pagination via limit and offset parameters
- [x] Calculated fields that can use all built-in functions (even window functions)
- [ ] GROUP BY and HAVING conditions (See the [RFC](./rfc/group-by-and-having-support.md))

## Supported Databases
- [x] MySQL
- [x] MariaDB
- [ ] PostgreSQL
- [ ] CockroachDB

## Todo
- [ ] Write docstrings
- [ ] Write tests
- [ ] Write examples (also with prepared statements/parameters)
- [ ] Publish to npm