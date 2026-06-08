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
    `INSERT INTO comments (page_id, post_id, facebook_comment_id, parent_facebook_comment_id, author_name, author_email, text, timestamp, permalink)
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

export async function findPosts(limit = 50) {
  const result = await query(
    `SELECT
       post_id,
       page_id,
       COUNT(*) AS comment_count,
       COUNT(*) FILTER (WHERE is_lead = TRUE) AS lead_count,
       MAX(timestamp) AS last_activity,
       (ARRAY_AGG(text ORDER BY timestamp ASC))[1] AS first_comment,
       json_object_agg(
         COALESCE(ai_intent, 'general'),
         intent_count
       ) FILTER (WHERE ai_intent IS NOT NULL) AS intent_breakdown
     FROM (
       SELECT *, COUNT(*) OVER (PARTITION BY post_id, ai_intent) AS intent_count
       FROM comments
     ) sub
     GROUP BY post_id, page_id
     ORDER BY last_activity DESC
     LIMIT $1`,
    [limit]
  );

  const deduped = new Map();
  for (const row of result.rows) {
    if (!deduped.has(row.post_id)) {
      deduped.set(row.post_id, row);
    }
  }

  return { data: Array.from(deduped.values()) };
}

export async function findThreadForPost(postId) {
  const result = await query(
    `SELECT * FROM comments WHERE post_id = $1 ORDER BY timestamp ASC`,
    [postId]
  );

  const comments = result.rows;
  const byParent = {};
  const topLevel = [];

  for (const c of comments) {
    const parentKey = c.parent_facebook_comment_id || null;
    if (!parentKey) {
      topLevel.push({ ...c, children: [] });
    } else {
      if (!byParent[parentKey]) byParent[parentKey] = [];
      byParent[parentKey].push({ ...c, children: [] });
    }
  }

  function attachChildren(node) {
    const fbId = node.facebook_comment_id;
    if (fbId && byParent[fbId]) {
      node.children = byParent[fbId].map(attachChildren);
    }
    return node;
  }

  return { data: topLevel.map(attachChildren) };
}
