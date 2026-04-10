import express from "express"
import bodyParser from "body-parser"
import { EscrowService } from "./services/EscrowService"
import { MockPaymentGateway } from "./services/payment/MockPaymentGateway"
import { SQLiteAdapter } from "./adapters/SQLiteAdapter"


const app = express()
app.use(bodyParser.json())
app.use(express.static("public"))


const db = new SQLiteAdapter()

// services
const paymentGateway = new MockPaymentGateway()
const escrowService = new EscrowService(db, paymentGateway)

// create escrow 
app.post("/escrow/create", async (req, res) => {
    const { buyer, seller, amount } = req.body
    try {
        const escrowID = await escrowService.createEscrow(buyer, seller, Number(amount))
        res.json({ success: true, escrowID })
    } catch (e: any) {
        res.status(400).json({ success: false, message: e.message })
    }
})

// escrow release
app.post("/escrow/release", async (req, res) => {
    const { escrowID } = req.body
    try {
        await escrowService.releaseEscrow(escrowID)
        res.json({ success: true })
    } catch (e: any) {
        res.status(400).json({ success: false, message: e.message })
    }
})

// escrow refund
app.post("/escrow/refund", async (req, res) => {
    const { escrowID } = req.body
    try {
        await escrowService.refundEscrow(escrowID)
        res.json({ success: true })
    } catch (e: any) {
        res.status(400).json({ success: false, message: e.message })
    }
})

// balance and transactions
app.get("/ledger", async (req, res) => {
    try {
        res.json({
            balances: await db.getAllBalances(),
            transactions: await db.getTransactions()
        })
    } catch (e: any) {
        res.status(400).json({ success: false, message: e.message })
    }
})

// top-up balance
app.post("/ledger/topup", (req, res) => {
    const { userID, amount } = req.body

    db.addBalance(userID, Number(amount))

    res.json({ success: true })
})

app.listen(3000, () => console.log("Server running on http://localhost:3000"))