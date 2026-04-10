
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
        try {

            if (amount <= 0) throw new Error("Amount must be greater than 0")
            if (buyerUserID === sellerUserID) throw new Error("Buyer and seller cannot be the same")

            const charged = await this.payment.charge(buyerUserID, amount)
            if (!charged) throw new Error("Payment failed")

            const escrowID = randomUUID()
            const transactionID = randomUUID()

            await this.db.saveTransaction({
                transactionID: transactionID,
                fromAccountID: buyerUserID,
                toAccountID: "escrow_pool",
                amount: amount,
                type: TransactionType.Hold,
                status: EscrowStatus.Held,
                createdAt: new Date(),
            })

            await this.db.saveEscrow({
                escrowID: escrowID,
                buyerUserID: buyerUserID,
                sellerUserID: sellerUserID,
                transactionID: transactionID,
                amount: amount,
                status: EscrowStatus.Pending,
                createdAt: new Date()
            })

            await this.db.subtractBalance(buyerUserID, amount)
            await this.db.addBalance("escrow_pool", amount)

            return escrowID

        } catch (error) {
            console.error(error)
            throw error
        }
    }

    async releaseEscrow(escrowID: string) {
        try {
            const escrow = await this.db.getEscrow(escrowID)
            if (!escrow) throw new Error("Escrow not found")

            await this.db.subtractBalance("escrow_pool", escrow.amount)
            await this.db.addBalance(escrow.sellerUserID, escrow.amount)

            await this.db.saveTransaction({
                transactionID: crypto.randomUUID(),
                fromAccountID: "escrow_pool",
                toAccountID: escrow.sellerUserID,
                amount: escrow.amount,
                type: TransactionType.Release,
                status: EscrowStatus.Released,
                createdAt: new Date(),
            })

            await this.db.updateEscrowStatus(escrowID, EscrowStatus.Released)

        } catch (error) {
            console.error(error)
            throw error
        }
    }

    async refundEscrow(escrowID: string) {
        const escrow = await this.db.getEscrow(escrowID)
        if (!escrow) throw new Error("Escrow not found")

        await this.db.subtractBalance("escrow_pool", escrow.amount)
        await this.db.addBalance(escrow.buyerUserID, escrow.amount)

        await this.db.saveTransaction({
            transactionID: crypto.randomUUID(),
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