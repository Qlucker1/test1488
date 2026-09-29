/* ==========================================================================
   LEMARK — базовый JS: меню, pop-апы, формы, cookie
   (аналог основного JS сайта; при переносе на MODX сохраняется как есть)
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(html) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = html;
    el.classList.add('toast_shown');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('toast_shown');
    }, 4000);
  }

  /* ---------- Мобильное меню ---------- */
  function initMenu() {
    var toggle = document.querySelector('.js-menu-toggle');
    var overlay = document.querySelector('.js-menu-overlay');
    if (!toggle) return;

    function close() {
      document.body.classList.remove('menu-open');
    }

    toggle.addEventListener('click', function () {
      document.body.classList.toggle('menu-open');
    });
    if (overlay) overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ---------- Pop-апы ---------- */
  function initPopups() {
    function open(id) {
      var p = document.getElementById(id);
      if (!p) return;
      p.classList.add('popup_shown');
      document.body.style.overflow = 'hidden';
    }
    function closeAll() {
      document.querySelectorAll('.popup.popup_shown').forEach(function (p) {
        p.classList.remove('popup_shown');
      });
      document.body.style.overflow = '';
    }

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && (t.closest('.js-open-callback') || t.closest('[data-open-callback]'))) {
        e.preventDefault();
        open('callbackPopup');
        return;
      }
      if (t.closest && t.closest('.js-open-spec')) {
        e.preventDefault();
        open('specPopup');
        return;
      }
      if (t.closest && t.closest('.js-open-price')) {
        e.preventDefault();
        open('pricePopup');
        return;
      }
      if (t.closest && t.closest('.js-open-samples') || t.closest && t.closest('[data-open-samples]')) {
        e.preventDefault();
        open('samplesPopup');
        return;
      }
      if (t.closest && t.closest('.js-open-calc')) {
        e.preventDefault();
        open('calcPopup');
        return;
      }
      if (t.closest && t.closest('.js-popup-close')) {
        closeAll();
        return;
      }
      if (t.classList && t.classList.contains('popup')) {
        closeAll();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  /* ---------- Файлы в формах ---------- */
  function initFileFields() {
    document.querySelectorAll('.js-file-field').forEach(function (field) {
      var input = field.querySelector('.common-form__real-file-input');
      var label = field.querySelector('.js-file-label');
      if (!input || !label) return;
      var def = label.textContent;
      input.addEventListener('change', function () {
        label.textContent = input.files.length ? '📎 ' + input.files[0].name : def;
      });
    });
  }

  /* ---------- Демо-отправка форм (Netlify).
     На MODX формы уходят через AjaxForm/свой коннектор — см. modx/README.md */
  function initDemoForms() {
    document.querySelectorAll('.js-demo-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = form.dataset.formName || 'Заявка';
        form.reset();
        toast('<b>Спасибо!</b> Заявка «' + name + '» отправлена. Менеджер свяжется с вами в рабочее время.');
        document.querySelectorAll('.popup.popup_shown').forEach(function (p) {
          p.classList.remove('popup_shown');
        });
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- Cookie-плашка ---------- */
  function initCookies() {
    var banner = document.getElementById('cookieBanner');
    var accept = document.getElementById('cookieAccept');
    if (!banner || !accept) return;
    if (localStorage.getItem('lemark_cookies_ok')) {
      banner.classList.add('is-hidden');
      return;
    }
    accept.addEventListener('click', function () {
      try {
        localStorage.setItem('lemark_cookies_ok', '1');
      } catch (err) { /* noop */ }
      banner.classList.add('is-hidden');
    });
  }

  /* ---------- Год в подвале ---------- */
  function initYear() {
    var y = document.getElementById('footerYear');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- Ссылки "скачать" (демо-PDF) ---------- */
  function initDownloads() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.js-download-doc');
      if (!a) return;
      e.preventDefault();
      toast('<b>Демо-режим:</b> файл документа будет лежать на MODX в /assets/files/pdf/ — см. modx/README.md');
    });
  }

  /* ---------- Экспорт ---------- */
  window.Lemark = { toast: toast };

  document.addEventListener('DOMContentLoaded', function () {
    initMenu();
    initPopups();
    initFileFields();
    initDemoForms();
    initCookies();
    initYear();
    initDownloads();
  });
})();
