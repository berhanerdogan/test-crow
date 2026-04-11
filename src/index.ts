import express from "express"
import bodyParser from "body-parser"
import { EscrowService } from "./services/EscrowService"
import { MockPaymentGateway } from "./services/payment/MockPaymentGateway"
import { SQLiteAdapter } from "./adapters/SQLiteAdapter"

const app = express()
app.use(bodyParser.json())
app.use(express.static("public"))

// Demo users — in a real app this comes from auth middleware
const DEMO_USERS = {
  buyer: { userID: "buyer001", userName: "sourpatch", balance: 2000, lockedBalance: 0 },
  seller: { userID: "seller001", userName: "shopkeeper", balance: 0, lockedBalance: 0 },
}

app.use((req, res, next) => {
  const role = req.headers["x-demo-role"] === "seller" ? "seller" : "buyer"
  req.user = DEMO_USERS[role]
  next()
})

const db = new SQLiteAdapter()
const paymentGateway = new MockPaymentGateway()
const escrowService = new EscrowService(db, paymentGateway)

// Seed buyer balance on start if not exists
db.getBalance("buyer001").then(b => {
  if (b === 0) db.addBalance("buyer001", 2000)
})

// Create escrow
app.post("/escrow/create", async (req, res) => {
  const { product } = req.body
  const buyer = req.user!.userID
  const seller = product.seller_id
  const amount = product.price
  try {
    const escrowID = await escrowService.createEscrow(buyer, seller, Number(amount))
    res.json({ success: true, escrowID })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

// Ship escrow (seller only)
app.post("/escrow/ship", async (req, res) => {
  const { escrowID } = req.body
  const seller = req.user!.userID
  try {
    await escrowService.shipEscrow(escrowID, seller)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

// Release escrow (buyer confirms delivery)
app.post("/escrow/release", async (req, res) => {
  const { escrowID } = req.body
  try {
    await escrowService.releaseEscrow(escrowID)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

// Refund escrow
app.post("/escrow/refund", async (req, res) => {
  const { escrowID } = req.body
  try {
    await escrowService.refundEscrow(escrowID)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

// Get escrows for seller
app.get("/escrow/seller", async (req, res) => {
  const seller = req.user!.userID
  try {
    const escrows = await db.getEscrowsBySeller(seller)
    res.json({ escrows })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

// Get escrows for buyer
app.get("/escrow/buyer", async (req, res) => {
  const buyer = req.user!.userID
  try {
    const escrows = await db.getEscrowsByBuyer(buyer)
    res.json({ escrows })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

// Ledger
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

// Top-up
app.post("/ledger/topup", (req, res) => {
  const { userID, amount } = req.body
  db.addBalance(userID, Number(amount))
  res.json({ success: true })
})

// Products
app.get("/products", async (req, res) => {
  try {
    res.json({ products: await db.getAllProducts() })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

app.listen(3000, () => console.log("Server running on http://localhost:3000"))