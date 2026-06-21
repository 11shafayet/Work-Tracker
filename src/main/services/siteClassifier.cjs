const MUST_SHOW_SITES = [
  { name: 'LinkedIn', patterns: [/linkedin/i] },
  { name: 'YouTube', patterns: [/youtube|youtu\.be/i] },
  { name: 'Kaggle', patterns: [/kaggle/i] },
  { name: 'ChatGPT', patterns: [/chatgpt|openai/i] },
  { name: 'Claude', patterns: [/claude|anthropic/i] },
  { name: 'Gemini', patterns: [/gemini|google ai studio/i] },
  { name: 'WhatsApp Web', patterns: [/whatsapp/i] },
  { name: 'Gmail', patterns: [/gmail|google mail/i] }
];

const COMMON_SITES = [
  ...MUST_SHOW_SITES,
  { name: 'GitHub', patterns: [/github/i] },
  { name: 'Google Search', patterns: [/google search|search - google|google$/i] },
  { name: 'Google Drive', patterns: [/google drive|drive\.google/i] },
  { name: 'Google Docs', patterns: [/google docs|docs\.google/i] },
  { name: 'Google Sheets', patterns: [/google sheets|sheets\.google/i] },
  { name: 'Stack Overflow', patterns: [/stack overflow|stackoverflow/i] },
  { name: 'Reddit', patterns: [/reddit/i] },
  { name: 'X', patterns: [/\bx\b|twitter/i] },
  { name: 'Facebook', patterns: [/facebook/i] },
  { name: 'Notion', patterns: [/notion/i] },
  { name: 'Trello', patterns: [/trello/i] },
  { name: 'Jira', patterns: [/jira|atlassian/i] },
  { name: 'Figma', patterns: [/figma/i] }
];

function cleanChromeTitle(windowTitle) {
  return String(windowTitle || '')
    .replace(/\s+-\s+Google Chrome$/i, '')
    .replace(/\s+-\s+Chromium$/i, '')
    .trim();
}

function hostnameFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    return hostname || '';
  } catch (_error) {
    return '';
  }
}

function prettifyHostname(hostname) {
  const domain = String(hostname || '').split('.').filter(Boolean);
  const name = domain.length > 1 ? domain[domain.length - 2] : domain[0];

  if (!name) {
    return '';
  }

  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function classifySiteFromWindowTitle(windowTitle, url = '') {
  const title = cleanChromeTitle(windowTitle);
  const hostname = hostnameFromUrl(url);
  const source = `${title} ${url}`.trim();

  if (!source) {
    return null;
  }

  for (const site of COMMON_SITES) {
    if (site.patterns.some((pattern) => pattern.test(source))) {
      return {
        siteName: site.name,
        pageTitle: title || hostname
      };
    }
  }

  if (hostname) {
    return {
      siteName: hostname,
      pageTitle: title || hostname
    };
  }

  const splitTitle = title.split(/\s+[-|•]\s+/).map((part) => part.trim()).filter(Boolean);
  const siteName = splitTitle.length > 1 ? splitTitle[splitTitle.length - 1] : title;

  return {
    siteName: prettifyHostname(siteName) || siteName.slice(0, 80),
    pageTitle: title
  };
}

function isBrowserApp(appName) {
  return /google chrome|chromium|brave|microsoft edge|firefox/i.test(appName || '');
}

module.exports = {
  classifySiteFromWindowTitle,
  isBrowserApp
};
