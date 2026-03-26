const IS_IFRAME = (window.self !== window.top);

function parseUrl(url) {
  const match = url.match(/\/dizi\/([^/]+)\/sezon-(\d+)\/bolum-(\d+)/i);
  if (!match) return null;

  return {
    slug: match[1],
    season: parseInt(match[2]),
    episode: parseInt(match[3])
  };
}

function slugToName(slug) {
  return slug
    .replace(/-\d+$/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getSeriesNameFromPage() {
  const selectors = ['h1.entry-title', '.page-title h1', 'h1', 'title'];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      let text = el.innerText || el.textContent || '';
      text = text
        .replace(/\d+\.\s*sezon.*/i, '')
        .replace(/sezon.*/i, '')
        .replace(/izle$/i, '')
        .replace(/hd$/i, '')
        .trim();
      if (text.length > 2) return text;
    }
  }
  return null;
}

function buildNextEpisodeUrl(baseUrl, parsed) {
  const nextEp = parsed.episode + 1;
  const newUrl = baseUrl.replace(
    /\/bolum-\d+([^/]*)/i,
    `/bolum-${nextEp}`
  );
  return newUrl !== baseUrl ? newUrl : null;
}

function showToast(message) {
  const existing = document.getElementById('__dizi_toast__');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = '__dizi_toast__';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1a1a1e;
    color: #f0f0f0;
    border: 1px solid #e8c840;
    border-radius: 10px;
    padding: 12px 18px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: __dizi_slide_in 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes __dizi_slide_in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  toast.innerHTML = `<span style="font-size:16px">📺</span> <span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showCountdownToast(seconds) {
  const existing = document.getElementById('__dizi_toast__');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = '__dizi_toast__';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1a1a1e;
    color: #f0f0f0;
    border: 1px solid #e8c840;
    border-radius: 10px;
    padding: 14px 20px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: __dizi_slide_in 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 280px;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes __dizi_slide_in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:18px">⏭️</span>
      <span id="__dizi_countdown_text__">Sonraki bölüme <strong>${seconds}</strong> saniye içinde geçiliyor...</span>
    </div>
    <button id="__dizi_cancel__" style="
      background: transparent;
      border: 1px solid #e8c840;
      color: #e8c840;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      align-self: flex-end;
      transition: background 0.2s;
    " onmouseover="this.style.background='#e8c84022'" onmouseout="this.style.background='transparent'">İptal Et</button>
  `;

  document.body.appendChild(toast);
  return toast;
}

function initIframe() {
  let parsed = parseUrl(document.referrer);

  if (!parsed) {
    chrome.runtime.sendMessage({ type: 'GET_TAB_URL' }, (response) => {
      if (response && response.url) {
        parsed = parseUrl(response.url);
        if (parsed) attachIframeVideoListener(parsed);
      }
    });
  } else {
    attachIframeVideoListener(parsed);
  }
}

let iframeVideoAttached = false;

function attachIframeVideoListener(parsed) {
  if (iframeVideoAttached) return;

  const tryAttach = () => {
    const videos = document.querySelectorAll('video');
    if (videos.length === 0) return false;

    videos.forEach(video => {
      video.addEventListener('ended', () => {
        chrome.runtime.sendMessage({ type: 'VIDEO_ENDED', data: parsed });
        chrome.runtime.sendMessage({ type: 'NAVIGATE_NEXT', data: parsed });
      });

      video.addEventListener('timeupdate', () => {
        if (video.duration && video.currentTime / video.duration > 0.9) {
          chrome.runtime.sendMessage({
            type: 'EPISODE_PROGRESS',
            data: { ...parsed, progress: 0.9 }
          });
        }
      }, { once: true });
    });

    iframeVideoAttached = true;
    return true;
  };

  if (!tryAttach()) {
    const observer = new MutationObserver(() => {
      if (tryAttach()) observer.disconnect();
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  }
}

let videoListenerAttached = false;

function attachVideoListener(parsed) {
  if (videoListenerAttached) return;

  const tryAttach = () => {
    const videos = document.querySelectorAll('video');
    if (videos.length === 0) return false;

    videos.forEach(video => {
      video.addEventListener('ended', () => {
        chrome.runtime.sendMessage({ type: 'VIDEO_ENDED', data: parsed });
        navigateToNextEpisode(window.location.href, parsed);
      });

      video.addEventListener('timeupdate', () => {
        if (video.duration && video.currentTime / video.duration > 0.9) {
          chrome.runtime.sendMessage({
            type: 'EPISODE_PROGRESS',
            data: { ...parsed, progress: 0.9 }
          });
        }
      }, { once: true });
    });

    videoListenerAttached = true;
    return true;
  };

  if (!tryAttach()) {
    const observer = new MutationObserver(() => {
      if (tryAttach()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  }
}

function navigateToNextEpisode(baseUrl, parsed) {
  const nextUrl = buildNextEpisodeUrl(baseUrl, parsed);
  if (!nextUrl) {
    showToast('✅ Bölüm bitti! Kayıt güncellendi.');
    return;
  }

  let seconds = 5;
  const toast = showCountdownToast(seconds);

  const interval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      window.location.href = nextUrl;
    } else {
      const textEl = toast.querySelector('#__dizi_countdown_text__');
      if (textEl) {
        textEl.innerHTML = `Sonraki bölüme <strong>${seconds}</strong> saniye içinde geçiliyor...`;
      }
    }
  }, 1000);

  const cancelBtn = toast.querySelector('#__dizi_cancel__');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      clearInterval(interval);
      toast.remove();
      showToast('⏸️ Otomatik geçiş iptal edildi.');
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (IS_IFRAME) return;

  if (message.type === 'TRIGGER_NAVIGATE') {
    const parsed = message.data;
    navigateToNextEpisode(window.location.href, parsed);
  }
});

function init() {
  if (IS_IFRAME) {
    initIframe();
    return;
  }

  const parsed = parseUrl(window.location.href);
  if (!parsed) return;

  setTimeout(() => {
    const nameFromPage = getSeriesNameFromPage();
    const nameFromSlug = slugToName(parsed.slug);
    const seriesName = (nameFromPage && nameFromPage.length > nameFromSlug.length)
      ? nameFromPage
      : nameFromSlug;

    const info = {
      slug: parsed.slug,
      name: seriesName,
      season: parsed.season,
      episode: parsed.episode
    };

    chrome.runtime.sendMessage({ type: 'PAGE_DETECTED', data: info });
    attachVideoListener(info);
  }, 1200);
}

init();

let lastUrl = window.location.href;
if (!IS_IFRAME) {
  const navObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      videoListenerAttached = false;
      setTimeout(init, 800);
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });
}
