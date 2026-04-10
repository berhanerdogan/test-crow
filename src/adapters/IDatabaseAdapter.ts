import type { Transaction } from "../interfaces/Transaction"
import type { Escrow } from "../interfaces/Escrow"
import type { EscrowStatus } from "../enums/EscrowStatus"

export interface IDatabaseAdapter {
  // Balances
  getBalance(userID: string): Promise<number>
  addBalance(userID: string, amount: number): Promise<void>
  subtractBalance(userID: string, amount: number): Promise<void>
  getAllBalances(): Promise<Record<string, number>>

  // Escrows
  saveEscrow(escrow: Escrow): Promise<void>
  getEscrow(escrowID: string): Promise<Escrow | null>
  updateEscrowStatus(escrowID: string, status: EscrowStatus): Promise<void>

  // Transactions
  saveTransaction(tx: Transaction): Promise<void>
  getTransactions(): Promise<Transaction[]>
}