<?php
/**
 * ==========================================================================
 *  snGetHplProduct — карточка товара HPL (MODX Revolution 2.8.x)
 * ==========================================================================
 *  ОБЪЕДИНЯЕТ ДВА ИСТОЧНИКА ДАННЫХ и вшивает результат в страницу:
 *  <script type="application/json" id="hpl-product-json">...</script>
 *  Этот блок подхватывает product.js (см. репозиторий, assets/js/product.js).
 *
 *  1) TV ресурса-товара (приоритет) — заполняемые характеристики:
 *       hpl_thickness    — основная толщина, мм (число)
 *       hpl_thicknesses  — все толщины, «6|12|16|25» (блок «Другие толщины»)
 *       hpl_category     — тип материала (свободный текст)
 *       hpl_application  — применение (свободный текст)
 *       hpl_decors       — декоры (свободный текст)
 *       hpl_processing   — обработка (свободный текст)
 *       hpl_formats      — форматы, «3050×1300|3050×1600» (1–3 из трёх)
 *       hpl_techspec     — технические характеристики (структурный текст,
 *                          парсер в product.js::parseTechspec)
 *     TV создаёт install.php; описание каждого — modx/README.md.
 *
 *  2) MIGX-грид контейнера (фолбэк + «Другие решения») — строка с
 *     slug = alias текущего ресурса.
 *
 *  Код сниппета делает «сложную» работу:
 *   - читает TV ($modx->getTVValue) с защитой от отсутствующих TV,
 *   - «6|12|16»  → числовой массив thicknesses,
 *   - «3050×1300|3050×1600» → массив formats (валидация по канону),
 *   - перегоняет TV поверх MIGX-значений (заполненный TV побеждает),
 *   - строит JSON со всей витриной (для «Другие решения») + «current».
 *
 *  Параметры:
 *    &container — алиас или id ресурса-контейнера (по умолчанию hpl-catalog-container)
 *    &tv        — имя TV MIGX-грида (по умолчанию hpl_products)
 *    &id        — slug товара (по умолчанию — alias текущего ресурса)
 *
 *  Пример в шаблоне HPL Product:
 *    [[+snGetHplProduct?&id=`[[*alias*]]`*]]
 *
 *  Важно:
 *  - Ресурс-карточка товара: alias = MIGX-поле «slug», template = HPL Product.
 *  - TV можно не заполнять — страница сработает по значениям MIGX и дефолтам.
 * ==========================================================================
 */

// Защита от прямого доступа к файлу через браузер
if (!defined('MODX_CORE_PATH')) {
    exit;
}

/* Канон форматов листа — ОДИНАКОВЫЙ с assets/js/product.js (FORMATS).
   Ключи без «мм» и без пробелов, знак × (U+00D7). */
$FORMATS = array('3050×1300', '3050×1600', '3050×1250');

/* TV карточки товара (имя => как парсить) */
$HPL_TV = array('hpl_thickness', 'hpl_thicknesses', 'hpl_category', 'hpl_application', 'hpl_decors', 'hpl_processing', 'hpl_formats', 'hpl_techspec');

$tvName       = trim((string)$modx->getOption('tv', $scriptProperties, 'hpl_products'));
$containerRef = trim((string)$modx->getOption('container', $scriptProperties, 'hpl-catalog-container'));
$slug         = trim((string)$modx->getOption('id', $scriptProperties, ''));

// slug по умолчанию — alias текущего ресурса
if ($slug === '') {
    $slug = is_object($modx->resource) ? trim((string)$modx->resource->get('alias')) : '';
}

/* ---------- 1. Контейнер MIGX ---------- */
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

/* ---------- 3. Текущий товар в гриде (фолбэк-источник) ---------- */
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

/* ---------- 4. TV текущего ресурса ---------- */
$tvVals = array();
foreach ($HPL_TV as $t) {
    $tvVals[$t] = '';
}
if (is_object($modx->resource)) {
    $resId = (int)$modx->resource->id;
    foreach ($HPL_TV as $t) {
        $v = $modx->getTVValue($t, $resId);
        $tvVals[$t] = is_string($v) ? trim($v) : '';
    }
}

/* ---------- 5. Подготовка данных ---------- */
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

/* «6|12|16» → array(6,12,16) */
$parseThicknesses = function ($src) {
    $out = array();
    foreach (explode('|', (string)$src) as $t) {
        $t = (int)trim($t);
        if ($t > 0) $out[] = $t;
    }
    sort($out);
    return array_values(array_unique($out));
};

/* «3050×1300|3050×1600» → array (только канонические ключи;
   нестандартные значения отбрасываются — их JS всё равно не отрисует) */
$parseFormats = function ($src) use ($FORMATS) {
    $out = array();
    foreach (explode('|', (string)$src) as $f) {
        $f = trim($f);
        if (in_array($f, $FORMATS, true)) $out[] = $f;
    }
    return array_values(array_unique($out));
};

$normalize = function ($it) use ($siteUrl, $parseThicknesses, $parseFormats) {
    $image = trim((string)isset($it['image']) ? $it['image'] : '');
    if ($image !== '' && strpos($image, 'http') !== 0) {
        $image = $siteUrl . '/' . ltrim($image, '/');
    }
    $url = trim((string)isset($it['url']) ? $it['url'] : '');
    if ($url === '') {
        $url = $siteUrl . '/' . trim((string)isset($it['slug']) ? $it['slug'] : '') . '/';
    }
    $thickness = (int)(isset($it['thickness']) ? $it['thickness'] : 0);
    /* Все толщины: поле грида, иначе — сама основная */
    $thicknesses = $parseThicknesses(isset($it['thicknesses']) ? $it['thicknesses'] : '');
    if (count($thicknesses) === 0 && $thickness > 0) {
        $thicknesses = array($thickness);
    }
    return array(
        'id'            => (int)(isset($it['id']) ? $it['id'] : 0),
        'slug'          => trim((string)isset($it['slug']) ? $it['slug'] : ''),
        'title'         => trim((string)isset($it['title']) ? $it['title'] : ''),
        'category'      => trim((string)isset($it['category']) ? $it['category'] : ''),
        'applications'  => array_values(array_filter(explode('|', (string)isset($it['applications']) ? $it['applications'] : ''))),
        'application_text' => trim((string)isset($it['application_text']) ? $it['application_text'] : ''),
        'fire_class'    => trim((string)isset($it['fire_class']) ? $it['fire_class'] : ''),
        'thickness'     => $thickness,
        'thicknesses'   => $thicknesses,
        'decors'        => trim((string)isset($it['decors']) ? $it['decors'] : ''),
        'processing'    => trim((string)isset($it['processing']) ? $it['processing'] : ''),
        'formats'       => $parseFormats(isset($it['formats']) ? $it['formats'] : ''),
        'techspec'      => isset($it['techspec']) ? (string)$it['techspec'] : '',
        'tags'          => array_values(array_filter(array_map('trim', explode('|', (string)isset($it['tags']) ? $it['tags'] : '')))),
        'properties'    => array_values(array_filter(explode('|', (string)isset($it['properties']) ? $it['properties'] : ''))),
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

/* ---------- 6. Текущий товар: TV поверх MIGX ---------- */
$currentData = $normalize($current);

if ($tvVals['hpl_thickness'] !== '') {
    $currentData['thickness'] = (int)$tvVals['hpl_thickness'];
    if (!in_array($currentData['thickness'], $currentData['thicknesses'], true)) {
        $currentData['thicknesses'][] = $currentData['thickness'];
        sort($currentData['thicknesses']);
        $currentData['thicknesses'] = array_values(array_unique($currentData['thicknesses']));
    }
}
if ($tvVals['hpl_thicknesses'] !== '') {
    $ths = $parseThicknesses($tvVals['hpl_thicknesses']);
    if (count($ths) > 0) $currentData['thicknesses'] = $ths;
}
if ($tvVals['hpl_category'] !== '')    $currentData['category'] = $tvVals['hpl_category'];
if ($tvVals['hpl_application'] !== '') $currentData['application_text'] = $tvVals['hpl_application'];
if ($tvVals['hpl_decors'] !== '')      $currentData['decors'] = $tvVals['hpl_decors'];
if ($tvVals['hpl_processing'] !== '')  $currentData['processing'] = $tvVals['hpl_processing'];
if ($tvVals['hpl_formats'] !== '') {
    $fmts = $parseFormats($tvVals['hpl_formats']);
    if (count($fmts) > 0) $currentData['formats'] = $fmts;
}
if ($tvVals['hpl_techspec'] !== '')    $currentData['techspec'] = $tvVals['hpl_techspec'];

$json = json_encode(array(
    'applications' => $appLabels,
    'products'     => $products,
    'current'      => $currentData,
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Не допускаем случайного закрытия <script> в данных
$json = str_replace('</', '<\\/', $json);

return '<script type="application/json" id="hpl-product-json">' . $json . '</script>';
