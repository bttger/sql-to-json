/**
 * See the following two convenience functions for usage info:
 * - getJsonObj => string
 * - getJsonArr => string
 */
function getScalarJsonQuery(
  objectOrArray: "object" | "array",
  table: TableName,
  selections: (ColumnName | [KeyName, JsonQuery])[],
  where: Conditions,
  ...innerJoins: [TableName, Conditions][]
): JsonQuery {
  // Map all column selections to a string array
  const mappedSelections: string[] = [];

  selections.forEach((selection) => {
    if (Array.isArray(selection)) {
      mappedSelections.push(`"${selection[0]}"`);
      mappedSelections.push(`(${selection[1]})`);
    } else {
      mappedSelections.push(`"${selection}"`);
      mappedSelections.push(`${table}.${selection}`);
    }
  });

  // Insert the column selections in the JSON function
  let jsonMapping: string = `JSON_OBJECT(${mappedSelections.join(", ")})`;
  if (objectOrArray === "array") {
    jsonMapping = `JSON_ARRAYAGG(${jsonMapping})`;
  }
  jsonMapping += " as json";

  // Map all joined tables to a string array
  const mappedInnerJoins: string[] = [];
  innerJoins.forEach((innerJoin) => {
    mappedInnerJoins.push(`INNER JOIN ${innerJoin[0]} ON ${innerJoin[1]}`);
  });

  return `SELECT ${jsonMapping} FROM ${table} ${mappedInnerJoins.join(" ")} ${
    where ? "WHERE " + where : ""
  }`;
}

/**
 * Generate a query to find a single row and map it to a JSON object. When
 * run, the query would return a scalar value - the JSON object string.
 *
 * You can select the columns that you want to be mapped to the JSON object.
 * A selection is either
 * - a column name (as `string`) or
 * - a scalar subquery (as `[key: string, subquery: string]`).
 *
 * Inner joins are represented as an array with length 2, containing
 * the joined table name and the condition(s) as a single string.
 *
 * You can join as many tables as you like but you must make sure that in
 * all cases the query returns one row at maximum. Otherweise the query will
 * return with the error `#1242 - Subquery returns more than 1 row`.
 *
 * The `where` condition can access all (joined) tables but should not
 * reference a table defined in the outer query. (See the MySQL docs:
 * https://dev.mysql.com/doc/refman/8.0/en/correlated-subqueries.html)
 *
 * TBD: Also allow other joins than inner joins?
 */
function getJsonObj(
  table: TableName,
  selections: (ColumnName | [KeyName, JsonQuery])[],
  where: Conditions,
  ...innerJoins: [TableName, Conditions][]
): JsonQuery {
  return getScalarJsonQuery("object", table, selections, where, ...innerJoins);
}

/**
 * Generate a query to find many rows, map each row to a JSON object, and
 * aggregate all objects to an array. When run, the query would return a
 * scalar value - the JSON array string.
 *
 * You can select the columns that you want to be mapped to each JSON
 * object. A selection is either
 * - a column name (as `string`) or
 * - a scalar subquery (as `[key: string, subquery: string]`). => MUST BE TESTED
 *
 * Inner joins are represented as an array with length 2, containing
 * the joined table name and the condition(s) as a single string.
 *
 * The `where` condition can access all (joined) tables but should not
 * reference a table defined in the outer query. (See the MySQL docs:
 * https://dev.mysql.com/doc/refman/8.0/en/correlated-subqueries.html)
 */
function getJsonArr(
  table: TableName,
  selections: (ColumnName | [KeyName, JsonQuery])[],
  where: Conditions,
  ...innerJoins: [TableName, Conditions][]
): JsonQuery {
  return getScalarJsonQuery("array", table, selections, where, ...innerJoins);
}

/**
 * Subqueried rows (usually) depend on the same params that were used
 * to query the parent row (e.g. the ).
 * For convenience, this method just repeatedly concats the params
 * by `by` times.
 */
function repeatParams(params: any[], by: number): any[] {
  let repeatedParams = params;
  for (let i = 1; i < by; i++) {
    repeatedParams = repeatedParams.concat(params);
  }
  return repeatedParams;
}

// Example query single job posting with relations mapped
const whereCondition = "job_posting.id = ? AND job_posting.state = ?";
const params = ["20MH0IgkQ3", 5];
console.log(
  getJsonObj(
    "job_posting",
    [
      "id",
      "title",
      [
        "from",
        getJsonObj("employer", ["id", "companyName"], whereCondition, [
          "job_posting",
          "job_posting.fromId = employer.id",
        ]),
      ],
      [
        "benefits",
        getJsonArr(
          "benefit",
          ["code", "englishTranslation"],
          whereCondition,
          [
            "job_posting_benefits_benefit",
            "job_posting_benefits_benefit.benefitCode = benefit.code",
          ],
          [
            "job_posting",
            "job_posting.id = job_posting_benefits_benefit.jobPostingId AND job_posting.state = job_posting_benefits_benefit.jobPostingState",
          ]
        ),
      ],
    ],
    whereCondition
  )
);
console.log(repeatParams(params, 3));

// Example query many employers with relations mapped (DOESNT WORK, SUBQUERY RETURNS MORE THAN ONE ROW)
console.log(
  getJsonArr(
    "employer",
    [
      "id",
      "companyName",
      [
        "language",
        getJsonObj("language", ["code", "englishTranslation"], "", [
          "employer",
          "employer.languageCode = language.code",
        ]),
      ],
    ],
    ""
  )
);
