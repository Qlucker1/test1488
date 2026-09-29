/* Minimal DOM shim smoke-test for catalog.js and product.js (Node, no jsdom). */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

class FakeEl {
  constructor(id) {
    this.id = id || '';
    this.innerHTML = '';
    this.textContent = '';
    this.hidden = false;
    this.value = '';
    this.dataset = {};
    this.style = {};
    this._listeners = {};
    const self = this;
    this.classList = {
      _s: new Set(),
      add(...c) { c.forEach(x => self.classList._s.add(x)); },
      remove(...c) { c.forEach(x => self.classList._s.delete(x)); },
      toggle(c, f) {
        const has = self.classList._s.has(c);
        const want = f === undefined ? !has : f;
        if (want) self.classList._s.add(c); else self.classList._s.delete(c);
        return want;
      },
      contains(c) { return self.classList._s.has(c); }
    };
  }
  addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); }
  removeEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  closest() { return null; }
  setAttribute() {}
  reset() {}
}

function makeEnv(extra = {}) {
  const byId = {};
  const docListeners = {};
  const document = {
    getElementById(id) { return byId[id] || (byId[id] = new FakeEl(id)); },
    querySelector(sel) { return byId['__q_' + sel] || (byId['__q_' + sel] = new FakeEl(sel)); },
    querySelectorAll() { return []; },
    addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    body: new FakeEl('body')
  };
  const sandbox = {
    document,
    window: {
      location: { search: extra.search || '' },
      addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); }
    },
    URLSearchParams,
    console,
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: (url) => {
      const m = String(url).match(/data\/products\.json/);
      if (m) {
        const json = fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8');
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(json)) });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) });
    },
    setTimeout,
    clearTimeout
  };
  return { sandbox, byId, docListeners };
}

function fireReady(docListeners) {
  (docListeners['DOMContentLoaded'] || []).forEach(fn => fn());
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const count = (html, sub) => html.split(sub).length - 1;

let failed = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('  PASS', name);
  else { failed++; console.log('  FAIL', name, extra); }
}

(async function testCatalog() {
  console.log('catalog.js:');
  const { sandbox, byId, docListeners } = makeEnv();
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8'), sandbox, { filename: 'main.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/catalog.js'), 'utf8'), sandbox, { filename: 'catalog.js' });
  fireReady(docListeners);
  await wait(150);

  const grid = byId['catalogGrid'];
  const countEl = byId['catalogCount'];
  const pills = byId['catalogPills'];
  const chips = byId['catalogChips'];
  const loadmore = byId['catalogLoadmore'];
  const note = byId['catalogLoadmoreNote'];
  const resetBtn = byId['__q_.js-reset'];
  const loadmoreBtn = byId['__q_.js-loadmore'];

  check('grid has 9 cards initially', count(grid.innerHTML, 'class="product-card"') === 9, 'got ' + count(grid.innerHTML, 'class="product-card"'));
  check('count shows «24 решения»', countEl.innerHTML.includes('<b>24</b>') && countEl.innerHTML.includes('решения'), countEl.innerHTML);
  check('loadmore visible', loadmore.hidden === false);
  check('note shows «Показано 9 из 24»', note.textContent.includes('9 из 24'), note.textContent);
  check('first card is 12mm partitions', grid.innerHTML.includes('HPL панели 12 мм для сантехнических перегородок'));
  check('card links to product.html?id=', grid.innerHTML.includes('product.html?id=hpl-12-peregorodki'));
  check('badge rendered', grid.innerHTML.includes('product-card__badge'));
  check('pills generated from JSON (8 apps + Все сферы)', count(pills.innerHTML, 'class="catalog-pill') === 9, 'got ' + count(pills.innerHTML, 'class="catalog-pill'));

  (loadmoreBtn._listeners['click'] || []).forEach(fn => fn({ target: loadmoreBtn, closest: () => loadmoreBtn }));
  await wait(30);
  check('load more → 18 cards', count(grid.innerHTML, 'class="product-card"') === 18, 'got ' + count(grid.innerHTML, 'class="product-card"'));

  const firstBefore = grid.innerHTML.indexOf('HPL панели 12 мм для сантехнических перегородок');
  const sortSel = byId['catalogSort'];
  sortSel.value = 'name';
  (sortSel._listeners['change'] || []).forEach(fn => fn());
  await wait(30);
  // sort сбрасывает видимые карточки к PAGE_SIZE (9); ru-collation: Антивандальный (№2) раньше Перегородочного (№8)
  check('sort by name: order correct + first card changed',
    grid.innerHTML.indexOf('HPL панели 12 мм для сантехнических перегородок') === -1
    && grid.innerHTML.indexOf('Антивандальный HPL 12 мм') !== -1
    && grid.innerHTML.indexOf('Антивандальный HPL 12 мм') < grid.innerHTML.indexOf('Перегородочный HPL 10 мм'));

  (pills._listeners['click'] || []).forEach(fn => fn({
    target: { closest: () => ({ dataset: { app: 'peregorodki' } }) }
  }));
  await wait(30);
  const m = countEl.innerHTML.match(/<b>(\d+)<\/b>/);
  check('filter «Перегородки» → 3 найдено', m && m[1] === '3', 'got ' + (m && m[1]));
  check('active chip rendered', chips.innerHTML.includes('Перегородки'));
  check('reset button visible', resetBtn.hidden === false);
})();

(async function testProduct() {
  console.log('product.js:');
  const { sandbox, byId, docListeners } = makeEnv({ search: '?id=hpl-12-peregorodki' });
  // статичные вкладки декора из product.html
  const decorTabs = ['solid', 'wood', 'stone', 'fantasy'].map(g => {
    const t = new FakeEl('tab-' + g);
    t.dataset = { decor: g };
    return t;
  });
  const decorTabsEl = new FakeEl('decorTabs');
  decorTabsEl.querySelectorAll = sel => (sel === '.decor-tab' ? decorTabs : []);
  byId['decorTabs'] = decorTabsEl;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8'), sandbox, { filename: 'main.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/product.js'), 'utf8'), sandbox, { filename: 'product.js' });
  fireReady(docListeners);
  await wait(150);

  const title = byId['productTitle'];
  const specs = byId['productSpecs'];
  const price = byId['productPriceValue'];
  const gallery = byId['galleryImage'];
  const facts = byId['factProduction'];
  const thicks = byId['thicknessChips'];
  const configSummary = byId['configSummary'];
  const decorGrid = byId['decorGrid'];
  const tech = byId['techspecGroups'];
  const why = byId['whyGrid'];
  const applying = byId['applyingGrid'];
  const projects = byId['projectsGrid'];
  const related = byId['relatedGrid'];
  const faq = byId['faqList'];
  const crumbs = byId['breadcrumbs'];

  check('title rendered', title.textContent === 'HPL панели 12 мм для сантехнических перегородок', title.textContent);
  check('specs: Толщина 12 мм', specs.innerHTML.includes('12 мм') && specs.innerHTML.includes('Тип материала'));
  check('price: от 4 200 ₽/м²', price.innerHTML.includes('4 200') && price.innerHTML.includes('/м²'), price.innerHTML);
  check('gallery image set', gallery.src === 'assets/img/products/p01.svg', gallery.src);
  check('production days fact', facts.textContent === 'от 10 рабочих дней', facts.textContent);
  check('breadcrumbs: MARK, Каталог HPL', crumbs.innerHTML.includes('Каталог HPL') && crumbs.innerHTML.includes('MARK'));
  check('thickness chips 6/8/10/12/16/25', ['6', '8', '10', '12', '16', '25'].every(t => thicks.innerHTML.includes(t + ' мм')));
  check('current thickness marked', thicks.innerHTML.includes('is-current'));
  check('config summary: 0101 + Super Matt', configSummary.innerHTML.includes('0101') && configSummary.innerHTML.includes('Super Matt'), configSummary.innerHTML);
  check('decor grid: 8 solid swatches', count(decorGrid.innerHTML, 'class="decor-swatch"') === 8, 'got ' + count(decorGrid.innerHTML, 'class="decor-swatch"'));
  check('techspec: 3 groups', count(tech.innerHTML, 'class="techspec-group"') === 3 && tech.innerHTML.includes('Абсолютная'));
  check('why: featured set (peregorodki)', why.innerHTML.includes('Влагостойкость') && why.innerHTML.includes('Антивандальность'));
  check('applying: 6 items', count(applying.innerHTML, 'product-applying__item') === 6 && applying.innerHTML.includes('Туалетные кабины'));
  check('projects: 2 cards', count(projects.innerHTML, 'project-card__body') === 2);
  check('related: cards rendered', count(related.innerHTML, 'class="related-card"') >= 1, 'got ' + count(related.innerHTML, 'class="related-card"'));
  check('faq: 4 items', count(faq.innerHTML, 'faq-item__front') === 4 && faq.innerHTML.includes('Можно ли использовать HPL 12 мм в душевых?'));

  decorTabs[1]._listeners['click'].forEach(fn => fn());
  await wait(30);
  check('decor tab «Древесные» → wood swatches', byId['decorGrid'].innerHTML.includes('0501') && byId['decorGrid'].innerHTML.includes('Дуб молочный') && count(byId['decorGrid'].innerHTML, 'class="decor-swatch"') === 8);

  const env2 = makeEnv({ search: '' });
  vm.createContext(env2.sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/product.js'), 'utf8'), env2.sandbox, { filename: 'product.js' });
  fireReady(env2.docListeners);
  await wait(150);
  check('no ?id → first product from JSON', env2.byId['productTitle'].textContent === 'HPL панели 12 мм для сантехнических перегородок');

  const env3 = makeEnv({ search: '?id=nonexistent' });
  vm.createContext(env3.sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/product.js'), 'utf8'), env3.sandbox, { filename: 'product.js' });
  fireReady(env3.docListeners);
  await wait(150);
  check('unknown slug → falls back to first product', env3.byId['productTitle'].textContent.length > 0, env3.byId['productTitle'].textContent);

  const env4 = makeEnv({ search: '' });
  vm.createContext(env4.sandbox);
  const jsonPayload = {
    applications: { peregorodki: 'Перегородки' },
    products: [{ slug: 'x-1', title: 'MIGX тест', category: 'Compact HPL', applications: ['peregorodki'], thickness: 12, tags: ['12 мм'], stock: 'in_stock', price: { kind: 'from', label: 'Цена за м²', value: 'от 5 000 ₽' }, image: 'assets/img/products/p02.svg', short_desc: 'desc' }],
    current: { slug: 'x-1', title: 'MIGX тест', category: 'Compact HPL', applications: ['peregorodki'], thickness: 12, tags: ['12 мм'], stock: 'in_stock', price: { kind: 'from', label: 'Цена за м²', value: 'от 5 000 ₽' }, image: 'assets/img/products/p02.svg', short_desc: 'desc', production_days: '25', min_order: 'от 20 м²', delivery: 'По РФ' }
  };
  env4.byId['hpl-product-json'] = new FakeEl('hpl-product-json');
  env4.byId['hpl-product-json'].innerHTML = JSON.stringify(jsonPayload);
  env4.byId['hpl-product-json'].textContent = env4.byId['hpl-product-json'].innerHTML;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/product.js'), 'utf8'), env4.sandbox, { filename: 'product.js' });
  fireReady(env4.docListeners);
  await wait(30);
  check('MODX JSON mode: title from embedded data', env4.byId['productTitle'].textContent === 'MIGX тест', env4.byId['productTitle'].textContent);
  check('MODX JSON mode: price', env4.byId['productPriceValue'].innerHTML.includes('5 000'));

  console.log('');
  console.log(failed === 0 ? 'ALL TESTS PASSED' : failed + ' TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
