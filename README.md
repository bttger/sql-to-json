# SQL-to-JSON

Usually, we have two options when we want to retrieve data from a relational database. The first option is to do a single query that joins all the tables we need data from, and then mapping the rows to objects. But this is highly inefficient when you need data from tables related in a one-to-many or many-to-many fashion. Let's assume a client asks for the company data including their benefits and ads. We could execute a query like `SELECT * FROM company LEFT JOIN benefits ON .. LEFT JOIN ads ON .. WHERE company.id = 'someId';` to return that data. Assuming this company has 10 benefits and 10 ads, the database returns 100 rows for the shown query. Of course these rows contain **lots of redundant data** and the query essentially builds a **Cartesian product of all joined tables**. Additionally, the overhead of mapping all these rows can be huge, and the reason ORM tools are so slow for queries with joined tables.

The second option tries to solve this problem by making an extra query for each joined table. An example would be querying companies and their ads. Instead of joining these two tables, we first make one database query to retrieve all companies and then an extra query for each company to retrieve their ads. The responses are easily mapped. The performance and redundancy issues are solved, but now we could face higher latency because we need to make 1+N (or better known as **N+1 problem**) queries.

**This SQL query builder solves both issues efficiently by utilizing built-in database functions to aggregate rows to a JSON string. It compiles SQL queries that map tables to JSON arrays and rows to JSON objects directly in the upstream database. Thus, it makes it unnecessary to map database responses to objects.** You may ask yourself now, what do I win if I still need to join tables? The mapping problem just got moved to the database, right? And yes, that's right - but we don't need to actually join tables and can avoid the Cartesian product on the database itself. Instead of actually joining raw tables, the compiled queries do subqueries for each joined table and efficiently filters via join condition. The outer query then simply selects the output of these subqueries and assembles the JSON object. The responses of compiled queries are scalar, meaning they only contain a single row and column called `_json`. There is no need to manually deserialize this column since the column type is JSON and your client does that automatically for you.

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
- [ ] Computed fields that can use all built-in functions including window functions (I had to remove this feature again because it was error prone due to aliases and ambiguous column names. Though, this is on the roadmap.)
- [ ] GROUP BY and HAVING conditions (See the [RFC](./rfc/group-by-and-having-support.md))

## Use cases
- Basically all read transactions where you need to select columns of more than one table and want to map rows to objects. If you need to get data from one table only, just do a simple SELECT query.
- In case of findtech.jobs, clients can ask for a job posting and the related data like the employer, office addresses, languages, technologies, professional area, benefits, and currency information. We save many database requests by aggregating the object in the database and don't need to worry about mapping the data to an object.
- You like simplicity and to work with the raw database client instead of an ORM tool.

## Limitations and drawbacks
The database response contains only a single column (with column type JSON). You won't get type information about the columns that you have queried since they will be mapped to JSON. Modern DBMS support many more types than what JSON specifies. Thus, some columns will be converted to strings (e.g. dates).

Another point to consider is that mapping the data on the database can lead to a higher load on the database per client request. But this depends on the type of query. Nesting multiple `findMany` queries involves derived subqueries with lateral joins which cause lots of iterative subqueries on the database. On the other hand, queries that retrieve a unique object with one-to-one, one-to-many, and many-to-many relations mapped are very efficient. The benchmarks show that the overall system load is lower than the ORM approach if the database and the API server are running on the same machine.

## Supported Databases
- [x] MySQL (>=8.0.14; OrderBy not supported; MariaDB not supported due to lack of lateral joins)
- [ ] PostgreSQL (>=10)
- [ ] CockroachDB (>=21.2.0)

## Install

```sh
$ npm install sql-to-json
```

## Usage




## Todo
- [ ] join option must allow array
- [ ] do i always need a lateral join inside of unique object? maybe i need it bc the object can lie within an array
- [ ] Write docstrings
- [ ] Write benchmarks
- [ ] Write tests
- [ ] Write examples (also with prepared statements/parameters and the compiled output to show how it works)
- [ ] Publish to npm