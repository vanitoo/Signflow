import { describe, expect, it } from "vitest";
import { decryptBytesWithPassword, encryptBytesWithPassword } from "./password-encryption";

describe("password encryption", () => {
  it("restores the original bytes with the correct password", async () => {
    const original = new TextEncoder().encode("Тестовый документ SignFlow");
    const container = await encryptBytesWithPassword(original, "correct-password");
    const decrypted = await decryptBytesWithPassword(container, "correct-password");

    expect(decrypted).toEqual(original);
    expect(container.data).not.toContain("Тестовый документ");
  });

  it("rejects an incorrect password", async () => {
    const container = await encryptBytesWithPassword(new Uint8Array([1, 2, 3]), "correct-password");
    await expect(decryptBytesWithPassword(container, "wrong-password")).rejects.toThrow();
  });

  it("rejects passwords shorter than eight characters", async () => {
    await expect(encryptBytesWithPassword(new Uint8Array([1]), "short")).rejects.toThrow(
      "не менее 8 символов",
    );
  });
});
