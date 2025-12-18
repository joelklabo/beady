/* Generate `media/screenshot.png` for README/Marketplace from actual Beady webviews.
 *
 * This renders the Tasks webview (dist/views/issues.{js,css}) and the In Progress
 * Spotlight panel side-by-side using Playwright, with VS Code theme variables set
 * to a stable dark theme.
 *
 * Usage:
 *   npm run compile && npm run bundle
 *   node scripts/visual/readme-screenshot.js
 *
 * Optional env:
 *   BEADY_SCREENSHOT_OUT=/absolute/or/relative/path.png
 *   BEADY_VISUAL_NOW=2025-01-02T12:00:00Z
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { chromium } = require('playwright');

process.env.TZ = process.env.TZ || 'UTC';

const fixedNow = process.env.BEADY_VISUAL_NOW ? new Date(process.env.BEADY_VISUAL_NOW) : new Date('2025-01-02T12:00:00Z');
Date.now = () => fixedNow.getTime();

const repoRoot = path.resolve(__dirname, '..', '..');
const outFile = path.resolve(repoRoot, process.env.BEADY_SCREENSHOT_OUT || path.join('media', 'screenshot.png'));

const distPath = (...parts) => path.join(repoRoot, 'dist', ...parts);
const outPath = (...parts) => path.join(repoRoot, 'out', ...parts);

const themeCss = /* css */ `
:root {
  --vscode-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --vscode-font-size: 13px;
  --vscode-editor-background: #1e1e1e;
  --vscode-foreground: #d4d4d4;
  --vscode-descriptionForeground: rgba(212, 212, 212, 0.72);
  --vscode-disabledForeground: rgba(212, 212, 212, 0.42);
  --vscode-panel-border: rgba(128, 128, 128, 0.28);
  --vscode-editor-inactiveSelectionBackground: rgba(255, 255, 255, 0.04);

  --vscode-charts-blue: #4fc1ff;
  --vscode-charts-green: #89d185;
  --vscode-charts-yellow: #ffd700;
  --vscode-charts-orange: #d7ba7d;
  --vscode-charts-red: #f48771;
  --vscode-charts-purple: #c586c0;
}

html, body { height: 100%; }
body { margin: 0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
`;

const codiconsHref = 'https://microsoft.github.io/vscode-codicons/dist/codicon.css';

const shift = (ms) => new Date(fixedNow.getTime() + ms).toISOString();

const sampleTasks = [
  {
    id: 'beady-100',
    title: 'Epic: Publish Beady to Marketplace',
    description: 'Release planning, publisher setup, and CI tag publishing.',
    status: 'open',
    priority: 2,
    issueType: 'epic',
    labels: ['release', 'marketplace'],
    updatedAt: shift(-2 * 60 * 60 * 1000),
    isStale: false,
    icon: { id: 'milestone', color: 'var(--vscode-charts-purple)' },
  },
  {
    id: 'beady-101',
    title: 'Set up CI publishing (VSCE_PAT)',
    description: 'Create VSCE_PAT secret and publish from tags.',
    status: 'in_progress',
    priority: 1,
    issueType: 'task',
    labels: ['ci', 'publish'],
    updatedAt: shift(-12 * 60 * 1000),
    isStale: false,
    epicId: 'beady-100',
    assignee: { name: 'Joel', color: 'var(--vscode-charts-blue)', initials: 'JK' },
    icon: { id: 'check', color: 'var(--vscode-charts-blue)' },
  },
  {
    id: 'beady-102',
    title: 'Update README screenshot',
    description: 'Show an in-progress task + epic list.',
    status: 'open',
    priority: 2,
    issueType: 'task',
    labels: ['docs'],
    updatedAt: shift(-55 * 60 * 1000),
    isStale: false,
    epicId: 'beady-100',
    assignee: { name: 'Joel', color: 'var(--vscode-charts-blue)', initials: 'JK' },
    icon: { id: 'device-camera', color: 'var(--vscode-charts-blue)' },
  },
];

function buildTasksHtml() {
  const issuesJs = fs.readFileSync(distPath('views', 'issues.js'), 'utf8');
  const issuesCss = fs.readFileSync(distPath('views', 'issues.css'), 'utf8');

  return /* html */ `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${codiconsHref}">
    <style>${themeCss}</style>
    <style>${issuesCss}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.vscode = {
        postMessage: () => {},
        getState: () => null,
        setState: () => {}
      };
    </script>
    <script>${issuesJs}</script>
  </body>
</html>`;
}

// Stub vscode for HTML builders (compiled under out/)
const realLoad = Module._load;
Module._load = (request, parent, isMain) => {
  if (request === 'vscode') {
    const t = (message, ...args) =>
      message.replace(/\{(\d+)\}/g, (_m, i) => String(args[Number(i)] ?? `{${i}}`));
    return { l10n: { t } };
  }
  return realLoad(request, parent, isMain);
};

function injectThemeIntoHead(html) {
  return html.replace('</head>', `  <link rel="stylesheet" href="${codiconsHref}">\n  <style>${themeCss}</style>\n</head>`);
}

function buildInProgressHtml() {
  const { getInProgressPanelHtml, buildInProgressPanelStrings } = require(outPath('views', 'inProgress', 'html.js'));

  const beadItems = [
    {
      id: 'beady-101',
      title: 'Set up CI publishing (VSCE_PAT)',
      status: 'in_progress',
      updatedAt: shift(-12 * 60 * 1000),
      inProgressSince: shift(-3 * 60 * 60 * 1000),
      blockingDepsCount: 1,
      assignee: 'Joel',
      raw: {
        issue_type: 'task',
        priority: 1,
        labels: ['ci', 'publish'],
        updated_at: shift(-12 * 60 * 1000),
        created_at: shift(-2 * 24 * 60 * 60 * 1000),
      },
    },
    {
      id: 'beady-103',
      title: 'Create Marketplace publisher',
      status: 'in_progress',
      updatedAt: shift(-45 * 60 * 1000),
      inProgressSince: shift(-6 * 60 * 60 * 1000),
      blockingDepsCount: 0,
      assignee: 'Joel',
      raw: {
        issue_type: 'task',
        priority: 2,
        labels: ['marketplace'],
        updated_at: shift(-45 * 60 * 1000),
        created_at: shift(-1 * 24 * 60 * 60 * 1000),
      },
    },
  ];

  const html = getInProgressPanelHtml(beadItems, buildInProgressPanelStrings(), 'en');
  return injectThemeIntoHead(html);
}

function toDataUrl(html) {
  return `data:text/html;base64,${Buffer.from(html, 'utf8').toString('base64')}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1504, height: 996 } });

  const tasksHtml = buildTasksHtml();
  const inProgressHtml = buildInProgressHtml();

  const shellHtml = /* html */ `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      ${themeCss}
      body { background: var(--vscode-editor-background); }
      .layout {
        height: 100vh;
        display: flex;
        gap: 0;
      }
      .pane {
        border-right: 1px solid var(--vscode-panel-border);
      }
      iframe {
        border: 0;
        height: 100%;
        width: 100%;
      }
      #tasksPane { width: 420px; min-width: 380px; max-width: 460px; }
      #spotlightPane { flex: 1; }
    </style>
  </head>
  <body>
    <div class="layout">
      <div class="pane" id="tasksPane">
        <iframe name="tasks" src="${toDataUrl(tasksHtml)}"></iframe>
      </div>
      <div id="spotlightPane">
        <iframe name="spotlight" src="${toDataUrl(inProgressHtml)}"></iframe>
      </div>
    </div>
  </body>
</html>`;

  await page.setContent(shellHtml, { waitUntil: 'networkidle' });
  const tasksFrame = page.frame({ name: 'tasks' });
  if (!tasksFrame) {
    throw new Error('Tasks iframe did not load.');
  }

  const payload = { type: 'update', beads: sampleTasks, sortMode: 'status', density: 'default' };
  await tasksFrame.evaluate((data) => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  }, payload);
  await tasksFrame.waitForSelector('.bead-row', { timeout: 5000 });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await page.screenshot({ path: outFile, fullPage: false });
  await browser.close();
  console.log(`Wrote ${outFile}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    Module._load = realLoad;
  });

