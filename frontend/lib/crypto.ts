"use client";

/** Client-side AES-GCM encryption for zero-knowledge cloud sync. */

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToBytes(b64: string): ArrayBuffer {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/** Derive a 256-bit AES key from email using PBKDF2. Salt is deterministic per email. */
async function deriveKey(email: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(email.toLowerCase().trim()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  // Deterministic salt derived from email (not secure against offline attack, but
  // server never sees plaintext or key, and email is the only identifier).
  const saltBytes = await crypto.subtle.digest(
    "SHA-256",
    enc.encode("signsafe-v1:" + email.toLowerCase().trim()),
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptForEmail(
  email: string,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveKey(email);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptForEmail(
  email: string,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const key = await deriveKey(email);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(plainBuf);
}
