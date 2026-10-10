import { DEFAULT_CATEGORIES } from "../categories/categories";
import { LIMITS, OTHER_CATEGORY_ID, STORAGE_KEYS } from "../constants";
import { asBool, asString, clampInt, isRecord } from "../utils/guards";
import { normalizeDomainInput } from "../utils/url";
import type {
  Category,
  CategoryKind,
  Settings,
  SiteLimit,
} from "../types/settings";
import { readValue, withStorageLock, writeValue } from "./storage";

export const createDefaultSettings = (): Settings => ({
  categories: structuredClone(DEFAULT_CATEGORIES),
  siteLimits: [],
  tracking: {
    enabled: true,
    idleSeconds: 60,
    countAudibleWhileIdle: true,
    retentionDays: 90,
  },
  warnings: {
    enabled: true,
    notifications: true,
    levels: [80, 100],
    mentionOpenTasks: true,
  },
  todos: { carryOverIncomplete: true, keepCompletedDays: 30 },
});

const KINDS: CategoryKind[] = ["productive", "distracting", "neutral"];

function sanitizeLevels(raw: unknown): number[] {
  const list = Array.isArray(raw) ? raw : [];
  const levels = list.filter(
    (v): v is number =>
      typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 100,
  );
  return [...new Set([...levels, 100])].sort((a, b) => a - b);
}

function sanitizeCategory(raw: unknown): Category | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id).trim();
  const name = asString(raw.name).trim();
  if (!id || !name) return null;
  const domains = Array.isArray(raw.domains)
    ? [
        ...new Set(
          raw.domains
            .map((d) => normalizeDomainInput(asString(d)))
            .filter((d): d is string => d !== null),
        ),
      ]
    : [];
  const limit = raw.dailyLimitMin;
  return {
    id,
    name,
    kind: KINDS.includes(raw.kind as CategoryKind)
      ? (raw.kind as CategoryKind)
      : "neutral",
    domains: id === OTHER_CATEGORY_ID ? [] : domains,
    dailyLimitMin:
      typeof limit === "number" && Number.isFinite(limit)
        ? clampInt(
            limit,
            LIMITS.dailyLimitMin.min,
            LIMITS.dailyLimitMin.max,
            60,
          )
        : null,
  };
}

function sanitizeSiteLimits(raw: unknown): SiteLimit[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: SiteLimit[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const domain = normalizeDomainInput(asString(item.domain));
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    result.push({
      domain,
      dailyLimitMin: clampInt(
        item.dailyLimitMin,
        LIMITS.dailyLimitMin.min,
        LIMITS.dailyLimitMin.max,
        30,
      ),
    });
  }
  return result;
}

/** Turns anything (undefined, old versions, corrupted data) into a valid Settings object. */
export function sanitizeSettings(raw: unknown): Settings {
  const defaults = createDefaultSettings();
  if (!isRecord(raw)) return defaults;
  const tracking = isRecord(raw.tracking) ? raw.tracking : {};
  const warnings = isRecord(raw.warnings) ? raw.warnings : {};
  const todos = isRecord(raw.todos) ? raw.todos : {};

  const seen = new Set<string>();
  let categories = (Array.isArray(raw.categories) ? raw.categories : [])
    .map(sanitizeCategory)
    .filter(
      (c): c is Category => c !== null && !seen.has(c.id) && !!seen.add(c.id),
    );
  if (categories.length === 0) categories = defaults.categories;
  if (!categories.some((c) => c.id === OTHER_CATEGORY_ID)) {
    categories = [
      ...categories,
      defaults.categories.find((c) => c.id === OTHER_CATEGORY_ID)!,
    ];
  }

  return {
    categories,
    siteLimits: sanitizeSiteLimits(raw.siteLimits),
    tracking: {
      enabled: asBool(tracking.enabled, defaults.tracking.enabled),
      idleSeconds: clampInt(
        tracking.idleSeconds,
        LIMITS.idleSeconds.min,
        LIMITS.idleSeconds.max,
        defaults.tracking.idleSeconds,
      ),
      countAudibleWhileIdle: asBool(
        tracking.countAudibleWhileIdle,
        defaults.tracking.countAudibleWhileIdle,
      ),
      retentionDays: clampInt(
        tracking.retentionDays,
        LIMITS.retentionDays.min,
        LIMITS.retentionDays.max,
        defaults.tracking.retentionDays,
      ),
    },
    warnings: {
      enabled: asBool(warnings.enabled, defaults.warnings.enabled),
      notifications: asBool(
        warnings.notifications,
        defaults.warnings.notifications,
      ),
      levels:
        "levels" in warnings
          ? sanitizeLevels(warnings.levels)
          : defaults.warnings.levels,
      mentionOpenTasks: asBool(
        warnings.mentionOpenTasks,
        defaults.warnings.mentionOpenTasks,
      ),
    },
    todos: {
      carryOverIncomplete: asBool(
        todos.carryOverIncomplete,
        defaults.todos.carryOverIncomplete,
      ),
      keepCompletedDays: clampInt(
        todos.keepCompletedDays,
        LIMITS.keepCompletedDays.min,
        LIMITS.keepCompletedDays.max,
        defaults.todos.keepCompletedDays,
      ),
    },
  };
}

/** Human-readable problems with a draft; empty array means it can be saved. */
export function validateSettings(s: Settings): string[] {
  const errors: string[] = [];
  const inRange = (v: number, r: { min: number; max: number }) =>
    Number.isInteger(v) && v >= r.min && v <= r.max;
  const { idleSeconds, retentionDays, dailyLimitMin, keepCompletedDays } =
    LIMITS;
  if (!inRange(s.tracking.idleSeconds, idleSeconds))
    errors.push(
      `Idle timeout must be ${idleSeconds.min}-${idleSeconds.max} seconds.`,
    );
  if (!inRange(s.tracking.retentionDays, retentionDays))
    errors.push(
      `History must be kept ${retentionDays.min}-${retentionDays.max} days.`,
    );
  if (!inRange(s.todos.keepCompletedDays, keepCompletedDays))
    errors.push(
      `Completed tasks must be kept ${keepCompletedDays.min}-${keepCompletedDays.max} days.`,
    );
  for (const c of s.categories) {
    if (c.dailyLimitMin !== null && !inRange(c.dailyLimitMin, dailyLimitMin))
      errors.push(
        `${c.name}: limit must be ${dailyLimitMin.min}-${dailyLimitMin.max} minutes.`,
      );
  }
  for (const l of s.siteLimits) {
    if (!inRange(l.dailyLimitMin, dailyLimitMin))
      errors.push(
        `${l.domain}: limit must be ${dailyLimitMin.min}-${dailyLimitMin.max} minutes.`,
      );
  }
  if (s.warnings.levels.some((v) => !Number.isInteger(v) || v < 1 || v > 100))
    errors.push("Warning levels must be whole numbers from 1 to 100.");
  return errors;
}

export const getSettings = (): Promise<Settings> =>
  readValue(STORAGE_KEYS.settings, sanitizeSettings);

/** Sanitises before writing so invalid values can never reach storage. */
export const saveSettings = (settings: Settings): Promise<boolean> =>
  withStorageLock(() =>
    writeValue(STORAGE_KEYS.settings, sanitizeSettings(settings)),
  );

export const resetSettings = (): Promise<boolean> =>
  saveSettings(createDefaultSettings());
