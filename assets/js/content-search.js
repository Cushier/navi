// ============================================
// 站内搜索功能
// ============================================
var zhanneiSites = [];
var zhanneiCollected = false;

// 收集所有网站信息（排除最近访问和添加按钮）
function zhanneiCollectSites() {
    zhanneiSites = [];
    $('.url-card').not('#my-click .url-card').not('#add-site').each(function() {
        var $card = $(this);
        var $link = $card.find('a.card');
        var title = $card.find('strong').text().trim();
        var description = $link.attr('title') || $link.attr('data-original-title') || '';
        var url = $link.attr('data-url') || $link.attr('href') || '';
        var logo = $card.find('img').attr('data-src') || $card.find('img').attr('src') || '';
        
        // 去掉描述里的HTML
        description = description.replace(/<[^>]+>/g, '');
        
        if (title && url && url !== '#' && url !== 'javascript:;' && url.indexOf('javascript') !== 0) {
            // 按URL去重，避免常用推荐和其他分类重复
            var exists = zhanneiSites.some(function(s) { return s.url === url; });
            if (!exists) {
                zhanneiSites.push({
                    title: title,
                    description: description,
                    url: url,
                    logo: logo
                });
            }
        }
    });
    zhanneiCollected = true;
}

// 搜索站内网站（标题匹配权重 > 描述匹配）
function zhanneiSearch(keyword) {
    if (!keyword || !zhanneiCollected) return [];
    keyword = keyword.toLowerCase();
    var results = [];
    
    for (var i = 0; i < zhanneiSites.length; i++) {
        var site = zhanneiSites[i];
        var titleMatch = site.title.toLowerCase().indexOf(keyword) !== -1;
        var descMatch = site.description.toLowerCase().indexOf(keyword) !== -1;
        
        if (titleMatch || descMatch) {
            results.push({
                site: site,
                score: titleMatch ? 2 : 1
            });
        }
    }
    
    results.sort(function(a, b) {
        return b.score - a.score;
    });
    
    return results.map(function(r) { return r.site; });
}

// 显示站内搜索建议
function zhanneiShowTips(keyword, parent) {
    var results = zhanneiSearch(keyword);
    var $list = parent.children('.search-smart-tips');
    var $ul = $list.children('ul');
    
    $ul.empty();
    $ul.show(); // 确保ul显示（首页的ul默认有display:none）
    
    if (results.length > 0) {
        var max = Math.min(results.length, 8);
        for (var i = 0; i < max; i++) {
            var site = results[i];
            var logoHtml = site.logo ? '<img src="' + site.logo + '" class="zhannei-logo" onerror="this.style.display=\'none\'">' : '';
            var $li = $('<li class="zhannei-result">' +
                logoHtml +
                '<div class="zhannei-info">' +
                '<div class="zhannei-title">' + site.title + '</div>' +
                '<div class="zhannei-desc">' + (site.description || '') + '</div>' +
                '</div></li>');
            $li.data('url', site.url);
            $ul.append($li);
        }
        
        // 点击跳转
        $ul.find('.zhannei-result').click(function() {
            var url = $(this).data('url');
            if (url) {
                window.open(url, '_blank');
            }
            $list.slideUp(200);
        });
        
        $list.slideDown(200);
    } else {
        $ul.append('<li class="zhannei-noresult">站内没有找到相关网站，可切换到百度搜索</li>');
        $list.slideDown(200);
    }
}

// 过滤页面显示（方案4：顶部独立搜索结果区域，集中显示所有匹配网站）
function zhanneiFilterPage(keyword) {
    if (!keyword) {
        zhanneiRestorePage();
        return;
    }
    
    var results = zhanneiSearch(keyword);
    
    // 先移除之前的搜索结果
    $('#zhannei-search-results').remove();
    
    if (results.length === 0) {
        zhanneiShowCount(0, keyword);
        return;
    }
    
    // 隐藏原来的所有分类内容（加class，用CSS控制，更可靠）
    $('.content-site').addClass('zhannei-searching');
    
    // 创建搜索结果区域
    var $results = $('<div id="zhannei-search-results"><div class="row io-mx-n2"></div></div>');
    var $row = $results.find('.row');
    
    // 把所有匹配的卡片克隆进去（保留原有样式，统一处理差异）
    for (var i = 0; i < results.length; i++) {
        var site = results[i];
        var $card = $('.url-card').not('#my-click .url-card').not('#add-site').filter(function() {
            var $link = $(this).find('a.card');
            var url = $link.attr('data-url') || $link.attr('href') || '';
            return url === site.url;
        }).first();
        
        if ($card.length > 0) {
            var $clone = $card.clone();
            // 统一外层列宽
            $clone.removeClass('col-6 col-2a col-sm-2a col-md-2a col-lg-3a col-sm-6 col-md-4 col-xl-5a col-xxl-6a col-xxl-10a io-px-2');
            $clone.addClass('url-card io-px-2 col-6 col-2a col-sm-2a col-md-2a col-lg-3a col-sm-6 col-md-4 col-xl-5a col-xxl-6a');
            // 移除删除按钮（我的导航的卡片）
            $clone.find('.remove-site').remove();
            // 统一内部样式：mini改成default
            $clone.find('.url-body').removeClass('mini').addClass('default');
            // 移除card-body的内联padding样式（我的导航的卡片）
            $clone.find('.card-body').removeAttr('style');
            // 给a标签统一加上card class（如果没有的话）
            $clone.find('a').first().addClass('card no-c mb-4');
            // 如果没有描述p标签，添加一个空的保持高度一致
            if ($clone.find('.url-info p').length === 0) {
                $clone.find('.url-info').append('<p class="overflowClip_1 m-0 text-muted text-xs"></p>');
            }
            // 处理懒加载图片：把data-src改成src
            $clone.find('img.lazy').each(function() {
                var $img = $(this);
                var dataSrc = $img.attr('data-src');
                if (dataSrc) {
                    $img.attr('src', dataSrc).removeClass('lazy');
                }
            });
            // 恢复title属性（Bootstrap tooltip会把title移到data-original-title）
            var $a = $clone.find('a').first();
            var originalTitle = $a.attr('data-original-title') || $a.attr('title') || '';
            if (originalTitle) {
                $a.attr('title', originalTitle);
            }
            // 重新初始化tooltip，确保鼠标悬停提示样式和原来一致
            $clone.find('[data-toggle="tooltip"]').tooltip();
            $row.append($clone);
        }
    }
    
    // 插入到内容区域顶部
    $('.content-site').prepend($results);
    
    // 显示搜索结果计数
    zhanneiShowCount(results.length, keyword);
}

// 恢复页面显示
function zhanneiRestorePage() {
    // 移除搜索结果区域
    $('#zhannei-search-results').remove();
    
    // 显示原来的所有分类内容（移除class）
    $('.url-card').not('#add-site').show();
    $('.content-site').removeClass('zhannei-searching');
    
    zhanneiHideCount();
}

// 显示搜索结果计数
function zhanneiShowCount(count, keyword) {
    var $count = $('#zhannei-search-count');
    if ($count.length === 0) {
        $count = $('<div id="zhannei-search-count" class="alert alert-info text-sm" style="margin: 10px 15px;"></div>');
    }
    // 确保计数条始终在最前面
    $('.content-site').prepend($count);
    $count.html('找到 <strong>' + count + '</strong> 个与"<strong>' + keyword + '</strong>"相关的网站 <a href="javascript:;" id="zhannei-clear-btn" class="btn btn-xs btn-light ml-2">清除搜索</a>');
    
    $('#zhannei-clear-btn').click(function() {
        $('.search-key').val('');
        zhanneiRestorePage();
    });
}

function zhanneiHideCount() {
    $('#zhannei-search-count').remove();
}

// 注入CSS样式
function zhanneiInjectCSS() {
    var css = `
        .zhannei-result {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
        }
        .zhannei-result:hover {
            background: #f5f5f5;
        }
        .zhannei-logo {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 10px;
            object-fit: cover;
            flex-shrink: 0;
        }
        .zhannei-info {
            flex: 1;
            min-width: 0;
        }
        .zhannei-title {
            font-size: 14px;
            color: #333;
            font-weight: 500;
        }
        .zhannei-desc {
            font-size: 12px;
            color: #999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
        }
        .zhannei-noresult {
            padding: 12px;
            text-align: center;
            color: #999;
            font-size: 13px;
        }
        #zhannei-search-count {
            border-radius: 6px;
        }
        .search-smart-tips {
            z-index: 1050;
        }
        /* 搜索结果区域 */
        #zhannei-search-results {
            margin: 10px 0 20px;
        }
        /* 搜索时隐藏所有分类内容，只保留搜索结果和计数条 */
        .content-site.zhannei-searching > *:not(#zhannei-search-results):not(#zhannei-search-count):not(.modal) {
            display: none !important;
        }
        /* 确保搜索建议下拉框初始为隐藏状态，修复百度搜索建议不显示的问题 */
        .search-smart-tips {
            display: none;
        }
    `;
    $('<style>').text(css).appendTo('head');
}

// 判断是否选中站内搜索（直接看选中的radio，不依赖zhannei属性）
function isZhanneiSearch($input) {
    var parent = $input.parents('.s-search');
    var checkedId = parent.find('input:radio:checked').attr('id');
    return checkedId == 'type-zhannei' || checkedId == 'm_type-zhannei';
}

// 初始化
$(function() {
    zhanneiInjectCSS();
    
    // 收集网站信息（延迟确保内容加载完成）
    setTimeout(zhanneiCollectSites, 500);
    setTimeout(zhanneiCollectSites, 1500);
    
    // 用capture捕获模式绑定submit事件，确保先于app-mini.js执行
    document.addEventListener('submit', function(e) {
        var $form = $(e.target);
        if (!$form.hasClass('super-search-fm')) return;
        
        var $input = $form.find('.search-key');
        var keyword = $input.val().trim();
        if (!keyword) return;
        
        // 判断是否选中站内搜索
        var checkedValue = $form.parents('.s-search').find('input:radio:checked').val();
        if (checkedValue == 'zhannei') {
            e.preventDefault();
            e.stopPropagation();
            zhanneiFilterPage(keyword);
            $form.parents('.s-search').find('.search-smart-tips').slideUp(200);
        }
    }, true);
    
    // 监听搜索框 focus
    $(document).on('focus', '.smart-tips.search-key', function() {
        var $input = $(this);
        if (isZhanneiSearch($input) && $input.val().trim()) {
            var parent = $input.parents('#search');
            zhanneiShowTips($input.val().trim(), parent);
        }
    });
    
    // 监听搜索框 keyup
    $(document).on('keyup', '.smart-tips.search-key', function(e) {
        var $input = $(this);
        if (!isZhanneiSearch($input)) return;
        
        var parent = $input.parents('#search');
        var keyword = $input.val().trim();
        
        // 上下键交给 app-mini.js 处理，回车键不显示下拉提示
        if (e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13) {
            return;
        }
        
        if (keyword) {
            zhanneiShowTips(keyword, parent);
        } else {
            parent.children('.search-smart-tips').slideUp(200);
            zhanneiRestorePage();
        }
    });
    
    // 监听搜索框 input（清空时恢复页面）
    $(document).on('input', '.smart-tips.search-key', function() {
        var $input = $(this);
        if (!isZhanneiSearch($input)) return;
        
        if (!$input.val().trim()) {
            zhanneiRestorePage();
        }
    });
    
    // 点击页面其他地方关闭建议
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.s-search').length) {
            $('.search-smart-tips').slideUp(200);
        }
    });
});
