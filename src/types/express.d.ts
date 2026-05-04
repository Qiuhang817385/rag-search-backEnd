import type { User } from '../users/users.service';
type AuthedUser = Omit<User, 'passwordHash'>;
declare global {
  namespace Express {
    interface Request {
      /** 由 SessionGuard 在通过鉴权后挂载 */
      user?: AuthedUser;
    }
  }
}
export {};
