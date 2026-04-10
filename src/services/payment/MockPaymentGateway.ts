import type { IPaymentGateway } from "./IPaymentGateway";

export class MockPaymentGateway implements IPaymentGateway {

  async charge(userId: string, amount: number): Promise<boolean> {
    console.log(`[MOCK] Charging ${userId} → ${amount}`);
    return true;
  }

  async refund(userId: string, amount: number): Promise<boolean> {
    console.log(`[MOCK] Refunding ${userId} → ${amount}`);
    return true;
  }
}