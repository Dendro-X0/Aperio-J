import { prisma } from "@aperio-j/db";

export const LOCAL_SETTING_KEYS = {
  adzunaAppId: "connector.adzuna.appId",
  adzunaAppKey: "connector.adzuna.appKey",
  reedApiKey: "connector.reed.apiKey",
  usajobsApiKey: "connector.usajobs.apiKey",
  usajobsEmail: "connector.usajobs.email",
  franceTravailClientId: "connector.francetravail.clientId",
  franceTravailClientSecret: "connector.francetravail.clientSecret",
  worknetAuthKey: "connector.worknet.authKey",
  careerjetApiKey: "connector.careerjet.apiKey",
  joobleApiKey: "connector.jooble.apiKey",
  cnZhipinCookie: "cnSession.zhipin.com",
  cnZhaopinCookie: "cnSession.zhaopin.com",
  cn58Cookie: "cnSession.58.com",
} as const;

export interface AdzunaCredentialSettings {
  appId: string;
  appKey: string;
  configured: boolean;
  hasAppKey: boolean;
}

export interface ReedCredentialSettings {
  configured: boolean;
  hasApiKey: boolean;
}

export interface UsajobsCredentialSettings {
  email: string;
  configured: boolean;
  hasApiKey: boolean;
}

export interface FranceTravailCredentialSettings {
  clientId: string;
  configured: boolean;
  hasClientSecret: boolean;
}

export interface WorknetCredentialSettings {
  configured: boolean;
  hasAuthKey: boolean;
}

export interface CareerjetCredentialSettings {
  configured: boolean;
  hasApiKey: boolean;
}

export interface JoobleCredentialSettings {
  configured: boolean;
  hasApiKey: boolean;
}

export interface CnSessionCredentialSettings {
  zhipinCookie: string;
  zhaopinCookie: string;
  cookie58: string;
  configured: boolean;
  hasZhipinCookie: boolean;
  hasZhaopinCookie: boolean;
  has58Cookie: boolean;
}

export interface ConnectorCredentialSettings {
  adzuna: AdzunaCredentialSettings;
  reed: ReedCredentialSettings;
  usajobs: UsajobsCredentialSettings;
  franceTravail: FranceTravailCredentialSettings;
  worknet: WorknetCredentialSettings;
  careerjet: CareerjetCredentialSettings;
  jooble: JoobleCredentialSettings;
}

const ALL_KEYS = Object.values(LOCAL_SETTING_KEYS);

async function loadSettingMap(profileId: string): Promise<Map<string, string>> {
  const rows = await prisma.profileLocalSetting.findMany({
    where: {
      seekerProfileId: profileId,
      key: { in: ALL_KEYS },
    },
  });

  return new Map(rows.map((row: { key: string; value: string }) => [row.key, row.value]));
}

async function upsertLocalSetting(profileId: string, key: string, value: string): Promise<void> {
  if (!value) {
    await prisma.profileLocalSetting.deleteMany({
      where: { seekerProfileId: profileId, key },
    });
    return;
  }

  await prisma.profileLocalSetting.upsert({
    where: {
      seekerProfileId_key: {
        seekerProfileId: profileId,
        key,
      },
    },
    create: {
      seekerProfileId: profileId,
      key,
      value,
    },
    update: {
      value,
    },
  });
}

export async function loadAdzunaCredentialSettings(
  profileId: string,
): Promise<AdzunaCredentialSettings> {
  const byKey = await loadSettingMap(profileId);
  const appId = byKey.get(LOCAL_SETTING_KEYS.adzunaAppId)?.trim() ?? "";
  const appKey = byKey.get(LOCAL_SETTING_KEYS.adzunaAppKey)?.trim() ?? "";

  return {
    appId,
    appKey,
    configured: Boolean(appId && appKey),
    hasAppKey: Boolean(appKey),
  };
}

export async function loadConnectorCredentialSettings(
  profileId: string,
): Promise<ConnectorCredentialSettings> {
  const byKey = await loadSettingMap(profileId);
  const adzunaAppId = byKey.get(LOCAL_SETTING_KEYS.adzunaAppId)?.trim() ?? "";
  const adzunaAppKey = byKey.get(LOCAL_SETTING_KEYS.adzunaAppKey)?.trim() ?? "";
  const reedApiKey = byKey.get(LOCAL_SETTING_KEYS.reedApiKey)?.trim() ?? "";
  const usajobsApiKey = byKey.get(LOCAL_SETTING_KEYS.usajobsApiKey)?.trim() ?? "";
  const usajobsEmail = byKey.get(LOCAL_SETTING_KEYS.usajobsEmail)?.trim() ?? "";
  const franceTravailClientId =
    byKey.get(LOCAL_SETTING_KEYS.franceTravailClientId)?.trim() ?? "";
  const franceTravailClientSecret =
    byKey.get(LOCAL_SETTING_KEYS.franceTravailClientSecret)?.trim() ?? "";
  const worknetAuthKey = byKey.get(LOCAL_SETTING_KEYS.worknetAuthKey)?.trim() ?? "";
  const careerjetApiKey = byKey.get(LOCAL_SETTING_KEYS.careerjetApiKey)?.trim() ?? "";
  const joobleApiKey = byKey.get(LOCAL_SETTING_KEYS.joobleApiKey)?.trim() ?? "";

  return {
    adzuna: {
      appId: adzunaAppId,
      appKey: adzunaAppKey,
      configured: Boolean(adzunaAppId && adzunaAppKey),
      hasAppKey: Boolean(adzunaAppKey),
    },
    reed: {
      configured: Boolean(reedApiKey),
      hasApiKey: Boolean(reedApiKey),
    },
    usajobs: {
      email: usajobsEmail,
      configured: Boolean(usajobsApiKey && usajobsEmail),
      hasApiKey: Boolean(usajobsApiKey),
    },
    franceTravail: {
      clientId: franceTravailClientId,
      configured: Boolean(franceTravailClientId && franceTravailClientSecret),
      hasClientSecret: Boolean(franceTravailClientSecret),
    },
    worknet: {
      configured: Boolean(worknetAuthKey),
      hasAuthKey: Boolean(worknetAuthKey),
    },
    careerjet: {
      configured: Boolean(careerjetApiKey),
      hasApiKey: Boolean(careerjetApiKey),
    },
    jooble: {
      configured: Boolean(joobleApiKey),
      hasApiKey: Boolean(joobleApiKey),
    },
  };
}

export async function saveAdzunaCredentialSettings(
  profileId: string,
  input: { appId?: string; appKey?: string | null },
): Promise<AdzunaCredentialSettings> {
  const current = await loadAdzunaCredentialSettings(profileId);
  const nextAppId = input.appId?.trim() ?? current.appId;
  const nextAppKey =
    input.appKey === null ? "" : input.appKey !== undefined ? input.appKey.trim() : current.appKey;

  await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.adzunaAppId, nextAppId);
  await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.adzunaAppKey, nextAppKey);

  return loadAdzunaCredentialSettings(profileId);
}

export async function saveConnectorCredentialSettings(
  profileId: string,
  input: {
    adzuna?: { appId?: string; appKey?: string | null };
    reed?: { apiKey?: string | null };
    usajobs?: { apiKey?: string | null; email?: string };
    franceTravail?: { clientId?: string; clientSecret?: string | null };
    worknet?: { authKey?: string | null };
    careerjet?: { apiKey?: string | null };
    jooble?: { apiKey?: string | null };
  },
): Promise<ConnectorCredentialSettings> {
  if (input.adzuna) {
    await saveAdzunaCredentialSettings(profileId, input.adzuna);
  }

  if (input.reed) {
    if (input.reed.apiKey === null) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.reedApiKey, "");
    } else if (input.reed.apiKey !== undefined) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.reedApiKey, input.reed.apiKey.trim());
    }
  }

  if (input.usajobs) {
    if (input.usajobs.email !== undefined) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.usajobsEmail, input.usajobs.email.trim());
    }
    if (input.usajobs.apiKey === null) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.usajobsApiKey, "");
    } else if (input.usajobs.apiKey !== undefined) {
      await upsertLocalSetting(
        profileId,
        LOCAL_SETTING_KEYS.usajobsApiKey,
        input.usajobs.apiKey.trim(),
      );
    }
  }

  if (input.franceTravail) {
    if (input.franceTravail.clientId !== undefined) {
      await upsertLocalSetting(
        profileId,
        LOCAL_SETTING_KEYS.franceTravailClientId,
        input.franceTravail.clientId.trim(),
      );
    }
    if (input.franceTravail.clientSecret === null) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.franceTravailClientSecret, "");
    } else if (input.franceTravail.clientSecret !== undefined) {
      await upsertLocalSetting(
        profileId,
        LOCAL_SETTING_KEYS.franceTravailClientSecret,
        input.franceTravail.clientSecret.trim(),
      );
    }
  }

  if (input.worknet) {
    if (input.worknet.authKey === null) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.worknetAuthKey, "");
    } else if (input.worknet.authKey !== undefined) {
      await upsertLocalSetting(
        profileId,
        LOCAL_SETTING_KEYS.worknetAuthKey,
        input.worknet.authKey.trim(),
      );
    }
  }

  if (input.careerjet) {
    if (input.careerjet.apiKey === null) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.careerjetApiKey, "");
    } else if (input.careerjet.apiKey !== undefined) {
      await upsertLocalSetting(
        profileId,
        LOCAL_SETTING_KEYS.careerjetApiKey,
        input.careerjet.apiKey.trim(),
      );
    }
  }

  if (input.jooble) {
    if (input.jooble.apiKey === null) {
      await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.joobleApiKey, "");
    } else if (input.jooble.apiKey !== undefined) {
      await upsertLocalSetting(
        profileId,
        LOCAL_SETTING_KEYS.joobleApiKey,
        input.jooble.apiKey.trim(),
      );
    }
  }

  return loadConnectorCredentialSettings(profileId);
}

export async function loadCnSessionCredentialSettings(
  profileId: string,
): Promise<CnSessionCredentialSettings> {
  const byKey = await loadSettingMap(profileId);
  const zhipinCookie = byKey.get(LOCAL_SETTING_KEYS.cnZhipinCookie)?.trim() ?? "";
  const zhaopinCookie = byKey.get(LOCAL_SETTING_KEYS.cnZhaopinCookie)?.trim() ?? "";
  const cookie58 = byKey.get(LOCAL_SETTING_KEYS.cn58Cookie)?.trim() ?? "";

  return {
    zhipinCookie,
    zhaopinCookie,
    cookie58,
    configured: Boolean(zhipinCookie || zhaopinCookie || cookie58),
    hasZhipinCookie: Boolean(zhipinCookie),
    hasZhaopinCookie: Boolean(zhaopinCookie),
    has58Cookie: Boolean(cookie58),
  };
}

export async function saveCnSessionCredentialSettings(
  profileId: string,
  input: {
    zhipinCookie?: string | null;
    zhaopinCookie?: string | null;
    cookie58?: string | null;
  },
): Promise<CnSessionCredentialSettings> {
  const current = await loadCnSessionCredentialSettings(profileId);

  const nextZhipin =
    input.zhipinCookie === null
      ? ""
      : input.zhipinCookie !== undefined
        ? input.zhipinCookie.trim()
        : current.zhipinCookie;
  const nextZhaopin =
    input.zhaopinCookie === null
      ? ""
      : input.zhaopinCookie !== undefined
        ? input.zhaopinCookie.trim()
        : current.zhaopinCookie;
  const next58 =
    input.cookie58 === null
      ? ""
      : input.cookie58 !== undefined
        ? input.cookie58.trim()
        : current.cookie58;

  await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.cnZhipinCookie, nextZhipin);
  await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.cnZhaopinCookie, nextZhaopin);
  await upsertLocalSetting(profileId, LOCAL_SETTING_KEYS.cn58Cookie, next58);

  return loadCnSessionCredentialSettings(profileId);
}

export function publicCnSessionCredentialSettings(
  settings: CnSessionCredentialSettings,
): CnSessionCredentialSettings {
  return {
    zhipinCookie: "",
    zhaopinCookie: "",
    cookie58: "",
    configured: settings.configured,
    hasZhipinCookie: settings.hasZhipinCookie,
    hasZhaopinCookie: settings.hasZhaopinCookie,
    has58Cookie: settings.has58Cookie,
  };
}

type ConnectorEnvSnapshot = Record<string, string | undefined>;

function readConnectorEnv(): ConnectorEnvSnapshot {
  return {
    APERO_J_ADZUNA_APP_ID: process.env.APERO_J_ADZUNA_APP_ID,
    APERO_J_ADZUNA_APP_KEY: process.env.APERO_J_ADZUNA_APP_KEY,
    APERO_J_REED_API_KEY: process.env.APERO_J_REED_API_KEY,
    APERO_J_USAJOBS_API_KEY: process.env.APERO_J_USAJOBS_API_KEY,
    APERO_J_USAJOBS_EMAIL: process.env.APERO_J_USAJOBS_EMAIL,
    APERO_J_FRANCE_TRAVAIL_CLIENT_ID: process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_ID,
    APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET: process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET,
    APERO_J_WORKNET_AUTH_KEY: process.env.APERO_J_WORKNET_AUTH_KEY,
    APERO_J_CAREERJET_API_KEY: process.env.APERO_J_CAREERJET_API_KEY,
    APERO_J_JOOBLE_API_KEY: process.env.APERO_J_JOOBLE_API_KEY,
  };
}

function applyConnectorEnv(values: Partial<Record<keyof ConnectorEnvSnapshot, string>>): ConnectorEnvSnapshot {
  const previous = readConnectorEnv();
  for (const [key, value] of Object.entries(values) as Array<
    [keyof ConnectorEnvSnapshot, string | undefined]
  >) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return previous;
}

function restoreConnectorEnv(previous: ConnectorEnvSnapshot): void {
  for (const [key, value] of Object.entries(previous) as Array<
    [keyof ConnectorEnvSnapshot, string | undefined]
  >) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

export async function resolveAdzunaCredentialsForProfile(profileId: string): Promise<{
  appId: string;
  appKey: string;
} | null> {
  const envId = process.env.APERO_J_ADZUNA_APP_ID?.trim();
  const envKey = process.env.APERO_J_ADZUNA_APP_KEY?.trim();
  if (envId && envKey) {
    return { appId: envId, appKey: envKey };
  }

  const local = await loadAdzunaCredentialSettings(profileId);
  if (local.configured) {
    return { appId: local.appId, appKey: local.appKey };
  }

  return null;
}

async function resolveConnectorEnvOverrides(profileId: string): Promise<
  Partial<Record<keyof ConnectorEnvSnapshot, string>>
> {
  const settings = await loadConnectorCredentialSettings(profileId);
  const overrides: Partial<Record<keyof ConnectorEnvSnapshot, string>> = {};

  const adzunaEnvId = process.env.APERO_J_ADZUNA_APP_ID?.trim();
  const adzunaEnvKey = process.env.APERO_J_ADZUNA_APP_KEY?.trim();
  if (!adzunaEnvId || !adzunaEnvKey) {
    if (settings.adzuna.configured) {
      overrides.APERO_J_ADZUNA_APP_ID = settings.adzuna.appId;
      overrides.APERO_J_ADZUNA_APP_KEY = settings.adzuna.appKey;
    }
  }

  if (!process.env.APERO_J_REED_API_KEY?.trim() && settings.reed.configured) {
    const byKey = await loadSettingMap(profileId);
    const apiKey = byKey.get(LOCAL_SETTING_KEYS.reedApiKey)?.trim();
    if (apiKey) overrides.APERO_J_REED_API_KEY = apiKey;
  }

  if (
    (!process.env.APERO_J_USAJOBS_API_KEY?.trim() || !process.env.APERO_J_USAJOBS_EMAIL?.trim()) &&
    settings.usajobs.configured
  ) {
    const byKey = await loadSettingMap(profileId);
    const apiKey = byKey.get(LOCAL_SETTING_KEYS.usajobsApiKey)?.trim();
    const email = byKey.get(LOCAL_SETTING_KEYS.usajobsEmail)?.trim();
    if (apiKey && email) {
      overrides.APERO_J_USAJOBS_API_KEY = apiKey;
      overrides.APERO_J_USAJOBS_EMAIL = email;
    }
  }

  if (
    (!process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_ID?.trim() ||
      !process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET?.trim()) &&
    settings.franceTravail.configured
  ) {
    const byKey = await loadSettingMap(profileId);
    const clientId = byKey.get(LOCAL_SETTING_KEYS.franceTravailClientId)?.trim();
    const clientSecret = byKey.get(LOCAL_SETTING_KEYS.franceTravailClientSecret)?.trim();
    if (clientId && clientSecret) {
      overrides.APERO_J_FRANCE_TRAVAIL_CLIENT_ID = clientId;
      overrides.APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET = clientSecret;
    }
  }

  if (!process.env.APERO_J_WORKNET_AUTH_KEY?.trim() && settings.worknet.configured) {
    const byKey = await loadSettingMap(profileId);
    const authKey = byKey.get(LOCAL_SETTING_KEYS.worknetAuthKey)?.trim();
    if (authKey) overrides.APERO_J_WORKNET_AUTH_KEY = authKey;
  }

  if (!process.env.APERO_J_CAREERJET_API_KEY?.trim() && settings.careerjet.configured) {
    const byKey = await loadSettingMap(profileId);
    const apiKey = byKey.get(LOCAL_SETTING_KEYS.careerjetApiKey)?.trim();
    if (apiKey) overrides.APERO_J_CAREERJET_API_KEY = apiKey;
  }

  if (!process.env.APERO_J_JOOBLE_API_KEY?.trim() && settings.jooble.configured) {
    const byKey = await loadSettingMap(profileId);
    const apiKey = byKey.get(LOCAL_SETTING_KEYS.joobleApiKey)?.trim();
    if (apiKey) overrides.APERO_J_JOOBLE_API_KEY = apiKey;
  }

  return overrides;
}

export async function withProfileConnectorCredentials<T>(
  profileId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const overrides = await resolveConnectorEnvOverrides(profileId);
  const previous = applyConnectorEnv(overrides);

  try {
    return await fn();
  } finally {
    restoreConnectorEnv(previous);
  }
}

export function publicConnectorCredentialSettings(
  settings: ConnectorCredentialSettings,
): ConnectorCredentialSettings {
  return {
    adzuna: {
      appId: settings.adzuna.appId,
      appKey: "",
      configured: settings.adzuna.configured,
      hasAppKey: settings.adzuna.hasAppKey,
    },
    reed: settings.reed,
    usajobs: settings.usajobs,
    franceTravail: settings.franceTravail,
    worknet: settings.worknet,
    careerjet: settings.careerjet,
    jooble: settings.jooble,
  };
}
