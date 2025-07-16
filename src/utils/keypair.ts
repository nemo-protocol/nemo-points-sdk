import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/**
 * Convert hexadecimal string to Uint8Array
 * @param hex hexadecimal string
 * @returns Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Create Ed25519Keypair from hexadecimal private key string
 * @param privateKeyHex hexadecimal private key string, can include or exclude 0x prefix
 * @returns Ed25519Keypair instance
 */
export function createKeypairFromHex(privateKeyHex: string): Ed25519Keypair {
  // Remove 0x prefix (if exists)
  const cleanHex = privateKeyHex.startsWith("0x")
    ? privateKeyHex.slice(2)
    : privateKeyHex;

  // Validate hexadecimal string length (should be 64 characters, i.e., 32 bytes)
  if (cleanHex.length !== 64) {
    throw new Error(
      `Invalid private key length: expected 64 hex characters, got ${cleanHex.length}`
    );
  }

  // Validate if it's a valid hexadecimal string
  if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
    throw new Error(
      "Invalid private key format: must be a valid hexadecimal string"
    );
  }

  try {
    const privateKeyBytes = hexToBytes(cleanHex);
    return Ed25519Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Failed to create keypair from private key: ${error}`);
  }
}

/**
 * Get Sui address corresponding to keypair
 * @param keypair Ed25519Keypair instance
 * @returns Sui address string
 */
export function getAddressFromKeypair(keypair: Ed25519Keypair): string {
  return keypair.getPublicKey().toSuiAddress();
}
