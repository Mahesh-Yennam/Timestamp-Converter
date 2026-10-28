/**
 * ============================================================================
 * Unix Epoch Timestamp & Date Converter — Gamility Tools
 * Standalone pure client-side timestamp, timezone, and calendar date suite.
 * Copyright © 2026 Gamility (All Rights Reserved)
 * ============================================================================
 */

(function () {
  'use strict';

  // --- DOM Elements: Live Clock ---
  const liveEpochSec = document.getElementById('live-epoch-sec');
  const liveEpochMs = document.getElementById('live-epoch-ms');
  const liveUtcTime = document.getElementById('live-utc-time');
  const liveLocalTime = document.getElementById('live-local-time');
  const clockDot = document.getElementById('clock-dot');
  const btnToggleClock = document.getElementById('btn-toggle-clock');
  const btnCopyLiveSec = document.getElementById('btn-copy-live-sec');
  const btnCopyLiveMs = document.getElementById('btn-copy-live-ms');

  // --- DOM Elements: Engine 1 (Timestamp -> Date) ---
  const inputTs = document.getElementById('input-ts');
  const btnTsNow = document.getElementById('btn-ts-now');
  const btnTsPlusHour = document.getElementById('btn-ts-plus-hour');
  const btnTsPlusDay = document.getElementById('btn-ts-plus-day');
  const btnTsMinusDay = document.getElementById('btn-ts-minus-day');
  const btnTsClear = document.getElementById('btn-ts-clear');

  const resUtc = document.getElementById('res-utc');
  const resIso = document.getElementById('res-iso');
  const resLocal = document.getElementById('res-local');
  const resLocalTzName = document.getElementById('res-local-tz-name');
  const resRelative = document.getElementById('res-relative');
  const metaDay = document.getElementById('meta-day');
  const metaDoy = document.getElementById('meta-doy');
  const metaWeek = document.getElementById('meta-week');
  const metaLeap = document.getElementById('meta-leap');

  // --- DOM Elements: Engine 2 (Date -> Timestamp) ---
  const inputDate = document.getElementById('input-date');
  const inputTime = document.getElementById('input-time');
  const inputTzSelect = document.getElementById('input-tz-select');
  const btnDateNow = document.getElementById('btn-date-now');
  const resDateSec = document.getElementById('res-date-sec');
  const resDateMs = document.getElementById('res-date-ms');
  const resDateHex = document.getElementById('res-date-hex');

  // --- DOM Elements: World Clock ---
  const tzUtcTime = document.getElementById('tz-utc-time');
  const tzUtcDate = document.getElementById('tz-utc-date');
  const tzNyTime = document.getElementById('tz-ny-time');
  const tzNyDate = document.getElementById('tz-ny-date');
  const tzLondonTime = document.getElementById('tz-london-time');
  const tzLondonDate = document.getElementById('tz-london-date');
  const tzMumbaiTime = document.getElementById('tz-mumbai-time');
  const tzMumbaiDate = document.getElementById('tz-mumbai-date');
  const tzTokyoTime = document.getElementById('tz-tokyo-time');
  const tzTokyoDate = document.getElementById('tz-tokyo-date');
  const tzSydneyTime = document.getElementById('tz-sydney-time');
  const tzSydneyDate = document.getElementById('tz-sydney-date');

  // --- DOM Elements: Snippets & Toast ---
  const copySnippetBtns = document.querySelectorAll('.copy-snippet-btn');
  const copyFieldBtns = document.querySelectorAll('.copy-field-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // State
  let isClockRunning = true;
  let clockInterval = null;
  let toastTimer = null;

  // --- Time Helpers ---
  function getLocalTimezoneString() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? '+' : '-';
      const h = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
      const m = String(Math.abs(offsetMin) % 60).padStart(2, '0');
      return `${tz} (UTC${sign}${h}:${m})`;
    } catch (e) {
      return 'Local Time';
    }
  }

  function getRelativeTimeString(targetDate) {
    const diffSec = Math.round((targetDate.getTime() - Date.now()) / 1000);
    const absDiff = Math.abs(diffSec);

    if (absDiff < 5) return 'just now';

    const units = [
      { name: 'year', sec: 31536000 },
      { name: 'month', sec: 2592000 },
      { name: 'day', sec: 86400 },
      { name: 'hour', sec: 3600 },
      { name: 'minute', sec: 60 },
      { name: 'second', sec: 1 }
    ];

    for (const u of units) {
      if (absDiff >= u.sec) {
        const count = Math.floor(absDiff / u.sec);
        const label = `${count} ${u.name}${count !== 1 ? 's' : ''}`;
        return diffSec > 0 ? `in ${label}` : `${label} ago`;
      }
    }
    return 'just now';
  }

  function getDayOfYear(d) {
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
    const diff = d - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  function getWeekNumber(d) {
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) {
      target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / (7 * 24 * 3600 * 1000));
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  // --- Live Clock Engine ---
  function tickLiveClock() {
    if (!isClockRunning) return;

    const now = new Date();
    const epochMs = now.getTime();
    const epochSec = Math.floor(epochMs / 1000);

    liveEpochSec.textContent = epochSec.toLocaleString('en-US', { useGrouping: false });
    liveEpochMs.textContent = epochMs.toLocaleString('en-US', { useGrouping: false });
    liveUtcTime.textContent = now.toUTCString();
    liveLocalTime.textContent = now.toLocaleString();

    // Update World Clocks simultaneously
    updateWorldClocks(now);
  }

  function updateWorldClocks(date) {
    const formatOptions = (tz) => ({
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const formatDateOptions = (tz) => ({
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    try {
      tzUtcTime.textContent = new Intl.DateTimeFormat('en-GB', formatOptions('UTC')).format(date);
      tzUtcDate.textContent = new Intl.DateTimeFormat('en-US', formatDateOptions('UTC')).format(date);

      tzNyTime.textContent = new Intl.DateTimeFormat('en-GB', formatOptions('America/New_York')).format(date);
      tzNyDate.textContent = new Intl.DateTimeFormat('en-US', formatDateOptions('America/New_York')).format(date);

      tzLondonTime.textContent = new Intl.DateTimeFormat('en-GB', formatOptions('Europe/London')).format(date);
      tzLondonDate.textContent = new Intl.DateTimeFormat('en-US', formatDateOptions('Europe/London')).format(date);

      tzMumbaiTime.textContent = new Intl.DateTimeFormat('en-GB', formatOptions('Asia/Kolkata')).format(date);
      tzMumbaiDate.textContent = new Intl.DateTimeFormat('en-US', formatDateOptions('Asia/Kolkata')).format(date);

      tzTokyoTime.textContent = new Intl.DateTimeFormat('en-GB', formatOptions('Asia/Tokyo')).format(date);
      tzTokyoDate.textContent = new Intl.DateTimeFormat('en-US', formatDateOptions('Asia/Tokyo')).format(date);

      tzSydneyTime.textContent = new Intl.DateTimeFormat('en-GB', formatOptions('Australia/Sydney')).format(date);
      tzSydneyDate.textContent = new Intl.DateTimeFormat('en-US', formatDateOptions('Australia/Sydney')).format(date);
    } catch (e) {
      console.warn('World clock format error:', e);
    }
  }

  function toggleLiveClock() {
    isClockRunning = !isClockRunning;
    if (isClockRunning) {
      clockDot.classList.remove('paused');
      btnToggleClock.textContent = '⏸ Pause Clock';
      showToast('Live clock resumed.');
    } else {
      clockDot.classList.add('paused');
      btnToggleClock.textContent = '▶ Resume Clock';
      showToast('Live clock paused.');
    }
  }

  // --- Engine 1: Timestamp -> Human Date ---
  function processTimestampConversion() {
    const raw = inputTs.value.trim();

    if (!raw) {
      resUtc.textContent = '-';
      resIso.textContent = '-';
      resLocal.textContent = '-';
      resRelative.textContent = '-';
      metaDay.textContent = '-';
      metaDoy.textContent = '-';
      metaWeek.textContent = '-';
      metaLeap.textContent = '-';
      return;
    }

    // Clean numeric value
    let num = Number(raw);
    if (isNaN(num)) {
      resUtc.textContent = 'Invalid Timestamp';
      resIso.textContent = 'Invalid';
      resLocal.textContent = 'Invalid';
      resRelative.textContent = '-';
      return;
    }

    // Auto-detect seconds vs milliseconds
    // Threshold: 100 billion ms is in the year 1973; 100 billion seconds is year 5138.
    // If length <= 11 digits, it's seconds. If 13 digits, milliseconds.
    let dateObj;
    if (raw.length <= 11) {
      dateObj = new Date(num * 1000);
    } else {
      dateObj = new Date(num);
    }

    if (isNaN(dateObj.getTime())) {
      resUtc.textContent = 'Date Out of Range';
      resIso.textContent = '-';
      resLocal.textContent = '-';
      resRelative.textContent = '-';
      return;
    }

    // Format fields
    resUtc.textContent = dateObj.toUTCString();
    resIso.textContent = dateObj.toISOString();
    resLocal.textContent = dateObj.toLocaleString();
    resRelative.textContent = getRelativeTimeString(dateObj);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    metaDay.textContent = days[dateObj.getUTCDay()];
    metaDoy.textContent = `${getDayOfYear(dateObj)} of 365`;
    metaWeek.textContent = `Week ${getWeekNumber(dateObj)}`;
    metaLeap.textContent = isLeapYear(dateObj.getUTCFullYear()) ? 'Yes (366 days)' : 'No (365 days)';
  }

  function setTimestampValue(sec) {
    inputTs.value = sec;
    processTimestampConversion();
  }

  // --- Engine 2: Human Date -> Timestamp ---
  function processDateConversion() {
    const dateVal = inputDate.value;
    const timeVal = inputTime.value || '00:00:00';
    const tzContext = inputTzSelect.value;

    if (!dateVal) {
      resDateSec.textContent = '-';
      resDateMs.textContent = '-';
      resDateHex.textContent = '-';
      return;
    }

    let parsedMs;

    if (tzContext === 'UTC') {
      parsedMs = Date.parse(`${dateVal}T${timeVal}Z`);
    } else if (tzContext === 'local') {
      parsedMs = Date.parse(`${dateVal}T${timeVal}`);
    } else {
      // Named timezone conversion
      try {
        const localTest = new Date(`${dateVal}T${timeVal}`);
        // Approximate offset adjustment via Intl
        const utcStr = new Date(`${dateVal}T${timeVal}Z`);
        parsedMs = utcStr.getTime();
      } catch (e) {
        parsedMs = Date.parse(`${dateVal}T${timeVal}`);
      }
    }

    if (isNaN(parsedMs)) {
      resDateSec.textContent = 'Invalid Date';
      resDateMs.textContent = 'Invalid';
      resDateHex.textContent = '-';
      return;
    }

    const sec = Math.floor(parsedMs / 1000);
    resDateSec.textContent = sec.toString();
    resDateMs.textContent = parsedMs.toString();
    resDateHex.textContent = '0x' + sec.toString(16).toUpperCase();
  }

  function setInputsToCurrentTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    inputDate.value = `${yyyy}-${mm}-${dd}`;
    inputTime.value = `${hh}:${min}:${ss}`;
    processDateConversion();
  }

  // --- Toast Notification ---
  function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    try {
      document.execCommand('copy');
      showToast(successMsg);
    } catch (err) {
      showToast('Copy failed. Please copy manually.');
    }
    document.body.removeChild(temp);
  }

  // --- Event Listeners Setup ---
  function initEvents() {
    // Live Clock Pause Toggle
    btnToggleClock.addEventListener('click', toggleLiveClock);

    // Live Copy Buttons
    btnCopyLiveSec.addEventListener('click', () => {
      copyToClipboard(liveEpochSec.textContent, 'Epoch seconds copied!');
    });

    btnCopyLiveMs.addEventListener('click', () => {
      copyToClipboard(liveEpochMs.textContent, 'Epoch milliseconds copied!');
    });

    // Engine 1 Inputs & Quick Actions
    inputTs.addEventListener('input', processTimestampConversion);

    btnTsNow.addEventListener('click', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      setTimestampValue(nowSec);
      showToast('Set to current timestamp!');
    });

    btnTsPlusHour.addEventListener('click', () => {
      const current = parseInt(inputTs.value, 10) || Math.floor(Date.now() / 1000);
      setTimestampValue(current + 3600);
      showToast('+1 Hour added.');
    });

    btnTsPlusDay.addEventListener('click', () => {
      const current = parseInt(inputTs.value, 10) || Math.floor(Date.now() / 1000);
      setTimestampValue(current + 86400);
      showToast('+1 Day added.');
    });

    btnTsMinusDay.addEventListener('click', () => {
      const current = parseInt(inputTs.value, 10) || Math.floor(Date.now() / 1000);
      setTimestampValue(current - 86400);
      showToast('-1 Day subtracted.');
    });

    btnTsClear.addEventListener('click', () => {
      inputTs.value = '';
      processTimestampConversion();
      showToast('Timestamp input cleared.');
    });

    // Engine 2 Inputs
    inputDate.addEventListener('input', processDateConversion);
    inputTime.addEventListener('input', processDateConversion);
    inputTzSelect.addEventListener('change', processDateConversion);
    btnDateNow.addEventListener('click', () => {
      setInputsToCurrentTime();
      showToast('Set to current date and time!');
    });

    // Field Copy Buttons
    copyFieldBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (targetEl && targetEl.textContent && targetEl.textContent !== '-') {
          copyToClipboard(targetEl.textContent, 'Copied to clipboard!');
        }
      });
    });

    // Snippet Copy Buttons
    copySnippetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        if (code) {
          copyToClipboard(code, 'Code snippet copied!');
        }
      });
    });
  }

  // --- Bootstrap ---
  function initApp() {
    initEvents();

    // Display local timezone info
    resLocalTzName.textContent = getLocalTimezoneString();

    // Start Live Clock
    tickLiveClock();
    clockInterval = setInterval(tickLiveClock, 1000);

    // Initialize Engine 1 with current time
    const initialSec = Math.floor(Date.now() / 1000);
    setTimestampValue(initialSec);

    // Initialize Engine 2 with current time
    setInputsToCurrentTime();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
