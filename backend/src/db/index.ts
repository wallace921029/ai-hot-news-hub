import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema.js'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const DB_PATH = './data/database.db'

// 确保数据目录存在
mkdirSync(dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH)

// 启用 WAL 模式提高性能
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

export type DB = typeof db
