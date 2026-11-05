declare module 'express-serve-static-core' {
  interface Request {
    /** Authenticated user's id, set by `requireAuth` from the verified JWT. */
    userId?: string;
  }
}

export {};
