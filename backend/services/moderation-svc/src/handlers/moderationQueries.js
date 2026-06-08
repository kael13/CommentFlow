import { query as dbQuery } from "@commentflow/shared";

export async function findFlaggedComments(filters, pagination) {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.moderation_status) {
    const statuses = filters.moderation_status.split(",");
    const placeholders = statuses.map((s) => {
      params.push(s.trim());
      return `$${paramIndex++}`;
    });
    conditions.push(`moderation_status IN (${placeholders.join(",")})`);
  }

  if (filters.page_id) {
    params.push(filters.page_id);
    conditions.push(`page_id = $${paramIndex++}`);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countResult = await dbQuery(
    `SELECT COUNT(*) FROM comments ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit);
  params.push(offset);
  const dataResult = await dbQuery(
    `SELECT * FROM comments ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    params
  );

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateCommentStatus(commentId, status) {
  const result = await dbQuery(
    `UPDATE comments SET moderation_status = $1
     WHERE id = $2
     RETURNING *`,
    [status, commentId]
  );
  return result.rows[0] || null;
}

export async function hideCommentsByAuthor(authorFbId) {
  const result = await dbQuery(
    `UPDATE comments SET moderation_status = 'hidden'
     WHERE author_fb_id = $1 AND moderation_status != 'hidden'
     RETURNING id`,
    [authorFbId]
  );
  return result.rows;
}

export async function getSpamKeywords() {
  const result = await dbQuery(
    `SELECT id, keyword, is_active, added_by, created_at
     FROM spam_keywords
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function addSpamKeyword(keyword, addedBy = null) {
  const result = await dbQuery(
    `INSERT INTO spam_keywords (keyword, added_by)
     VALUES ($1, $2)
     RETURNING id, keyword, is_active, added_by, created_at`,
    [keyword, addedBy]
  );
  return result.rows[0];
}

export async function removeSpamKeyword(id) {
  const result = await dbQuery(
    `DELETE FROM spam_keywords WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}

export async function toggleSpamKeyword(id, isActive) {
  const result = await dbQuery(
    `UPDATE spam_keywords SET is_active = $1
     WHERE id = $2
     RETURNING id, keyword, is_active, added_by, created_at`,
    [isActive, id]
  );
  return result.rows[0] || null;
}
