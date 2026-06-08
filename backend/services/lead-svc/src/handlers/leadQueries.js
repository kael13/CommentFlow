import { query } from "@commentflow/shared";

export async function findLeads(filters = {}, pagination = {}) {
  const conditions = ["deleted_at IS NULL"];
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`(name ILIKE $${paramIndex} OR product_interest ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.source) {
    conditions.push(`source = $${paramIndex++}`);
    params.push(filters.source);
  }

  if (filters.product_interest) {
    conditions.push(`product_interest ILIKE $${paramIndex++}`);
    params.push(`%${filters.product_interest}%`);
  }

  if (filters.date_from) {
    conditions.push(`captured_at >= $${paramIndex++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`captured_at <= $${paramIndex++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const limit = Math.min(parseInt(pagination.limit) || 50, 200);
  const offset = Math.max(parseInt(pagination.offset) || 0, 0);
  const orderBy = pagination.order_by || "captured_at";
  const orderDir = pagination.order_dir === "asc" ? "ASC" : "DESC";

  const dataQuery = `
    SELECT id, comment_id, name, contact_info_encrypted, product_interest,
           status, source, captured_at, notified_via, notes,
           created_at, updated_at
    FROM leads
    ${whereClause}
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  params.push(limit, offset);

  const countParams = params.slice(0, -2);
  const countQuery = `SELECT COUNT(*) FROM leads ${whereClause}`;

  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, countParams),
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function findLeadById(id) {
  const result = await query(
    `SELECT id, comment_id, name, contact_info_encrypted, product_interest,
            status, source, captured_at, notified_via, notes,
            created_at, updated_at
     FROM leads
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createLead(data) {
  const { comment_id, name, contact_info_encrypted, product_interest, source = "comment" } = data;

  const result = await query(
    `INSERT INTO leads (comment_id, name, contact_info_encrypted, product_interest, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, comment_id, name, contact_info_encrypted, product_interest,
               status, source, captured_at, notified_via, notes,
               created_at, updated_at`,
    [comment_id, name, contact_info_encrypted || null, product_interest || null, source]
  );
  return result.rows[0];
}

export async function updateLead(id, data) {
  const fields = [];
  const params = [];
  let paramIndex = 1;

  if (data.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    params.push(data.name);
  }
  if (data.contact_info_encrypted !== undefined) {
    fields.push(`contact_info_encrypted = $${paramIndex++}`);
    params.push(data.contact_info_encrypted);
  }
  if (data.product_interest !== undefined) {
    fields.push(`product_interest = $${paramIndex++}`);
    params.push(data.product_interest);
  }
  if (data.notes !== undefined) {
    fields.push(`notes = $${paramIndex++}`);
    params.push(data.notes);
  }
  if (data.notified_via !== undefined) {
    fields.push(`notified_via = $${paramIndex++}`);
    params.push(data.notified_via);
  }

  if (fields.length === 0) return null;

  fields.push("updated_at = NOW()");
  params.push(id);

  const result = await query(
    `UPDATE leads SET ${fields.join(", ")}
     WHERE id = $${paramIndex} AND deleted_at IS NULL
     RETURNING id, comment_id, name, contact_info_encrypted, product_interest,
               status, source, captured_at, notified_via, notes,
               created_at, updated_at`,
    params
  );
  return result.rows[0] || null;
}

export async function findLeadByCommentId(commentId) {
  const result = await query(
    `SELECT id, comment_id, name, contact_info_encrypted, product_interest,
            status, source, captured_at, notified_via, notes,
            created_at, updated_at
     FROM leads
     WHERE comment_id = $1 AND deleted_at IS NULL`,
    [commentId]
  );
  return result.rows[0] || null;
}

export async function softDeleteLead(id) {
  const result = await query(
    `UPDATE leads SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getLeadStats() {
  const result = await query(
    `SELECT status, COUNT(*)::int AS count
     FROM leads
     WHERE deleted_at IS NULL
     GROUP BY status
     ORDER BY status`
  );
  return result.rows;
}

export async function getAllLeads(filters = {}) {
  const conditions = ["deleted_at IS NULL"];
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.source) {
    conditions.push(`source = $${paramIndex++}`);
    params.push(filters.source);
  }

  if (filters.date_from) {
    conditions.push(`captured_at >= $${paramIndex++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`captured_at <= $${paramIndex++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const result = await query(
    `SELECT id, comment_id, name, contact_info_encrypted, product_interest,
            status, source, captured_at, notified_via, notes,
            created_at, updated_at
     FROM leads
     ${whereClause}
     ORDER BY captured_at DESC`,
    params
  );
  return result.rows;
}
