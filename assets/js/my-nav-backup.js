/**
 * 我的导航 导出/导入 备份
 * 数据源：localStorage["myLinks"]（与站点原有“我的导航”功能共用）
 * 导出：下载 JSON 备份文件
 * 导入：读取 JSON 备份，按 url 去重追加合并，并渲染到“我的导航”
 */
(function ($) {
  'use strict';
  if (typeof $ === 'undefined') return;

  var MY_KEY = 'myLinks';

  function getMyLinks() {
    try {
      var a = window.localStorage.getItem(MY_KEY);
      return a ? JSON.parse(a) : [];
    } catch (e) {
      return [];
    }
  }

  function setMyLinks(arr) {
    window.localStorage.setItem(MY_KEY, JSON.stringify(arr));
  }

  function esc(str) {
    return $('<i/>').text(str == null ? '' : String(str)).html();
  }

  // 生成图标地址（gstatic 要求 url 参数必须带协议；保留原始 http/https，无协议默认补 https://）
  function faviconUrl(url, defaultLogo) {
    var s = String(url || '').trim();
    if (!s) { return defaultLogo || ''; }
    var m = s.match(/^((https?):\/\/)?((?:[-A-Za-z0-9]+\.)+[A-Za-z]{2,6})/);
    if (m && m.length >= 4) {
      var proto = m[2] ? (m[2].toLowerCase() + '://') : 'https://';
      return 'https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=48&url=' + proto + m[3];
    }
    return defaultLogo || '';
  }

  // 修正单个 gstatic favicon 图标：url 参数缺协议的补上协议（保留站点原始 http/https，http 站不能用 https 拉图标）
  function fixImg($img) {
    // 从所在卡片链接读取原始网址，确定协议
    var rawUrl = '';
    var $a = $img.closest('a.card');
    if ($a.length) { rawUrl = $a.attr('data-url') || $a.attr('href') || ''; }
    var proto = 'https://';
    var pm = String(rawUrl).match(/^(https?):\/\//i);
    if (pm) { proto = pm[1].toLowerCase() + '://'; }
    ['data-src', 'src'].forEach(function (attr) {
      var src = $img.attr(attr);
      if (!src || src.indexOf('t2.gstatic.cn/faviconV2') === -1) { return; }
      var m = src.match(/[?&]url=([^&]*)/);
      if (!m || !m[1]) { return; }
      var u;
      try { u = decodeURIComponent(m[1]); } catch (e) { u = m[1]; }
      if (u && !/^https?:\/\//i.test(u)) {
        var fixed = 'https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=48&url=' + proto + u;
        $img.attr(attr, fixed);
      }
    });
  }

  // 修正“我的导航”区域所有 gstatic favicon 图标（页面加载时执行一次）
  function fixMyNavIcons() {
    $('#my-nav img.lazy, #my-nav img').each(function () {
      fixImg($(this));
    });
  }

  // 监听“我的导航”区域动态新增的卡片，立即修正新卡片的图标（解决当场添加图标不显示）
  function watchMyNavIcons() {
    if (typeof MutationObserver === 'undefined') { return; }
    var target = document.getElementById('my-nav') || document.body;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (!m.addedNodes) { return; }
        for (var i = 0; i < m.addedNodes.length; i++) {
          var node = m.addedNodes[i];
          if (!node || node.nodeType !== 1) { continue; }
          $(node).find('img').addBack().filter('img').each(function () {
            fixImg($(this));
          });
        }
      });
    });
    obs.observe(target, { childList: true, subtree: true });
  }

  // 渲染一条导入的网址卡片（结构对齐站点“我的导航”卡片）
  function renderImportedCard(site, defaultLogo) {
    var ico = faviconUrl(site.url, defaultLogo);
    var name = esc(site.name);
    return $(
      '<div class="url-card col-6  col-2a col-sm-2a col-md-2a col-lg-3a col-xl-5a col-xxl-6a  col-xxl-10a imported-card">' +
        '<div class="url-body mini">' +
          '<a href="' + esc(site.url) + '" target="_blank" class="card new-site mb-3 site-' + esc(site.id) + '" data-id="' + esc(site.id) + '" data-url="' + esc(site.url) + '" data-toggle="tooltip" data-placement="bottom" title="' + name + '" rel="external nofollow">' +
            '<div class="card-body" style="padding:0.4rem 0.5rem;">' +
              '<div class="url-content d-flex align-items-center">' +
                '<div class="url-img rounded-circle mr-2 d-flex align-items-center justify-content-center">' +
                  '<img class="lazy unfancybox" src="' + ico + '" data-src="' + ico + '">' +
                '</div>' +
                '<div class="url-info flex-fill">' +
                  '<div class="text-sm overflowClip_1"><strong>' + name + '</strong></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</a>' +
          '<a href="javascript:;" class="text-center remove-site" data-id="' + esc(site.id) + '" style="display: none"><i class="iconfont icon-close-circle"></i></a>' +
        '</div>' +
      '</div>'
    );
  }

  function importSites(list) {
    if (!$.isArray(list) || !list.length) return { added: 0, skipped: 0 };
    var current = getMyLinks();
    var exists = {};
    var i;
    for (i = 0; i < current.length; i++) exists[String(current[i].url)] = true;
    var added = 0, skipped = 0, ts = +new Date();
    var defaultLogo = $('#myNavExport').attr('data-logo') || '';
    var cards = [];
    for (i = 0; i < list.length; i++) {
      var it = list[i] || {};
      var url = String(it.url || '').trim();
      if (!url) { skipped++; continue; }
      if (exists[url]) { skipped++; continue; }
      var name = String(it.name || it.title || url).trim();
      var site = { id: it.id ? it.id : (ts + i), name: name, url: url };
      exists[url] = true;
      current.unshift(site);
      cards.push(renderImportedCard(site, defaultLogo));
      added++;
    }
    if (added) {
      setMyLinks(current);
      for (var j = 0; j < cards.length; j++) {
        $('#add-site').before(cards[j]);
      }
    }
    return { added: added, skipped: skipped };
  }

  function notify(status, msg) {
    if (typeof showAlert === 'function') {
      try { showAlert(JSON.parse('{"status":' + status + ',"msg":"' + msg + '"}'));
      } catch (e) { alert(msg); }
    } else {
      alert(msg);
    }
  }

  function doExport() {
    var list = getMyLinks();
    var payload = { version: 1, exportedAt: new Date().toISOString(), myLinks: list };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : n; };
    a.download = '我的导航备份_' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    notify(2, '已导出 ' + list.length + ' 条导航数据，请妥善保存备份文件');
  }

  $(function () {
    // 页面加载后修正“我的导航”区域缺协议的 favicon 图标
    fixMyNavIcons();
    // 监听动态新增卡片，当场添加的网址图标也能立即修正
    watchMyNavIcons();

    // 方案A：平时隐藏，进入编辑态（点“编辑”）才显示导出/导入按钮
    var myNavEditOn = false;
    $(document).on('click', '.customize-menu .btn-edit', function () {
      myNavEditOn = !myNavEditOn;
      $('#myNavExport, #myNavImport').toggle(myNavEditOn);
    });

    // 导出
    $(document).on('click', '#myNavExport', function (e) {
      e.preventDefault();
      doExport();
    });

    // 导入
    var $file = $('<input type="file" accept=".json,application/json" style="display:none">').appendTo('body');
    $(document).on('click', '#myNavImport', function (e) {
      e.preventDefault();
      $file.trigger('click');
    });
    $file.on('change', function () {
      var f = this.files && this.files[0];
      if (!f) { return; }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var list = $.isArray(data) ? data : (data && data.myLinks ? data.myLinks : null);
          if (!$.isArray(list)) {
            notify(4, '备份文件格式不正确，请选择本站导出的 JSON 备份');
            return;
          }
          var r = importSites(list);
          if (r.added > 0) {
            notify(1, '导入成功 ' + r.added + ' 条' + (r.skipped ? '，跳过重复 ' + r.skipped + ' 条' : ''));
          } else {
            notify(4, r.skipped ? '备份中 ' + r.skipped + ' 条记录与现有导航重复，未新增' : '备份中没有可导入的数据');
          }
        } catch (err) {
          notify(4, '文件读取失败，请确认是有效的 JSON 备份文件');
        }
        $file.val('');
      };
      reader.readAsText(f, 'utf-8');
    });

    // 删除导入的卡片（编辑态下与原有卡片一致显示删除按钮）
    $(document).on('click', '#my-nav .imported-card .remove-site', function () {
      var id = $(this).data('id');
      var list = getMyLinks();
      for (var i = 0; i < list.length; i++) {
        if (parseInt(list[i].id) === parseInt(id)) {
          list.splice(i, 1);
          break;
        }
      }
      setMyLinks(list);
      $(this).closest('.url-card').remove();
    });
  });
})(jQuery);
