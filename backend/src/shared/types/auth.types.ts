export type UserRole =
  | "admin"
  | "manager"
  | "staff"
  | "customer"
  | "supplier"
  | "driver";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
