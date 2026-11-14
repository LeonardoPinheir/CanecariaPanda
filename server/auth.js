import crypto from 'node:crypto';

const COOKIE = 'cp_sessao';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias
let fallbackSecret;

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  fallbackSecret ||= crypto.randomBytes(32).toString('hex');
  return fallbackSecret;
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function checkPassword(password, admin) {
  if (!admin?.hash || !admin?.salt) return false;
  const { hash } = hashPassword(password, admin.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(admin.hash, 'hex'));
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function makeSessionCookie(email, secure) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function readSession(cookieHeader = '') {
  const raw = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// Tentativas de login por IP, para dificultar adivinhação de senha.
const attempts = new Map();
export function tooManyAttempts(ip) {
  const a = attempts.get(ip);
  return a && a.count >= 8 && Date.now() - a.first < 15 * 60 * 1000;
}
export function registerFailure(ip) {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.first > 15 * 60 * 1000) attempts.set(ip, { count: 1, first: Date.now() });
  else a.count++;
}
export function clearFailures(ip) {
  attempts.delete(ip);
}
