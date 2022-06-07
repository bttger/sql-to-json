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

The benchmarks in the following results were performed on a consumer laptop with a Ryzen 4500U processor and 20GB RAM. Please note that these benchmarks do not meet scientific standards. I'm happy for any contributions that improve the benchmarks, so feel free to open a pull request.

Database responses get deserialized to JavaScript objects both for Prisma and SQL-to-JSON. The objects get then serialized and written to the http response body.

### findUnique()

Find a unique customer and return it as JSON object string. The benchmark is divided into multiple join depths.

#### Join depth of 0

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|4|2|
|Average Latency (ms)|2.04|0.56|
|Standard Deviation Latency (ms)|0.87|0.62|
|Average Requests per second|3846.7|8333.34|

#### Join depth of 1

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|||
|Average Latency (ms)|||
|Standard Deviation Latency (ms)|||
|Average Requests per second|||

#### Join depth of 2

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|||
|Average Latency (ms)|||
|Standard Deviation Latency (ms)|||
|Average Requests per second|||

### findMany()

Find many customers and return them as JSON array string. The benchmark is divided into multiple join depths.

#### Join depth of 0

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|||
|Average Latency (ms)|||
|Standard Deviation Latency (ms)|||
|Average Requests per second|||

#### Join depth of 1

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|||
|Average Latency (ms)|||
|Standard Deviation Latency (ms)|||
|Average Requests per second|||

#### Join depth of 2

||Prisma|SQL-to-JSON|
|---|---:|---:|
|99th Percentile Latency (ms)|||
|Average Latency (ms)|||
|Standard Deviation Latency (ms)|||
|Average Requests per second|||