/* ==========================================================================
   Карточка товара HPL
   Тестовый бэкенд: data/products.json (аналог MIGX-грида на MODX,
   см. modx/README.md и modx/snippets/snGetHplProduct.php)
   ========================================================================== */
(function () {
  'use strict';

  var state = { data: null, product: null };

  /* ---------- Декоры (тестовая выборка; на MODX — отдельный MIGX/чанк) ---------- */
  var DECORS = {
    solid: {
      label: 'Однотонные',
      items: [
        { code: '0101', name: 'Белый', emboss: 'MT Super Matt', img: 'assets/img/products/p06.svg' },
        { code: '0112', name: 'Антрацит', emboss: 'MT Super Matt', img: 'assets/img/products/p08.svg' },
        { code: '0124', name: 'Серый пепел', emboss: 'MT Super Matt', img: 'assets/img/products/p01.svg' },
        { code: '0135', name: 'Красный феррари', emboss: 'MT Super Matt', img: 'assets/img/products/p04.svg' },
        { code: '0140', name: 'Крем', emboss: 'MT Super Matt', img: 'assets/img/products/p05.svg' },
        { code: '0155', name: 'Глубокий синий', emboss: 'MT Super Matt', img: 'assets/img/products/p22.svg' },
        { code: '0160', name: 'Жёлтый солнечный', emboss: 'MT Super Matt', img: 'assets/img/products/p02.svg' },
        { code: '0172', name: 'Лесная зелень', emboss: 'MT Super Matt', img: 'assets/img/products/p15.svg' }
      ]
    },
    wood: {
      label: 'Древесные',
      items: [
        { code: '0501', name: 'Дуб молочный', emboss: 'FG Fine Grain', img: 'assets/img/products/p11.svg' },
        { code: '0512', name: 'Дуб сонома', emboss: 'FG Fine Grain', img: 'assets/img/products/p03.svg' },
        { code: '0524', name: 'Орех тёмный', emboss: 'MT Super Matt', img: 'assets/img/products/p09.svg' },
        { code: '0535', name: 'Ясень белый', emboss: 'FG Fine Grain', img: 'assets/img/products/p21.svg' },
        { code: '0540', name: 'Вишня', emboss: 'MT Super Matt', img: 'assets/img/products/p10.svg' },
        { code: '0555', name: 'Бук натуральный', emboss: 'FG Fine Grain', img: 'assets/img/products/p07.svg' },
        { code: '0560', name: 'Тик', emboss: 'FG Fine Grain', img: 'assets/img/products/p18.svg' },
        { code: '0572', name: 'Морёный дуб', emboss: 'MT Super Matt', img: 'assets/img/products/p23.svg' }
      ]
    },
    stone: {
      label: 'Каменные',
      items: [
        { code: '0701', name: 'Мрамор каррара', emboss: 'MT Super Matt', img: 'assets/img/products/p24.svg' },
        { code: '0712', name: 'Грешам', emboss: 'MT Super Matt', img: 'assets/img/products/p18.svg' },
        { code: '0724', name: 'Кварц зелёный', emboss: 'MT Super Matt', img: 'assets/img/products/p15.svg' },
        { code: '0735', name: 'Гранит чёрный', emboss: 'MT Super Matt', img: 'assets/img/products/p16.svg' },
        { code: '0740', name: 'Бетон серый', emboss: 'FG Fine Grain', img: 'assets/img/products/p20.svg' },
        { code: '0755', name: 'Оникс голубой', emboss: 'MT Super Matt', img: 'assets/img/products/p12.svg' },
        { code: '0760', name: 'Сланец', emboss: 'MT Super Matt', img: 'assets/img/products/p14.svg' },
        { code: '0772', name: 'Песчаник', emboss: 'FG Fine Grain', img: 'assets/img/products/p13.svg' }
      ]
    },
    fantasy: {
      label: 'Фантазийные',
      items: [
        { code: '0901', name: 'Атлас', emboss: 'MT Super Matt', img: 'assets/img/products/p04.svg' },
        { code: '0912', name: 'Небесный', emboss: 'MT Super Matt', img: 'assets/img/products/p12.svg' },
        { code: '0924', name: 'Сталь', emboss: 'GL Gloss', img: 'assets/img/products/p14.svg' },
        { code: '0935', name: 'Карбон', emboss: 'MT Super Matt', img: 'assets/img/products/p23.svg' },
        { code: '0940', name: 'Дюна', emboss: 'FG Fine Grain', img: 'assets/img/products/p13.svg' },
        { code: '0955', name: 'Шёлк', emboss: 'GL Gloss', img: 'assets/img/products/p19.svg' },
        { code: '0960', name: 'Глубина', emboss: 'MT Super Matt', img: 'assets/img/products/p22.svg' },
        { code: '0972', name: 'Мозаика', emboss: 'FG Fine Grain', img: 'assets/img/products/p20.svg' }
      ]
    }
  };

  var EMBOSSES = { MT: 'Super Matt (MT)', FG: 'Fine Grain (FG)', GL: 'Gloss (GL)' };
  /* Каноны форматов листа (выбор 1–3 заводится в TV hpl_formats / MIGX) */
  var FORMATS = {
    '3050×1300': '3050 × 1300 мм',
    '3050×1600': '3050 × 1600 мм',
    '3050×1250': '3050 × 1250 мм'
  };
  var PROCESSING = { none: 'Без обработки', cut: 'Раскрой', cnc: 'CNC обработка' };

  var INTERIORS = {
    peregorodki: 'assets/img/interiors/shower.svg',
    medicina: 'assets/img/interiors/clinic.svg',
    laboratorii: 'assets/img/interiors/lab.svg',
    transport: 'assets/img/interiors/cabin.svg',
    mebel: 'assets/img/interiors/office.svg',
    orientka: 'assets/img/interiors/office.svg',
    faades: 'assets/img/interiors/facade.svg',
    vse: 'assets/img/interiors/office.svg'
  };

  var els = {};

  /* ---------- Утилиты ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function $id(id) { return document.getElementById(id); }

  /* Ссылка на карточку товара: в MODX — поле url из MIGX,
     в Netlify-версии — product.html?id=slug */
  function productUrl(p) {
    return p.url || ('product.html?id=' + encodeURIComponent(p.slug));
  }

  /* ---------- Контент карточки ---------- */
  function appLabel(key) {
    return (state.data.applications && state.data.applications[key]) || key;
  }

  /* Характеристики — все заполняемые (TV на MODX / поле в JSON):
     thickness, thicknesses[], category, application_text, decors,
     processing, formats[], techspec{groups[]} */
  function formatsList(p) {
    var f = (p.formats || []).filter(function (f) { return FORMATS[f]; });
    return f.length ? f : Object.keys(FORMATS);
  }

  function specsHtml(p) {
    var apps = (p.applications || []).map(appLabel).join(', ');
    var fmts = formatsList(p).map(function (f) { return FORMATS[f]; });
    return '' +
      '<div class="product-specs__row"><dt>Толщина</dt><dd>' + esc(p.thickness) + ' мм</dd></div>' +
      '<div class="product-specs__row"><dt>Тип материала</dt><dd>' + esc(p.category) + '</dd></div>' +
      '<div class="product-specs__row"><dt>Применение</dt><dd>' + esc(p.application_text || apps || 'Универсальное') + '</dd></div>' +
      '<div class="product-specs__row"><dt>Декоры</dt><dd>' + esc(p.decors || '3156 декоров / выбор из каталога') + '</dd></div>' +
      '<div class="product-specs__row"><dt>Обработка</dt><dd>' + esc(p.processing || 'Раскрой и CNC по запросу') + '</dd></div>' +
      '<div class="product-specs__row"><dt>Формат</dt><dd>' + esc(fmts.join(', ')) + '</dd></div>';
  }

  function priceHtml(p) {
    var pr = p.price || {};
    if (pr.kind === 'from') {
      // «от 4 200 ₽» из данных → «от 4 200 ₽/м²» (как в макете, без дубля ₽)
      var v = String(pr.value || '').replace(/ ₽\s*$/, '');
      return esc(v) + ' <small>₽/м²</small>';
    }
    if (pr.kind === 'request') {
      return esc(pr.value || 'Цена по запросу');
    }
    return esc(pr.value || '');
  }

  function renderHero(p) {
    els.productTitle.textContent = p.title;
    document.title = p.title + ' — купить HPL Lemark';
    els.productDesc.textContent = p.short_desc || '';
    els.productSpecs.innerHTML = specsHtml(p);
    els.productPriceValue.innerHTML = priceHtml(p);
    els.galleryImage.src = p.image;
    els.galleryImage.alt = p.title;

    els.factProduction.textContent = 'от ' + esc(p.production_days) + ' рабочих дней';
    els.factMinOrder.textContent = esc(p.min_order);
    els.factDelivery.textContent = esc(p.delivery);

    // Хлебные крошки: Lemark / Каталог HPL / ...
    els.breadcrumbs.innerHTML =
      '<a href="index.html">LEMARK</a><span class="breadcrumbs__sep">—</span>' +
      '<a href="index.html">Каталог HPL</a><span class="breadcrumbs__sep">—</span>' +
      '<span class="breadcrumbs__current">' + esc(p.title) + '</span>';
  }

  /* ---------- Галерея (Материал / Фактура / В интерьере) ---------- */
  function initGallery(p) {
    var tabs = els.galleryTabs.querySelectorAll('.product-gallery__tab');
    var img = els.galleryImage;
    var caption = els.galleryCaption;
    var interior = INTERIORS[(p.applications || ['vse'])[0]] || INTERIORS.vse;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        var mode = tab.dataset.gallery;
        img.classList.remove('is-texture');
        if (mode === 'material') {
          img.src = p.image;
          caption.textContent = p.category + ' • ' + p.thickness + ' мм';
        } else if (mode === 'texture') {
          img.src = p.image;
          img.classList.add('is-texture');
          caption.textContent = 'Фактура поверхности';
        } else {
          img.src = interior;
          caption.textContent = 'Пример применения';
        }
      });
    });
    caption.textContent = p.category + ' • ' + p.thickness + ' мм';
  }

  /* ---------- Другие толщины ----------
     Варианты толщин заводит контент-менеджер (TV hpl_thicknesses /
     поле thicknesses в JSON). Текущая толщина — p.thickness.
     Если у товара один вариант — блок скрываем. */
  function renderThicknesses(p) {
    var ths = (p.thicknesses || []).map(Number).filter(Boolean).sort(function (a, b) { return a - b; });
    var section = $id('thicknessSection');

    if (ths.length <= 1) {
      if (section) section.hidden = true;
      els.thicknessChips.innerHTML = '';
      return;
    }
    if (section) section.hidden = false;

    els.thicknessChips.innerHTML = ths.map(function (t) {
      if (t === p.thickness) {
        return '<span class="thickness-chip is-current">' + t + ' мм<small>— текущая</small></span>';
      }
      return '<span class="thickness-chip">' + t + ' мм</span>';
    }).join('');
  }

  /* ---------- Конфигуратор ---------- */
  var config = { decor: DECORS.solid.items[0], decorGroup: 'solid', emboss: 'MT', format: '3050×1300', processing: 'none' };

  function renderConfigDecor(group) {
    config.decorGroup = group;
    var items = DECORS[group].items;
    els.configDecor.innerHTML = items.slice(0, 8).map(function (d, i) {
      return '<button class="config-decor-swatch' + (i === 0 ? ' is-selected' : '') + '" type="button" data-decor="' + d.code + '" aria-label="' + esc(d.name) + '">' +
             '<img src="' + esc(d.img) + '" alt="" loading="lazy">' +
             '<span class="config-decor-swatch__code">' + esc(d.code) + '</span></button>';
    }).join('');
    // при смене группы выбираем первый декор группы
    config.decor = items[0];
  }

  function initConfigurator() {
    // группа декоров (однотонные / древесные / каменные / фантазийные)
    if (els.configDecorGroups) {
      els.configDecorGroups.addEventListener('click', function (e) {
        var btn = e.target.closest('.config-decor-group');
        if (!btn) return;
        els.configDecorGroups.querySelectorAll('.config-decor-group').forEach(function (b) {
          b.classList.toggle('is-selected', b === btn);
        });
        renderConfigDecor(btn.dataset.group);
        updateSummary();
      });
    }
    renderConfigDecor('solid');

    els.configDecor.addEventListener('click', function (e) {
      var btn = e.target.closest('.config-decor-swatch');
      if (!btn) return;
      els.configDecor.querySelectorAll('.config-decor-swatch').forEach(function (b) {
        b.classList.toggle('is-selected', b === btn);
      });
      config.decor = DECORS[config.decorGroup].items.find(function (d) { return d.code === btn.dataset.decor; });
      updateSummary();
    });

    [['configEmboss', 'emboss'], ['configFormat', 'format'], ['configProcessing', 'processing']].forEach(function (pair) {
      var box = $id(pair[0]);
      if (!box) return;
      box.addEventListener('click', function (e) {
        var btn = e.target.closest('.config-option');
        if (!btn) return;
        box.querySelectorAll('.config-option').forEach(function (b) {
          b.classList.toggle('is-selected', b === btn);
        });
        config[pair[1]] = btn.dataset.value;
        updateSummary();
      });
    });

    /* Стартовый формат листа — из данных товара (TV hpl_formats) */
    var fmtBox = $id('configFormat');
    if (fmtBox) {
      fmtBox.querySelectorAll('.config-option').forEach(function (b) {
        b.classList.toggle('is-selected', b.dataset.value === config.format);
      });
    }

    updateSummary();
  }

  function updateSummary() {
    var html = 'Декор: <b>' + esc(config.decor.code + ' ' + config.decor.name) + '</b> • ' +
      'Тиснение: <b>' + EMBOSSES[config.emboss] + '</b> • ' +
      'Формат: <b>' + FORMATS[config.format] + '</b> • ' +
      'Обработка: <b>' + PROCESSING[config.processing] + '</b>';
    els.configSummary.innerHTML = html;
    var popupConfig = $id('calcPopupConfig');
    if (popupConfig) {
      popupConfig.innerHTML = 'Конфигурация: ' + html + '. Укажите контакты — пришлём расчёт в течение рабочего дня.';
    }
  }

  /* ---------- Технические характеристики ----------
     Заполняемые: TV hpl_techspec (MODX) / поле techspec (JSON).
     Формат:
       [Название группы]
       Параметр: значение
       Параметр: значение
       (пустая строка — новый абзац)
     Группы и строки — любые, количество не ограничено. */
  function parseTechspec(src) {
    var groups = [];
    var cur = null;
    String(src == null ? '' : src).split(/\r?\n/).forEach(function (line) {
      line = line.replace(/\s+$/, '');
      if (line === '') return;
      var head = line.match(/^\[([^\]]+)\]$/);
      if (head) {
        cur = { title: head[1].trim(), rows: [] };
        groups.push(cur);
        return;
      }
      var m = line.match(/^([^:]{1,60}):\s*(.+)$/);
      if (m && cur) {
        cur.rows.push([m[1].trim(), m[2].trim()]);
      } else if (line.indexOf(':') !== -1) {
        /* строка до первой группы — в первую же группу */
        cur = cur || { title: 'Параметры', rows: [] };
        var parts = line.split(':');
        cur.rows.push([parts[0].trim(), parts.slice(1).join(':').trim()]);
        if (groups.indexOf(cur) === -1) groups.push(cur);
      }
    });
    return groups.filter(function (g) { return g.rows.length > 0; });
  }

  function techspecGroups(p) {
    if (p.techspec) {
      var parsed = parseTechspec(p.techspec);
      if (parsed.length) return parsed;
    }
    /* Фолбэк, если TV/поле не заполнены */
    var doubleSide = p.category.indexOf('Compact') !== -1;
    var fmts = formatsList(p).map(function (f) { return FORMATS[f]; });
    return [
      {
        title: 'Основные параметры',
        rows: [
          ['Тип материала', p.category],
          ['Толщина', p.thickness + ' мм'],
          ['Формат', fmts.join(' / ')],
          ['Декоративность', doubleSide ? 'Двухсторонняя' : 'Односторонняя']
        ]
      },
      {
        title: 'Эксплуатационные свойства',
        rows: [
          ['Влагостойкость', 'Абсолютная'],
          ['Плотность', '1.45 г/см³'],
          ['Пожарный класс', p.thickness >= 10 ? 'КМ1 (по исполнению)' : 'По исполнению'],
          ['Ударопрочность', 'Высокая (EN 438)']
        ]
      },
      {
        title: 'Производство и обработка',
        rows: [
          ['Раскрой', 'Доступен (CNC)'],
          ['Сверление', 'По чертежам'],
          ['Обработка кромки', 'R2 / Фаска'],
          ['Страна', 'Россия']
        ]
      }
    ];
  }

  function renderTechspecs(p) {
    els.techspecGroups.innerHTML = techspecGroups(p).map(function (g) {
      return '<div class="techspec-group"><b>' + esc(g.title) + '</b><table>' +
        g.rows.map(function (r) {
          return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>';
        }).join('') +
        '</table></div>';
    }).join('');
  }

  /* ---------- Почему / Где применяется ---------- */
  function renderWhy(p) {
    var items;
    if (p.id === 1) {
      items = [
        ['Влагостойкость', 'Материал не разбухает и не расслаивается даже при прямом контакте с водой. Идеально для душевых зон.'],
        ['Прочность ' + p.thickness + ' мм', 'Толщина ' + p.thickness + ' мм обеспечивает необходимую жесткость для безкаркасного монтажа сантехнических кабин.'],
        ['Антивандальность', 'Высокая плотность и защитный слой делают поверхность устойчивой к царапинам и сильным ударам.']
      ];
    } else {
      items = [
        ['Влагостойкость', 'HPL Lemark не впитывает влагу и не разбухает — работает в помещениях с любой влажностью.'],
        ['Прочность ' + p.thickness + ' мм', 'Панель выдерживает удары, давление и изгиб без повреждения защитного слоя.'],
        ['Долговечность', 'Срок службы — более 50 лет без потери декоративных и эксплуатационных свойств.']
      ];
    }
    els.whyGrid.innerHTML = items.map(function (it) {
      return '<div class="why-item"><b>' + esc(it[0]) + '</b><p>' + esc(it[1]) + '</p></div>';
    }).join('');
    if (p.id === 1) {
      els.whyHeading.textContent = 'Почему Compact HPL подходит для перегородок';
    }
  }

  var APPLYING_BY_APP = {
    peregorodki: ['Туалетные кабины', 'Душевые перегородки', 'Раздевалки', 'Спортивные комплексы', 'Школы и ВУЗы', 'Торговые центры'],
    medicina: ['Больницы и клиники', 'Операционные', 'Диагностические центры', 'Лаборатории', 'Чистые помещения', 'Санатории'],
    laboratorii: ['Научные лаборатории', 'Медицинские лаборатории', 'Фармацевтика', 'Пищепром', 'Водолаборатории', 'Резервуары и стойки'],
    faades: ['Вентилируемые фасады', 'Фальц-панели', 'Ритейл и франшизы', 'Брендинг зданий', 'Ландшафтные объекты', 'Крытые набережные'],
    mebel: ['Кухонная мебель', 'Офисная мебель', 'Торговое оборудование', 'Шкафы и стеллажи', 'Столешницы', 'Ресепшн и бары'],
    transport: ['Вагоны и поезда', 'Суда и яхты', 'Автобусы', 'Салонные перегородки', 'Мебель для транспорта', 'Спецтехника'],
    orientka: ['Стены и ниши', 'Коридоры и холлы', 'Санузлы', 'Лестничные клетки', 'Отделка стен под дерево', 'Панели вокруг окон'],
    vse: ['Коммерческие объекты', 'Жилая отделка', 'Производство мебели', 'Торговое оборудование', 'Общественные пространства', 'Спецпроекты']
  };

  function renderApplying(p) {
    var list = APPLYING_BY_APP[(p.applications || ['vse'])[0]] || APPLYING_BY_APP.vse;
    els.applyingGrid.innerHTML = list.map(function (a) {
      return '<div class="product-applying__item"><span></span><span>' + esc(a) + '</span></div>';
    }).join('');
  }

  /* ---------- Проекты ---------- */
  function renderProjects(p) {
    els.projectsGrid.innerHTML =
      '<div class="project-card">' +
        '<div class="project-card__picture" style="background:linear-gradient(135deg,#3a3f45 0%,#22262b 50%,#4a4f56 100%);"></div>' +
        '<span class="project-card__badge">' + esc(p.thickness) + ' мм</span>' +
        '<div class="project-card__body"><b>Фитнес-клуб «World Class»</b><span>Москва • Душевые перегородки</span></div>' +
      '</div>' +
      '<div class="project-card">' +
        '<div class="project-card__picture" style="background:linear-gradient(135deg,#5a6470 0%,#2e343b 55%,#6d7680 100%);"></div>' +
        '<span class="project-card__badge">' + esc(p.thickness) + ' мм</span>' +
        '<div class="project-card__body"><b>Бизнес-центр «Avenue»</b><span>Санкт-Петербург • Санитарные зоны</span></div>' +
      '</div>';
  }

  /* ---------- Другие решения ---------- */
  function renderRelated(p) {
    var related = state.products
      .filter(function (x) { return x.id !== p.id; })
      .sort(function (a, b) {
        var sa = a.thickness === p.thickness ? 0 : 1;
        var sb = b.thickness === p.thickness ? 0 : 1;
        return sa - sb || a.id - b.id;
      })
      .slice(0, 4);

    els.relatedGrid.innerHTML = related.map(function (x) {
      var text = (x.short_desc || '').length > 90 ? x.short_desc.slice(0, 90).replace(/\s+\S*$/, '') + '…' : (x.short_desc || '');
      return '<div class="related-card">' +
        '<b>' + esc(x.title) + '</b>' +
        '<p>' + esc(text) + '</p>' +
        '<a href="' + esc(productUrl(x)) + '">Подробнее</a>' +
      '</div>';
    }).join('');
  }

  /* ---------- FAQ ---------- */
  function faqItems(p) {
    if (p.id === 1) {
      return [
        ['Можно ли использовать HPL ' + p.thickness + ' мм в душевых?',
         'Да, HPL толщиной ' + p.thickness + ' мм является абсолютно влагостойким материалом. Он специально разработан для использования в агрессивных влажных средах, таких как общественные душевые.'],
        ['Чем HPL ' + p.thickness + ' мм отличается от 10 мм?',
         'Основное отличие — в жесткости. Для сантехнических перегородок стандартной высоты (около 2000 мм) без верхнего профиля рекомендуется использовать именно ' + p.thickness + ' мм для обеспечения стабильности конструкции.'],
        ['Можно ли заказать раскрой деталей?',
         'Да, наше производство оснащено станками ЧПУ для высокоточного раскроя панелей любой сложности по вашим чертежам.'],
        ['Как рассчитывается стоимость?',
         'Стоимость зависит от выбранного декора, общего объема заказа в квадратных метрах, выбранного формата листа и необходимости дополнительной обработки (раскрой, фрезеровка).']
      ];
    }
    return [
      ['Какие сроки производства?',
         'Стандартный срок — от ' + esc(p.production_days) + ' рабочих дней в зависимости от объема и сложности обработки. Точный срок фиксируем в договоре с финансовой ответственностью за просрочку.'],
      ['Можно ли заказать раскрой деталей?',
         'Да, наше производство оснащено станками ЧПУ для высокоточного раскроя панелей любой сложности по вашим чертежам.'],
      ['Какая минимальная партия?',
         'Минимальный заказ по этой позиции — ' + esc(p.min_order) + '. Для складских позиций возможна отгрузка от 1 листа.'],
      ['Как рассчитывается стоимость?',
         'Стоимость зависит от выбранного декора, общего объема заказа в квадратных метрах, выбранного формата листа и необходимости дополнительной обработки (раскрой, фрезеровка).']
    ];
  }

  function renderFaq(p) {
    els.faqList.innerHTML = faqItems(p).map(function (q, i) {
      return '<div class="faq-item">' +
        '<button class="faq-item__front" type="button" aria-expanded="false">' +
          '<span class="faq-item__question">' + esc(q[0]) + '</span>' +
          '<span class="faq-item__plus"></span>' +
        '</button>' +
        '<div class="faq-item__back">' + esc(q[1]) + '</div>' +
      '</div>';
    }).join('');

    els.faqList.querySelectorAll('.faq-item__front').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- Загрузка товара ---------- */
  function init() {
    ['breadcrumbs', 'productTitle', 'productDesc', 'productSpecs', 'productPriceValue',
     'galleryImage', 'galleryCaption', 'galleryTabs', 'factProduction', 'factMinOrder',
     'factDelivery', 'thicknessChips', 'configDecorGroups', 'configDecor', 'configSummary',
     'techspecGroups', 'whyGrid', 'whyHeading', 'applyingGrid', 'projectsGrid',
     'relatedGrid', 'faqList'
    ].forEach(function (id) {
      els[id] = $id(id);
    });

    var params = new URLSearchParams(window.location.search);
    var slug = params.get('id') || 'hpl-12-peregorodki';

    function applyProduct(p) {
      state.product = p;
      config.format = formatsList(p)[0];
      renderHero(p);
      initGallery(p);
      renderThicknesses(p);
      initConfigurator();
      renderTechspecs(p);
      renderWhy(p);
      renderApplying(p);
      renderProjects(p);
      renderRelated(p);
      renderFaq(p);
    }

    /* MODX-режим: snippet snGetHplProduct вшивает товар в
       <script type="application/json" id="hpl-product-json"> */
    var pre = document.getElementById('hpl-product-json');
    if (pre && (pre.textContent || '').trim()) {
      try {
        var preData = JSON.parse(pre.textContent);
        state.data = preData;
        state.products = preData.products || [];
        var p = preData.current || state.products.find(function (x) { return x.slug === slug; });
        if (!p) p = state.products[0];
        if (!p) throw new Error('Товар не найден в MIGX');
        applyProduct(p);
        return;
      } catch (err) {
        console.error('Ошибка данных MIGX:', err);
      }
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
        var p = state.products.find(function (x) { return x.slug === slug; });
        if (!p) p = state.products[0];
        applyProduct(p);
      })
      .catch(function (err) {
        document.getElementById('productHero').innerHTML =
          '<div class="product-loading" style="grid-column:1/-1;"><b>Не удалось загрузить товар</b><br>' + esc(err.message) + '</div>';
        console.error(err);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
