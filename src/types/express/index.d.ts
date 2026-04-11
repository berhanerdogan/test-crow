import express from 'express';
import 'express-serve-static-core'

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
