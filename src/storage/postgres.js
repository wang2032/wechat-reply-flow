import pg from "pg";

const { Pool } = pg;

const USER_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS wechat_users (
    openid TEXT PRIMARY KEY,
    to_user_name TEXT NOT NULL,
    latest_msg_type TEXT,
    latest_event TEXT,
    latest_event_key TEXT,
    latest_content TEXT,
    latest_raw_xml TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    ai_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ai_mode_updated_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const MESSAGE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS wechat_messages (
    id BIGSERIAL PRIMARY KEY,
    openid TEXT NOT NULL,
    to_user_name TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'in',
    msg_type TEXT,
    event_name TEXT,
    event_key TEXT,
    content TEXT,
    raw_xml TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const USER_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS wechat_users_last_seen_at_idx
  ON wechat_users (last_seen_at DESC);
`;

const MESSAGE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS wechat_messages_openid_created_at_idx
  ON wechat_messages (openid, created_at DESC);
`;

const MESSAGE_DIRECTION_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS wechat_messages_openid_direction_created_at_idx
  ON wechat_messages (openid, direction, created_at DESC);
`;

export function createPostgresStore(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
  });

  let initPromise = null;

  async function ensureInitialized() {
    if (!initPromise) {
      initPromise = (async () => {
        await pool.query(USER_TABLE_SQL);
        await pool.query(MESSAGE_TABLE_SQL);
        await pool.query(
          "ALTER TABLE wechat_users ADD COLUMN IF NOT EXISTS ai_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE",
        );
        await pool.query(
          "ALTER TABLE wechat_users ADD COLUMN IF NOT EXISTS ai_mode_updated_at TIMESTAMPTZ",
        );
        await pool.query(
          "ALTER TABLE wechat_messages ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'in'",
        );
        await pool.query(USER_INDEX_SQL);
        await pool.query(MESSAGE_INDEX_SQL);
        await pool.query(MESSAGE_DIRECTION_INDEX_SQL);
      })();
    }
    return initPromise;
  }

  async function recordIncomingMessage(message) {
    await ensureInitialized();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const messageResult = await client.query(
        `
        INSERT INTO wechat_messages (
          openid,
          to_user_name,
          direction,
          msg_type,
          event_name,
          event_key,
          content,
          raw_xml
        ) VALUES ($1, $2, 'in', $3, $4, $5, $6, $7)
        RETURNING id, created_at
        `,
        [
          message.openid,
          message.toUserName,
          message.msgType || null,
          message.event || null,
          message.eventKey || null,
          message.content || null,
          message.rawXml,
        ],
      );

      const userResult = await client.query(
        `
        INSERT INTO wechat_users (
          openid,
          to_user_name,
          latest_msg_type,
          latest_event,
          latest_event_key,
          latest_content,
          latest_raw_xml,
          message_count,
          first_seen_at,
          last_seen_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW(), NOW())
        ON CONFLICT (openid) DO UPDATE SET
          to_user_name = EXCLUDED.to_user_name,
          latest_msg_type = EXCLUDED.latest_msg_type,
          latest_event = EXCLUDED.latest_event,
          latest_event_key = EXCLUDED.latest_event_key,
          latest_content = EXCLUDED.latest_content,
          latest_raw_xml = EXCLUDED.latest_raw_xml,
          message_count = wechat_users.message_count + 1,
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING *
        `,
        [
          message.openid,
          message.toUserName,
          message.msgType || null,
          message.event || null,
          message.eventKey || null,
          message.content || null,
          message.rawXml,
        ],
      );

      await client.query("COMMIT");
      return {
        message: messageResult.rows[0],
        user: userResult.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function listUsers(limit = 20) {
    await ensureInitialized();
    const result = await pool.query(
      `
      SELECT *
      FROM wechat_users
      ORDER BY last_seen_at DESC
      LIMIT $1
      `,
      [limit],
    );
    return result.rows;
  }

  async function getUser(openid) {
    await ensureInitialized();
    const result = await pool.query(
      "SELECT * FROM wechat_users WHERE openid = $1 LIMIT 1",
      [openid],
    );
    return result.rows[0] ?? null;
  }

  async function setAiMode(openid, enabled, toUserName = "unknown") {
    await ensureInitialized();
    const result = await pool.query(
      `
      INSERT INTO wechat_users (
        openid,
        to_user_name,
        latest_raw_xml,
        ai_mode_enabled,
        ai_mode_updated_at,
        first_seen_at,
        last_seen_at,
        updated_at
      ) VALUES ($1, $2, '', $3, NOW(), NOW(), NOW(), NOW())
      ON CONFLICT (openid) DO UPDATE SET
        ai_mode_enabled = EXCLUDED.ai_mode_enabled,
        ai_mode_updated_at = NOW(),
        updated_at = NOW()
      RETURNING *
      `,
      [openid, toUserName, enabled],
    );
    return result.rows[0];
  }

  async function recordOutgoingMessage(message) {
    await ensureInitialized();
    const result = await pool.query(
      `
      INSERT INTO wechat_messages (
        openid,
        to_user_name,
        direction,
        msg_type,
        event_name,
        event_key,
        content,
        raw_xml
      ) VALUES ($1, $2, 'out', $3, NULL, NULL, $4, $5)
      RETURNING id, created_at
      `,
      [
        message.openid,
        message.toUserName,
        message.msgType || "text",
        message.content || null,
        message.rawXml,
      ],
    );
    return result.rows[0];
  }

  async function getRecentConversation(openid, limit = 12) {
    await ensureInitialized();
    const result = await pool.query(
      `
      SELECT direction, msg_type, event_name, event_key, content, created_at
      FROM wechat_messages
      WHERE openid = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [openid, limit],
    );
    return result.rows.reverse();
  }

  async function close() {
    await pool.end();
  }

  return {
    ensureInitialized,
    recordIncomingMessage,
    recordOutgoingMessage,
    listUsers,
    getUser,
    setAiMode,
    getRecentConversation,
    close,
  };
}
