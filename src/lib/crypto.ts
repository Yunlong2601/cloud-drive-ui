// Web Crypto API utilities for file encryption/decryption

// Generate a random encryption key from a password/code
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt file content with a password/code
export async function encryptFile(
  fileContent: ArrayBuffer,
  password: string
): Promise<{ encrypted: ArrayBuffer; salt: Uint8Array; iv: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    fileContent
  );

  return { encrypted, salt, iv };
}

// Decrypt file content with a password/code
export async function decryptFile(
  encryptedContent: ArrayBuffer,
  password: string,
  salt: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encryptedContent
  );

  return decrypted;
}

// Create an encrypted file package (includes metadata for decryption)
export async function createEncryptedPackage(
  file: File,
  encryptionCode: string
): Promise<Blob> {
  const fileContent = await file.arrayBuffer();
  const { encrypted, salt, iv } = await encryptFile(fileContent, encryptionCode);

  // Create a package with metadata header
  const metadata = {
    fileName: file.name,
    mimeType: file.type,
    originalSize: file.size,
    encryptedAt: new Date().toISOString(),
  };

  const metadataJson = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataJson);
  const metadataLength = new Uint32Array([metadataBytes.length]);

  // Package format: [4 bytes metadata length][metadata][16 bytes salt][12 bytes iv][encrypted content]
  const packageBuffer = new Uint8Array(
    4 + metadataBytes.length + 16 + 12 + encrypted.byteLength
  );

  let offset = 0;
  packageBuffer.set(new Uint8Array(metadataLength.buffer), offset);
  offset += 4;
  packageBuffer.set(metadataBytes, offset);
  offset += metadataBytes.length;
  packageBuffer.set(salt, offset);
  offset += 16;
  packageBuffer.set(iv, offset);
  offset += 12;
  packageBuffer.set(new Uint8Array(encrypted), offset);

  return new Blob([packageBuffer], { type: "application/octet-stream" });
}

// Parse and decrypt an encrypted package
export async function decryptPackage(
  packageBlob: Blob,
  decryptionCode: string
): Promise<{ file: Blob; metadata: { fileName: string; mimeType: string; originalSize: number } }> {
  const buffer = await packageBlob.arrayBuffer();
  const view = new Uint8Array(buffer);

  // Read metadata length
  const metadataLength = new Uint32Array(buffer.slice(0, 4))[0];

  let offset = 4;

  // Read metadata
  const metadataBytes = view.slice(offset, offset + metadataLength);
  const metadataJson = new TextDecoder().decode(metadataBytes);
  const metadata = JSON.parse(metadataJson);
  offset += metadataLength;

  // Read salt
  const salt = view.slice(offset, offset + 16);
  offset += 16;

  // Read iv
  const iv = view.slice(offset, offset + 12);
  offset += 12;

  // Read encrypted content
  const encryptedContent = buffer.slice(offset);

  // Decrypt
  const decrypted = await decryptFile(encryptedContent, decryptionCode, salt, iv);

  return {
    file: new Blob([decrypted], { type: metadata.mimeType }),
    metadata: {
      fileName: metadata.fileName,
      mimeType: metadata.mimeType,
      originalSize: metadata.originalSize,
    },
  };
}

// Generate a 6-digit decryption code
export function generateDecryptionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
