/* ==========================================================================
   Каталог HPL — фильтрация, сортировка, "загрузить еще"
   Тестовый бэкенд: data/products.json (аналог MIGX-грида на MODX,
   см. modx/README.md и modx/snippets/snGetHplProducts.php)
   ========================================================================== */
(function () {
  'use strict';

  var PAGE_SIZE = 9;
  var state = {
    data: null,
    apps: {},            // key -> label
    products: [],
    selected: [],        // выбранные сферы (ключи)
    sort: 'recommended',
    visible: PAGE_SIZE
  };

  var els = {};

  /* ---------- Утилиты ---------- */
  function plural(n, one, few, many) {
    n = Math.abs(n) % 100;
    var d = n % 10;
    if (n > 10 && n < 20) return many;
    if (d === 1) return one;
    if (d >= 2 && d <= 4) return few;
    return many;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stockInfo(stock) {
    switch (stock) {
      case 'in_stock': return { label: 'В наличии', cls: '' };
      case 'under_order': return { label: 'Под заказ', cls: 'product-card__badge--order' };
      case 'request': return { label: 'По запросу', cls: 'product-card__badge--request' };
      default: return { label: '', cls: '' };
    }
  }

  function priceHtml(p) {
    if (!p.price) return '';
    return '<span class="product-card__price-label">' + esc(p.price.label) + '</span>' +
           '<span class="product-card__price-value">' + esc(p.price.value) + '</span>';
  }

  /* ---------- Карточка товара ----------
     data-* атрибуты используются в MODX-режиме: snippet рендерит карточки
     на сервере (чанк hpl-product-card), и JS фильтрует уже готовый DOM. */
  /* Ссылка на карточку товара: в MODX её отдаёт snippet (поле url),
     в Netlify-версии — product.html?id=slug */
  function productUrl(p) {
    return p.href || ('product.html?id=' + encodeURIComponent(p.slug));
  }

  function cardDataAttrs(p) {
    return ' data-id="' + (p.id || 0) + '"' +
      ' data-slug="' + esc(p.slug) + '"' +
      ' data-href="' + esc(p.href || '') + '"' +
      ' data-title="' + esc(p.title) + '"' +
      ' data-category="' + esc(p.category) + '"' +
      ' data-thickness="' + (p.thickness || 0) + '"' +
      ' data-apps="' + esc((p.applications || []).join('|')) + '"' +
      ' data-tags="' + esc((p.tags || []).join('|')) + '"' +
      ' data-image="' + esc(p.image || '') + '"' +
      ' data-stock="' + esc(p.stock || '') + '"' +
      ' data-price-kind="' + esc((p.price && p.price.kind) || '') + '"' +
      ' data-price-label="' + esc((p.price && p.price.label) || '') + '"' +
      ' data-price-value="' + esc((p.price && p.price.value) || '') + '"';
  }

  function cardHtml(p) {
    var s = stockInfo(p.stock);
    var tags = (p.tags || []).map(function (t) {
      return '<span class="product-card__tag">' + esc(t) + '</span>';
    }).join('');
    var badge = s.label
      ? '<span class="product-card__badge ' + s.cls + '">' + s.label + '</span>'
      : '';
    var url = productUrl(p);
    return '' +
      '<article class="product-card"' + cardDataAttrs(p) + '>' +
        '<a class="product-card__picture" href="' + esc(url) + '">' +
          badge +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy">' +
        '</a>' +
        '<div class="product-card__body">' +
          '<span class="product-card__category">' + esc(p.category) + '</span>' +
          '<h3 class="product-card__title">' +
            '<a href="' + esc(url) + '">' + esc(p.title) + '</a>' +
          '</h3>' +
          '<div class="product-card__tags">' + tags + '</div>' +
          '<div class="product-card__footer">' +
            '<div>' + priceHtml(p) + '</div>' +
            '<a class="arrow-button" href="' + esc(url) + '">' +
              '<span>Подробнее</span>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M7 17L17 7M9 7h8v8"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- Фитринг / сортировка ---------- */
  function filtered() {
    var list = state.products.slice();

    if (state.selected.length) {
      list = list.filter(function (p) {
        return state.selected.some(function (k) {
          return (p.applications || []).indexOf(k) !== -1;
        });
      });
    }

    switch (state.sort) {
      case 'thickness_asc':
        list.sort(function (a, b) { return a.thickness - b.thickness; });
        break;
      case 'thickness_desc':
        list.sort(function (a, b) { return b.thickness - a.thickness; });
        break;
      case 'name':
        list.sort(function (a, b) { return a.title.localeCompare(b.title, 'ru'); });
        break;
      default: /* recommended — исходный порядок (сортировка в MIGX) */
    }
    return list;
  }

  /* ---------- Рендер ---------- */
  function bindPills() {
    els.pills.addEventListener('click', function (e) {
      var btn = e.target.closest('.catalog-pill');
      if (!btn) return;
      var app = btn.dataset.app;
      if (app === 'all') {
        state.selected = [];
      } else {
        var i = state.selected.indexOf(app);
        if (i === -1) state.selected.push(app);
        else state.selected.splice(i, 1);
      }
      state.visible = PAGE_SIZE;
      render();
    });
  }

  function render() {
    // пилюли: подсветка
    els.pills.querySelectorAll('.catalog-pill').forEach(function (btn) {
      var app = btn.dataset.app;
      var active = app === 'all' ? state.selected.length === 0 : state.selected.indexOf(app) !== -1;
      btn.classList.toggle('is-active', active);
    });

    var list = filtered();

    // счётчик
    els.count.innerHTML = 'Найдено <b>' + list.length + '</b> ' +
      plural(list.length, 'решение', 'решения', 'решений');

    // чипы активных фильтров
    if (state.selected.length) {
      els.chips.innerHTML = state.selected.map(function (k) {
        return '<span class="catalog-chip">' + esc(state.apps[k] || k) +
               '<button type="button" data-remove="' + esc(k) + '" aria-label="Убрать фильтр"></button></span>';
      }).join('');
      els.reset.hidden = false;
    } else {
      els.chips.innerHTML = '';
      els.reset.hidden = true;
    }

    // сетка
    var shown = list.slice(0, state.visible);
    els.grid.innerHTML = shown.map(cardHtml).join('');
    els.empty.hidden = list.length !== 0;

    // загрузить еще
    var left = list.length - shown.length;
    els.loadmore.hidden = left <= 0;
    if (left > 0) {
      els.loadmoreNote.textContent = 'Показано ' + shown.length + ' из ' + list.length;
    }
  }

  /* Генерация пилюль (только для Netlify-режима; в MODX пилюли рендерятся сервером) */
  function renderPills() {
    var html = '<button class="catalog-pill is-active" type="button" data-app="all">Все сферы</button>';
    Object.keys(state.apps).forEach(function (k) {
      html += '<button class="catalog-pill" type="button" data-app="' + esc(k) + '">' + esc(state.apps[k]) + '</button>';
    });
    els.pills.innerHTML = html;
    bindPills();
  }

  /* ---------- Запуск ---------- */
  function init() {
    els.pills = document.getElementById('catalogPills');
    els.grid = document.getElementById('catalogGrid');
    els.count = document.getElementById('catalogCount');
    els.chips = document.getElementById('catalogChips');
    els.reset = document.querySelector('.js-reset');
    els.empty = document.getElementById('catalogEmpty');
    els.loadmore = document.getElementById('catalogLoadmore');
    els.loadmoreNote = document.getElementById('catalogLoadmoreNote');
    els.sort = document.getElementById('catalogSort');

    if (!els.pills || !els.grid) return;

    els.chips.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove]');
      if (!btn) return;
      var k = btn.dataset.remove;
      var i = state.selected.indexOf(k);
      if (i !== -1) state.selected.splice(i, 1);
      state.visible = PAGE_SIZE;
      render();
    });

    els.reset.addEventListener('click', function () {
      state.selected = [];
      state.visible = PAGE_SIZE;
      render();
    });

    els.sort.addEventListener('change', function () {
      state.sort = els.sort.value;
      state.visible = PAGE_SIZE;
      render();
    });

    document.querySelector('.js-loadmore').addEventListener('click', function () {
      state.visible += PAGE_SIZE;
      render();
    });

    /* МОД-X режим: карточки и пилюли уже отрендерены snippet'ом
       (snGetHplProducts + чанк hpl-product-card) — работаем с DOM. */
    var domCards = els.grid.querySelectorAll('.product-card[data-slug]');
    if (domCards.length) {
      state.products = Array.prototype.map.call(domCards, function (card) {
        var d = card.dataset;
        return {
          id: parseInt(d.id, 10) || 0,
          slug: d.slug,
          title: d.title,
          category: d.category,
          thickness: parseInt(d.thickness, 10) || 0,
          applications: (d.apps || '').split('|').filter(Boolean),
          tags: (d.tags || '').split('|').filter(Boolean),
          image: d.image,
          stock: d.stock,
          href: d.href || null,
          price: d.priceValue ? { kind: d.priceKind, label: d.priceLabel, value: d.priceValue } : null
        };
      });
      els.pills.querySelectorAll('.catalog-pill[data-app]').forEach(function (btn) {
        var k = btn.dataset.app;
        if (k !== 'all') state.apps[k] = btn.textContent.trim();
      });
      bindPills();
      render();
      return;
    }

    /* Netlify-режим: данные из data/products.json */
    fetch('data/products.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        state.data = data;
        state.apps = data.applications || {};
        state.products = data.products || [];
        renderPills();
        render();
      })
      .catch(function (err) {
        els.grid.innerHTML = '<div class="catalog-empty" style="grid-column:1/-1;"><b>Не удалось загрузить каталог</b>' + esc(err.message) + '</div>';
        console.error(err);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
