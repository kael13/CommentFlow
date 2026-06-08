export function buildDateRangeQuery(table, dateField, startDate, endDate) {
  const clauses = [];
  const params = [];

  if (startDate) {
    clauses.push(`${dateField} >= $${params.length + 1}`);
    params.push(startDate);
  }
  if (endDate) {
    clauses.push(`${dateField} <= $${params.length + 1}`);
    params.push(endDate);
  }

  return { clause: clauses.length > 0 ? clauses.join(" AND ") : null, params };
}

export function buildGroupByPeriod(period, dateField) {
  switch (period) {
    case "week":
      return `DATE_TRUNC('week', ${dateField})`;
    case "month":
      return `DATE_TRUNC('month', ${dateField})`;
    case "day":
    default:
      return `DATE_TRUNC('day', ${dateField})`;
  }
}

export function countByGroup(table, groupField, extraFilters = []) {
  const filterClauses = extraFilters.length > 0
    ? ` WHERE ${extraFilters.join(" AND ")}`
    : "";
  return `SELECT ${groupField}, COUNT(*)::int AS count FROM ${table}${filterClauses} GROUP BY ${groupField}`;
}

export function getStats(fields, table, extraClauses = []) {
  const selectParts = [];
  const values = [];
  let paramIndex = 1;

  for (const field of fields) {
    switch (field.type) {
      case "count":
        selectParts.push(`COUNT(*)::int AS ${field.alias || field.name}`);
        break;
      case "avg":
        selectParts.push(`AVG(${field.expression || field.name})::numeric(10,2) AS ${field.alias || field.name}`);
        break;
      case "sum":
        selectParts.push(`COALESCE(SUM(${field.expression || field.name}), 0) AS ${field.alias || field.name}`);
        break;
      case "date_trunc_count":
        selectParts.push(
          `${buildGroupByPeriod(field.period, field.dateField)} AS ${field.alias || "date"}, COUNT(*)::int AS count`
        );
        break;
      default:
        selectParts.push(`${field.name} AS ${field.alias || field.name}`);
    }
  }

  let sql = `SELECT ${selectParts.join(", ")} FROM ${table}`;

  if (extraClauses.length > 0) {
    sql += ` WHERE ${extraClauses.join(" AND ")}`;
  }

  if (fields.some(f => f.type === "date_trunc_count")) {
    sql += ` GROUP BY ${fields
      .filter(f => f.type === "date_trunc_count")
      .map(() => "1")
      .join(", ")} ORDER BY 1`;
  }

  return { text: sql, values };
}
