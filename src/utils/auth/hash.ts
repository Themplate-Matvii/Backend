import bcrypt from "bcrypt";

const saltRounds = Number(process.env.SALT_ROUNDS) || 10;

/**
 * Hash a plain text password.
 * @param password - The plain text password to hash.
 * @returns A promise resolving to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed one.
 * @param password - The plain text password to check.
 * @param hashedPassword - The hashed password to compare against.
 * @returns A promise resolving to true if they match, false otherwise.
 */
export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
