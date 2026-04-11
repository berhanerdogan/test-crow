import type { Transaction } from "../interfaces/Transaction"
import type { Escrow } from "../interfaces/Escrow"
import type { EscrowStatus } from "../enums/EscrowStatus"

export interface IDatabaseAdapter {
  getBalance(userID: string): Promise<number>
  addBalance(userID: string, amount: number): Promise<void>
  subtractBalance(userID: string, amount: number): Promise<void>
  getAllBalances(): Promise<Record<string, number>>

  saveEscrow(escrow: Escrow): Promise<void>
  getEscrow(escrowID: string): Promise<Escrow | null>
  getEscrowsBySeller(sellerID: string): Promise<Escrow[]>
  getEscrowsByBuyer(buyerID: string): Promise<Escrow[]>
  updateEscrowStatus(escrowID: string, status: EscrowStatus): Promise<void>

  saveTransaction(tx: Transaction): Promise<void>
  getTransactions(): Promise<Transaction[]>

  getAllProducts(): Promise<any[]>
}