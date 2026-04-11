import { Request, Response, NextFunction } from "express"

const DEMO_USERS = {
  buyer: { userID: "buyer001", userName: "sourpatch", balance: 2000, lockedBalance: 0 },
  seller: { userID: "seller001", userName: "shopkeeper", balance: 0, lockedBalance: 0 },
}

export function demoAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const role = req.headers["x-demo-role"] === "seller" ? "seller" : "buyer"
  req.user = DEMO_USERS[role]
  next()
}