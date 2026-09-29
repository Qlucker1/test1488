/* ==========================================================================
   Каталог HPL — фильтры, сортировка, "загрузить еще"
   - Верхний ряд плиток «Подберите HPL по применению» — быстрый фильтр
     по сфере (одна за раз, «Все сферы» = без фильтра).
   - Сайдбар слева — доп. фильтры: тип материала, толщина, специальные
     свойства, (+ дополнительные параметры: наличие).
   - Состояние фильтров читается из DOM (единый источник) — одинаково
     работает и в Netlify-режиме (fetch data/products.json), и в MODX
     (карточки предрендерены snippet'ом snGetHplProducts).

   Обязательные поля товара: slug, title, category, applications[],
   thickness, tags[], stock, price{kind,label,value}, image, properties[]
   properties: fire | biocidal | chemical | moisture
   ========================================================================== */
(function () {
  'use strict';

  var PAGE_SIZE = 9;
  var STOCK_LABELS = { in_stock: 'В наличии', under_order: 'Под заказ', request: 'По запросу' };

  var state = {
    data: null,
    appLabels: {},    // ключ сферы -> подпись (из плиток)
    propLabels: {},   // ключ свойства -> подпись (из сайдбара)
    products: [],
    filters: { apps: '', category: [], thickness: [], property: [], stock: [] },
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

  /* Ссылка на карточку товара: в MODX её отдаёт snippet (поле url),
     в Netlify-версии — product.html?id=slug */
  function productUrl(p) {
    return p.href || ('product.html?id=' + encodeURIComponent(p.slug));
  }

  /* ---------- Карточка товара ---------- */
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
      ' data-properties="' + esc((p.properties || []).join('|')) + '"' +
      ' data-price-kind="' + esc((p.price && p.price.kind) || '') + '"' +
      ' data-price-label="' + esc((p.price && p.price.label) || '') + '"' +
      ' data-price-value="' + esc((p.price && p.price.value) || '') + '"' +
      ' data-fire-class="' + esc(p.fire_class || '') + '"';
  }

  function cardHtml(p) {
    var s = stockInfo(p.stock);
    var tags = (p.tags || []).map(function (t) {
      return '<span class="product-card__tag">' + esc(t) + '</span>';
    }).join('');
    var badge = s.label
      ? '<span class="product-card__badge ' + s.cls + '">' + s.label + '</span>'
      : '';
    var fireBadge = p.fire_class
      ? '<span class="product-card__fire-badge">' + esc(p.fire_class) + '</span>'
      : '';
    var url = productUrl(p);
    return '' +
      '<article class="product-card"' + cardDataAttrs(p) + '>' +
        '<a class="product-card__picture" href="' + esc(url) + '">' +
          badge +
          fireBadge +
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

  /* ---------- Чтение фильтров из DOM (единый источник) ---------- */
  function readFilters() {
    var f = { apps: '', category: [], thickness: [], property: [], stock: [] };

    /* Сфера применения — активная плитка верхнего ряда */
    els.appTiles.forEach(function (t) {
      if (t.classList.contains('is-active') && t.dataset.app !== 'all') {
        f.apps = t.dataset.app;
      }
    });

    /* Чекбоксы сайдбара */
    els.filterInputs.forEach(function (inp) {
      if (inp.checked && f[inp.dataset.filter]) {
        f[inp.dataset.filter].push(inp.value);
      }
    });

    /* Толщина — кнопки-переключатели сайдбара */
    els.thicknessButtons.forEach(function (b) {
      if (b.classList.contains('is-active')) {
        f.thickness.push(parseInt(b.dataset.value, 10));
      }
    });
    f.thickness.sort(function (a, b) { return a - b; });

    state.filters = f;
  }

  function readLabels() {
    state.appLabels = {};
    state.propLabels = {};
    els.appTiles.forEach(function (t) {
      if (t.dataset.app && t.dataset.app !== 'all') {
        var txt = (t.textContent || '').trim();
        if (txt) state.appLabels[t.dataset.app] = txt;
      }
    });
    els.filterInputs.forEach(function (inp) {
      if (inp.dataset.filter !== 'property') return;
      var label = inp.parentElement ? (inp.parentElement.textContent || '').trim() : '';
      state.propLabels[inp.value] = label || inp.value;
    });
  }

  /* Выставить активную сферу в плитках ('' = «Все сферы») */
  function setActiveApp(key) {
    els.appTiles.forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.app === (key || 'all'));
    });
  }

  function clearFilterDom() {
    els.filterInputs.forEach(function (inp) { inp.checked = false; });
    els.thicknessButtons.forEach(function (b) { b.classList.remove('is-active'); });
    setActiveApp('');
  }

  /* ---------- Фильтрация / сортировка ---------- */
  function filtered() {
    var list = state.products.slice();
    var f = state.filters;

    if (f.apps) {
      list = list.filter(function (p) {
        return (p.applications || []).indexOf(f.apps) !== -1;
      });
    }
    if (f.category.length) {
      list = list.filter(function (p) { return f.category.indexOf(p.category) !== -1; });
    }
    if (f.thickness.length) {
      list = list.filter(function (p) { return f.thickness.indexOf(p.thickness) !== -1; });
    }
    if (f.property.length) {
      list = list.filter(function (p) {
        return f.property.some(function (k) { return (p.properties || []).indexOf(k) !== -1; });
      });
    }
    if (f.stock.length) {
      list = list.filter(function (p) { return f.stock.indexOf(p.stock) !== -1; });
    }

    switch (state.sort) {
      case 'thickness':
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

  /* ---------- Чипы активных фильтров ---------- */
  function chipLabel(group, value) {
    switch (group) {
      case 'apps': return state.appLabels[value] || value;
      case 'category': return value;
      case 'thickness': return value + ' мм';
      case 'property': return state.propLabels[value] || value;
      case 'stock': return STOCK_LABELS[value] || value;
      default: return value;
    }
  }

  function renderChips() {
    var f = state.filters;
    var html = '';
    if (f.apps) {
      html += '<span class="catalog-chip">' + esc(chipLabel('apps', f.apps)) +
              '<button type="button" data-remove="apps|' + esc(f.apps) + '" aria-label="Убрать фильтр"></button></span>';
    }
    ['category', 'thickness', 'property', 'stock'].forEach(function (group) {
      f[group].forEach(function (value) {
        html += '<span class="catalog-chip">' + esc(chipLabel(group, value)) +
                '<button type="button" data-remove="' + esc(group + '|' + value) + '" aria-label="Убрать фильтр"></button></span>';
      });
    });
    els.chips.innerHTML = html;
  }

  /* ---------- Рендер ---------- */
  function render() {
    readFilters();

    var list = filtered();

    els.count.innerHTML = 'Найдено <b>' + list.length + '</b> ' +
      plural(list.length, 'решение', 'решения', 'решений');

    renderChips();

    var shown = list.slice(0, state.visible);
    els.grid.innerHTML = shown.map(cardHtml).join('');
    els.empty.hidden = list.length !== 0;

    var left = list.length - shown.length;
    els.loadmore.hidden = left <= 0;
    if (left > 0) {
      els.loadmoreNote.textContent = 'Показано ' + shown.length + ' из ' + list.length;
    }
  }

  /* ---------- Запуск ---------- */
  function init() {
    els.appsBox = document.getElementById('catalogApps');
    els.filtersBox = document.getElementById('catalogFilters');
    els.grid = document.getElementById('catalogGrid');
    els.count = document.getElementById('catalogCount');
    els.chips = document.getElementById('catalogChips');
    els.reset = document.querySelector('.js-reset');
    els.empty = document.getElementById('catalogEmpty');
    els.loadmore = document.getElementById('catalogLoadmore');
    els.loadmoreNote = document.getElementById('catalogLoadmoreNote');
    els.sort = document.getElementById('catalogSort');
    els.filtersMore = document.querySelector('.js-filters-more');
    els.filtersExtra = document.getElementById('catalogFiltersExtra');

    if (!els.grid) return;

    els.appTiles = els.appsBox
      ? Array.prototype.slice.call(els.appsBox.querySelectorAll('.app-tile'))
      : [];
    els.filterInputs = els.filtersBox
      ? Array.prototype.slice.call(els.filtersBox.querySelectorAll('input[data-filter]'))
      : [];
    els.thicknessButtons = els.filtersBox
      ? Array.prototype.slice.call(els.filtersBox.querySelectorAll('.thickness-toggle'))
      : [];
    readLabels();

    /* Плитки применения: одна активная */
    if (els.appsBox) {
      els.appsBox.addEventListener('click', function (e) {
        var tile = e.target.closest ? e.target.closest('.app-tile') : null;
        if (!tile) return;
        setActiveApp(tile.dataset.app === 'all' ? '' : tile.dataset.app);
        state.visible = PAGE_SIZE;
        render();
      });
    }

    /* Чекбоксы + толщина: делегирование на сайдбар */
    if (els.filtersBox) {
      els.filtersBox.addEventListener('change', function () {
        state.visible = PAGE_SIZE;
        render();
      });
      els.filtersBox.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.thickness-toggle') : null;
        if (!btn) return;
        btn.classList.toggle('is-active');
        state.visible = PAGE_SIZE;
        render();
      });
    }

    /* Сбросить (шапка сайдбара) — очищает и плитки, и доп. фильтры */
    if (els.reset) {
      els.reset.addEventListener('click', function () {
        clearFilterDom();
        state.visible = PAGE_SIZE;
        render();
      });
    }

    /* «Дополнительные параметры» */
    if (els.filtersMore && els.filtersExtra) {
      els.filtersMore.addEventListener('click', function () {
        var open = els.filtersExtra.hidden;
        els.filtersExtra.hidden = !open;
        els.filtersMore.classList.toggle('is-open', open);
        els.filtersMore.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    /* Чипы: снять фильтр */
    els.chips.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-remove]') : null;
      if (!btn) return;
      var parts = btn.dataset.remove.split('|');
      var group = parts[0];
      var value = parts.slice(1).join('|');

      if (group === 'apps') {
        setActiveApp('');
      } else if (group === 'thickness') {
        els.thicknessButtons.forEach(function (b) {
          if (parseInt(b.dataset.value, 10) === parseInt(value, 10)) b.classList.remove('is-active');
        });
      } else {
        els.filterInputs.forEach(function (inp) {
          if (inp.dataset.filter === group && inp.value === value) inp.checked = false;
        });
      }
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

    /* MODX-режим: карточки уже отрендерены snippet'ом
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
          properties: (d.properties || '').split('|').filter(Boolean),
          href: d.href || null,
          fire_class: d.fireClass || '',
          price: d.priceValue ? { kind: d.priceKind, label: d.priceLabel, value: d.priceValue } : null
        };
      });
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
        state.products = data.products || [];
        render();
      })
      .catch(function (err) {
        els.grid.innerHTML = '<div class="catalog-empty" style="grid-column:1/-1;"><b>Не удалось загрузить каталог</b>' + esc(err.message) + '</div>';
        console.error(err);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
