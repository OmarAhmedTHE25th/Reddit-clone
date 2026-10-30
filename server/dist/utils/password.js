import bcrypt from 'bcrypt';
// 12 salt rounds balances strong brute-force resistance with responsive login times (~250ms)
const SALT_ROUNDS = 12;
export async function hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}
export async function verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
}
