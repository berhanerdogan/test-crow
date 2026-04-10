
import { EscrowStatus } from "../enums/EscrowStatus"
import { TransactionType } from "../enums/TransactionType"

export interface Transaction {
    transactionID: string
    fromAccountID: string
    toAccountID: string
    amount: number
    type: TransactionType
    status: EscrowStatus
    createdAt: Date;
}
