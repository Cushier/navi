//加载完成后执行
window.addEventListener('load', function () {
    //音乐播放器：支持自定义歌单 + 网易云官方外链 + 自动播放记忆
    (function () {
        var KEY = 'music_state';
        var CUSTOM_KEY = 'custom_playlist_id';
        var DEFAULT_PLAYLIST_ID = '9874829261';

        // 歌单解析API列表（按稳定性排列，逐个尝试，失败自动切换下一个）
        var METING_APIS = [
            'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=',
            'https://api.injahow.cn/meting/?type=playlist&id=',
            'https://meting.jmstrand.cn/?type=playlist&id=',
            'https://api.qijieya.cn/meting/?type=playlist&id='
        ];

        // 带超时的fetch（避免某个解析源卡住太久）
        function fetchWithTimeout(url, timeout) {
            return Promise.race([
                fetch(url),
                new Promise(function (_, reject) {
                    setTimeout(function () { reject(new Error('请求超时')); }, timeout);
                })
            ]);
        }

        // 多源加载歌单：按顺序尝试，成功返回歌单数组，全部失败则reject
        function loadPlaylist(playlistId, idx) {
            idx = idx || 0;
            if (idx >= METING_APIS.length) {
                return Promise.reject(new Error('所有解析源均失败'));
            }
            var apiUrl = METING_APIS[idx] + playlistId;
            console.log('[播放器] 尝试解析源 ' + (idx + 1) + '/' + METING_APIS.length);
            return fetchWithTimeout(apiUrl, 12000)
                .then(function (res) { return res.json(); })
                .then(function (list) {
                    if (!list || !list.length) throw new Error('歌单为空');
                    return list;
                })
                .catch(function (err) {
                    console.warn('[播放器] 解析源 ' + (idx + 1) + ' 失败，切换下一个:', err);
                    return loadPlaylist(playlistId, idx + 1);
                });
        }
        var currentPlayer = null;
        var autoPlayHandler = null;
        var isSwitching = false; // 切换歌单标志位，切换期间禁止任何播放

        function getState() { try { return JSON.parse(Cookies.get(KEY)) || {}; } catch (e) { return {}; } }
        function saveState(s) { Cookies.set(KEY, JSON.stringify(s), { expires: 36500 }); }

        // 从输入中提取歌单 ID（支持数字ID或歌单链接）
        function extractPlaylistId(input) {
            if (/^\d+$/.test(input)) return input;
            var match = input.match(/[?&]id=(\d+)/);
            if (match) return match[1];
            match = input.match(/playlist\/(\d+)/);
            if (match) return match[1];
            return null;
        }

        // 移除旧的自动播放监听器（切换歌单时调用，避免旧播放器也触发播放）
        function removeAutoPlayHandler() {
            if (autoPlayHandler) {
                document.removeEventListener('click', autoPlayHandler);
                document.removeEventListener('keydown', autoPlayHandler);
                autoPlayHandler = null;
            }
        }

        // 初始化播放器
        function initPlayer(playlistId) {
            console.log('[播放器] 正在加载歌单 ' + playlistId + '...');
            isSwitching = true; // 开始切换歌单，禁止任何播放

            // 先移除旧的自动播放监听器，避免切换歌单后旧播放器也触发播放
            removeAutoPlayHandler();

            // 先暂停并销毁旧播放器
            if (currentPlayer) {
                try {
                    currentPlayer.pause();
                    if (currentPlayer.audio) {
                        currentPlayer.audio.pause();
                        currentPlayer.audio.src = '';
                        currentPlayer.audio.load();
                    }
                    // 不调用 destroy()，它可能异步重新触发播放；直接移除 DOM 和 audio 更彻底
                } catch (e) {}
                currentPlayer = null;
            }
            // 移除旧播放器的 .aplayer DOM（fixed 模式下 DOM 可能直接挂在 body 上，不在 container 里）
            // 注意：跳过 id="aplayer" 的容器本身，否则新播放器创建时找不到容器
            var aplayerEls = document.querySelectorAll('.aplayer');
            for (var ai = 0; ai < aplayerEls.length; ai++) {
                if (aplayerEls[ai].id === 'aplayer') continue;
                if (aplayerEls[ai].parentNode) {
                    aplayerEls[ai].parentNode.removeChild(aplayerEls[ai]);
                }
            }
            // 移除页面上所有 audio 元素（彻底停止旧播放器的声音）
            var allAudios = document.querySelectorAll('audio');
            for (var aj = 0; aj < allAudios.length; aj++) {
                try {
                    allAudios[aj].pause();
                    allAudios[aj].src = '';
                    if (allAudios[aj].parentNode) {
                        allAudios[aj].parentNode.removeChild(allAudios[aj]);
                    }
                } catch (e) {}
            }
            // 清空容器
            var container = document.getElementById('aplayer');
            if (container) container.innerHTML = '';

            // 获取歌单列表，替换播放地址为网易云官方外链
            loadPlaylist(playlistId)
                .then(function (list) {
                    var audios = list.map(function (song) {
                        var url = song.url;
                        var match = url && url.match(/id=(\d+)/);
                        if (match) {
                            url = 'https://music.163.com/song/media/outer/url?id=' + match[1] + '.mp3';
                        }
                        return {
                            name: song.title || song.name || '未知歌曲',
                            artist: song.author || song.artist || '未知歌手',
                            url: url,
                            cover: song.pic || song.cover || '',
                            lrc: song.lrc || ''
                        };
                    });

                    // 创建 APlayer
                    var player = new APlayer({
                        container: document.getElementById('aplayer'),
                        fixed: true,
                        autoplay: false,
                        volume: 0.8,
                        order: 'random',
                        lrcType: 1,
                        audio: audios
                    });
                    if (player.audio) player.audio.referrerPolicy = 'no-referrer';
                    currentPlayer = player;
                    isSwitching = false; // 切换完成，允许播放

                    console.log('[播放器] 已加载 ' + audios.length + ' 首歌');

                    var state = getState();
                    var autoplay = state.autoplay !== false;

                    // 跳转到上次播放的歌曲
                    if (state.index !== undefined && state.index >= 0 && state.index < player.list.audios.length) {
                        player.list.switch(state.index);
                    }

                    // 监听事件保存状态
                    player.on('play', function () {
                        if (isSwitching) { player.pause(); return; } // 切换期间禁止播放
                        var idx = player.list.index;
                        var s = getState();
                        s.index = idx;
                        s.autoplay = true;
                        saveState(s);

                        // 修正列表选中状态（自定义入口占用了顶部一个位置，导致APlayer索引偏移1位）
                        setTimeout(function() {
                            var list = document.querySelector('.aplayer-list ol') || document.querySelector('.aplayer-list ul');
                            if (!list) return;
                            var hasCustomEntry = list.querySelector('.custom-playlist-entry') !== null;
                            if (!hasCustomEntry) return;
                            var items = list.querySelectorAll('li');
                            for (var ci = 0; ci < items.length; ci++) {
                                items[ci].classList.remove('aplayer-list-light');
                            }
                            var targetIdx = idx + 1;
                            if (items[targetIdx]) {
                                items[targetIdx].classList.add('aplayer-list-light');
                            }
                        }, 50);
                    });
                    player.on('pause', function () {
                        var s = getState(); s.autoplay = false; saveState(s);
                    });

                    // 第一次交互后自动播放（只播放最新的播放器，避免切换歌单后旧播放器也播放）
                    if (autoplay) {
                        autoPlayHandler = function () {
                            if (currentPlayer === player) {
                                player.play();
                            }
                            removeAutoPlayHandler();
                        };
                        document.addEventListener('click', autoPlayHandler);
                        document.addEventListener('keydown', autoPlayHandler);
                    }
                })
                .catch(function (err) {
                    console.error('[播放器] 歌单加载失败:', err);
                    alert('歌单加载失败，请检查歌单ID是否正确（歌单需要是公开的）');
                });
        }

        // 注入自定义歌单入口到播放器列表顶部（持续检查，APlayer 列表会动态重渲染）
        function injectCustomEntry() {
            var list = document.querySelector('.aplayer-list ol') || document.querySelector('.aplayer-list ul') || document.querySelector('.aplayer-list-lrc');
            if (!list) return;
            if (list.querySelector('.custom-playlist-entry')) return;

            var entry = document.createElement('li');
            entry.className = 'aplayer-list-item custom-playlist-entry';
            entry.innerHTML = '<span class="aplayer-list-index">🎵</span><span class="aplayer-list-title">自定义歌单（点击输入）</span><span class="aplayer-list-author">设置</span>';
            entry.style.cssText = 'cursor:pointer;color:#2980b9;';
            entry.onclick = function() {
                var customId = Cookies.get(CUSTOM_KEY) || '';
                var input = prompt('请输入网易云歌单ID或链接：\n（留空则恢复默认歌单）\n\n获取方式：打开网易云歌单，复制链接，链接里 id= 后面的数字就是歌单ID', customId);
                if (input === null) return;
                input = input.trim();
                if (input === '') {
                    Cookies.remove(CUSTOM_KEY);
                    initPlayer(DEFAULT_PLAYLIST_ID);
                    return;
                }
                var id = extractPlaylistId(input);
                if (id) {
                    Cookies.set(CUSTOM_KEY, id, { expires: 36500 });
                    initPlayer(id);
                } else {
                    alert('无法识别歌单ID，请输入数字ID或歌单链接');
                }
            };

            list.insertBefore(entry, list.firstChild);
        }
        // 持续检查并注入（每500ms检查一次，确保 APlayer 重渲染后入口仍存在）
        setInterval(injectCustomEntry, 500);

        // 页面加载时初始化播放器（优先用用户自定义歌单）
        var customId = Cookies.get(CUSTOM_KEY);
        var playlistId = customId || DEFAULT_PLAYLIST_ID;
        initPlayer(playlistId);
    })();

    //载入动画
    $('#loading-box').attr('class', 'loaded');
    $('#bg').css("cssText", "transform: scale(1);filter: blur(0px);transition: ease 1.5s;");
    $('#section').css("cssText", "opacity: 1;transition: ease 1.5s;");
    $('.cover').css("cssText", "opacity: 1;transition: ease 1.5s;");

    //用户欢迎
    iziToast.settings({
        timeout: 3000,
        backgroundColor: '#ffffff40',
        titleColor: '#efefef',
        messageColor: '#efefef',
        progressBar: false,
        close: false,
        closeOnEscape: true,
        position: 'topCenter',
        transitionIn: 'bounceInDown',
        transitionOut: 'flipOutX',
        displayMode: 'replace',
        layout: '1'
    });
    setTimeout(function () {
        iziToast.show({
            title: hello,
            message: '欢迎来到 青年科技学习导航'
        });
    }, 800);

    //中文字体缓加载-此处写入字体源文件
    //先行加载简体中文子集，后续补全字集
    //由于压缩过后的中文字体仍旧过大，可转移至对象存储或 CDN 加载
    const font = new FontFace(
        "MiSans",
        "url(" + "./font/MiSans-Regular.woff2" + ")"
    );
    document.fonts.add(font);

}, false)

//进入问候
now = new Date(), hour = now.getHours()
if (hour < 6) {
    var hello = "凌晨好";
} else if (hour < 9) {
    var hello = "早上好";
} else if (hour < 12) {
    var hello = "上午好";
} else if (hour < 14) {
    var hello = "中午好";
} else if (hour < 17) {
    var hello = "下午好";
} else if (hour < 19) {
    var hello = "傍晚好";
} else if (hour < 22) {
    var hello = "晚上好";
} else {
    var hello = "夜深了";
}

//获取时间
var t = null;
t = setTimeout(time, 1000);

function time() {
    clearTimeout(t);
    dt = new Date();
    var mm = dt.getMonth() + 1;
    var d = dt.getDate();
    var weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    var day = dt.getDay();
    var h = dt.getHours();
    var m = dt.getMinutes();
    if (h < 10) {
        h = "0" + h;
    }
    if (m < 10) {
        m = "0" + m;
    }
    $("#time_text").html(h + '<span id="point">:</span>' + m);
    $("#day").html(mm + "&nbsp;月&nbsp;" + d + "&nbsp;日&nbsp;" + weekday[day]);
    t = setTimeout(time, 1000);
}

//判断是否为当前时间之后
function isCurrentTimeAfter(targetTime) {  
    // 获取当前时间  
    const now = new Date();  
  
    // 设置目标时间的日期部分与当前日期相同，确保比较的是同一天的时间  
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());  
  
    // 解析目标时间字符串并设置到目标日期对象上  
    const [targetHours, targetMinutes] = targetTime.split(':').map(Number);  
    targetDate.setHours(targetHours);  
    targetDate.setMinutes(targetMinutes);  
    targetDate.setSeconds(0);  
    targetDate.setMilliseconds(0);  
  
    // 比较两个时间  
    return now > targetDate;  
}  
// 获取经纬度
async function main() {
  // 和风天气 key
  var WEATHER_KEY = 'c1a71b432b774096b6df1985dd390f88';
  // 定位失败时的兜底城市：赣州 LocationID
  var DEFAULT_CITY = '101240701';

  // 获取定位（拒绝/不支持/超时返回 null）
  function getLocation() {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (position) {
          resolve(position.coords.longitude + ',' + position.coords.latitude);
        },
        function () {
          resolve(null);
        },
        { timeout: 5000, maximumAge: 600000 }
      );
    });
  }

  // 定位成功用经纬度，失败用赣州兜底
  var location = await getLocation() || DEFAULT_CITY;

  //获取天气
  fetch('https://devapi.qweather.com/v7/weather/3d?location=' + location + '&key=' + WEATHER_KEY)
      .then(response => response.json())
      .then(data => {
          if (data.code !== '200') {
              console.error('天气接口返回错误: ' + data.code);
              return;
          }
          if (isCurrentTimeAfter(data.daily[0].sunset)) {  
              // console.log("当前时间超过了 " + data.daily[0].sunset); 
              $('#wea_text').text(data.daily[0].textNight)
              $('#windDir').text(data.daily[0].windDirNight) 
          } else {  
              // console.log("当前时间还未到 " + data.daily[0].sunset); 
              $('#wea_text').text(data.daily[0].textDay)
              $('#windDir').text(data.daily[0].windDirDay) 
          }
          $('#wea').attr('href',data.fxLink)
          $('#tem1').text(data.daily[0].tempMax)
          $('#tem2').text(data.daily[0].tempMin)
      })
      .catch(console.error)
}

main();

//火狐浏览器独立样式
if (isFirefox = navigator.userAgent.indexOf("Firefox") > 0) {
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.href = './css/firefox.css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    head.appendChild(link);
    window.addEventListener('load', function () {
        setTimeout(function () {
            iziToast.show({
                timeout: 8000,
                message: '您正在使用火狐浏览器，部分功能可能不支持'
            });
        }, 3800);
    }, false)
}

//Tab书签页
$(function () {
    $(".mark .tab .tab-item").click(function () {
        $(this).addClass("active").siblings().removeClass("active");
        $(".products .mainCont").eq($(this).index()).css("display", "flex").siblings().css("display", "none");
    })
})

//设置
$(function () {
    $(".set .tabs .tab-items").click(function () {
        $(this).addClass("actives").siblings().removeClass("actives");
        $(".productss .mainConts").eq($(this).index()).css("display", "flex").siblings().css("display", "none");
    })
})

//输入框为空时阻止跳转
$(window).keydown(function (e) {
    var key = window.event ? e.keyCode : e.which;
    if (key.toString() == "13") {
        if ($(".wd").val() == "") {
            return false;
        }
    }
});

//点击搜索按钮
$(".sou-button").click(function () {
    if ($("body").hasClass("onsearch")) {
        if ($(".wd").val() != "") {
            $("#search-submit").click();
        }
    }
});

$(window).mousedown(function (event) {
    if (event.button == 1) {
        $("#time_text").click();
    }
});

//控制台输出
// var styleTitle1 = `
// font-size: 20px;
// font-weight: 600;
// color: rgb(244,167,89);
// `
// var styleTitle2 = `
// font-size:12px;
// color: rgb(244,167,89);
// `
// var styleContent = `
// color: rgb(30,152,255);
// `
// var title1 = 'Snavigation'
// var title2 = `
//  _____ __  __  _______     ____     __
// |_   _|  \\/  |/ ____\\ \\   / /\\ \\   / /
//   | | | \\  / | (___  \\ \\_/ /  \\ \\_/ / 
//   | | | |\\/| |\\___ \\  \\   /    \\   /  
//  _| |_| |  | |____) |  | |      | |   
// |_____|_|  |_|_____/   |_|      |_|                                                     
// `
// var content = `
// 版 本 号：1.1
// 更新日期：2022-07-12

// Github:  https://github.com/imsyy/Snavigation
// `
// console.log(`%c${title1} %c${title2}
// %c${content}`, styleTitle1, styleTitle2, styleContent)
