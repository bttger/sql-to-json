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

Database responses get deserialized to JavaScript objects both for Prisma and SQL-to-JSON. The objects then get serialized and written to the http response body.

Please note that these benchmarks do not meet scientific standards. I'm happy for any contributions that improve the benchmarks, so feel free to open a pull request.

### Join depth of 0

Find a random unique customer and return it as JSON object string. See [here](https://dev.mysql.com/doc/sakila/en/sakila-structure.html) for the database structure.

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|4|2|
|Average Latency (ms)|2.04|0.56|
|Standard Deviation Latency (ms)|0.87|0.62|
|Average Requests per second|3846.7|8333.34|

### Join depth of 1

Find a random film store, their customers and film inventory (limited to 50 entries).

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|56|17|
|Average Latency (ms)|38.54|8.65|
|Standard Deviation Latency (ms)|8.34|2.84|
|Average Requests per second|238.1|1063.83|
|CPU load node|330|69|
|CPU load mysqld|197|455|
|CPU load node/RPS|1.39|0.06|
|CPU load mysqld/RPS|0.83|0.43|

Find 200 films and their actors.

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|195|56|
|Average Latency (ms)|120.59|33.99|
|Standard Deviation Latency (ms)|33.32|7.03|
|Average Requests per second|81.97|277.78|
|CPU load node|270|92|
|CPU load mysqld|68|334|
|CPU load node/RPS|3.29|0.33|
|CPU load mysqld/RPS|0.83|1.2|

### Join depth of 2

Find a random film store, their customers and their last 10 payments, film inventory, and the related film actors and film categories (limited to 50 entries). Probably a quite unrealistic case.

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|182|84|
|Average Latency (ms)|122.47|51.15|
|Standard Deviation Latency (ms)|26.09|12.64|
|Average Requests per second|80.65|185.19|
