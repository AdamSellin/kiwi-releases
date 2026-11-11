// Site de Kiwi.
//
// - Le bouton « Télécharger Kiwi » mène à l'APK arm64-v8a de la dernière
//   version publiée (presque tous les téléphones), sinon à l'APK universel.
//   Mêmes noms de fichiers que l'updater intégré
//   (lib/data/update/app_release.dart). Sans JavaScript, ou si l'API de
//   GitHub ne répond pas (aucune version publiée, limite de requêtes, hors
//   ligne), le bouton mène à la page de la dernière version.
// - « Télécharger pour la TV » (section « Kiwi sur la télé » et page /tv)
//   mène à l'APK armeabi-v7a : beaucoup de télés sont en ARM 32 bits, et
//   il s'installe aussi sur celles en 64 bits. Repli : l'APK universel.
//   Sans JavaScript, les liens visent déjà ces fichiers dans la dernière
//   version (adresses fixes …/releases/latest/download/…).
// - Ouverte depuis une télé (navigateur de la télé, appli Downloader), la
//   page mène ses boutons « Télécharger » vers l'installation sur la télé.
// - « Quoi de neuf » reprend les notes de cette version (section du
//   CHANGELOG recopiée dans la Release) ; caché s'il n'y en a pas.
// - Carrousel des captures : flèches, points, capture du milieu en avant.
// - Navigation du bas (téléphone) : la section visible est mise en avant.

(function () {
  'use strict';

  // Dépôt public des APK (le code source est dans AdamSellin/Onde).
  var REPOSITORY = 'AdamSellin/kiwi-releases';
  var API = 'https://api.github.com/repos/' + REPOSITORY + '/releases/latest';
  var PREFERRED = ['app-arm64-v8a-release.apk', 'app-release.apk'];
  var TV_PREFERRED = ['app-armeabi-v7a-release.apk', 'app-release.apk'];
  var UNIVERSAL = 'app-release.apk';
  // Navigateurs des télés Android TV et Google TV (et de leurs boîtiers).
  var TV_AGENT = /Android ?TV|Google ?TV|GoogleTV|\bAFT\w+|BRAVIA|SMART-?TV|MiTV|\bTV Build|Leanback/i;

  var $ = function (selector) { return document.querySelector(selector); };

  // --- Dernière version ---

  function findApk(release, names) {
    if (!Array.isArray(release.assets)) return null;
    for (var i = 0; i < names.length; i++) {
      for (var j = 0; j < release.assets.length; j++) {
        if (release.assets[j].name === names[i]) return release.assets[j];
      }
    }
    return null;
  }

  function megabytes(bytes) {
    return (bytes / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mo';
  }

  // Lignes « - … » des notes de version, avec le **gras** du CHANGELOG.
  // Le texte est inséré comme texte, jamais comme HTML.
  function showNews(release, version) {
    var section = $('[data-news]');
    var list = $('[data-news-list]');
    if (!section || !list || typeof release.body !== 'string') return;
    var lines = release.body.split(/\r?\n/).filter(function (line) {
      return /^\s*[-*]\s+/.test(line);
    });
    if (!lines.length) return;
    lines.slice(0, 8).forEach(function (line) {
      var item = document.createElement('li');
      line.replace(/^\s*[-*]\s+/, '').split(/\*\*/).forEach(function (part, i) {
        if (!part) return;
        var node = i % 2 ? document.createElement('strong') : document.createTextNode(part);
        if (i % 2) node.textContent = part;
        item.appendChild(node);
      });
      list.appendChild(item);
    });
    var label = $('[data-news-version]');
    if (label) label.textContent = version;
    section.hidden = false;
  }

  function showRelease(release) {
    var version = String(release.tag_name || '').replace(/^v/, '');
    var apk = findApk(release, PREFERRED);
    var button = $('[data-download]');
    if (apk && button) {
      button.href = apk.browser_download_url;
      $('[data-download-label]').textContent = 'Télécharger Kiwi ' + version;
      $('[data-download-status]').textContent =
        'Fichier APK · ' + megabytes(apk.size) + ' · pour presque tous les téléphones Android.';
    }
    var tvApk = findApk(release, TV_PREFERRED);
    if (tvApk) {
      document.querySelectorAll('[data-download-tv]').forEach(function (link) {
        link.href = tvApk.browser_download_url;
      });
      document.querySelectorAll('[data-download-tv-status]').forEach(function (status) {
        status.textContent = 'Kiwi ' + version + ' · fichier APK · ' + megabytes(tvApk.size) +
          ' · pour presque toutes les télés Android TV et Google TV.';
      });
    }
    var universal = findApk(release, [UNIVERSAL]);
    if (universal) {
      document.querySelectorAll('[data-download-universal]').forEach(function (link) {
        link.href = universal.browser_download_url;
        var size = link.querySelector('[data-size]');
        if (size) size.textContent = megabytes(universal.size);
      });
    }
    document.querySelectorAll('[data-version]').forEach(function (label) {
      label.textContent = 'Version ' + version;
    });
    var releaseLine = $('[data-release-line]');
    if (releaseLine && version) {
      var date = release.published_at ? new Date(release.published_at) : null;
      releaseLine.textContent = 'Version ' + version +
        (date && !isNaN(date) ? ', publiée le ' + date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '') +
        ' · Android 7.0 ou plus récent et Android TV';
    }
    showNews(release, version);
  }

  // --- Page ouverte depuis une télé ---

  if (TV_AGENT.test(navigator.userAgent || '')) {
    document.documentElement.classList.add('on-tv');
    var heroLabel = $('[data-download-hero-label]');
    if (heroLabel) heroLabel.textContent = 'Télécharger pour la TV';
    ['[data-download-hero]', '[data-download-top]'].forEach(function (selector) {
      var link = $(selector);
      if (link) link.setAttribute('href', '#installer-tv');
    });
  }

  // Page /tv : le premier bouton a le focus, la croix et OK suffisent.
  var first = $('[data-autofocus]');
  if (first) first.focus();

  if (window.fetch) {
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('GitHub ' + response.status);
        return response.json();
      })
      .then(showRelease)
      .catch(function () { /* le lien vers la page des versions reste */ });
  }

  // --- Carrousel des captures ---

  var strip = $('[data-carousel]');
  if (strip) {
    var shots = Array.prototype.slice.call(strip.querySelectorAll('.shot'));
    var dotsBox = $('[data-carousel-dots]');
    var prev = $('[data-carousel-prev]');
    var next = $('[data-carousel-next]');
    var dots = shots.map(function () {
      var dot = document.createElement('span');
      if (dotsBox) dotsBox.appendChild(dot);
      return dot;
    });
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var currentIndex = function () {
      var middle = strip.scrollLeft + strip.clientWidth / 2;
      var best = 0;
      var bestDistance = Infinity;
      shots.forEach(function (shot, i) {
        var box = shot.parentElement;
        var distance = Math.abs(box.offsetLeft + box.offsetWidth / 2 - middle);
        if (distance < bestDistance) { bestDistance = distance; best = i; }
      });
      return best;
    };

    var update = function () {
      var current = currentIndex();
      var scrollable = strip.scrollWidth > strip.clientWidth + 4;
      shots.forEach(function (shot, i) {
        shot.classList.toggle('is-current', scrollable && i === current);
        dots[i].classList.toggle('is-current', i === current);
      });
      if (dotsBox) dotsBox.style.visibility = scrollable ? 'visible' : 'hidden';
      if (prev) prev.disabled = !scrollable || strip.scrollLeft <= 4;
      if (next) next.disabled = !scrollable || strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
    };

    var goTo = function (index) {
      var box = shots[Math.max(0, Math.min(shots.length - 1, index))].parentElement;
      strip.scrollTo({
        left: box.offsetLeft + box.offsetWidth / 2 - strip.clientWidth / 2,
        behavior: reduced ? 'auto' : 'smooth',
      });
    };

    if (prev) prev.addEventListener('click', function () { goTo(currentIndex() - 1); });
    if (next) next.addEventListener('click', function () { goTo(currentIndex() + 1); });
    var pending = false;
    strip.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () { pending = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // --- Navigation du bas : section visible ---

  var links = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  if (links.length && 'IntersectionObserver' in window) {
    var visible = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible[entry.target.id] = entry.isIntersecting; });
      var current = null;
      links.forEach(function (link) {
        if (!current && visible[link.getAttribute('data-nav')]) current = link;
      });
      if (current) {
        links.forEach(function (link) {
          link.classList.toggle('is-current', link === current);
          if (link === current) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    links.forEach(function (link) {
      var target = document.getElementById(link.getAttribute('data-nav'));
      if (target) observer.observe(target);
    });
  }
})();
