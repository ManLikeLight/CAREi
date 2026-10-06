import { db, familyAccess, pool } from "@workspace/db";
import { newCredential, hashCredential } from "../family-session";
import { SUPPORTED_FAMILY_MAPPING } from "../family-mapping";

// Trusted operator only: verify the recipient out of band before issuing.
// Never expose this command behind a staff HTTP endpoint.
if (!process.argv.includes("--recipient-verified")) {
  throw new Error("Verify the intended recipient first, then supply --recipient-verified.");
}
try {
  const code = newCredential();
  const mapping = SUPPORTED_FAMILY_MAPPING;
  await db.insert(familyAccess).values({
    inviteHash: hashCredential(code),
    clientId: mapping.clientId,
    familyMemberId: mapping.familyMemberId,
    familyMemberName: mapping.familyMemberName,
    inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  console.log("Deliver this one-time code privately to the verified recipient. Expires in 24 hours:");
  console.log(code);
} finally {
  await pool.end();
}
