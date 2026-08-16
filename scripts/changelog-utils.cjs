const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(repoRoot, 'public', 'changelog.json');
const MAX_ENTRIES = 30;

const IGNORED_PATHS = new Set([
  'package.json',
  'package-lock.json',
  'public/changelog.json',
  'public/version.json',
]);

/** 경로별 사용자-facing 변경 설명 */
const FILE_CHANGE_HINTS = [
  { pattern: /src\/pages\/TrinityApp\.tsx$/i, label: 'Trinity 타로 리딩·UI 개선' },
  { pattern: /src\/components\/trinity\/TarotSpread\.tsx$/i, label: '타로 카드 휠 성능·역방향 카드' },
  { pattern: /src\/lib\/trinity\/utils\.ts$/i, label: '타로 자동 배열법·AI 프롬프트 강화' },
  { pattern: /src\/data\/tarotData\.ts$/i, label: '타로 카드 데이터·역방향 지원' },
  { pattern: /src\/components\/trinity\/BgMusicPlayer\.tsx$/i, label: 'BGM 플레이어·데일리 타로 음악 수정' },
  { pattern: /src\/components\/trinity\/VisionPortal\.tsx$/i, label: '비전 포털(카메라 타로) 연동' },
  { pattern: /src\/components\/UpdateNoticeModal\.tsx$/i, label: '업데이트 변경점 안내 UI' },
  { pattern: /src\/lib\/updateNotice\.ts$/i, label: '업데이트 changelog 로직' },
  { pattern: /src\/components\/muse\/ArtistWayBible\.tsx$/i, label: 'Artist Bible 페이지 헤더 통일' },
  { pattern: /muse\/src\/App\.tsx$/i, label: 'Muse 탭 라벨 통일' },
  { pattern: /src\/pages\/MuseApp\.tsx$/i, label: 'Muse 앱 기능 개선' },
  { pattern: /src\/pages\/HealApp\.tsx$/i, label: 'Heal 앱 기능 개선' },
  { pattern: /src\/pages\/BluebirdApp\.tsx$/i, label: 'Bluebird 앱 기능 개선' },
  { pattern: /src\/pages\/OrangeApp\.tsx$/i, label: 'Orange 앱 기능 개선' },
  { pattern: /src\/App\.tsx$/i, label: '앱 셸·동기화·업데이트 안내' },
  { pattern: /server\//i, label: '서버 API 개선' },
  { pattern: /api\//i, label: 'API 라우트 개선' },
];

const AREA_SUMMARY_HINTS = [
  {
    test: (files) => files.some((f) => /trinity|tarot/i.test(f)),
    summary: '타로 리딩 기능 강화',
  },
  {
    test: (files) => files.some((f) => /muse|ArtistWay/i.test(f)),
    summary: 'Muse · Artist Bible 개선',
  },
  {
    test: (files) => files.some((f) => /UpdateNotice|updateNotice|changelog/i.test(f)),
    summary: '업데이트 변경점 안내 개선',
  },
  {
    test: (files) => files.some((f) => /BgMusicPlayer/i.test(f)),
    summary: 'BGM·음악 재생 안정화',
  },
];

function parseCommitSummary(message) {
  const trimmed = String(message || '').trim();
  const match = trimmed.match(/^v?\d+\.\d+\.\d+\s*:\s*(.+)$/i);
  if (match) return match[1].trim();
  return trimmed || '자동 업데이트';
}

function getWorkingTreeFiles() {
  try {
    const out = execSync('git status --porcelain', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (!out) return [];
    return out
      .split('\n')
      .map((line) => line.slice(3).trim().replace(/\\/g, '/'))
      .filter((filePath) => filePath && !IGNORED_PATHS.has(filePath));
  } catch {
    return [];
  }
}

function labelForFile(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const hit = FILE_CHANGE_HINTS.find((entry) => entry.pattern.test(normalized));
  if (hit) return hit.label;
  const base = normalized.split('/').pop() || normalized;
  return `${base} 수정`;
}

function summarizeWorkingTreeChanges(customMessage) {
  const files = getWorkingTreeFiles();
  const fileItems = [...new Set(files.map(labelForFile))];

  if (customMessage && String(customMessage).trim()) {
    const text = String(customMessage).trim();
    const messageItems = text
      .split(/\n|•|·/)
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter((line) => line.length > 1);
    const summary = messageItems[0] || text.split('\n')[0].trim() || text;
    const items = [...new Set([...messageItems.slice(1), ...fileItems])].filter(
      (item) => item && item !== summary,
    );
    return { summary, items };
  }
  if (files.length === 0) {
    return { summary: '버그 수정 및 안정화', items: ['내부 안정화 및 성능 개선'] };
  }

  const items = [...new Set(files.map(labelForFile))];
  const area = AREA_SUMMARY_HINTS.find((hint) => hint.test(files));
  const summary = area?.summary || items[0] || '기능 개선 및 버그 수정';

  return { summary, items };
}

function readChangelog() {
  try {
    const raw = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeChangelog(entries) {
  fs.mkdirSync(path.dirname(CHANGELOG_PATH), { recursive: true });
  fs.writeFileSync(CHANGELOG_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

function appendChangelogEntry({ version, summary, items, builtAt }) {
  const entries = readChangelog().filter((entry) => entry.version !== version);
  const entry = {
    version,
    summary: summary || '기능 개선 및 버그 수정',
    builtAt: builtAt || new Date().toISOString(),
  };
  if (Array.isArray(items) && items.length > 0) {
    entry.items = items;
  }
  entries.unshift(entry);
  writeChangelog(entries.slice(0, MAX_ENTRIES));
}

module.exports = {
  CHANGELOG_PATH,
  parseCommitSummary,
  readChangelog,
  writeChangelog,
  appendChangelogEntry,
  summarizeWorkingTreeChanges,
  getWorkingTreeFiles,
};