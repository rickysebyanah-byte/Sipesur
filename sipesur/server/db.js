/**
 * db.js - Supabase REST API adapter untuk SIPESUR
 *
 * Menggunakan PostgREST RPC (/rest/v1/rpc/sipesur_exec|insert|mutate)
 * sebagai transport, sehingga tidak memerlukan koneksi TCP PostgreSQL langsung.
 * Kompatibel 100% dengan API db.query(sql, params) yang dipakai server.js.
 */
import 'dotenv/config';
import https from 'https';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[DB] ERROR: SUPABASE_URL dan SUPABASE_KEY harus diisi di .env');
}

// ----------------------------------------------------------------
// Helper: HTTP POST ke Supabase REST API
// ----------------------------------------------------------------
function rpcPost(funcName, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/${funcName}`);

    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = { message: data }; }
          const msg = parsed?.message || parsed?.hint || `HTTP ${res.statusCode}`;
          const err = new Error(msg);
          err.status = res.statusCode >= 400 && res.statusCode < 500 ? res.statusCode : 500;
          err.pgCode = parsed?.code;
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error('Request ke Supabase timeout (45s). Periksa koneksi internet.'));
    });
    req.write(payload);
    req.end();
  });
}

// ----------------------------------------------------------------
// Escape parameter nilai ke literal SQL yang aman
// ----------------------------------------------------------------
function escapeSqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    if (Number.isNaN(val)) return 'NULL';
    return String(val);
  }
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return 'NULL';
    return val.map((v) => escapeSqlVal(v)).join(', ');
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }
  // String
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

// ----------------------------------------------------------------
// Translate MySQL ? → literal SQL dan beberapa fungsi MySQL→PostgreSQL
// ----------------------------------------------------------------
function translateQuery(sql, params = []) {
  let cleanSql = sql
    .replace(/\bYEAR\s*\(\s*([^)]+)\s*\)/gi, 'EXTRACT(YEAR FROM $1)')
    .replace(
      /\bDATE_FORMAT\s*\(\s*([^,]+)\s*,\s*'%Y-%m'\s*\)/gi,
      "TO_CHAR($1, 'YYYY-MM')"
    );

  let newSql = '';
  let inStr = false;
  let strChar = '';
  let paramIdx = 0;

  for (let i = 0; i < cleanSql.length; i++) {
    const ch = cleanSql[i];
    if (inStr) {
      newSql += ch;
      if (ch === strChar && cleanSql[i - 1] !== '\\') inStr = false;
    } else if (ch === "'" || ch === '"') {
      inStr = true;
      strChar = ch;
      newSql += ch;
    } else if (ch === '?') {
      const val = params[paramIdx++];
      newSql += escapeSqlVal(val);
    } else {
      newSql += ch;
    }
  }

  // Auto-append RETURNING id untuk INSERT jika belum ada
  const trimmed = newSql.trim();
  if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
    newSql = `${trimmed} RETURNING id`;
  }

  return { sql: newSql };
}

// ----------------------------------------------------------------
// Deteksi tipe query
// ----------------------------------------------------------------
function queryType(sql) {
  const s = sql.trim().toUpperCase();
  if (s.startsWith('INSERT')) return 'insert';
  if (s.startsWith('SELECT') || s.startsWith('WITH')) return 'select';
  return 'mutate'; // UPDATE, DELETE, TRUNCATE, DDL
}

// ----------------------------------------------------------------
// API utama: db.query(sql, params)
// ----------------------------------------------------------------
const db = {
  async query(sql, params = []) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      const err = new Error(
        'SUPABASE_URL dan SUPABASE_KEY belum diisi di .env. ' +
        'Buka Supabase Dashboard > Settings > API untuk mendapatkan URL dan kunci.'
      );
      err.status = 503;
      throw err;
    }

    const { sql: pgSql } = translateQuery(sql, params);
    const type = queryType(pgSql);

    // Pilih fungsi RPC sesuai tipe query
    let funcName;
    if (type === 'insert') funcName = 'sipesur_insert';
    else if (type === 'select') funcName = 'sipesur_exec';
    else funcName = 'sipesur_mutate';

    let raw;
    try {
      raw = await rpcPost(funcName, { query: pgSql });
    } catch (err) {
      console.error('[DB Error]', err.message);
      console.error('[DB SQL]', pgSql.slice(0, 200));
      throw err;
    }

    // Normalisasi hasil
    if (type === 'mutate') {
      const meta = raw || { rowCount: 0, affectedRows: 0 };
      const rows = [];
      rows.insertId = null;
      rows.affectedRows = meta.affectedRows || 0;
      rows.rowCount = meta.rowCount || 0;
      return [rows, meta];
    }

    // SELECT / INSERT → array of rows
    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const insertId = type === 'insert' ? (rows[0]?.id ?? null) : null;
    const rowCount = rows.length;

    rows.insertId = insertId;
    rows.affectedRows = rowCount;
    rows.rowCount = rowCount;

    const meta = { insertId, affectedRows: rowCount, rowCount };
    return [rows, meta];
  },

  pool: {
    async query(sql) {
      return db.query(sql);
    },
    async end() {},
  },

  async end() {},
};

export default db;
