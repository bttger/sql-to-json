type TableName = string;
type ColumnReference = string;
type SqlConditions = string;
type JsonKeyName = string;
type OrderBy = Record<ColumnReference, "ASC" | "DESC">;

enum QueryNodeType {
  Array,
  Object,
}

interface QueryOptions {
  where?: SqlConditions;
  /**
   * Add a **junction table** of a many-to-many relation.
   *
   * Add columns of these joined tables to the `ColumnSelection` by
   * prefixing the column with the table like:
   * `<tableName>.<columnName>`.
   */
  join?: TableName;
  limit?: number;
  offset?: number;
  orderBy?: OrderBy;
}

interface TableSelectionOptions {
  table: TableName;
  jsonKey: JsonKeyName;
}

type TableSelection = TableName | TableSelectionOptions;

interface ColumnSelectionOptions {
  /**
   * Specify the column you want to write to the JSON object.
   *
   * You may reference a column via the table name to prevent ambiguous
   * column names or to select a column of a junction table.
   * `<table>.<column>`
   *
   * For calculated fields, use the `calculation`, `jsonKey`,
   * and `referencedColumns` properties instead.
   */
  column?: ColumnReference;
  /**
   * Set the name of the JSON object key. `{ "jsonKey": "someValue" }`
   */
  jsonKey: JsonKeyName;
}

type ColumnSelection = ColumnReference | ColumnSelectionOptions;

class JsonQueryNode {
  constructor(
    private type: QueryNodeType,
    private tableSelection: TableSelection,
    private columnSelections: ColumnSelection[],
    private joinedTables?: JsonQueryNode[],
    private where?: SqlConditions,
    private join?: TableName,
    private limit?: number,
    private offset?: number,
    private orderBy?: OrderBy | OrderBy[]
  ) {}

  public compile(): string {
    let table: string;
    if (typeof this.tableSelection === "string") {
      table = this.tableSelection;
    } else {
      table = this.tableSelection.table;
    }

    /**
     * Additional columns that need to be selected in the subquery and that must be
     * aliased to prevent ambiguous column names.
     */
    const junctionTableSelections: string[] = [];
    /**
     * The assembled JSON object properties from `columnSelections` and `joinedTables`
     */
    const jsonObjectProperties: string[] = [];

    const getColumnAndReferencedTable = (
      columnReference: ColumnReference
    ): [string, string] => {
      const columnSelectionSplit = columnReference.split(".");
      const column =
        columnSelectionSplit.length === 2
          ? columnSelectionSplit[1]
          : columnReference;
      const relatedTable =
        columnSelectionSplit.length === 2 ? columnSelectionSplit[0] : table;

      return [column, relatedTable];
    };

    const addColumnSelection = (
      columnReference: ColumnReference,
      jsonKey: JsonKeyName
    ) => {
      const [column, referencedTable] =
        getColumnAndReferencedTable(columnReference);
      if (referencedTable !== table) {
        junctionTableSelections.push(
          `${referencedTable}.${column} AS ${referencedTable}_${column}`
        );
        jsonObjectProperties.push(
          `"${jsonKey}"`,
          `${referencedTable}_${column}`
        );
      } else {
        jsonObjectProperties.push(`"${jsonKey}"`, `${table}.${column}`);
      }
    };

    this.columnSelections.forEach((columnSelection: ColumnSelection) => {
      if (typeof columnSelection === "string") {
        addColumnSelection(columnSelection, columnSelection);
      } else if (columnSelection.column && columnSelection.jsonKey) {
        addColumnSelection(columnSelection.column, columnSelection.jsonKey);
      } else {
        throw new Error(
          `Could not extract a column selection for ${JSON.stringify(
            columnSelection
          )}. Please check your ColumnSelectionOptions.`
        );
      }
    });

    // Recursively compile all descendants and map them to lateral left joins
    const descendantsOutput: string[] = [];
    if (Array.isArray(this.joinedTables)) {
      for (const joinedTable of this.joinedTables) {
        let joinedTableName: string;
        let joinedTableJsonKey: string;

        if (typeof joinedTable.tableSelection === "string") {
          joinedTableName = joinedTable.tableSelection;
          joinedTableJsonKey = joinedTable.tableSelection;
        } else {
          joinedTableName = joinedTable.tableSelection.table;
          joinedTableJsonKey = joinedTable.tableSelection.jsonKey;
        }

        jsonObjectProperties.push(
          `"${joinedTableJsonKey}"`,
          `${joinedTableName}._json`
        );

        const compiled = joinedTable.compile();
        descendantsOutput.push(
          `LEFT JOIN LATERAL (${compiled}) AS ${joinedTableName} ON true`
        );
      }
    }

    if (this.type === QueryNodeType.Object) {
      // Building a scalar JSON object query
      return `SELECT JSON_OBJECT(${jsonObjectProperties.join(
        ", "
      )}) as _json FROM (SELECT * FROM ${table} WHERE ${
        this.where
      }) AS ${table} ${descendantsOutput.join(" ")}`;
    } else {
      // Building a scalar JSON array query
      const tables = this.join ? table + ", " + this.join : table;

      const where = this.where ? `WHERE ${this.where}` : "";
      const limit = this.limit
        ? `LIMIT ${this.offset ? this.offset + "," : ""} ${this.limit}`
        : "";

      let orderBy = "";
      if (this.orderBy) {
        if (Array.isArray(this.orderBy)) {
          orderBy = this.orderBy
            .map((v) => `${v.column} ${v.order}`)
            .join(", ");
        } else {
          orderBy = `ORDER BY ${this.orderBy.column} ${this.orderBy.order}`;
        }
      }

      // Need to cast the second COALESCE parameter due to implicit type conversion
      // https://stackoverflow.com/a/20678157/11858359
      return `SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(${jsonObjectProperties.join(
        ", "
      )})), CAST("[]" AS JSON)) as _json FROM (SELECT ${table}.* ${
        junctionTableSelections.length
          ? ", " + junctionTableSelections.join(", ")
          : ""
      } FROM ${tables} ${where} ${orderBy} ${limit}) AS ${table} ${descendantsOutput.join(
        " "
      )}`;
    }
  }
}

/**
 * Generate a query to find a single row and map it to a JSON object. When
 * run, the query returns a scalar value - the JSON object string.
 *
 * This function always requires a WHERE condition. If the query finds more
 * than one row, it returns JSON objects spread over many rows. This
 * leads to an error if this function's output is nested in another query.
 */
export function findUnique(
  table: TableSelection,
  select: ColumnSelection[],
  where: SqlConditions,
  join?: JsonQueryNode[]
): JsonQueryNode {
  return new JsonQueryNode(QueryNodeType.Object, table, select, join, where);
}

/**
 * Generate a query to find many rows, map each row to a JSON object, and
 * aggregate all objects to a JSON array. When run, the query returns
 * a scalar value - the JSON array string.
 */
export function findMany(
  table: TableSelection,
  select: ColumnSelection[],
  join?: JsonQueryNode[]
): JsonQueryNode;
/**
 * Generate a query to find many rows, map each row to a JSON object, and
 * aggregate all objects to a JSON array. When run, the query returns
 * a scalar value - the JSON array string.
 *
 * The `where` parameter in the QueryOptions is used for joining
 * related rows (like in the `ON` condition) and for arbitrary
 * `WHERE` conditions.
 */
export function findMany(
  table: TableSelection,
  select: ColumnSelection[],
  options: QueryOptions,
  join?: JsonQueryNode[]
): JsonQueryNode;
export function findMany(
  table: TableSelection,
  select: ColumnSelection[],
  optionsOrJoin?: QueryOptions | JsonQueryNode[],
  join?: JsonQueryNode[]
): JsonQueryNode {
  if (optionsOrJoin === undefined && join === undefined) {
    return new JsonQueryNode(QueryNodeType.Array, table, select);
  }
  if (Array.isArray(optionsOrJoin)) {
    return new JsonQueryNode(QueryNodeType.Array, table, select, optionsOrJoin);
  }
  return new JsonQueryNode(
    QueryNodeType.Array,
    table,
    select,
    join,
    optionsOrJoin?.where,
    optionsOrJoin?.join,
    optionsOrJoin?.limit,
    optionsOrJoin?.offset,
    optionsOrJoin?.orderBy
  );
}
