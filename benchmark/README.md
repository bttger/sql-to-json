# Benchmark
## Setup

```bash
# Build the project from the project's root directory
$ npm run prepublish

# Start a MySQL server (>=8.0.14)
# Connect to it via mysql client and load the schema and data:
$ cd benchmark
$ mysql -h localhost -P 3306 -u root -p
> source sakila-schema.sql
> source sakila-data.sql
> exit

# Install the dependencies in this directory
$ npm run ci
$ npx prisma generate

# Change the index.mjs code according to your config

# Run the http server
$ node index.mjs

# Start the benchmark
$ npx autocannon --renderStatusCodes -a 5000 -l http://localhost:7744
```

## Results

The benchmarks in the following results were performed on a consumer laptop with a 6-core Ryzen 4500U processor and 20GB RAM. The SQL-to-JSON queries were executed with the [mysql2](https://www.npmjs.com/package/mysql2) client. Both the Prisma and mysql2 client were used with their default configuration. According to the Prisma docs, the client creates a connection pool with a size depending on my CPU-core count (`num_physical_cpus * 2 + 1`). The mysql2 client has a default pool size of 10.

The Prisma client is already very efficient since it makes multiple database queries for included relations. I know that other ORMs like TypeORM join tables in a single query when you specify relations in their respective `find()` method. For the cases that we test here, these type of queries would result in response times in the seconds range as explained in the readme.

Database responses get deserialized to JavaScript objects both for Prisma and SQL-to-JSON. The objects get then serialized and written to the http response body.

Please note that these benchmarks do not meet scientific standards. I'm happy for any contributions that improve the benchmarks, so feel free to open a pull request.

### Join depth of 0

Find a random unique customer and return it as JSON object string.

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|4|2|
|Average Latency (ms)|2.04|0.56|
|Standard Deviation Latency (ms)|0.87|0.62|
|Average Requests per second|3846.7|8333.34|

### Join depth of 1

Find a random film store and return their customers and film inventory (limited to 50 entries).

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|56|17|
|Average Latency (ms)|38.54|8.65|
|Standard Deviation Latency (ms)|8.34|2.84|
|Average Requests per second|238.1|1063.83|

### Join depth of 2

Extend the previous case by also returning the film actors, film categories and last 10 customer payments.

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|182|84|
|Average Latency (ms)|122.47|51.15|
|Standard Deviation Latency (ms)|26.09|12.64|
|Average Requests per second|80.65|185.19|
