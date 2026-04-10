export interface IPaymentGateway {
  charge(userId: string, amount: number): Promise<boolean>;
  refund(userId: string, amount: number): Promise<boolean>;
}