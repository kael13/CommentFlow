import { query } from "@commentflow/shared";

export async function findComments(filters, pagination) {
  const conditions = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) {
      conditions.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query(
    `SELECT COUNT(*) FROM comments ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const offset = (pagination.page - 1) * pagination.limit;
  const dataResult = await query(
    `SELECT * FROM comments ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, pagination.limit, offset]
  );

  return {
    data: dataResult.rows,
    total,
    page: pagination.page,
    limit: pagination.limit,
  };
}

export async function findCommentById(id) {
  const result = await query("SELECT * FROM comments WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function createComment(data) {
  const result = await query(
    `INSERT INTO comments (page_id, post_id, facebook_comment_id, parent_facebook_comment_id, author_name, author_email, message, timestamp, permalink)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.page_id,
      data.post_id,
      data.facebook_comment_id,
      data.parent_facebook_comment_id,
      data.author_name,
      data.author_email,
      data.message,
      data.timestamp,
      data.permalink,
    ]
  );
  return result.rows[0];
}

export async function updateComment(id, data) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    setClauses.push(`${key} = $${idx++}`);
    values.push(value);
  }

  if (setClauses.length === 0) {
    const existing = await findCommentById(id);
    return existing;
  }

  values.push(id);
  const result = await query(
    `UPDATE comments SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function updateCommentReply(id, replyData) {
  const result = await query(
    `UPDATE comments SET reply_text = $1, reply_tone = $2, auto_replied = $3, reply_timestamp = $4 WHERE id = $5 RETURNING *`,
    [replyData.reply_text, replyData.reply_tone, replyData.auto_replied, replyData.reply_timestamp, id]
  );
  return result.rows[0];
}

export async function classifyAndUpdate(id, classification) {
  const result = await query(
    `UPDATE comments SET ai_intent = $1, ai_confidence = $2, sentiment = $3, is_lead = $4 WHERE id = $5 RETURNING *`,
    [classification.intent, classification.confidence, classification.sentiment, classification.isLead, id]
  );
  return result.rows[0];
}
