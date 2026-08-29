const PREFIXES = Object.freeze({ member: "mk_", vip: "vk_" });

function assertTier(tier) {
  if (!(tier in PREFIXES)) throw new Error(`unsupported tier: ${tier}`);
  return tier;
}

function normalizeLabel(label) {
  if (typeof label !== "string") throw new Error("label must be a string");
  const normalized = label.trim();
  if (normalized.length < 1 || normalized.length > 80) {
    throw new Error("label must contain 1-80 characters");
  }
  return normalized;
}

function normalizeEntropy(entropy) {
  if (typeof entropy !== "string") throw new Error("entropy must be a string");
  const normalized = entropy.replace(/-/g, "").toLowerCase();
  if (!/^[a-z0-9]{16,}$/.test(normalized)) throw new Error("entropy must contain at least 16 alphanumeric characters");
  return normalized.slice(0, 16);
}

export function createManualKey(tier = "member", entropy = crypto.randomUUID()) {
  return `${PREFIXES[assertTier(tier)]}${normalizeEntropy(entropy)}`;
}

export function createManualKeyRecord(tier, label, created = new Date().toISOString()) {
  assertTier(tier);
  const normalizedLabel = normalizeLabel(label);
  if (typeof created !== "string" || Number.isNaN(Date.parse(created))) throw new Error("created must be a valid date string");
  return { tier, label: normalizedLabel, via: "manual", created };
}
