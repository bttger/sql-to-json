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

# Run the http server
$ node index.mjs

# Start the benchmark
$ npx autocannon --warmup [ -c 1 -d 5 ] -a 5000 -l http://localhost:7744
```