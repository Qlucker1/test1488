<?php
/**
 * ==========================================================================
 *  snGetHplProducts — каталог HPL Lemark (MODX Revolution 2.8.x)
 * ==========================================================================
 *  Читает MIGX-грид контейнера (TV «hpl_products») и выводит карточки
 *  товаров через чанк «hpl-product-card». Сортировка — по полю «sort».
 *
 *  Параметры snippet'а (в шаблоне):
 *    &container   — алиас или id ресурса-контейнера (по умолчанию hpl-catalog-container)
 *    &tv          — имя TV (по умолчанию hpl_products)
 *    &chunk       — чанк карточки (по умолчанию hpl-product-card)
 *    &application — фильтр по сферам через запятую: «peregorodki,medicina» (пусто = все)
 *    &limit       — сколько строк (0 = все, по умолчанию 0)
 *    &offset      — смещение (по умолчанию 0)
 *    &empty       — что вывести, если грид пуст (по умолчанию '')
 *
 *  Пример в шаблоне:
 *    [[+snGetHplProducts?&container=`hpl-catalog-container`*]]
 *
 *  Важно:
 *  - Скрипт НЕ зависит от pdoTools и MiniShop — только ядро xPDO.
 *  - Frontend JS (catalog.js) работает с предрендеренными карточками
 *    (data-атрибуты), поэтому фильтрация/сортировка без перезагрузки.
 * ==========================================================================
 */

// Защита от прямого доступа к файлу через браузер
if (!defined('MODX_CORE_PATH')) {
    exit;
}

$tvName         = trim((string)$modx->getOption('tv', $scriptProperties, 'hpl_products'));
$containerRef   = trim((string)$modx->getOption('container', $scriptProperties, 'hpl-catalog-container'));
$chunkName      = trim((string)$modx->getOption('chunk', $scriptProperties, 'hpl-product-card'));
$filterApps     = trim((string)$modx->getOption('application', $scriptProperties, ''));
$limit          = (int)$modx->getOption('limit', $scriptProperties, 0);
$offset         = (int)$modx->getOption('offset', $scriptProperties, 0);
$emptyTpl       = trim((string)$modx->getOption('empty', $scriptProperties, ''));

/* ---------- 1. Ищем контейнер ---------- */
$container = null;
if (is_numeric($containerRef)) {
    $container = $modx->getObject('modResource', (int)$containerRef);
}
if (!$container) {
    $container = $modx->getObject('modResource', array('alias' => $containerRef));
}
if (!$container) {
    $modx->log(xPDO::LOG_LEVEL_ERROR, '[snGetHplProducts] Контейнер не найден: ' . $containerRef
        . '. Проверьте алиас (install.php создает ресурс с алиасом hpl-catalog-container).');
    return $emptyTpl;
}

/* ---------- 2. Читаем грид ---------- */
$raw   = (string)$container->get($tvName);
$items = $raw !== '' ? json_decode($raw, true) : null;
if (!is_array($items) || count($items) === 0) {
    $modx->log(xPDO::LOG_LEVEL_ERROR, '[snGetHplProducts] TV «' . $tvName . '» пуста или некорректна (ресурс '
        . $container->get('id') . '). Добавьте товары через MIGX-интерфейс.');
    return $emptyTpl;
}

/* ---------- 3. Сортировка по «sort» ---------- */
usort($items, function ($a, $b) {
    $sa = isset($a['sort']) ? (float)$a['sort'] : 100.0;
    $sb = isset($b['sort']) ? (float)$b['sort'] : 100.0;
    if ($sa == $sb) return 0;
    return ($sa < $sb) ? -1 : 1;
});

/* ---------- 4. Фильтр по сферам (опционально) ---------- */
if ($filterApps !== '') {
    $wanted = array_filter(array_map('trim', explode(',', $filterApps)));
    $items  = array_values(array_filter($items, function ($it) use ($wanted) {
        $apps = explode('|', (string)isset($it['applications']) ? $it['applications'] : '');
        return count(array_intersect($wanted, $apps)) > 0;
    }));
}

if ($offset > 0) {
    $items = array_slice($items, $offset);
}
if ($limit > 0) {
    $items = array_slice($items, 0, $limit);
}

/* ---------- 5. Рендер карточек ---------- */
$stockBadges = array(
    'in_stock'    => '<span class="product-card__badge">В наличии</span>',
    'under_order' => '<span class="product-card__badge product-card__badge--order">Под заказ</span>',
    'request'     => '<span class="product-card__badge product-card__badge--request">По запросу</span>',
);

$chunkTpl = $modx->getChunk($chunkName);
if (!$chunkTpl) {
    $modx->log(xPDO::LOG_LEVEL_ERROR, '[snGetHplProducts] Чанк карточки не найден: ' . $chunkName);
    return '';
}

$siteUrl = rtrim((string)$modx->getOption('site_url'), '/');

$out = '';
foreach ($items as $it) {
    $slug    = trim((string)isset($it['slug']) ? $it['slug'] : '');
    $title   = trim((string)isset($it['title']) ? $it['title'] : '');
    $image   = trim((string)isset($it['image']) ? $it['image'] : '');
    $stock   = trim((string)isset($it['stock']) ? $it['stock'] : '');
    $url     = trim((string)isset($it['url']) ? $it['url'] : '');

    // Абсолютный URL картинки (MIGX хранит относительный путь)
    if ($image !== '' && strpos($image, 'http') !== 0) {
        $image = $siteUrl . '/' . ltrim($image, '/');
    }

    // URL карточки: поле «url» или /slug/
    if ($url === '') {
        $url = $siteUrl . '/' . $slug . '/';
    }

    // Теги — рендерим прямо здесь, чтобы чанк не знал про HTML
    $tagsHtml = '';
    $tags = isset($it['tags']) ? explode('|', (string)$it['tags']) : array();
    foreach ($tags as $tag) {
        $tag = trim($tag);
        if ($tag !== '') {
            $tagsHtml .= '<span class="product-card__tag">' . htmlspecialchars($tag, ENT_QUOTES) . '</span>';
        }
    }

    $props = array(
        'id'          => (string)(isset($it['id']) ? (int)$it['id'] : 0),
        'slug'        => htmlspecialchars($slug, ENT_QUOTES),
        'title'       => htmlspecialchars($title, ENT_QUOTES),
        'category'    => htmlspecialchars(trim((string)isset($it['category']) ? $it['category'] : ''), ENT_QUOTES),
        'thickness'   => (string)(isset($it['thickness']) ? (int)$it['thickness'] : 0),
        'apps'        => htmlspecialchars(trim((string)isset($it['applications']) ? $it['applications'] : ''), ENT_QUOTES),
        'tags'        => $tagsHtml,
        'image'       => htmlspecialchars($image, ENT_QUOTES),
        'stock'       => $stock,
        'price_kind'  => trim((string)isset($it['price_kind']) ? $it['price_kind'] : ''),
        'price_label' => htmlspecialchars(trim((string)isset($it['price_label']) ? $it['price_label'] : ''), ENT_QUOTES),
        'price_value' => htmlspecialchars(trim((string)isset($it['price_value']) ? $it['price_value'] : ''), ENT_QUOTES),
        'badge'       => isset($stockBadges[$stock]) ? $stockBadges[$stock] : '',
        'url'         => htmlspecialchars($url, ENT_QUOTES),
    );

    $out .= $modx->getChunk($chunkName, $props);
}

return $out;
