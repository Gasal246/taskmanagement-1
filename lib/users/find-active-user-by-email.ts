import Users from "@/models/users.model";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Prefer the indexed, canonical lookup and fall back to a case-insensitive
 * match for legacy records that were saved before email normalization existed.
 */
export async function findActiveUserByEmail(email: string, selection: string): Promise<any | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const exactUser: any = await Users.findOne({ email: normalizedEmail, status: 1 }).select(selection).lean();
  if (exactUser) return exactUser;

  return Users.findOne({
    email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
    status: 1,
  }).select(selection).lean();
}
