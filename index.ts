type TableName = string;
type ColumnName = string;
type SqlConditions = string;
type JsonKeyName = string;
type Limit = number;
type Offset = number;

enum QueryNodeType {
  Array,
  Object,
}

interface OrderBy {
  column: ColumnName;
  order: "ASC" | "DESC";
}

interface QueryOptions {
  where?: SqlConditions;
  // Needed for many-to-many relations
  join?: TableName | TableName[];
  limit?: Limit;
  offset?: Offset;
  orderBy?: OrderBy | OrderBy[];
}

/**
 * Can access all columns of table and use all built-in database functions.
 * Should reference columns via the table name to prevent ambiguous column names.
 */
type CalculatedField = string;

type ColumnSelection =
  | ColumnName
  | [ColumnName, JsonKeyName]
  | [ColumnName, JsonKeyName, CalculatedField];
type TableSelection = TableName | [TableName, JsonKeyName];

class JsonQueryNode {
  constructor(
    private type: QueryNodeType,
    private tableSelection: TableSelection,
    private columnSelections: ColumnSelection[],
    private joinedTables?: JsonQueryNode[],
    private where?: SqlConditions,
    private join?: TableName | TableName[],
    private limit?: Limit,
    private offset?: Offset,
    private orderBy?: OrderBy | OrderBy[]
  ) {}

  public compile(): string {
    const tableName: string = Array.isArray(this.tableSelection)
      ? this.tableSelection[0]
      : this.tableSelection;

    // Assembled from the `columnSelections` and the `joinedTables`
    const assembledColumnSelections: string[] = this.columnSelections.flatMap(
      (columnSelection: ColumnSelection) => {
        if (Array.isArray(columnSelection)) {
          // JSON key name provided
          if (columnSelection.length === 2) {
            return [
              `"${columnSelection[1]}"`,
              `${tableName}.${columnSelection[0]}`,
            ];
          }
          // Calculated field
          return [`"${columnSelection[1]}"`, `(${columnSelection[2]})`];
        }
        // Only column name provided
        return [`"${columnSelection}"`, `${tableName}.${columnSelection}`];
      }
    );

    // Recursively compile all descendants and map them to lateral left joins
    const descendantsOutput: string[] = [];
    if (Array.isArray(this.joinedTables)) {
      for (const joinedTable of this.joinedTables) {
        let joinedTableName: string;
        let joinedTableJsonKey: string;

        if (Array.isArray(joinedTable.tableSelection)) {
          joinedTableName = joinedTable.tableSelection[0];
          joinedTableJsonKey = joinedTable.tableSelection[1];
        } else {
          joinedTableName = joinedTable.tableSelection;
          joinedTableJsonKey = joinedTable.tableSelection;
        }

        assembledColumnSelections.push(
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
      return `SELECT JSON_OBJECT(${assembledColumnSelections.join(
        ", "
      )}) as _json FROM (SELECT * FROM ${tableName} WHERE ${
        this.where
      }) AS ${tableName} ${descendantsOutput.join(" ")}`;
    } else {
      // Building a scalar JSON array query
      let tables = tableName;
      if (this.join) {
        if (Array.isArray(this.join)) {
          tables = [...this.join, tableName].join(", ");
        } else {
          tables = this.join + ", " + tableName;
        }
      }

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
      return `SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(${assembledColumnSelections.join(
        ", "
      )})), CAST("[]" AS JSON)) as _json FROM (SELECT * FROM ${tables} ${where} ${orderBy} ${limit}) AS ${tableName} ${descendantsOutput.join(
        " "
      )}`;
    }
  }
}

/**
 * Braucht immer where condition (wenn sie nicht nur auf eine einzige row
 * applied, dann werden mehrere rows zurückgegeben welche alle jeweils ein
 * JSON object string darstellen) => kann die query failen wenns ne nested node ist
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
 * The `where` parameter is used for joining the related rows (like in the
 * `ON` condition) and for arbitrary `WHERE` conditions.
 */
export function findMany(
  table: TableSelection,
  select: ColumnSelection[],
  join?: JsonQueryNode[]
): JsonQueryNode;
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
