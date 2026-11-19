import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:3000';
const EXACT_LAST_AREA_MSG = 'Mantenha pelo menos uma área ativa para os alunos.';
const EXACT_LOCKED_MSG = 'Esta área está temporariamente desativada pelo administrador.';
const EXACT_GO_BTN = 'Ir para área disponível';
const STUDENT_ID = 'aluno-1791404655417-oit4';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
}

async function apiReq(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, json };
}

async function setAreasApi(adminToken, target) {
  for (const key of ['tasks', 'announcements', 'resumos']) {
    if (target[key]) {
      await apiReq('/api/admin/student-areas', {
        method: 'PUT',
        token: adminToken,
        body: { area: key, enabled: true },
      });
    }
  }
  for (const key of ['tasks', 'announcements', 'resumos']) {
    if (!target[key]) {
      const r = await apiReq('/api/admin/student-areas', {
        method: 'PUT',
        token: adminToken,
        body: { area: key, enabled: false },
      });
      assert(r.ok, `Failed disabling ${key}: ${JSON.stringify(r)}`);
    }
  }
}

async function loginUI(page, userId, password, isAdmin = false) {
  await page.bringToFront();
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
  });
  const loginRes = await page.evaluate(async ({ base, userId, password }) => {
    const r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, password }),
    });
    const d = await r.json();
    if (d.token) {
      localStorage.setItem('auth_token', d.token);
      localStorage.setItem('cached_user', JSON.stringify(d.user));
    }
    return { status: r.status, user: d.user };
  }, { base: BASE, userId, password });

  assert(loginRes.status === 200, `Login failed for ${userId}: ${JSON.stringify(loginRes)}`);
  await page.goto(BASE + (isAdmin ? '/admin' : '/aluno'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(isAdmin ? '[data-testid="tab-student-areas"]' : '[data-testid="student-tab-tasks"]', { timeout: 12000 });
}

async function main() {
  const adminLogin = await apiReq('/api/auth/login', {
    method: 'POST',
    body: { user_id: 'admin-user-001', password: process.env.ADMIN_PASSWORD || 'enzo123cg' },
  });
  assert(adminLogin.ok && adminLogin.json?.token, 'Admin API login failed');
  const adminToken = adminLogin.json.token;

  let testStudentId = STUDENT_ID;
  let studentLogin = await apiReq('/api/auth/login', {
    method: 'POST',
    body: { user_id: testStudentId, password: '123' },
  });
  if (!studentLogin.ok) {
    testStudentId = 'bot-user-001';
    studentLogin = await apiReq('/api/auth/login', {
      method: 'POST',
      body: { user_id: testStudentId, password: '123' },
    });
  }
  assert(studentLogin.ok && studentLogin.json?.token, 'Student API login failed');
  const studentToken = studentLogin.json.token;
  console.log('Using student:', testStudentId);

  await setAreasApi(adminToken, { tasks: true, announcements: true, resumos: true });
  await apiReq('/api/ai/status', {
    method: 'PUT',
    token: adminToken,
    body: { frames_disabled: false },
  });

  const origTasks = (await apiReq('/api/tasks', { token: adminToken })).json?.length ?? 0;
  const origAnns = (await apiReq('/api/announcements', { token: adminToken })).json?.length ?? 0;
  const origSums = (await apiReq('/api/summaries', { token: adminToken })).json?.length ?? 0;
  console.log(`Baseline counts: tasks=${origTasks}, announcements=${origAnns}, summaries=${origSums}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });

  try {
    console.log('--- 1. Server concurrency & 403 guards ---');
    await setAreasApi(adminToken, { tasks: false, announcements: true, resumos: true });
    const [concA, concB] = await Promise.all([
      apiReq('/api/admin/student-areas', { method: 'PUT', token: adminToken, body: { area: 'announcements', enabled: false } }),
      apiReq('/api/admin/student-areas', { method: 'PUT', token: adminToken, body: { area: 'resumos', enabled: false } }),
    ]);
    const statuses = [concA.status, concB.status].sort();
    assert(statuses[0] === 200 && statuses[1] === 400, `Expected [200, 400] on concurrent disable-last, got ${JSON.stringify([concA, concB])}`);
    const errResp = concA.status === 400 ? concA : concB;
    assert(errResp.json?.detail === EXACT_LAST_AREA_MSG, `Unexpected concurrent error message: ${JSON.stringify(errResp.json)}`);
    const afterConc = await apiReq('/api/student-areas', { token: adminToken });
    const activeAfterConc = Object.values(afterConc.json.student_areas).filter(Boolean).length;
    assert(activeAfterConc === 1, `Expected 1 active area after concurrent requests, got ${JSON.stringify(afterConc.json)}`);
    console.log('PASS: Simultaneous disable-last atomically rejected one with exact message.');

    await setAreasApi(adminToken, { tasks: false, announcements: false, resumos: true });
    for (const p of ['/api/tasks', '/api/schedule', '/api/student-buttons', '/api/ai/daily-summary', '/api/announcements']) {
      const sr = await apiReq(p, { token: studentToken });
      assert(sr.status === 403, `Expected 403 for student on ${p}, got ${sr.status}`);
    }
    const adminTasksR = await apiReq('/api/tasks', { token: adminToken });
    const adminAnnsR = await apiReq('/api/announcements', { token: adminToken });
    assert(adminTasksR.status === 200 && adminAnnsR.status === 200, 'Admin blocked from disabled areas!');

    if (adminTasksR.json?.length > 0) {
      const tid = adminTasksR.json[0].id;
      const chatBlock = await apiReq('/api/ai/chat', {
        method: 'POST',
        token: studentToken,
        body: { message: 'ajuda', task_id: tid },
      });
      assert(chatBlock.status === 403, `Expected 403 on student /api/ai/chat with task_id, got ${chatBlock.status}`);
    }
    await setAreasApi(adminToken, { tasks: true, announcements: true, resumos: false });
    const sum403 = await apiReq('/api/summaries', { token: studentToken });
    assert(sum403.status === 403, `Expected 403 on student /api/summaries, got ${sum403.status}`);

    const taskWithFile = (adminTasksR.json || []).find(t => (t.attachments || []).length > 0);
    if (taskWithFile) {
      const fid = taskWithFile.attachments[0].id;
      await setAreasApi(adminToken, { tasks: false, announcements: true, resumos: true });
      const dlBlocked = await fetch(`${BASE}/api/files/${fid}/download`, { headers: { Authorization: `Bearer ${studentToken}` } });
      assert(dlBlocked.status === 403, `Expected 403 on exclusive task attachment download, got ${dlBlocked.status}`);
      await setAreasApi(adminToken, { tasks: true, announcements: true, resumos: true });
      const dlOk = await fetch(`${BASE}/api/files/${fid}/download`, { headers: { Authorization: `Bearer ${studentToken}` } });
      assert(dlOk.status === 200, `Expected 200 on task attachment when tasks enabled, got ${dlOk.status}`);
    }
    console.log('PASS: Server 403 enforcement & Admin 200 retention verified.');

    await setAreasApi(adminToken, { tasks: true, announcements: true, resumos: true });

    const pageErrors = [];
    const adminCtx = await browser.createBrowserContext();
    const studentCtx = await browser.createBrowserContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.setViewport({ width: 1366, height: 900 });
    adminPage.on('pageerror', e => pageErrors.push('ADMIN: ' + e.message));

    console.log('--- 2. Store Disable Admin Bug Test ---');
    await loginUI(adminPage, 'admin-user-001', process.env.ADMIN_PASSWORD || 'enzo123cg', true);
    await adminPage.click('[data-testid="tab-store"]');
    await adminPage.waitForFunction(
      () => document.querySelector('[data-testid="toggle-frames-disabled-btn"]')?.innerText?.includes('Desativar Loja'),
      { timeout: 10000 }
    );
    await adminPage.click('[data-testid="toggle-frames-disabled-btn"]');
    await adminPage.waitForSelector('[data-testid="admin-store-disabled-notice"]', { timeout: 10000 });
    await adminPage.waitForFunction(
      () => !document.querySelector('[data-testid="toggle-frames-disabled-btn"]')?.disabled,
      { timeout: 10000 }
    );

    const tabStoreStillVisible = await adminPage.$eval('[data-testid="tab-store"]', el => ({
      visible: el.offsetParent !== null,
      text: el.innerText.trim(),
    }));
    assert(tabStoreStillVisible.visible, 'Admin tab-store disappeared when disabled!');
    assert(tabStoreStillVisible.text.includes('Desativada'), `Expected "(Desativada)" label, got "${tabStoreStillVisible.text}"`);

    await adminPage.click('[data-testid="tab-students"]');
    await adminPage.waitForSelector('[data-testid="tab-store"]', { timeout: 5000 });
    await adminPage.click('[data-testid="tab-store"]');
    await adminPage.waitForSelector('[data-testid="admin-store-disabled-notice"]', { timeout: 5000 });

    const studentPage = await studentCtx.newPage();
    await studentPage.setViewport({ width: 1366, height: 900 });
    studentPage.on('pageerror', e => pageErrors.push('STUDENT: ' + e.message));
    await loginUI(studentPage, testStudentId, '123', false);
    const studentStoreWhileDisabled = await studentPage.$('[data-testid="student-tab-store"]');
    assert(!studentStoreWhileDisabled, 'Student still sees store while disabled!');

    await adminPage.bringToFront();
    await adminPage.click('[data-testid="reactivate-store-banner-btn"]');
    await adminPage.waitForFunction(
      () => !document.querySelector('[data-testid="admin-store-disabled-notice"]'),
      { timeout: 10000 }
    );
    await studentPage.bringToFront();
    await studentPage.reload({ waitUntil: 'domcontentloaded' });
    await studentPage.waitForSelector('[data-testid="student-tab-store"]', { timeout: 10000 });
    console.log('PASS: Admin Store disable/re-enable bug fixed & verified on Admin + Student.');

    console.log('--- 3. Admin UI: 7 Combinations & Mandatory Rule ---');
    await adminPage.bringToFront();
    await adminPage.click('[data-testid="tab-student-areas"]');
    await adminPage.waitForSelector('[data-testid="admin-student-areas-panel"]', { timeout: 10000 });

    const combos = [
      { tasks: true, announcements: true, resumos: true, expectedEntry: 'tasks' },
      { tasks: true, announcements: true, resumos: false, expectedEntry: 'tasks' },
      { tasks: true, announcements: false, resumos: true, expectedEntry: 'tasks' },
      { tasks: false, announcements: true, resumos: true, expectedEntry: 'announcements' },
      { tasks: true, announcements: false, resumos: false, expectedEntry: 'tasks' },
      { tasks: false, announcements: true, resumos: false, expectedEntry: 'announcements' },
      { tasks: false, announcements: false, resumos: true, expectedEntry: 'resumos' },
    ];

    async function setAdminAreasUI(target) {
      await adminPage.bringToFront();
      for (const k of ['tasks', 'announcements', 'resumos']) {
        const checked = await adminPage.$eval(`[data-testid="student-area-switch-${k}"]`, el => el.getAttribute('aria-checked') === 'true');
        if (target[k] && !checked) {
          await adminPage.click(`[data-testid="student-area-switch-${k}"]`);
          await adminPage.waitForFunction(
            (key) => document.querySelector(`[data-testid="student-area-switch-${key}"]`)?.getAttribute('aria-checked') === 'true',
            { timeout: 6000 },
            k
          );
        }
      }
      for (const k of ['tasks', 'announcements', 'resumos']) {
        const checked = await adminPage.$eval(`[data-testid="student-area-switch-${k}"]`, el => el.getAttribute('aria-checked') === 'true');
        if (!target[k] && checked) {
          await adminPage.click(`[data-testid="student-area-switch-${k}"]`);
          await adminPage.waitForFunction(
            (key) => document.querySelector(`[data-testid="student-area-switch-${key}"]`)?.getAttribute('aria-checked') === 'false',
            { timeout: 6000 },
            k
          );
        }
      }
    }

    for (const c of combos) {
      await setAdminAreasUI(c);
      for (const k of ['tasks', 'announcements', 'resumos']) {
        const statusText = await adminPage.$eval(`[data-testid="student-area-status-${k}"]`, el => el.textContent.trim());
        assert(statusText === (c[k] ? 'Ativa' : 'Desativada'), `Status mismatch for ${k}: ${statusText}`);
      }
      const activeKeys = ['tasks', 'announcements', 'resumos'].filter(k => c[k]);
      if (activeKeys.length === 1) {
        const lastKey = activeKeys[0];
        await adminPage.click(`[data-testid="student-area-switch-${lastKey}"]`);
        await adminPage.waitForSelector('[data-testid="student-areas-rule-alert"]', { timeout: 5000 });
        const ruleText = await adminPage.$eval('[data-testid="student-areas-rule-alert"]', el => el.innerText);
        assert(ruleText.includes(EXACT_LAST_AREA_MSG), `Expected rule text "${EXACT_LAST_AREA_MSG}", got "${ruleText}"`);
        const stillChecked = await adminPage.$eval(`[data-testid="student-area-switch-${lastKey}"]`, el => el.getAttribute('aria-checked') === 'true');
        assert(stillChecked, `Last area ${lastKey} got turned off!`);
      }

      await studentPage.bringToFront();
      for (const vp of [{ name: 'desktop', w: 1366, h: 900 }, { name: 'mobile', w: 390, h: 844 }]) {
        await studentPage.setViewport({ width: vp.w, height: vp.h });
        await studentPage.evaluate(() => {
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith('edutask_preferred_tab_')) localStorage.removeItem(k);
          }
        });
        await studentPage.goto(`${BASE}/aluno`, { waitUntil: 'domcontentloaded' });
        await studentPage.waitForSelector('[data-testid="student-tab-tasks"]', { timeout: 8000 });

        if (c.expectedEntry === 'tasks') {
          await studentPage.waitForSelector('[data-testid="filter-all"]', { timeout: 8000 });
        } else if (c.expectedEntry === 'announcements') {
          await studentPage.waitForSelector('[data-testid="student-announcements-panel"]', { timeout: 8000 });
        } else {
          await studentPage.waitForSelector('[data-testid="student-resumos-panel"]', { timeout: 8000 });
        }

        for (const k of ['tasks', 'announcements', 'resumos']) {
          const desktopLock = await studentPage.$(`[data-testid="desktop-nav-lock-${k}"]`);
          assert(Boolean(desktopLock) === !c[k], `Desktop lock mismatch for ${k} in ${JSON.stringify(c)}`);
          if (vp.name === 'mobile') {
            const mobileLock = await studentPage.$(`[data-testid="mobile-nav-lock-${k}"]`);
            assert(Boolean(mobileLock) === !c[k], `Mobile lock mismatch for ${k} in ${JSON.stringify(c)}`);
          }
        }
        if (!c.announcements) {
          const annBtnText = await studentPage.$eval('[data-testid="student-tab-announcements"]', el => el.innerText.trim());
          assert(!annBtnText.includes('Novo!') && !/\(\d+\)/.test(annBtnText), `Announcements badge/count leaked when disabled: "${annBtnText}"`);
        }
        const firstDisabled = ['tasks', 'announcements', 'resumos'].find(k => !c[k]);
        if (firstDisabled) {
          const clickSel = vp.name === 'mobile'
            ? `[data-testid="mobile-nav-${firstDisabled}"]`
            : `[data-testid="student-tab-${firstDisabled}"]`;
          await studentPage.click(clickSel);
          await studentPage.waitForSelector(`[data-testid="locked-area-screen-${firstDisabled}"]`, { timeout: 6000 });
          await studentPage.click('[data-testid="go-to-available-area-btn"]');
          await studentPage.waitForFunction(
            (dk) => !document.querySelector(`[data-testid="locked-area-screen-${dk}"]`),
            { timeout: 6000 },
            firstDisabled
          );
        }
        const storeBtnExists = await studentPage.$(vp.name === 'mobile' ? '[data-testid="mobile-nav-store"]' : '[data-testid="student-tab-store"]');
        const profileBtnExists = await studentPage.$(vp.name === 'mobile' ? '[data-testid="mobile-nav-profile"]' : '[data-testid="student-tab-profile"]');
        assert(Boolean(storeBtnExists) && Boolean(profileBtnExists), `Store or Profile missing on ${vp.name} in ${JSON.stringify(c)}`);
        const overflow = await studentPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        assert(!overflow, `Horizontal overflow detected at ${vp.w}px in combo ${JSON.stringify(c)}`);
      }
      console.log(`PASS combo T=${c.tasks} A=${c.announcements} R=${c.resumos} (entry=${c.expectedEntry})`);
    }

    console.log('--- 4. Direct Link, Preference Fallback, Locked Screen & Zero Leak ---');
    await setAreasApi(adminToken, { tasks: false, announcements: false, resumos: true });
    await studentPage.bringToFront();
    await studentPage.setViewport({ width: 1366, height: 900 });
    await studentPage.evaluate((sid) => {
      localStorage.setItem(`edutask_preferred_tab_${sid}`, 'tasks');
    }, testStudentId);
    await studentPage.goto(`${BASE}/aluno`, { waitUntil: 'domcontentloaded' });
    await studentPage.waitForSelector('[data-testid="student-resumos-panel"]', { timeout: 8000 });

    await studentPage.goto(`${BASE}/aluno?tab=announcements`, { waitUntil: 'domcontentloaded' });
    await studentPage.waitForSelector('[data-testid="locked-area-screen-announcements"]', { timeout: 8000 });
    const lockMsg = await studentPage.$eval('[data-testid="locked-area-message"]', el => el.innerText.trim());
    assert(lockMsg === EXACT_LOCKED_MSG, `Unexpected locked screen message: "${lockMsg}"`);
    const hasGrayscale = await studentPage.$eval('[data-testid="locked-area-screen-announcements"]', el => el.className.includes('grayscale'));
    assert(hasGrayscale, 'LockedAreaScreen missing grayscale class');
    const leakedAnnPanel = await studentPage.$('[data-testid="student-announcements-panel"]');
    assert(!leakedAnnPanel, 'Announcements panel leaked inside locked screen!');
    const goBtnText = await studentPage.$eval('[data-testid="go-to-available-area-btn"]', el => el.innerText.trim());
    assert(goBtnText.includes(EXACT_GO_BTN), `Go button missing text: "${goBtnText}"`);
    await studentPage.click('[data-testid="go-to-available-area-btn"]');
    await studentPage.waitForSelector('[data-testid="student-resumos-panel"]', { timeout: 8000 });
    console.log('PASS: Direct URL, preference fallback, locked screen UI & zero leak verified.');

    console.log('--- 5. Live Update Without Re-Login (Desktop & Mobile) ---');
    await setAreasApi(adminToken, { tasks: true, announcements: true, resumos: true });
    await studentPage.bringToFront();
    for (const vp of [{ name: 'desktop', w: 1366, h: 900 }, { name: 'mobile', w: 390, h: 844 }]) {
      await studentPage.setViewport({ width: vp.w, height: vp.h });
      await studentPage.goto(`${BASE}/aluno?tab=tasks`, { waitUntil: 'domcontentloaded' });
      await studentPage.waitForSelector('[data-testid="filter-all"]', { timeout: 8000 });

      await setAreasApi(adminToken, { tasks: false, announcements: true, resumos: true });
      await studentPage.waitForSelector('[data-testid="locked-area-screen-tasks"]', { timeout: 10000 });
      const tasksGridAfterLock = await studentPage.$('[data-testid="student-tasks-grid"]');
      assert(!tasksGridAfterLock, `Tasks grid still present on ${vp.name} after live lock!`);

      await setAreasApi(adminToken, { tasks: true, announcements: true, resumos: true });
      await studentPage.waitForSelector('[data-testid="filter-all"]', { timeout: 10000 });
      console.log(`PASS: Live lock & unlock on ${vp.name} without re-login.`);
    }

    const endTasks = (await apiReq('/api/tasks', { token: adminToken })).json?.length ?? 0;
    const endAnns = (await apiReq('/api/announcements', { token: adminToken })).json?.length ?? 0;
    const endSums = (await apiReq('/api/summaries', { token: adminToken })).json?.length ?? 0;
    assert(endTasks === origTasks && endAnns === origAnns && endSums === origSums, 'Content counts changed!');

    assert(pageErrors.length === 0, `Page errors detected: ${pageErrors.join('; ')}`);
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
    await setAreasApi(adminToken, { tasks: true, announcements: true, resumos: true }).catch(() => {});
    await apiReq('/api/ai/status', {
      method: 'PUT',
      token: adminToken,
      body: { frames_disabled: false },
    }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
