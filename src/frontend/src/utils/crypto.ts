/**
 * Utility function to hash a string using SHA-256 via the SubtleCrypto API.
 * Returns the hash as a lowercase hex string.
 */
export async function hashWithSHA256(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
