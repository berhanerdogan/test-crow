import Database from "better-sqlite3"
import type { IDatabaseAdapter } from "./IDatabaseAdapter"
import type { Transaction } from "../interfaces/Transaction"
import type { Escrow } from "../interfaces/Escrow"
import { EscrowStatus } from "../enums/EscrowStatus"
import { TransactionType } from "../enums/TransactionType"

export class SQLiteAdapter implements IDatabaseAdapter {
  private db: Database.Database

  constructor(dbFile = "ledger.db") {
    this.db = new Database(dbFile)
    this.migrate()
  }

  private migrate() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        balance REAL NOT NULL DEFAULT 0,
        locked_balance REAL NOT NULL DEFAULT 0
      )
    `).run()

    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        from_account TEXT,
        to_account TEXT,
        amount REAL NOT NULL,
        type TEXT,
        status TEXT,
        created_at TEXT
      )
    `).run()

    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS escrows (
        id TEXT PRIMARY KEY,
        buyer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        transaction_id TEXT,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `).run()
  }

  async getBalance(userID: string): Promise<number> {
    const row = this.db
      .prepare("SELECT balance FROM users WHERE id = ?")
      .get(userID) as { balance: number } | undefined
    return row?.balance ?? 0
  }

  async addBalance(userID: string, amount: number): Promise<void> {
    this.db.prepare(`
      INSERT INTO users (id, balance) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET balance = balance + excluded.balance
    `).run(userID, amount)
  }

  async subtractBalance(userID: string, amount: number): Promise<void> {
    const current = await this.getBalance(userID)
    if (current < amount) throw new Error("Insufficient balance")
    this.db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(amount, userID)
  }

  async getAllBalances(): Promise<Record<string, number>> {
    const rows = this.db.prepare("SELECT id, balance FROM users").all() as { id: string; balance: number }[]
    return Object.fromEntries(rows.map(r => [r.id, r.balance]))
  }

  async saveEscrow(escrow: Escrow): Promise<void> {
    this.db.prepare(`
      INSERT INTO escrows (id, buyer_id, seller_id, transaction_id, amount, status, created_at)
      VALUES (@id, @buyer_id, @seller_id, @transaction_id, @amount, @status, @created_at)
    `).run({
      id: escrow.escrowID,
      buyer_id: escrow.buyerUserID,
      seller_id: escrow.sellerUserID,
      transaction_id: escrow.transactionID,
      amount: escrow.amount,
      status: escrow.status,
      created_at: escrow.createdAt.toISOString(),
    })
  }

  async getEscrow(escrowID: string): Promise<Escrow | null> {
    const row = this.db
      .prepare("SELECT * FROM escrows WHERE id = ?")
      .get(escrowID) as {
        id: string; buyer_id: string; seller_id: string
        transaction_id: string; amount: number; status: string
        created_at: string; updated_at: string | null
      } | undefined

    if (!row) return null

    return {
      escrowID: row.id,
      buyerUserID: row.buyer_id,
      sellerUserID: row.seller_id,
      transactionID: row.transaction_id,
      amount: row.amount,
      status: row.status as EscrowStatus,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    }
  }

  async updateEscrowStatus(escrowID: string, status: EscrowStatus): Promise<void> {
    this.db.prepare(`
      UPDATE escrows SET status = ?, updated_at = ? WHERE id = ?
    `).run(status, new Date().toISOString(), escrowID)
  }

  async saveTransaction(tx: Transaction): Promise<void> {
    this.db.prepare(`
      INSERT INTO transactions (id, from_account, to_account, amount, type, status, created_at)
      VALUES (@id, @from_account, @to_account, @amount, @type, @status, @created_at)
    `).run({
      id: tx.transactionID,
      from_account: tx.fromAccountID,
      to_account: tx.toAccountID,
      amount: tx.amount,
      type: tx.type,
      status: tx.status,
      created_at: tx.createdAt.toISOString(),
    })
  }

  async getTransactions(): Promise<Transaction[]> {
    const rows = this.db.prepare("SELECT * FROM transactions").all() as {
      id: string; from_account: string; to_account: string
      amount: number; type: string; status: string; created_at: string
    }[]

    return rows.map(row => ({
      transactionID: row.id,
      fromAccountID: row.from_account,
      toAccountID: row.to_account,
      amount: row.amount,
      type: row.type as TransactionType,
      status: row.status as EscrowStatus,
      createdAt: new Date(row.created_at),
    }))
  }
}      