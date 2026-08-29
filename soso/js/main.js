//加载完成后执行
window.addEventListener('load', function () {
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
