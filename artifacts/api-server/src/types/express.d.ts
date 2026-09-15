declare global {
  namespace Express {
    interface Request {
      /** Raw request body bytes, captured by express.json()'s verify hook —
       *  needed to check webhook HMAC signatures (Razorpay, etc.), since the
       *  parsed/re-serialized JSON body is not guaranteed to byte-match what
       *  the sender signed. */
      rawBody?: Buffer;
    }
  }
}

export {};
