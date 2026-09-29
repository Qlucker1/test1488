<?php
/**
 * ==========================================================================
 *  snGetHplProduct — карточка товара HPL (MODX Revolution 2.8.x)
 * ==========================================================================
 *  Читает MIGX-грид контейнера и вшивает товар в страницу:
 *  <script type="application/json" id="hpl-product-json">...</script>
 *  Этот блок подхватывает product.js (см. репозиторий, assets/js/product.js).
 *
 *  Параметры:
 *    &container — алиас или id ресурса-контейнера (по умолчанию hpl-catalog-container)
 *    &tv        — имя TV (по умолчанию hpl_products)
 *    &id        — slug товара (по умолчанию — alias текущего ресурса)
 *
 *  Пример в шаблоне HPL Product:
 *    [[+snGetHplProduct?&id=`[[*alias*]]`*]]
 *
 *  Важно:
 *  - Ресурс-карточка товара должен иметь alias = MIGX-полю «slug».
 *  - В JSON уходит ВЕСЬ грид (для блоков «Другие толщины», «Другие решения»)
 *    + текущий товар в поле «current».
 * ==========================================================================
 */

// Защита от прямого доступа к файлу через браузер
if (!defined('MODX_CORE_PATH')) {
    exit;
}

$tvName       = trim((string)$modx->getOption('tv', $scriptProperties, 'hpl_products'));
$containerRef = trim((string)$modx->getOption('container', $scriptProperties, 'hpl-catalog-container'));
$slug         = trim((string)$modx->getOption('id', $scriptProperties, ''));

// slug по умолчанию — alias текущего ресурса
if ($slug === '') {
    $slug = is_object($modx->resource) ? trim((string)$modx->resource->get('alias')) : '';
}

/* ---------- 1. Контейнер ---------- */
$container = null;
if (is_numeric($containerRef)) {
    $container = $modx->getObject('modResource', (int)$containerRef);
}
if (!$container) {
    $container = $modx->getObject('modResource', array('alias' => $containerRef));
}
if (!$container) {
    $modx->log(xPDO::LOG_LEVEL_ERROR, '[snGetHplProduct] Контейнер не найден: ' . $containerRef);
    return '<script type="application/json" id="hpl-product-json">{"error":"container_not_found"}</script>';
}

/* ---------- 2. Грид ---------- */
$raw   = (string)$container->get($tvName);
$items = $raw !== '' ? json_decode($raw, true) : null;
if (!is_array($items) || count($items) === 0) {
    $modx->log(xPDO::LOG_LEVEL_ERROR, '[snGetHplProduct] TV «' . $tvName . '» пуста.');
    return '<script type="application/json" id="hpl-product-json">{"error":"empty_grid"}</script>';
}

usort($items, function ($a, $b) {
    $sa = isset($a['sort']) ? (float)$a['sort'] : 100.0;
    $sb = isset($b['sort']) ? (float)$b['sort'] : 100.0;
    if ($sa == $sb) return 0;
    return ($sa < $sb) ? -1 : 1;
});

/* ---------- 3. Текущий товар ---------- */
$current = null;
foreach ($items as $it) {
    if (trim((string)isset($it['slug']) ? $it['slug'] : '') === $slug) {
        $current = $it;
        break;
    }
}
if (!$current && count($items) > 0) {
    $current = $items[0]; // фолбэк: первый товар (чтобы страница не пустовала)
    $modx->log(xPDO::LOG_LEVEL_WARN, '[snGetHplProduct] slug «' . $slug
        . '» не найден в гриде, показан первый товар. Проверьте alias ресурса и поле «slug» в MIGX.');
}

/* ---------- 4. Подготовка данных ---------- */
$siteUrl = rtrim((string)$modx->getOption('site_url'), '/');
$appLabels = array(
    'faades'      => 'Фасады',
    'peregorodki' => 'Перегородки',
    'medicina'    => 'Медицина',
    'laboratorii' => 'Лаборатории',
    'orientka'    => 'Отделка',
    'mebel'       => 'Мебель',
    'transport'   => 'Транспорт',
    'vse'         => 'Все сферы',
);

$normalize = function ($it) use ($siteUrl) {
    $image = trim((string)isset($it['image']) ? $it['image'] : '');
    if ($image !== '' && strpos($image, 'http') !== 0) {
        $image = $siteUrl . '/' . ltrim($image, '/');
    }
    $url = trim((string)isset($it['url']) ? $it['url'] : '');
    if ($url === '') {
        $url = $siteUrl . '/' . trim((string)isset($it['slug']) ? $it['slug'] : '') . '/';
    }
    return array(
        'id'            => (int)(isset($it['id']) ? $it['id'] : 0),
        'slug'          => trim((string)isset($it['slug']) ? $it['slug'] : ''),
        'title'         => trim((string)isset($it['title']) ? $it['title'] : ''),
        'category'      => trim((string)isset($it['category']) ? $it['category'] : ''),
        'applications'  => array_values(array_filter(explode('|', (string)isset($it['applications']) ? $it['applications'] : ''))),
        'thickness'     => (int)(isset($it['thickness']) ? $it['thickness'] : 0),
        'tags'          => array_values(array_filter(array_map('trim', explode('|', (string)isset($it['tags']) ? $it['tags'] : '')))),
        'stock'         => trim((string)isset($it['stock']) ? $it['stock'] : ''),
        'price'         => array(
            'kind'  => trim((string)isset($it['price_kind']) ? $it['price_kind'] : ''),
            'label' => trim((string)isset($it['price_label']) ? $it['price_label'] : ''),
            'value' => trim((string)isset($it['price_value']) ? $it['price_value'] : ''),
        ),
        'image'         => $image,
        'short_desc'    => trim((string)isset($it['short_desc']) ? $it['short_desc'] : ''),
        'production_days' => trim((string)isset($it['production_days']) ? $it['production_days'] : ''),
        'min_order'     => trim((string)isset($it['min_order']) ? $it['min_order'] : ''),
        'delivery'      => trim((string)isset($it['delivery']) ? $it['delivery'] : ''),
        'url'           => $url,
    );
};

$products = array();
foreach ($items as $it) {
    $products[] = $normalize($it);
}

$json = json_encode(array(
    'applications' => $appLabels,
    'products'     => $products,
    'current'      => $normalize($current),
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Не допускаем случайного закрытия <script> в данных
$json = str_replace('</', '<\/', $json);

return '<script type="application/json" id="hpl-product-json">' . $json . '</script>';
