import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';

// Fully isolated gallery fixtures. No live account, image model or API calls.
const root = process.cwd();
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'tipo-lightbox-contracts-'));
const providerCalls = [];
const pageErrors = [];
let checks = 0;
function check(label, assertion) {
  try { assertion(); checks++; }
  catch (error) { console.error(`FAIL ${label}`); throw error; }
}
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') {
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    }
    if (/127\.0\.0\.1|googleapis|higgsfield|magnific|freepik|runware/i.test(url.hostname)) providerCalls.push(url.href);
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => { pageErrors.push(error.message); console.error('Page error:', error.message); });
  await page.goto('http://localhost/fotograma.html');
  await page.waitForSelector('#studioReviewOpen');
  check('initial page error-free', () => assert.deepEqual(pageErrors, []));

  async function seed(count = 4) {
    return page.evaluate(async total => {
      closeLightbox();
      state.pending = [];
      galleryQuery = '';
      $('gallerySearch').value = '';
      for (const take of state.takes) URL.revokeObjectURL(take.url);
      state.takes = [];
      const database = await db();
      await new Promise((resolve, reject) => {
        const tx = database.transaction('takes', 'readwrite');
        tx.objectStore('takes').clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      const definitions = [
        ['a', '#bf573e', 960, 540, 'MATCH A landscape'],
        ['b', '#338c99', 360, 640, 'MATCH B portrait'],
        ['c', '#b1984f', 960, 300, 'MATCH C wide'],
        ['d', '#605887', 300, 960, 'OTHER D tall'],
      ].slice(0, total);
      for (let i = 0; i < definitions.length; i++) {
        const [id, color, width, height, caption] = definitions[i];
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#f8f4e8'; ctx.fillRect(8, 8, width - 16, 6);
        ctx.fillRect(8, height - 14, width - 16, 6);
        ctx.font = 'bold 42px sans-serif'; ctx.fillText(id.toUpperCase(), 30, 70);
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        await idbPut({
          id: `fixture-${id}`, caption, liked: false, blob, ts: 4_000 - i * 1_000,
          params: { ...snapshotParams(), scene: `SCENE_${id.toUpperCase()}_ONLY`, prompt: `EXACT_PROMPT_${id.toUpperCase()}_ONLY`, model: 'fixture-model', directionLabel: 'Fixture' },
        });
      }
      await loadGallery();
      window.__lightboxDownloads = [];
      const realAnchorClick = HTMLAnchorElement.prototype.click;
      if (!window.__lightboxAnchorPatched) {
        HTMLAnchorElement.prototype.click = function () {
          if (this.download && this.href.startsWith('blob:')) {
            window.__lightboxDownloads.push({ href: this.href, filename: this.download });
            return;
          }
          return realAnchorClick.call(this);
        };
        window.__lightboxAnchorPatched = true;
      }
      return state.takes.map(take => ({ id: take.id, url: take.url }));
    }, count);
  }

  async function open(id) {
    const trigger = page.locator(`#gallery [data-take-id="fixture-${id}"] img`);
    await trigger.focus();
    await trigger.press('Enter');
    await page.waitForFunction(() => $('lightbox').classList.contains('open') && document.activeElement === $('lightboxClose'));
  }
  async function ids() {
    return page.evaluate(() => {
      const takeFor = id => state.takes.find(take => take.url === $(id).src)?.id || '';
      return {
        a: takeFor('lightboxImg'), b: takeFor('lightboxCompareImg'),
        open: $('lightbox').classList.contains('open'),
        compare: !$('lightboxComparePanel').hidden,
        counter: $('lightboxCounter').textContent,
        title: $('lightboxTitle').textContent,
        storedPrompt: lightboxTake()?.params?.prompt || '',
        prevDisabled: $('lightboxPrev').disabled,
        nextDisabled: $('lightboxNext').disabled,
        compareDisabled: $('lightboxCompareToggle').disabled,
      };
    });
  }
  async function filter(value) {
    await page.evaluate(query => {
      $('gallerySearch').value = query;
      $('gallerySearch').dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  await seed();
  await page.evaluate(() => {
    state.pending = [{ id: 'pending-only', status: 'queued', msg: 'fixture waiting', model: 'nano_banana_2', provider: 'higgsfield' }];
    renderGallery(-1);
  });
  await open('a');
  let stateNow = await ids();
  check('anywhere on gallery image opens primary A', () => assert.equal(stateNow.a, 'fixture-a'));
  check('pending jobs excluded from counter', () => assert.match(stateNow.counter, /1\s*(?:de|\/)\s*4/));
  check('beginning has no previous', () => assert.equal(stateNow.prevDisabled, true));
  check('beginning has a next', () => assert.equal(stateNow.nextDisabled, false));
  await page.keyboard.press('ArrowLeft');
  stateNow = await ids();
  check('left boundary does not wrap', () => assert.equal(stateNow.a, 'fixture-a'));
  await page.locator('#lightboxNext').click();
  stateNow = await ids();
  check('next follows gallery order', () => assert.equal(stateNow.a, 'fixture-b'));
  check('counter follows primary', () => assert.match(stateNow.counter, /2\s*(?:de|\/)\s*4/));
  check('primary retains original stored prompt internally', () => assert.equal(stateNow.storedPrompt, 'EXACT_PROMPT_B_ONLY'));
  await page.keyboard.press('ArrowRight');
  stateNow = await ids();
  check('keyboard right advances', () => assert.equal(stateNow.a, 'fixture-c'));
  await page.keyboard.press('ArrowRight');
  stateNow = await ids();
  check('last frame selected', () => assert.equal(stateNow.a, 'fixture-d'));
  check('last frame disables next', () => assert.equal(stateNow.nextDisabled, true));
  await page.keyboard.press('ArrowRight');
  stateNow = await ids();
  check('right boundary does not wrap', () => assert.equal(stateNow.a, 'fixture-d'));
  await page.keyboard.press('ArrowLeft');
  stateNow = await ids();
  check('keyboard left reverses', () => assert.equal(stateNow.a, 'fixture-c'));
  await page.locator('#lightboxClose').click();
  stateNow = await ids();
  check('X closes overlay', () => assert.equal(stateNow.open, false));
  const restoredFocus = await page.evaluate(() => document.activeElement.closest('[data-take-id]')?.dataset.takeId);
  check('X restores focus to a gallery take', () => assert.ok(restoredFocus));

  await open('a');
  await page.locator('#lightboxCompareToggle').click();
  await page.selectOption('#lightboxCompareSelect', 'fixture-b');
  await page.locator('#lightboxNext').click();
  stateNow = await ids();
  check('forward navigation skips pinned middle image', () => assert.deepEqual([stateNow.a, stateNow.b], ['fixture-c', 'fixture-b']));
  await page.locator('#lightboxPrev').click();
  stateNow = await ids();
  check('backward navigation skips pinned middle image', () => assert.deepEqual([stateNow.a, stateNow.b], ['fixture-a', 'fixture-b']));
  await page.locator('#lightboxClose').click();

  await filter('MATCH');
  await open('a');
  stateNow = await ids();
  check('search narrows lightbox order', () => assert.match(stateNow.counter, /1\s*(?:de|\/)\s*3/));
  await page.locator('#lightboxCompareToggle').click();
  await page.selectOption('#lightboxCompareSelect', 'fixture-c');
  stateNow = await ids();
  check('comparison exposes secondary frame', () => assert.equal(stateNow.compare, true));
  check('comparison selected B is distinct', () => assert.equal(stateNow.b, 'fixture-c'));
  const compareOptions = await page.locator('#lightboxCompareSelect option:not([disabled])').evaluateAll(options => options.map(option => option.value));
  check('comparison excludes primary', () => assert.ok(!compareOptions.includes('fixture-a')));
  check('comparison excludes filtered-out frames', () => assert.ok(!compareOptions.includes('fixture-d')));
  await page.locator('#lightboxNext').click();
  stateNow = await ids();
  check('A navigates while B remains pinned', () => assert.deepEqual([stateNow.a, stateNow.b], ['fixture-b', 'fixture-c']));
  check('A never navigates into pinned B', () => assert.equal(stateNow.nextDisabled, true));
  check('comparison counter uses complete filtered gallery index', () => assert.match(stateNow.counter, /2\s*(?:de|\/)\s*3/));
  check('inspector remains about primary A', () => assert.equal(stateNow.title, 'MATCH B portrait'));
  const actionScope = await page.locator('#lightboxActionScope').textContent();
  check('actions explicitly identify primary scope', () => assert.match(actionScope, /A/));
  const promptSurfaces = await page.locator('#lightboxPromptToggle, #lightboxPromptPanel, #lightboxPromptCopy, #gallery [data-a="copy"]').count();
  check('comparison has no prompt or copy surfaces', () => assert.equal(promptSurfaces, 0));
  const publicDom = await page.locator('body').innerHTML();
  check('comparison does not insert compiled prompt into DOM', () => assert.doesNotMatch(publicDom, /EXACT_PROMPT_[ABCD]_ONLY/));
  await page.locator('#lightboxDownload').click();
  const download = await page.evaluate(() => ({ clicked: window.__lightboxDownloads[0], wanted: state.takes.find(take => take.id === 'fixture-b').url }));
  check('download targets A blob', () => assert.equal(download.clicked.href, download.wanted));
  check('download retains PNG filename', () => assert.match(download.clicked.filename, /\.png$/));
  await page.locator('#lightboxLike').click();
  const liked = await page.evaluate(() => state.takes.filter(take => take.liked).map(take => take.id));
  check('like targets only A', () => assert.deepEqual(liked, ['fixture-b']));
  stateNow = await ids();
  check('like redraw preserves pinned B', () => assert.deepEqual([stateNow.a, stateNow.b], ['fixture-b', 'fixture-c']));

  await page.locator('#lightboxCompareSelect').focus();
  const beforeSelect = (await ids()).a;
  await page.keyboard.press('ArrowLeft');
  stateNow = await ids();
  check('select arrow key does not navigate A', () => assert.equal(stateNow.a, beforeSelect));
  await page.selectOption('#lightboxCompareSelect', 'fixture-c');
  const beforeTyping = (await ids()).a;
  for (const kind of ['text', 'number', 'range']) {
    await page.evaluate(type => {
      const input = document.createElement('input'); input.id = 'lightbox-native-fixture'; input.type = type;
      input.value = type === 'text' ? 'fixture' : '2'; input.min = '0'; input.max = '4';
      $('lightboxInspector').appendChild(input); input.focus();
    }, kind);
    await page.keyboard.press('ArrowLeft');
    stateNow = await ids();
    check(`${kind} input arrow key does not navigate A`, () => assert.equal(stateNow.a, beforeTyping));
    await page.locator('#lightbox-native-fixture').evaluate(el => el.remove());
  }
  const focusables = await page.locator('#lightbox').evaluate(el => [...el.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter(node => node.getClientRects().length).map(node => node.id));
  await page.locator(`#${focusables[0]}`).focus();
  await page.keyboard.press('Shift+Tab');
  let focusId = await page.evaluate(() => document.activeElement.id);
  check('focus wraps backward inside overlay', () => assert.equal(focusId, focusables.at(-1)));
  await page.keyboard.press('Tab');
  focusId = await page.evaluate(() => document.activeElement.id);
  check('focus wraps forward inside overlay', () => assert.equal(focusId, focusables[0]));
  const visited = [];
  for (let i = 0; i < focusables.length; i++) {
    await page.keyboard.press('Tab');
    visited.push(await page.evaluate(() => ({ id: document.activeElement.id, inside: !!document.activeElement.closest('#lightbox') })));
  }
  check('tab sequence never leaves modal', () => assert.ok(visited.every(item => item.inside)));
  check('comparison selector participates in tab order', () => assert.ok(visited.some(item => item.id === 'lightboxCompareSelect')));
  await page.screenshot({ path: path.join(output, 'compare-desktop.png') });
  await page.locator('#lightboxReuse').click();
  stateNow = await ids();
  const reusedScene = await page.locator('#scene').inputValue();
  check('reuse closes lightbox', () => assert.equal(stateNow.open, false));
  check('reuse restores A parameters', () => assert.equal(reusedScene, 'SCENE_B_ONLY'));

  await open('b');
  await page.locator('#lightboxCompareToggle').click();
  await page.selectOption('#lightboxCompareSelect', 'fixture-c');
  await page.locator('#lightboxToSheets').click();
  await page.waitForFunction(() => utilityState.active === 'sheets' && !!utilityState.image);
  const sheetInput = await page.evaluate(async () => {
    const image = new Image(); image.src = utilityState.image.dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, pixel: [...ctx.getImageData(image.width / 2, image.height / 2, 1, 1).data] };
  });
  check('Sheets receives A portrait geometry', () => assert.deepEqual([sheetInput.width, sheetInput.height], [360, 640]));
  check('Sheets receives A pixels, not B', () => assert.ok(Math.abs(sheetInput.pixel[0] - 51) < 8 && Math.abs(sheetInput.pixel[1] - 140) < 8));
  await page.evaluate(() => setFotogramaTool('create'));

  await seed();
  await open('a');
  await page.locator('#lightboxCompareToggle').click();
  await page.selectOption('#lightboxCompareSelect', 'fixture-d');
  await filter('MATCH');
  stateNow = await ids();
  check('filter keeps valid primary', () => assert.equal(stateNow.a, 'fixture-a'));
  check('filter removing pinned B exits comparison', () => assert.equal(stateNow.compare, false));
  check('filter recomputes counter', () => assert.match(stateNow.counter, /1\s*(?:de|\/)\s*3/));
  await filter('OTHER');
  stateNow = await ids();
  check('filter removing A reconciles to remaining completed take', () => assert.equal(stateNow.a, 'fixture-d'));
  check('single filtered take disables compare', () => assert.equal(stateNow.compareDisabled, true));
  check('single filtered take disables both arrows', () => assert.ok(stateNow.prevDisabled && stateNow.nextDisabled));
  await filter('MATCH');
  await page.locator('#lightboxCompareToggle').click();
  await page.selectOption('#lightboxCompareSelect', 'fixture-c');
  const beforeArrival = await ids();
  const arrivingId = await page.evaluate(() => {
    const source = state.takes.find(take => take.id === 'fixture-b');
    addTake(URL.createObjectURL(source.blob), 'MATCH E arrived', source.blob, { ...source.params, scene: 'SCENE_E_ONLY', prompt: 'EXACT_PROMPT_E_ONLY' });
    return state.takes[0].id;
  });
  stateNow = await ids();
  check('new matching result does not steal A or B', () => assert.deepEqual([stateNow.a, stateNow.b], [beforeArrival.a, beforeArrival.b]));
  check('new matching result updates filtered count', () => assert.match(stateNow.counter, /2\s*(?:de|\/)\s*4/));
  const arrivalOption = await page.locator(`#lightboxCompareSelect option[value="${arrivingId}"]`).count();
  check('new result becomes comparison option', () => assert.equal(arrivalOption, 1));
  await page.evaluate(() => {
    const source = state.takes[0];
    addTake(URL.createObjectURL(source.blob), 'EXCLUDED F arrived', source.blob, { ...source.params, scene: 'ONLY_F', prompt: 'ONLY_F' });
  });
  stateNow = await ids();
  check('filtered-out arrival does not change visible count', () => assert.match(stateNow.counter, /2\s*(?:de|\/)\s*4/));
  await page.locator('#lightboxDelete').click();
  await page.waitForFunction(id => !state.takes.some(take => take.id === id), beforeArrival.a);
  stateNow = await ids();
  const remaining = await page.evaluate(() => state.takes.map(take => take.id));
  check('delete removes A only', () => assert.ok(!remaining.includes(beforeArrival.a) && remaining.includes(beforeArrival.b)));
  check('delete reconciles A without colliding with B', () => assert.ok(stateNow.open && stateNow.a && stateNow.a !== stateNow.b));
  check('delete keeps valid pinned B', () => assert.equal(stateNow.b, beforeArrival.b));
  await page.evaluate(() => deleteTake(state.takes.find(take => take.id === 'fixture-c')));
  stateNow = await ids();
  check('deleting pinned B disables comparison', () => assert.equal(stateNow.compare, false));
  check('deleting pinned B does not close valid A', () => assert.equal(stateNow.open, true));
  await filter('NO_RESULT_MATCH_123');
  stateNow = await ids();
  check('zero matching takes closes viewer', () => assert.equal(stateNow.open, false));

  await seed(2);
  await open('a');
  await page.locator('#lightboxCompareToggle').click();
  stateNow = await ids();
  check('two images can compare without same-image navigation', () => assert.ok(stateNow.compare && stateNow.a !== stateNow.b && stateNow.prevDisabled && stateNow.nextDisabled));
  await page.locator('#lightboxCompareToggle').click();
  stateNow = await ids();
  check('leaving comparison restores access to formerly pinned image', () => assert.equal(stateNow.nextDisabled, false));

  await seed(1);
  await open('a');
  stateNow = await ids();
  check('one saved take cannot compare', () => assert.equal(stateNow.compareDisabled, true));
  check('one saved take cannot navigate', () => assert.ok(stateNow.prevDisabled && stateNow.nextDisabled));
  await page.locator('#lightboxDelete').click();
  await page.waitForFunction(() => !$('lightbox').classList.contains('open'));
  stateNow = await ids();
  const emptyVisible = await page.locator('#galleryEmpty').isVisible();
  check('deleting last take closes viewer', () => assert.equal(stateNow.open, false));
  check('deleting last take exposes empty gallery', () => assert.equal(emptyVisible, true));
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  const persistedAfterDeletion = await page.evaluate(async () => { await loadGallery(); return state.takes.map(take => take.id); });
  check('deleted record stays absent after immediate reload', () => assert.deepEqual(persistedAfterDeletion, []));
  const countAfterReload = await page.locator('#gallery [data-take-id]').count();
  check('last deletion persists to IndexedDB', () => assert.equal(countAfterReload, 0));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  await seed();
  await open('a');
  await page.locator('#lightboxCompareToggle').click();
  await page.selectOption('#lightboxCompareSelect', 'fixture-b');
  await page.waitForFunction(() => $('lightboxImg').complete && $('lightboxCompareImg').complete);
  const mobile = await page.evaluate(() => {
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overlay: box($('lightbox')),
      controls: ['lightboxClose', 'lightboxPrev', 'lightboxNext', 'lightboxCompareSelect'].map(id => ({ id, ...box($(id)) })),
      images: ['lightboxImg', 'lightboxCompareImg'].map(id => ({ id, ...box($(id)), fit: getComputedStyle($(id)).objectFit, decoded: $(id).naturalWidth > 0 })),
      overflowX: $('lightbox').scrollWidth > $('lightbox').clientWidth + 1,
    };
  });
  check('mobile overlay fills viewport without horizontal overflow', () => assert.ok(!mobile.overflowX && mobile.overlay.x >= 0 && mobile.overlay.right <= mobile.viewport.width + 1));
  for (const control of mobile.controls) check(`mobile ${control.id} inside viewport`, () => assert.ok(control.width > 0 && control.x >= 0 && control.right <= mobile.viewport.width + 1 && control.y >= 0 && control.bottom <= mobile.viewport.height + 1));
  for (const image of mobile.images) {
    check(`mobile ${image.id} contains rather than crops`, () => assert.equal(image.fit, 'contain'));
    check(`mobile ${image.id} decoded and visible`, () => assert.ok(image.decoded && image.width > 0 && image.height > 0));
    check(`mobile ${image.id} fits viewport`, () => assert.ok(image.x >= 0 && image.right <= mobile.viewport.width + 1 && image.y >= 0 && image.bottom <= mobile.viewport.height + 1));
  }
  await page.screenshot({ path: path.join(output, 'compare-mobile.png') });
  await page.keyboard.press('Escape');
  stateNow = await ids();
  check('Escape closes comparison on mobile', () => assert.equal(stateNow.open, false));
  check('no JavaScript errors throughout interaction', () => assert.deepEqual(pageErrors, []));
  check('no real provider requests', () => assert.deepEqual(providerCalls, []));
  console.log(`PASS ${checks} lightbox checks. No provider requests or image charges. Screenshots: ${output}`);
} finally {
  await browser.close();
}
