# Раздел «Каталог HPL» для MODX Revolution 2.8.x

Полный комплект для установки каталога HPL-панелей на сайт **lemarkllc.ru**
(MODX Revolution 2.8.3): чанки, шаблоны, MIGX-грид, сниппеты и установщик.

Дизайн повторяет live-сайт (шрифт VisueltPro, акцент `#e42840`, шапка/подвал как на lemarkllc.ru).

---

## Состав папки

| Путь | Что это | Куда копировать на сайт |
|---|---|---|
| `chunks/style.css.txt` | базовые стили раздела (чанк `style.css`) | → устанавливается скриптом |
| `chunks/catalog.css.txt` | CSS страницы каталога (чанк `catalog.css`) | → устанавливается скриптом |
| `chunks/product.css.txt` | CSS карточки товара (чанк `product.css`) | → устанавливается скриптом |
| `chunks/header.txt` / `footer.txt` / `popups.txt` | шапка, подвал, pop-ап формы | → устанавливается скриптом |
| `chunks/hpl-product-card.txt` | HTML карточки товара каталога | → устанавливается скриптом |
| `migx/hpl_products.json` | конфиг MIGX-грида | → устанавливается скриптом (чанк `hpl_products`) |
| `snippets/snGetHplProducts.php` | вывод каталога из грида | → устанавливается скриптом |
| `snippets/snGetHplProduct.php` | вшивка JSON товара в карточку | → устанавливается скриптом |
| `templates/catalog.tpl.txt` | шаблон «HPL Catalog» | → устанавливается скриптом |
| `templates/product.tpl.txt` | шаблон «HPL Product» | → устанавливается скриптом |
| `sample_data.json` | 24 тестовых товара (заполняют грид при установке) | читается скриптом |
| `install.php` | установщик | **положить в `/assets/` сайта** |

---

## Установка (5 шагов)

### 1. Скопируйте фронтенд-файлы в сайт

Файлы из **корня репозитория** (они же используются на Netlify-тесте):

```
assets/css/style.css    →  /assets/templates/assets/css/style.css
assets/css/catalog.css  →  /assets/templates/assets/css/catalog.css
assets/css/product.css  →  /assets/templates/assets/css/product.css
assets/js/main.js       →  /assets/templates/assets/js/main.js
assets/js/catalog.js    →  /assets/templates/assets/js/catalog.js
assets/js/product.js    →  /assets/templates/assets/js/product.js
assets/img/…            →  /assets/templates/assets/img/…
```

Шрифты **VisueltPro** уже есть на сайте — `/assets/templates/assets/fonts/VisueltPro/`
(чанк `style.css` ссылается на них через `[[++site_url]]`).

### 2. Загрузите `install.php`

Положите файл `install.php` в папку **`/assets/`** сайта (рядом с `import/`, `snippets/`).

### 3. Прогоните установку один раз

Откройте в браузере:

```
https://ваш-сайт/assets/hpl_install.php?secret=лемарк2026&parent=1
```

* `parent` — id ресурса-родителя (по умолчанию `1` = root). Укажите id вашего
  раздела «Каталог», чтобы страницы легли под него.
* `secret` — ключ доступа (по умолчанию `лемарк2026`; меняется в начале файла).

Скрипт создаст (повторный запуск безопасен — существующие объекты не затирает):

* **Чанки:** `style.css`, `catalog.css`, `product.css`, `header`, `footer`, `popups`,
  `hpl-product-card`, `hpl_products` (конфиг MIGX)
* **Шаблоны:** `HPL Catalog`, `HPL Product`
* **TV:** `hpl_products` (тип `list` — именно так MIGX определяет грид) + привязка к шаблонам
* **Сниппеты:** `snGetHplProducts`, `snGetHplProduct`
* **Ресурсы:**
  * `hpl-catalog-container` — скрытый MIGX-контейнер, грид заполнен 24 тестовыми товарами
  * `katalog-hpl` — страница каталога (опубликована)
  * `hpl-12-peregorodki` — пример карточки товара (опубликована)

### 4. Проверьте

* `https://ваш-сайт/katalog-hpl/` — каталог (фильтры, сортировка, «Загрузить еще»)
* `https://ваш-сайт/hpl-12-peregorodki/` — карточка товара

### 5. Удалите `install.php` с сервера.

---

## Как дальше вести каталог (MIGX)

1. Откройте в менеджер MODX ресурс **`hpl-catalog-container`**.
2. Вкладка **«Свойства»** → грид **«Каталог HPL»**:
   * «+» — добавить товар; редактировать/перетаскивать строки — как в обычном MIGX.
3. Поля грида (имена фиксированы — их читают сниппеты и JS, **не переименовывать**):

| Поле | Тип | Что писать |
|---|---|---|
| `sort` | число | порядок в каталоге (1 — первый) |
| `title` | текст | название товара |
| `slug` | текст | латиницей/дефисы; **= alias ресурса-карточки** |
| `category` | список | Compact HPL / Standard HPL / Facade HPL / Laboratory HPL |
| `applications` | список (много) | faades, peregorodki, medicina, laboratorii, orientka, mebel, transport, vse |
| `thickness` | число | толщина, мм (4…25) |
| `tags` | текст | 3 тега через `|` (например `12 мм\|Влагостойкий\|Антибактериальный`) |
| `stock` | список | `in_stock` (В наличии) / `under_order` (Под заказ) / `request` (По запросу) |
| `price_kind` | список | `from` (цена от) / `term` (срок) / `request` (по запросу) |
| `price_label` | текст | подпись: «Цена за м²», «Производство», … |
| `price_value` | текст | значение: «от 4 200 ₽», «от 15 дней», … |
| `image` | картинка | изображение карточки, 800×600 (4:3) |
| `short_desc` | текст | 1–2 предложения (описание + блок «Другие решения») |
| `production_days` | число | срок производства, раб. дней |
| `min_order` | текст | минимальный заказ («от 10 м²») |
| `delivery` | текст | условия доставки |
| `url` | URL | полный URL карточки; пусто = `site_url` + `/slug/` |

### Как создаётся карточка товара

* Для **каждого товара** нужен отдельный ресурс: шаблон **`HPL Product`**,
  `alias` = полю `slug` грида, `pagetitle`/`description` — SEO-поля (можно дублировать из грида).
* Сниппет `snGetHplProduct` сам подтянет данные товара из грида по alias.
* Для новых товаров создавайте ресурсы-карточки (или пакетно — через MIGX-экспорт/
  сторонние утилиты); грид — единственный источник данных.

---

## Как работает

```
MIGX-грид (TV hpl_products на ресурсе hpl-catalog-container)
        │
        ├─ snGetHplProducts → рендерит чанк hpl-product-card на каждую строку
        │     (в data-атрибутах карточки — все данные для JS)
        │
        └─ snGetHplProduct → вшивает <script type="application/json"
              id="hpl-product-json">{applications, products, current}</script>
```

* `catalog.js` видит предрендеренные карточки (`#catalogGrid .product-card[data-slug]`)
  и работает без fetch: фильтрация/сортировка/«загрузить еще» — на клиенте.
* `product.js` берёт товар из `#hpl-product-json`.
* На **Netlify-тесте** (корень репозитория) те же скрипты работают в «статическом»
  режиме: данные берутся из `data/products.json` — код JS один и тот же.

### Параметры сниппетов

`snGetHplProducts`:

* `&container` — алиас/id контейнера (по умолчанию `hpl-catalog-container`)
* `&tv` — имя TV (по умолчанию `hpl_products`)
* `&application` — фильтр по сферам через запятую (например `medicina,laboratorii`)
* `&limit`, `&offset` — пагинация на стороне сервера (0 = все)
* `&chunk` — чанк карточки (по умолчанию `hpl-product-card`)
* `&empty` — вывод при пустом гриде

`snGetHplProduct`:

* `&container`, `&tv` — то же
* `&id` — slug товара (в шаблоне передано из `[[*alias*]]`)

---

## Формы → AjaxForm

На live-сайте уже стоит **AjaxForm** — подключите реальные формы вместо демо-тоста:

1. В чанках `popups` и в шаблонах формы имеют класс `js-demo-form` и атрибут `data-form-name`
   (`callback`, `spec`, `price`, `samples`, `calc`, `calc-popup`).
2. Замените на нативный вызов AjaxForm, например:

```html
<form class="common-form"
      data-ajaxform-config="{&quot;action&quot;:&quot;https://ваш-сайт/&quot;,&quot;controller&quot;:&quot;ajaxform.php&quot;,&quot;method&quot;:&quot;POST&quot;}"
      data-ajaxform-params='{"form_name":"callback","success":"Отправили заявку — свяжемся в течение рабочего дня.","error":"Не удалось отправить, позвоните +7 (495) 221-63-36"}'>
```

3. Создайте соответствующие forms в AjaxForm (`callback`, `spec`, `price`, `samples`,
   `calc`, `calc-popup`) с нужными действиями (почта/мини-шоп-заявка).
4. Класс `js-demo-form` уберите — `main.js` перестанет показывать демо-уведомление.

Поля `js-file-field` (загрузка спецификации) отправляются как обычный
`<input type="file" name="file">` — в AjaxForm включите приём вложений.

---

## Отличие от Netlify-версии (корень репозитория)

| | Netlify (тест) | MODX (продакшн) |
|---|---|---|
| Данные | `data/products.json` (fetch) | MIGX-грид (предрендер + JSON в стр. карточки) |
| CSS | `<link href="assets/css/…">` | `<style>[[*style.css*]]</style>` + `<style>[[*catalog.css\|product.css*]]</style>` в head |
| Картинки | `assets/img/…` | `assets/templates/assets/img/…` (MIGX хранит относительный путь, сниппет дописывает `site_url`) |
| Ресурсы-карточки | `product.html?id=slug` | отдельные ресурсы с alias = `slug` |

JS-файлы **одинаковые** — меняйте их в корне репозитория и копируйте в `assets/templates/assets/js/`.
