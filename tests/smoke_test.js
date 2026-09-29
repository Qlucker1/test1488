/* Smoke-тесты JS каталога и карточки товара (Node, DOM-шим, браузер не нужен).
   Запуск: node tests/smoke_test.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
const exp = fn => DATA.products.filter(fn).length;

class FakeEl {
  constructor(id) {
    this.id = id || '';
    this.innerHTML = '';
    this.textContent = '';
    this.hidden = false;
    this.value = '';
    this.dataset = {};
    this.style = {};
    this.checked = false;
    this.parentElement = null;
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

/* Фейковый верхний ряд плиток «Подберите HPL по применению» */
function makeApps(byId) {
  const tiles = {};
  const make = (app, label, all = false) => {
    const t = new FakeEl('tile-' + app);
    t.dataset = { app };
    t.textContent = label;
    if (all) t.classList.add('app-tile--all');
    if (app === 'all') t.classList.add('is-active');
    tiles[app] = t;
    return t;
  };
  make('faades', 'Фасады');
  make('peregorodki', 'Перегородки');
  make('medicina', 'Медицина');
  make('laboratorii', 'Лаборатории');
  make('orientka', 'Отделка');
  make('mebel', 'Мебель');
  make('transport', 'Транспорт');
  make('all', 'Все сферы', true);

  const box = new FakeEl('catalogApps');
  box.querySelectorAll = sel => (sel === '.app-tile' ? Object.values(tiles) : []);
  byId['catalogApps'] = box;
  return { box, tiles };
}

/* Фейковый сайдбар доп. фильтров (статичный HTML в реальном DOM) */
function makeFilters(byId) {
  const inputs = [];
  const add = (filter, value, label) => {
    const inp = new FakeEl('inp-' + filter + '-' + value);
    inp.value = value;
    inp.dataset = { filter, value };
    const lbl = new FakeEl('lbl-' + value);
    lbl.textContent = label;
    inp.parentElement = lbl;
    inputs.push(inp);
    return inp;
  };
  ['Compact HPL', 'Standard HPL', 'Facade HPL', 'Laboratory HPL']
    .forEach(v => add('category', v, v));
  [
    ['fire', 'Трудногорючий'], ['biocidal', 'Биоцидный'],
    ['chemical', 'Химически стойкий'], ['moisture', 'Влагостойкий']
  ].forEach(a => add('property', a[0], a[1]));
  [['in_stock', 'В наличии'], ['under_order', 'Под заказ'], ['request', 'По запросу']]
    .forEach(a => add('stock', a[0], a[1]));

  const buttons = [4, 6, 8, 10, 12, 16, 25].map(t => {
    const b = new FakeEl('th-' + t);
    b.dataset = { filter: 'thickness', value: String(t) };
    return b;
  });

  const box = new FakeEl('catalogFilters');
  box.querySelectorAll = sel => {
    if (sel === 'input[data-filter]') return inputs;
    if (sel === '.thickness-toggle') return buttons;
    return [];
  };
  byId['catalogFilters'] = box;
  return { box, inputs, buttons };
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
  const { box: appsBox, tiles } = makeApps(byId);
  const { box, inputs, buttons } = makeFilters(byId);
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8'), sandbox, { filename: 'main.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/catalog.js'), 'utf8'), sandbox, { filename: 'catalog.js' });
  fireReady(docListeners);
  await wait(150);

  const grid = byId['catalogGrid'];
  const countEl = byId['catalogCount'];
  const chips = byId['catalogChips'];
  const resetBtn = byId['__q_.js-reset'];
  const loadmoreBtn = byId['__q_.js-loadmore'];
  const inp = (g, v) => inputs.find(i => i.dataset.filter === g && i.dataset.value === v);
  const thBtn = t => buttons.find(b => b.dataset.value === String(t));
  const clickTile = app => (appsBox._listeners['click'] || []).forEach(fn => fn({ target: { closest: () => tiles[app] } }));
  const change = () => (box._listeners['change'] || []).forEach(fn => fn({}));
  const clickTh = b => (box._listeners['click'] || []).forEach(fn => fn({ target: { closest: () => b } }));
  const doReset = () => (resetBtn._listeners['click'] || []).forEach(fn => fn());
  const found = () => (countEl.innerHTML.match(/<b>(\d+)<\/b>/) || [])[1];

  check('сетка: 9 карточек, «Найдено 24 решения», активна «Все сферы»',
    count(grid.innerHTML, 'class="product-card"') === 9 && found() === '24'
    && tiles.all.classList.contains('is-active'), 'found=' + found());
  check('первая карточка: 12 мм перегородки + бейдж KM1',
    grid.innerHTML.includes('HPL панели 12 мм для сантехнических перегородок')
    && grid.innerHTML.includes('product-card__fire-badge'));

  /* --- Плитки применения (верхний ряд) --- */
  clickTile('peregorodki'); await wait(20);
  const nPereg = exp(p => p.applications.includes('peregorodki'));
  check('плитка «Перегородки» → ' + nPereg + ' найдено', found() === String(nPereg), 'found=' + found());
  check('чип «Перегородки», плитка активна',
    chips.innerHTML.includes('Перегородки') && tiles.peregorodki.classList.contains('is-active')
    && !tiles.all.classList.contains('is-active'));

  clickTile('medicina'); await wait(20);
  check('плитка «Медицина» (одна за раз) → ' + exp(p => p.applications.includes('medicina')),
    found() === String(exp(p => p.applications.includes('medicina'))), 'found=' + found());

  clickTile('all'); await wait(20);
  check('плитка «Все сферы» → 24', found() === '24' && tiles.all.classList.contains('is-active'));

  /* --- Сайдбар: доп. фильтры --- */
  inp('category', 'Standard HPL').checked = true; change(); await wait(20);
  check('тип материала Standard HPL → ' + exp(p => p.category === 'Standard HPL'),
    found() === String(exp(p => p.category === 'Standard HPL')), 'found=' + found());
  doReset(); await wait(20);
  check('«Сбросить» → 24, чипы пусты, «Все сферы» активна',
    found() === '24' && chips.innerHTML === '' && tiles.all.classList.contains('is-active'), 'found=' + found());

  clickTh(thBtn(12)); await wait(20);
  check('толщина 12 мм → ' + exp(p => p.thickness === 12),
    found() === String(exp(p => p.thickness === 12)), 'found=' + found());
  doReset(); await wait(20);

  inp('property', 'fire').checked = true; change(); await wait(20);
  check('свойство «Трудногорючий» → ' + exp(p => (p.properties || []).includes('fire')),
    found() === String(exp(p => (p.properties || []).includes('fire'))), 'found=' + found());
  doReset(); await wait(20);

  inp('stock', 'in_stock').checked = true; change(); await wait(20);
  check('наличие «В наличии» → ' + exp(p => p.stock === 'in_stock'),
    found() === String(exp(p => p.stock === 'in_stock')), 'found=' + found());
  doReset(); await wait(20);

  /* комбо: плитка + толщина */
  clickTile('peregorodki'); await wait(5);
  clickTh(thBtn(12)); await wait(20);
  const combo = exp(p => p.applications.includes('peregorodki') && p.thickness === 12);
  check('комбо: Перегородки + 12 мм → ' + combo, found() === String(combo), 'found=' + found());
  check('чипы активны: сфера + толщина',
    (chips.innerHTML.match(/data-remove="[^"]*"/g) || []).length === 2);
  doReset(); await wait(20);
  check('после сброса снова 24', found() === '24');

  /* load more + сортировка */
  (loadmoreBtn._listeners['click'] || []).forEach(fn => fn({ target: loadmoreBtn, closest: () => loadmoreBtn }));
  await wait(20);
  check('load more → 18 карточек', count(grid.innerHTML, 'class="product-card"') === 18,
    'got ' + count(grid.innerHTML, 'class="product-card"'));

  const sortSel = byId['catalogSort'];
  sortSel.value = 'name';
  (sortSel._listeners['change'] || []).forEach(fn => fn());
  await wait(20);
  check('сортировка по названию (ru-collation)',
    grid.innerHTML.indexOf('Антивандальный HPL 12 мм') !== -1
    && grid.innerHTML.indexOf('Антивандальный HPL 12 мм') < grid.innerHTML.indexOf('Перегородочный HPL 10 мм'));

  console.log('');
  await testProduct();

  console.log(failed === 0 ? 'ALL TESTS PASSED' : failed + ' TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();

async function testProduct() {
  console.log('product.js:');
  const { sandbox, byId, docListeners } = makeEnv({ search: '?id=hpl-12-peregorodki' });
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

  check('заголовок товара', title.textContent === 'HPL панели 12 мм для сантехнических перегородок', title.textContent);
  check('specs: Толщина 12 мм + «Применение» полный текст',
    specs.innerHTML.includes('12 мм') && specs.innerHTML.includes('Сантехнические и душевые перегородки'));
  check('price: от 4 200 ₽/м² (без дубля ₽)',
    price.innerHTML.includes('4 200') && price.innerHTML.includes('/м²') && price.innerHTML.indexOf('₽ ₽') === -1, price.innerHTML);
  check('галерея: изображение продукта', gallery.src === 'assets/img/products/p01.svg', gallery.src);
  check('факт: срок производства', facts.textContent === 'от 10 рабочих дней', facts.textContent);
  check('крошки: MARK + Каталог HPL', byId['breadcrumbs'].innerHTML.includes('Каталог HPL'));
  check('чипы толщин (без категорий), текущая «— текущая»',
    ['6', '8', '10', '12', '16', '25'].every(t => thicks.innerHTML.includes(t + ' мм'))
    && !thicks.innerHTML.includes('Laboratory') && thicks.innerHTML.includes('— текущая'));

  check('конфигуратор: 8 свотчей однотонных',
    count(byId['configDecor'].innerHTML, 'config-decor-swatch__code') === 8
    && byId['configDecor'].innerHTML.includes('0101'));
  check('сводка конфигурации: 0101 + Super Matt',
    byId['configSummary'].innerHTML.includes('0101') && byId['configSummary'].innerHTML.includes('Super Matt'));

  (byId['configDecorGroups']._listeners['click'] || []).forEach(fn => fn({
    target: { closest: () => ({ dataset: { group: 'wood' } }) }
  }));
  await wait(20);
  check('конфигуратор: группа «Древесные» → 0501',
    byId['configDecor'].innerHTML.includes('0501')
    && count(byId['configDecor'].innerHTML, 'config-decor-swatch__code') === 8
    && byId['configSummary'].innerHTML.includes('0501'));

  check('тех. описание: 3 группы',
    count(byId['techspecGroups'].innerHTML, 'class="techspec-group"') === 3);
  check('«Почему подходит»: влагостойкость + антивандальность',
    byId['whyGrid'].innerHTML.includes('Влагостойкость') && byId['whyGrid'].innerHTML.includes('Антивандальность'));
  check('«Где применяется»: 6 позиций', count(byId['applyingGrid'].innerHTML, 'product-applying__item') === 6);
  check('проекты: 2 карточки', count(byId['projectsGrid'].innerHTML, 'project-card__body') === 2);
  check('«Другие решения»: карточки', count(byId['relatedGrid'].innerHTML, 'class="related-card"') >= 1);
  check('FAQ: 4 вопроса', count(byId['faqList'].innerHTML, 'faq-item__front') === 4);

  /* без ?id → первый товар */
  const env2 = makeEnv({ search: '' });
  vm.createContext(env2.sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/product.js'), 'utf8'), env2.sandbox, { filename: 'product.js' });
  fireReady(env2.docListeners);
  await wait(150);
  check('без ?id → первый товар', env2.byId['productTitle'].textContent === 'HPL панели 12 мм для сантехнических перегородок');

  /* MODX JSON-режим */
  const env4 = makeEnv({ search: '' });
  vm.createContext(env4.sandbox);
  const jsonPayload = {
    applications: { peregorodki: 'Перегородки' },
    products: [{ slug: 'x-1', title: 'MIGX тест', category: 'Compact HPL', applications: ['peregorodki'], thickness: 12, tags: ['12 мм'], properties: ['moisture'], stock: 'in_stock', price: { kind: 'from', label: 'Цена за м²', value: 'от 5 000 ₽' }, image: 'assets/img/products/p02.svg', short_desc: 'desc' }],
    current: { slug: 'x-1', title: 'MIGX тест', category: 'Compact HPL', applications: ['peregorodki'], thickness: 12, tags: ['12 мм'], properties: ['moisture'], stock: 'in_stock', price: { kind: 'from', label: 'Цена за м²', value: 'от 5 000 ₽' }, image: 'assets/img/products/p02.svg', short_desc: 'desc', production_days: '25', min_order: 'от 20 м²', delivery: 'По РФ' }
  };
  env4.byId['hpl-product-json'] = new FakeEl('hpl-product-json');
  env4.byId['hpl-product-json'].innerHTML = JSON.stringify(jsonPayload);
  env4.byId['hpl-product-json'].textContent = env4.byId['hpl-product-json'].innerHTML;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/product.js'), 'utf8'), env4.sandbox, { filename: 'product.js' });
  fireReady(env4.docListeners);
  await wait(30);
  check('MODX JSON: заголовок из вшитых данных', env4.byId['productTitle'].textContent === 'MIGX тест', env4.byId['productTitle'].textContent);
  check('MODX JSON: цена', env4.byId['productPriceValue'].innerHTML.includes('5 000'));
}
