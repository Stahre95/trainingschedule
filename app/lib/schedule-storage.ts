import { promises as fs } from 'fs';
import path from 'node:path';
import { defaultSchedule, type ScheduleData } from './schedule';

const LOCAL_SCHEDULE_PATH = path.join(process.cwd(), 'data', 'schedule.json');

function getGitHubStorageConfig() {
  const token = process.env.SCHEDULE_STORAGE_GITHUB_TOKEN;
  const owner = process.env.SCHEDULE_STORAGE_GITHUB_OWNER;
  const repo = process.env.SCHEDULE_STORAGE_GITHUB_REPO;
  const branch = process.env.SCHEDULE_STORAGE_GITHUB_BRANCH || 'main';
  const filePath = process.env.SCHEDULE_STORAGE_GITHUB_FILE_PATH || 'data/schedule.json';

  if (!token || !owner || !repo) {
    return null;
  }

  return { token, owner, repo, branch, filePath };
}

function decodeGitHubContent(content: string) {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
}

function encodeGitHubContent(content: string) {
  return Buffer.from(content, 'utf8').toString('base64');
}

async function readFromGitHub(config: NonNullable<ReturnType<typeof getGitHubStorageConfig>>) {
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub-läsning misslyckades (${response.status}).`);
  }

  const data = (await response.json()) as { content?: string };

  if (!data.content) {
    throw new Error('GitHub svarade utan filinnehåll.');
  }

  return JSON.parse(decodeGitHubContent(data.content)) as ScheduleData;
}

async function writeToGitHub(config: NonNullable<ReturnType<typeof getGitHubStorageConfig>>, payload: ScheduleData) {
  const currentResponse = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    },
  );

  let sha: string | undefined;
  if (currentResponse.ok) {
    const currentData = (await currentResponse.json()) as { sha?: string };
    sha = currentData.sha;
  }

  const updateResponse = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `Update schedule for ${payload.weekLabel}`,
        content: encodeGitHubContent(JSON.stringify(payload, null, 2)),
        branch: config.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );

  if (!updateResponse.ok) {
    const details = (await updateResponse.json().catch(() => null)) as { message?: string } | null;
    throw new Error(details?.message || `GitHub skrivning misslyckades (${updateResponse.status}).`);
  }
}

async function readFromLocalDisk() {
  try {
    const fileContents = await fs.readFile(LOCAL_SCHEDULE_PATH, 'utf8');
    return JSON.parse(fileContents) as ScheduleData;
  } catch {
    return defaultSchedule;
  }
}

export async function readScheduleData() {
  const config = getGitHubStorageConfig();

  if (config) {
    try {
      return await readFromGitHub(config);
    } catch {
      return defaultSchedule;
    }
  }

  return readFromLocalDisk();
}

export async function saveScheduleData(payload: ScheduleData) {
  const config = getGitHubStorageConfig();

  if (config) {
    await writeToGitHub(config, payload);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Persistent schemalagring saknas. Sätt SCHEDULE_STORAGE_GITHUB_TOKEN, SCHEDULE_STORAGE_GITHUB_OWNER och SCHEDULE_STORAGE_GITHUB_REPO i Vercel.',
    );
  }

  await fs.mkdir(path.dirname(LOCAL_SCHEDULE_PATH), { recursive: true });
  await fs.writeFile(LOCAL_SCHEDULE_PATH, JSON.stringify(payload, null, 2));
}