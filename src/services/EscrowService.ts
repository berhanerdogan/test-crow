import type { IPaymentGateway } from "./payment/IPaymentGateway"
import { TransactionType } from "../enums/TransactionType"
import { EscrowStatus } from "../enums/EscrowStatus"
import { SQLiteAdapter } from "../adapters/SQLiteAdapter"
import { randomUUID } from "node:crypto"

export class EscrowService {
  private db: SQLiteAdapter
  private payment: IPaymentGateway

  constructor(db: SQLiteAdapter, payment: IPaymentGateway) {
    this.payment = payment
    this.db = db
  }

  async createEscrow(buyerUserID: string, sellerUserID: string, amount: number) {
    if (amount <= 0) throw new Error("Amount must be greater than 0")
    if (buyerUserID === sellerUserID) throw new Error("Buyer and seller cannot be the same")

    const balance = await this.db.getBalance(buyerUserID)
    if (balance < amount) throw new Error("Insufficient funds")

    const charged = await this.payment.charge(buyerUserID, amount)
    if (!charged) throw new Error("Payment failed")

    const escrowID = randomUUID()
    const transactionID = randomUUID()

    await this.db.subtractBalance(buyerUserID, amount)
    await this.db.addBalance("escrow_pool", amount)

    await this.db.saveTransaction({
      transactionID,
      fromAccountID: buyerUserID,
      toAccountID: "escrow_pool",
      amount,
      type: TransactionType.Hold,
      status: EscrowStatus.Held,
      createdAt: new Date(),
    })

    await this.db.saveEscrow({
      escrowID,
      buyerUserID,
      sellerUserID,
      transactionID,
      amount,
      status: EscrowStatus.Held,
      createdAt: new Date(),
    })

    return escrowID
  }

  async shipEscrow(escrowID: string, sellerUserID: string) {
    const escrow = await this.db.getEscrow(escrowID)
    if (!escrow) throw new Error("Escrow not found")
    if (escrow.sellerUserID !== sellerUserID) throw new Error("Unauthorized")
    if (escrow.status !== EscrowStatus.Held) throw new Error("Escrow is not in held state")
    await this.db.updateEscrowStatus(escrowID, EscrowStatus.Shipped)
  }

  async releaseEscrow(escrowID: string) {
    const escrow = await this.db.getEscrow(escrowID)
    if (!escrow) throw new Error("Escrow not found")
    if (escrow.status !== EscrowStatus.Shipped) throw new Error("Order has not been shipped yet")

    await this.db.subtractBalance("escrow_pool", escrow.amount)
    await this.db.addBalance(escrow.sellerUserID, escrow.amount)

    await this.db.saveTransaction({
      transactionID: randomUUID(),
      fromAccountID: "escrow_pool",
      toAccountID: escrow.sellerUserID,
      amount: escrow.amount,
      type: TransactionType.Release,
      status: EscrowStatus.Released,
      createdAt: new Date(),
    })

    await this.db.updateEscrowStatus(escrowID, EscrowStatus.Released)
  }

  async refundEscrow(escrowID: string) {
    const escrow = await this.db.getEscrow(escrowID)
    if (!escrow) throw new Error("Escrow not found")
    if (escrow.status === EscrowStatus.Released) throw new Error("Escrow already released")
    if (escrow.status === EscrowStatus.Refunded) throw new Error("Escrow already refunded")

    await this.db.subtractBalance("escrow_pool", escrow.amount)
    await this.db.addBalance(escrow.buyerUserID, escrow.amount)

    await this.db.saveTransaction({
      transactionID: randomUUID(),
      fromAccountID: "escrow_pool",
      toAccountID: escrow.buyerUserID,
      amount: escrow.amount,
      type: TransactionType.Refund,
      status: EscrowStatus.Refunded,
      createdAt: new Date(),
    })

    await this.db.updateEscrowStatus(escrowID, EscrowStatus.Refunded)
  }
}