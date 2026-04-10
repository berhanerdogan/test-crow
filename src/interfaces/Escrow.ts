import { EscrowStatus } from "../enums/EscrowStatus";

export interface Escrow {
  escrowID: string;             
  buyerUserID: string;        
  sellerUserID: string;
  transactionID: string       
  amount: number;        
  status: EscrowStatus;   
  createdAt: Date;        
  updatedAt?: Date;
}