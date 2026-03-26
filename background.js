const STORAGE_KEY = 'dizi_takipci_data';

async function loadSeries() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], result => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

async function saveSeries(list) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: list }, resolve);
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function upsertSeries({ slug, name, season, episode, autoAdvance = false }) {
  const list = await loadSeries();
  const existing = list.find(s => s.slug === slug);

  if (existing) {
    if (autoAdvance) {
      existing.episode = episode + 1;
      existing.updatedAt = Date.now();
      existing.status = 'watching';
    } else {
      const isAhead =
        season > existing.season ||
        (season === existing.season && episode > existing.episode);
      if (isAhead) {
        existing.season = season;
        existing.episode = episode;
        existing.updatedAt = Date.now();
      }
    }
  } else {
    list.push({
      id: uid(),
      slug,
      name,
      season,
      episode: autoAdvance ? episode + 1 : episode,
      status: 'watching',
      note: '',
      autoAdded: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  await saveSeries(list);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_DETECTED') {
    upsertSeries({ ...message.data, autoAdvance: false });
    sendResponse({ ok: true });
  }

  if (message.type === 'VIDEO_ENDED') {
    upsertSeries({ ...message.data, autoAdvance: true });
    sendResponse({ ok: true });
  }

  if (message.type === 'EPISODE_PROGRESS') {
    upsertSeries({ ...message.data, autoAdvance: false });
    sendResponse({ ok: true });
  }

  if (message.type === 'GET_TAB_URL') {
    if (sender.tab && sender.tab.url) {
      sendResponse({ url: sender.tab.url });
    } else if (sender.tab) {
      chrome.tabs.get(sender.tab.id, (tab) => {
        sendResponse({ url: tab ? tab.url : '' });
      });
      return true;
    } else {
      sendResponse({ url: '' });
    }
  }

  if (message.type === 'NAVIGATE_NEXT') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'TRIGGER_NAVIGATE',
        data: message.data
      });
    }
    sendResponse({ ok: true });
  }

  return true;
});
