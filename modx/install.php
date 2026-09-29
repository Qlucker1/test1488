<?php
/**
 * ==========================================================================
 *  УСТАНОВЩИК РАЗДЕЛА «КАТАЛОГ HPL» ДЛЯ MODX REVOLUTION 2.8.x
 *  Lemark HPL catalog — chunks, templates, MIGX container, snippets
 * ==========================================================================
 *
 *  ПРОИЗВОДСТВО (по шагам):
 *
 *  1. Скопируйте файлы в проект (папки в корне репозитория):
 *       assets/css/*        → /assets/templates/assets/css/
 *       assets/js/*         → /assets/templates/assets/js/
 *       assets/img/*        → /assets/templates/assets/img/
 *     (Шрифты VisueltPro уже есть на сайте: /assets/templates/assets/fonts/VisueltPro/)
 *
 *  2. Положите install.php в /assets/ (или /assets/import/) сайта.
 *
 *  3. Откройте в браузере ОДИН раз:
 *       https://ваш-сайт/assets/hpl_install.php?secret=лемарк2026&parent=1
 *
 *       parent=1 — id родителя, под которым создать ресурсы
 *                  (по умолчанию root; лучше указать id раздела «Каталог»)
 *       secret   — ключ; при необходимости смените $SECRET ниже
 *
 *  4. Установщик создаст:
 *       - чанки:  style.css, catalog.css, product.css, header, footer,
 *                 popups, hpl-product-card, hpl_products (конфиг MIGX)
 *       - шаблоны: HPL Catalog, HPL Product
 *       - TV:      hpl_products (тип «list» — так MIGX определяет грид)
 *       - snippet: snGetHplProducts, snGetHplProduct
 *       - ресурсы: hpl-catalog-container (MIGX-контейнер, скрытый,
 *                  заполнен тестовыми товарами из sample_data.json),
 *                  katalog-hpl (страница каталога), hpl-12-peregorodki
 *                  (пример карточки товара)
 *
 *  5. УДАЛИТЕ install.php после установки.
 *
 *  Скрипт идемпотентный: повторно открыть — существующие объекты
 *  не перезапишутся (проверка по имени), дописаны только ресурсы.
 * ==========================================================================
 */

// ---------------------------------------------------------------------------
// 1. Запуск MODX
// ---------------------------------------------------------------------------
if (!defined('MODX_BASE_PATH')) {
    define('MODX_BASE_PATH', dirname(__FILE__) . '/../');
    $coreFile = MODX_BASE_PATH . 'core/modx/index.php';
    if (!file_exists($coreFile)) {
        die('MODX core не найден: ' . $coreFile
            . ' — установите install.php в /assets/ сайта (или в /assets/import/ и поправьте путь).');
    }
    require_once $coreFile;
}

// ---------------------------------------------------------------------------
// 2. Безопасность
// ---------------------------------------------------------------------------
$SECRET = 'лемарк2026'; // <-- смените при желании
$secret = isset($_GET['secret']) ? $_GET['secret'] : '';
if ($secret !== $SECRET) {
    http_response_code(403);
    die('Запрещено. Нужен параметр ?secret=... (см. заголовок install.php).');
}

$parent = isset($_GET['parent']) && is_numeric($_GET['parent']) ? (int)$_GET['parent'] : 1;

ob_start();
$log = array(); // [ 'ok'|'skip'|'err', 'text' ]

function note($level, $text) {
    global $log;
    $log[] = array($level, $text);
}

function file_local($name) {
    return dirname(__FILE__) . '/' . $name;
}

function read_local($name) {
    $path = file_local($name);
    if (!file_exists($path)) {
        return false;
    }
    return file_get_contents($path);
}

// ---------------------------------------------------------------------------
// 3. Чанки
// ---------------------------------------------------------------------------
$chunks = array(
    'style.css'          => array('chunks/style.css.txt',          'Базовые стили раздела «Каталог HPL» (инлайнится в head рядом с основным style.css)'),
    'catalog.css'        => array('chunks/catalog.css.txt',        'CSS страницы «Каталог HPL»'),
    'product.css'        => array('chunks/product.css.txt',        'CSS страницы «Карточка товара HPL»'),
    'header'             => array('chunks/header.txt',             'Шапка раздела (как на lemarkllc.ru)'),
    'footer'             => array('chunks/footer.txt',             'Подвал раздела'),
    'popups'             => array('chunks/popups.txt',             'Pop-ап формы (обратный звонок, спецификация)'),
    'hpl-product-card'   => array('chunks/hpl-product-card.txt',   'Карточка товара каталога (рендерится snGetHplProducts)'),
    'hpl_products'       => array('migx/hpl_products.json',        'Конфиг MIGX-грида «Каталог HPL» (MIGX читает конфиг из чанка с именем TV)'),
);

foreach ($chunks as $name => $meta) {
    $content = read_local($meta[0]);
    if ($content === false) {
        note('err', 'Чанк «' . $name . '»: файл не найден — ' . $meta[0]);
        continue;
    }
    if ($modx->getObject('modChunk', $name)) {
        note('skip', 'Чанк «' . $name . '» — уже существует, не трогаем');
        continue;
    }
    $chunk = $modx->newObject('modChunk');
    $chunk->set('name', $name);
    $chunk->set('description', $meta[1]);
    $chunk->set('snippet', $content);
    if ($modx->save($chunk)) {
        note('ok', 'Чанк «' . $name . '» создан');
    } else {
        note('err', 'Чанк «' . $name . '»: ошибка сохранения');
    }
}

// ---------------------------------------------------------------------------
// 4. Шаблоны
// ---------------------------------------------------------------------------
$templates = array(
    'HPL Catalog' => array('templates/catalog.tpl.txt', 'Страница каталога HPL-панелей'),
    'HPL Product' => array('templates/product.tpl.txt', 'Карточка товара HPL'),
);

$tplIds = array();
foreach ($templates as $name => $meta) {
    $content = read_local($meta[0]);
    if ($content === false) {
        note('err', 'Шаблон «' . $name . '»: файл не найден — ' . $meta[0]);
        continue;
    }
    if ($modx->getObject('modTemplate', $name)) {
        note('skip', 'Шаблон «' . $name . '» — уже существует, не трогаем');
    } else {
        $tpl = $modx->newObject('modTemplate');
        $tpl->set('templatename', $name);
        $tpl->set('description', $meta[1]);
        $tpl->set('content', $content);
        if ($modx->save($tpl)) {
            note('ok', 'Шаблон «' . $name . '» создан');
        } else {
            note('err', 'Шаблон «' . $name . '»: ошибка сохранения');
            continue;
        }
    }
    $tplIds[$name] = (int)$modx->getObject('modTemplate', $name)->get('id');
}

// ---------------------------------------------------------------------------
// 5. TV hpl_products (MIGX определяет грид по TV типа «list» + чанку с тем же именем)
// ---------------------------------------------------------------------------
if ($modx->getObject('modTemplateVariable', 'hpl_products')) {
    note('skip', 'TV «hpl_products» — уже существует, не трогаем');
} else {
    $tv = $modx->newObject('modTemplateVariable');
    $tv->set('name', 'hpl_products');
    $tv->set('type', 'list');
    $tv->set('display', 'combo');
    $tv->set('description', 'MIGX-грид «Каталог HPL»');
    $tv->set('rank', 90);
    $tv->set('process_type', 0);
    $tv->set('tv_type', 0);
    $tv->set('display', 'combo');
    if ($modx->save($tv)) {
        note('ok', 'TV «hpl_products» создана');
    } else {
        note('err', 'TV «hpl_products»: ошибка сохранения');
    }
}

// Привязка TV к шаблонам раздела
$tvObj = $modx->getObject('modTemplateVariable', 'hpl_products');
if ($tvObj && !empty($tplIds)) {
    $ids = ',' . implode(',', $tplIds) . ',';
    $tvObj->set('template_ids', $ids);
    $tvObj->save();
    note('ok', 'TV «hpl_products» привязана к шаблонам: ' . implode(', ', array_keys($tplIds)));
}

// ---------------------------------------------------------------------------
// 6. Snippets
// ---------------------------------------------------------------------------
$snippets = array(
    'snGetHplProducts' => array('snippets/snGetHplProducts.php', 'Каталог HPL: вывод карточек из MIGX-грида'),
    'snGetHplProduct'  => array('snippets/snGetHplProduct.php',  'Карточка товара: вешает JSON товара из MIGX для product.js'),
);

foreach ($snippets as $name => $meta) {
    $code = read_local($meta[0]);
    if ($code === false) {
        note('err', 'Snippet «' . $name . '»: файл не найден — ' . $meta[0]);
        continue;
    }
    if ($modx->getObject('modSnippet', $name)) {
        note('skip', 'Snippet «' . $name . '» — уже существует, не трогаем');
        continue;
    }
    $sn = $modx->newObject('modSnippet');
    $sn->set('name', $name);
    $sn->set('description', $meta[1]);
    $sn->set('snippet', $code);
    $sn->set('static_file', 0);
    $sn->set('locked', 0);
    if ($modx->save($sn)) {
        note('ok', 'Snippet «' . $name . '» создан');
    } else {
        note('err', 'Snippet «' . $name . '»: ошибка сохранения');
    }
}

// ---------------------------------------------------------------------------
// 7. Ресурс-контейнер MIGX + тестовые товары
// ---------------------------------------------------------------------------
$container = $modx->getObject('modResource', array('alias' => 'hpl-catalog-container'));
if ($container) {
    note('skip', 'Ресурс «hpl-catalog-container» — уже существует');
} else {
    $container = $modx->newObject('modResource');
    $container->set('pagetitle', 'HPL Каталог (MIGX-контейнер)');
    $container->set('longtitle', 'Скрытый контейнер MIGX-грида каталога HPL');
    $container->set('description', 'Не публикуется. Товары редактируются через MIGX-интерфейс (вкладка «Свойства»).');
    $container->set('alias', 'hpl-catalog-container');
    $container->set('template', 0);
    $container->set('parent', $parent);
    $container->set('published', 0);
    $container->set('isfolder', 0);
    $container->set('content', '');
    $container->set('menuindex', 900);
    $container->set('show_in_menu', 0);
    if ($modx->save($container)) {
        note('ok', 'Ресурс-контейнер «hpl-catalog-container» создан (скрыт из меню)');
    } else {
        note('err', 'Ресурс-контейнер: ошибка создания');
    }
}

// Заполняем TV тестовыми товарами (только если грид пуст)
if ($container) {
    $existing = (string)$container->get('hpl_products');
    $rows = $existing !== '' ? json_decode($existing, true) : null;
    if (!is_array($rows) || count($rows) === 0) {
        $sample = read_local('sample_data.json');
        if ($sample !== false) {
            $data = json_decode($sample, true);
            $rows = array();
            foreach (isset($data['products']) ? $data['products'] : array() as $i => $p) {
                $image = isset($p['image']) ? $p['image'] : '';
                // пути картинок: assets/img/... → assets/templates/assets/img/...
                $image = str_replace('assets/img/', 'assets/templates/assets/img/', $image);
                $rows[] = array(
                    'id'               => 1000 + (int)$p['id'],
                    'sort'             => $i + 1,
                    'title'            => $p['title'],
                    'slug'             => $p['slug'],
                    'category'         => $p['category'],
                    'applications'     => implode('|', $p['applications']),
                    'application_text' => isset($p['application_text']) ? $p['application_text'] : '',
                    'fire_class'       => isset($p['fire_class']) ? $p['fire_class'] : '',
                    'thickness'        => (int)$p['thickness'],
                    'properties'       => isset($p['properties']) ? implode('|', $p['properties']) : '',
                    'tags'             => implode('|', $p['tags']),
                    'stock'            => $p['stock'],
                    'price_kind'       => $p['price']['kind'],
                    'price_label'      => $p['price']['label'],
                    'price_value'      => $p['price']['value'],
                    'image'            => $image,
                    'short_desc'       => $p['short_desc'],
                    'production_days'  => $p['production_days'],
                    'min_order'        => $p['min_order'],
                    'delivery'         => $p['delivery'],
                    'url'              => '',
                );
            }
            $container->set('hpl_products', json_encode($rows, JSON_UNESCAPED_UNICODE));
            if ($container->save()) {
                note('ok', 'В MIGX-грид добавлено ' . count($rows) . ' тестовых товаров (sample_data.json)');
            } else {
                note('err', 'Не удалось сохранить товары в TV «hpl_products»');
            }
        } else {
            note('err', 'sample_data.json не найден рядом с install.php — товары не добавлены');
        }
    } else {
        note('skip', 'MIGX-грид уже содержит ' . count($rows) . ' товаров, не трогаем');
    }
}

// ---------------------------------------------------------------------------
// 8. Ресурс каталога
// ---------------------------------------------------------------------------
$catalogPage = $modx->getObject('modResource', array('alias' => 'katalog-hpl'));
if ($catalogPage) {
    note('skip', 'Ресурс «katalog-hpl» — уже существует');
} elseif (isset($tplIds['HPL Catalog'])) {
    $seo = '<p>Lemark является ведущим российским производителем декоративного бумажно-слоистого пластика (HPL). Наш каталог включает широкий ассортимент решений для архитектуры, дизайна интерьеров и промышленного применения. Мы предлагаем панели Compact HPL, фасадные решения и специализированные материалы с повышенной износостойкостью.</p>'
         . '<p>Все материалы производятся на современном оборудовании с соблюдением строгих экологических и технических стандартов. В каталоге представлены как складские позиции, доступные к отгрузке в кратчайшие сроки, так и решения, которые могут быть произведены индивидуально под ваш проект.</p>'
         . '<p>Система фильтрации позволяет быстро отсортировать материалы по сфере применения — от медицинских учреждений и чистых помещений до транспортного машиностроения и производства мебели. Для каждой позиции доступна подробная техническая документация и сертификаты соответствия.</p>'
         . '<p>Если вам необходим расчет стоимости проекта или помощь в выборе конкретного декора из нашей коллекции, воспользуйтесь формой обратной связи или свяжитесь с отделом проектных продаж. Мы обеспечиваем полную техническую поддержку на всех этапах реализации объекта.</p>';

    $catalogPage = $modx->newObject('modResource');
    $catalogPage->set('pagetitle', 'Каталог HPL-панелей Lemark');
    $catalogPage->set('longtitle', 'Каталог HPL-панелей Lemark');
    $catalogPage->set('description', 'Каталог HPL-панелей Lemark: подберите HPL по применению, типу материала, толщине и характеристикам. Более 3156 декоров, производство полного цикла.');
    $catalogPage->set('alias', 'katalog-hpl');
    $catalogPage->set('template', $tplIds['HPL Catalog']);
    $catalogPage->set('parent', $parent);
    $catalogPage->set('published', 1);
    $catalogPage->set('isfolder', 0);
    $catalogPage->set('content', $seo);
    $catalogPage->set('menuindex', 100);
    $catalogPage->set('show_in_menu', 1);
    $catalogPage->set('menutitle', 'Каталог HPL');
    if ($modx->save($catalogPage)) {
        note('ok', 'Страница каталога «katalog-hpl» создана и опубликована');
    } else {
        note('err', 'Ресурс каталога: ошибка создания');
    }
}

// ---------------------------------------------------------------------------
// 9. Пример карточки товара (первый товар из sample)
// ---------------------------------------------------------------------------
$sample = read_local('sample_data.json');
$sampleData = $sample !== false ? json_decode($sample, true) : null;
if ($sampleData && !empty($sampleData['products']) && isset($tplIds['HPL Product'])) {
    $first = $sampleData['products'][0];
    $demo = $modx->getObject('modResource', array('alias' => $first['slug']));
    if ($demo) {
        note('skip', 'Ресурс «' . $first['slug'] . '» — уже существует');
    } else {
        $demo = $modx->newObject('modResource');
        $demo->set('pagetitle', $first['title']);
        $demo->set('longtitle', $first['title']);
        $demo->set('description', $first['short_desc']);
        $demo->set('alias', $first['slug']);
        $demo->set('template', $tplIds['HPL Product']);
        $demo->set('parent', $parent);
        $demo->set('published', 1);
        $demo->set('isfolder', 0);
        $demo->set('content', '');
        $demo->set('menuindex', 101);
        $demo->set('show_in_menu', 0);
        if ($modx->save($demo)) {
            note('ok', 'Пример карточки товара «' . $first['slug'] . '» создан и опубликован');
        } else {
            note('err', 'Пример карточки товара: ошибка создания');
        }
    }
    note('info', 'Остальные карточки товара: создайте ресурсы с шаблоном «HPL Product», '
        . 'alias = поле «slug» из MIGX-грида (можно пакетно через MIGX-экспорт или руками).');
}

// ---------------------------------------------------------------------------
// 10. Отчет
// ---------------------------------------------------------------------------
$css = '<style>body{font-family:Arial,sans-serif;background:#f7f7f7;color:#222;margin:0;padding:30px}
.box{max-width:900px;margin:0 auto;background:#fff;border:1px solid #e1e1e1;padding:30px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:24px 0 10px;color:#838383;text-transform:uppercase;letter-spacing:.05em}
.ok{color:#2e7d32;font-weight:bold}.skip{color:#e67e22;font-weight:bold}.err{color:#e42840;font-weight:bold}.info{color:#35507a;font-weight:bold}
ul{margin:8px 0;padding-left:20px;line-height:1.7}li{font-size:14px}
.warn{background:#fff4f5;border:1px solid #e42840;padding:14px;font-size:14px;margin-top:20px}
a{color:#e42840}</style>';

echo '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Установка раздела «Каталог HPL»</title>' . $css . '</head><body><div class="box">';
echo '<h1>Раздел «Каталог HPL» — отчет об установке</h1>';
echo '<p style="font-size:13px;color:#838383">MODX ' . $modx->version['code_version'] . ' • ' . date('d.m.Y H:i') . '</p>';

$groups = array('ok' => 'Создано', 'skip' => 'Пропущено (уже существует)', 'err' => 'Ошибки', 'info' => 'Важно');
foreach ($groups as $key => $label) {
    $items = array_filter($log, function ($r) use ($key) { return $r[0] === $key; });
    if (!$items) continue;
    echo '<h2>' . $label . '</h2><ul>';
    foreach ($items as $item) {
        echo '<li><span class="' . $item[0] . '">●</span> ' . htmlspecialchars($item[1], ENT_QUOTES) . '</li>';
    }
    echo '</ul>';
}

echo '<h2>Дальнейшие шаги</h2><ul>
<li>Скопируйте файлы в сайт: <code>assets/css/ → /assets/templates/assets/css/</code>, <code>assets/js/ → /assets/templates/assets/js/</code>, <code>assets/img/ → /assets/templates/assets/img/</code>.</li>
<li>Откройте ресурс <b>hpl-catalog-container</b> в менеджере → вкладка «Свойства» → там MIGX-грид «Каталог HPL»: редактируйте/добавляйте товары.</li>
<li>Проверьте страницу: <a href="' . rtrim($modx->getOption('site_url'), '/') . '/katalog-hpl/" target="_blank">/katalog-hpl/</a> и карточку: <a href="' . rtrim($modx->getOption('site_url'), '/') . '/hpl-12-peregorodki/" target="_blank">/hpl-12-peregorodki/</a>.</li>
<li>В шапке/подвале (чанки header, footer) при необходимости поправьте алиасы меню под ваш сайт.</li>
<li><b>Удалите этот файл (install.php) с сервера.</b></li>
</ul>';

echo '<div class="warn"><b>ВНИМАНИЕ:</b> после проверки работы каталога обязательно удалите install.php с сервера — это установочный скрипт с доступом к базе данных.</div>';
echo '</div></body></html>';
