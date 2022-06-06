# upstream-json-aggregate

Usually, we have two options when we want to retrieve data from a relational database. The first option is to do a single query that joins all the tables we need data from, and then mapping the rows to objects. But this is highly inefficient when you need data from tables related in a one-to-many or many-to-many fashion. Let's assume a client asks for the company data including their benefits and ads. We could execute a query like `SELECT * FROM company LEFT JOIN benefits ON .. LEFT JOIN ads ON .. WHERE company.id = 'someId';` to give him that data. Assuming that company has 10 benefits and 10 ads, the database returns 100 rows for the shown query. Of course these rows contain **lots of redundant data** and the query essentially builds a **Cartesian product of all joined tables**. Additionally, the overhead of mapping all these rows can be huge, and the reason ORM tools are so slow for queries with joined tables.

The second option tries to solve this problem by making an extra query for each joined table. An example would be querying companies and their ads. Instead of joining these two tables, we first make one database query to retrieve all companies and then an extra query for each company to retrieve their ads. The responses are easily mapped. The performance and redundancy issues are solved, but now we could face higher latency because we need to make 1+N (or better known as **N+1 problem**) queries.

**This project solves both issues efficiently and even makes it unnecessary to map database responses to objects. It compiles SQL queries that use built-in database functions to aggregate rows to JSON strings directly in the upstream database.** The responses are scalar, meaning they only contain a single row and column called `_json`.

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

## Install

```sh
$ npm install upstream-json-aggregate
```

## Usage


## Todo
- [ ] Write docstrings
- [ ] Write benchmarks
- [ ] Write tests
- [ ] Write examples (also with prepared statements/parameters and the compiled output to show how it works)
- [ ] Publish to npm