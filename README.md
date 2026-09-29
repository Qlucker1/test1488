# Lemark — «Каталог HPL»

Раздел каталога HPL-панелей для **lemarkllc.ru** + его MODX-обвязка.

Репозиторий работает в двух режимах (один и тот же JS):

1. **Статический сайт в корне** — тест макета на **Netlify**
   (24 случайных тестовых товара, данные из `data/products.json`).
2. **Пакет для MODX Revolution 2.8.x** в папке [`modx/`](modx/README.md) —
   чанки, шаблоны, **MIGX-грид**, сниппеты и установщик `install.php`.

Дизайн снят с live-сайта lemarkllc.ru: шрифт **VisueltPro**, акцент `#e42840`,
та же шапка/подвал/cookie-баннер. Макеты: каталог (вар. 1) и карточка товара (вар. 2).

> **Шрифт на тест-сайте:** VisueltPro грузится напрямую с lemarkllc.ru.
> Если хост не отдаёт CORS-заголовок `Access-Control-Allow-Origin`, браузер
> блокирует кросс-доменный шрифт, и страница отрисовывается fallback-шрифтом
> **Inter** (подключён через Google Fonts, визуально близок к VisueltPro).
> На MODX (продакшн) шрифт один домен — грузится всегда.

---

## Структура

```
├── index.html                  # каталог (макет 1): сайдбар фильтров слева + сетка
├── product.html                # карточка товара (макет 2), продукт — по ?id=slug
├── data/products.json          # 24 тестовых товара (источник данных для Netlify)
├── netlify.toml                # конфигурация деплоя (чистый статик)
├── assets/
│   ├── css/style.css           # базовые стили (шрифты, токены, шапка, подвал, формы)
│   ├── css/catalog.css         # CSS каталога
│   ├── css/product.css         # CSS карточки товара
│   ├── js/main.js              # общее: меню, pop-апы, cookie, тосты
│   ├── js/catalog.js           # фильтры/сортировка/load-more (2 режима: DOM + fetch)
│   ├── js/product.js           # рендер карточки товара (2 режима: JSON + fetch)
│   └── img/products/, img/interiors/   # тестовые SVG-изображения
├── modx/                       # MODX-пакет (чанки, шаблоны, MIGX, сниппеты)
│   ├── chunks/  templates/  migx/  snippets/
│   ├── sample_data.json        # те же 24 товара для MIGX-грида
│   ├── install.php             # установщик (положить в /assets/ сайта)
│   └── README.md               # ПОЛНАЯ инструкция по установке на MODX
└── tests/smoke_test.js         # Node smoke-тесты JS (DOM-шим, без браузера)
```

---

## Быстрый старт (локально)

```bash
python3 -m http.server 8080
# http://localhost:8080/             — каталог
# http://localhost:8080/product.html?id=hpl-12-peregorodki — карточка
```

## Netlify

Репозиторий уже привязан: корень = `publish` (см. `netlify.toml`).
Каждый push ветки публикуется; каталог читает `data/products.json`,
карточка — `product.html?id=<slug>` (любой из 24 товаров).

---

## Перенос на MODX (lemarkllc.ru)

Кратко (подробности — [`modx/README.md`](modx/README.md)):

1. Скопировать `assets/css|js|img` → `/assets/templates/assets/…` сайта.
2. Положить `modx/install.php` в `/assets/` сайта.
3. Открыть один раз:
   `/assets/hpl_install.php?secret=лемарк2026&parent=<id раздела>`
   — создаются чанки (`style.css`, `catalog.css`, `product.css`, `header`, `footer`,
   `popups`, `hpl-product-card`, `hpl_products`), шаблоны `HPL Catalog`/`HPL Product`,
   TV `hpl_products` (MIGX) **+ 8 TV карточки товара `hpl_*`**, сниппеты
   `snGetHplProducts`/`snGetHplProduct`, ресурс-контейнер `hpl-catalog-container`
   (заполнен тестовыми товарами) и демо-страницы (у демо-товара TV уже заполнены).
4. Проверить `/katalog-hpl/` и `/hpl-12-peregorodki/`.
5. **Удалить `install.php`**.

Дальше:
* **Товары каталога** — в MIGX-гриде на ресурсе `hpl-catalog-container` (вкладка
  «Свойства»).
* **Карточка товара** — отдельный ресурс с шаблоном `HPL Product`, `alias` = полю
  `slug` грида; **все характеристики заполняются TV** (`hpl_thickness`,
  `hpl_thicknesses`, `hpl_category`, `hpl_application`, `hpl_decors`,
  `hpl_processing`, `hpl_formats`, `hpl_techspec`) — что за что отвечает, формат
  `hpl_techspec` и как создать TV вручную: [`modx/README.md` → «Переменные шаблона (TV)»](modx/README.md).
  Сниппет `snGetHplProduct` (код) читает TV поверх MIGX и парсит списки.

### Ключевое решение по CSS

По ТЗ каждая страница получает **свой CSS-чанк** рядом с существующим `style.css`
(чтобы не раздувать общий файл). В `<head>` шаблона:

```html
<style>
[[*style.css*]]      <!-- базовые стили раздела -->
</style>
<style>
[[*catalog.css*]]    <!-- или [[*product.css*]] для карточки -->
</style>
```

Новая страница раздела = новый CSS-чанк + одна пара `<style>` в её шаблоне.

### Формы

Формы в чанках/шаблонах сейчас — демо (`js-demo-form` → тост «отправлено»).
На проде заменяются на **AjaxForm** (он уже установлен на lemarkllc.ru) —
инструкция: [`modx/README.md` → «Формы → AjaxForm»](modx/README.md).

---

## Данные (тестовые)

`data/products.json` — 24 товара: 6 первых — карточки из макета 1, остальные —
случайные варианты (фасады, медицина, лаборатории, транспорт, мебель, отделка).

Поля товара:
* каталог/карточка: `id, slug, title, category, applications[], tags[], stock,
  price{kind,label,value}, image, short_desc, production_days, min_order, delivery,
  thickness, fire_class, properties[]`
* **наполняемые характеристики карточки** (на MODX — это TV, см. ниже):
  * `thicknesses[]` — все толщины → блок «Другие толщины»
  * `category` — тип материала (свободный текст)
  * `application_text` — применение (свободный текст)
  * `decors` — декоры (свободный текст)
  * `processing` — обработка (свободный текст)
  * `formats[]` — форматы листа, 1–3 из `3050×1300`, `3050×1600`, `3050×1250`
  * `techspec` — технические характеристики, текст в формате
    `[Группа]` + `Параметр: значение` (парсер в `product.js`)

Ключи сфер: `faades, peregorodki, medicina, laboratorii, orientka, mebel, transport, vse`.

## Тесты JS

`tests/smoke_test.js` — Node-тесты логики (DOM-шим, браузер не нужно):
рендер сетки, фильтры (плитки + сайдбар), сортировка, load-more, рендер карточки
(наполняемые характеристики, «Другие толщины», парсинг `techspec`, конфигуратор
с группами декоров), MODX-JSON-режим. Запуск: `node tests/smoke_test.js`
(проходят на Node 18+). Прогоняйте после изменений `assets/js/*.js` или
`data/products.json`.
