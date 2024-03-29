
const GPT_ICON = "https://img.icons8.com/color/144/null/chatgpt.png"
const USER_ICON = "https://img.icons8.com/bubbles/100/null/user.png"

function createBotMessage(message) {
    var currentTimeUnix = Math.floor(Date.now() / 1000)
    var msgId = genMessageId()
    var msg = ""
    msg += `<li class="sm:ml-6 ml-0 sm:mb-4 mb-0 sm:mt-6 mt-1" data-time=${currentTimeUnix} id="msg-${msgId}">
    <span
        class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
        <img class="rounded-full shadow-lg" src="${GPT_ICON}"
            alt="Jese Leos image" />
    </span>
    <div
        class="items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:flex dark:bg-gray-700 dark:border-gray-600">
        <time class="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">Just Now</time>
        <div class="message-box text-sm font-normal text-gray-900 lex dark:text-gray-300">${message}</div>
    </div>
            </li>`
    return [msg, msgId]
}

function genMessageId() {
    // generate 5 digit number 
    return Math.floor(10000 + Math.random() * 90000)
}


function createUserMessage(message) {
    var currentTimeUnix = Math.floor(Date.now() / 1000)
    var msg = ""
    msg += `<li class="sm:ml-6 ml-0 sm:mb-6 mb-0 sm:mt-6 mt-1" data-time=${currentTimeUnix}>
    <span
        class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
        <img class="rounded-full shadow-lg" src="${USER_ICON}"
            alt="Jese Leos image" />
    </span>
    <div
        class="items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:flex dark:bg-gray-700 dark:border-gray-600">
        <time class="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">Just Now</time>
        <div class="sm:text-sm text-xs font-sans text-gray-900 lex dark:text-gray-300">${message}</div>
    </div>
            </li>`
    return msg
}

function sendMessage(message, isUser) {
    var chatbox = document.getElementById("chatbox")
    var msgId = ""
    var msgContent = ""
    if (isUser) {
        chatbox.innerHTML += createUserMessage(message)
    } else {
        var msg = createBotMessage(message)
        msgId = msg[1]
        chatbox.innerHTML += msg[0]
    }
    var app = document.getElementById("app")
    app.scrollTop = app.scrollHeight
    if (isUser) {
        fetchFromAPI(message, sendMessage("", false))
    } else {
        return msgId
    }
}

function updateTime() {
    var app = document.getElementById("app")
    var messages = app.getElementsByTagName("li")
    var currentTimeUnix = Math.floor(Date.now() / 1000)
    for (var i = 0; i < messages.length; i++) {
        data_time = messages[i].getAttribute("data-time")
        messages[i].getElementsByTagName("time")[0].innerHTML = getSince(data_time, currentTimeUnix)
    }
    setInterval(updateTime, 10000)
}

function getSince(postTime, currentTime) {
    var since = currentTime - postTime
    if (since < 10) {
        return "Just Now"
    } else if (since < 60) {
        return `${Math.floor(since)} seconds ago`
    } else if (since < 3600) {
        return `${Math.floor(since / 60)} minutes ago`
    } else if (since < 86400) {
        return `${Math.floor(since / 3600)} hours ago`
    } else {
        return `${Math.floor(since / 86400)} days ago`
    }
}

function sendMessageFromInput() {
    var input = document.getElementById("chat")
    var message = input.value
    if (message.length > 0) {
        sendMessage(message, true)
        input.value = ""
    }
}

document.getElementById("chat").addEventListener("keyup", function (event) {
    // skip if shift + enter
    if (event.shiftKey && event.keyCode == 13) {
        return
    }
    // skip if not enter, keyCode deprecated
    if (event.key !== "Enter") {
        return
    }
    sendMessageFromInput()
})

document.getElementById("send").addEventListener("click", sendMessageFromInput)

function fetchFromAPI(message, msgId) {
    var animationActive = true
    var messageBox = document.getElementById("msg-" + msgId)

    function Animate() {
        var box = messageBox.getElementsByClassName("message-box")[0]
        if (animationActive) {
            box.innerHTML += "."
            if (box.innerHTML.length > 10) {
                box.innerHTML = ""
            }
            setTimeout(Animate, 500)
        }
    }

    Animate()

    fetch("https://gpt.kavya.workers.dev?parentId=" + getCookies("msgId") + "&message=" + message + "&stream=true&ssid=" + makeSSID(), {
        method: "GET",
    }).then(function (response) {
        var reader = response.body.getReader()
        var decoder = new TextDecoder()
        var buffer = ""
        var finalTextV = []
        var msgId = ""
        var box = messageBox.getElementsByClassName("message-box")[0]
        var app = document.getElementById("app")
        reader.read().then(function processResult(result) {
            if (result.done) {
                return
            }
            buffer += decoder.decode(result.value, {
                stream: true
            })
            var lines = buffer.split("\n")
            buffer = lines.pop()
            animationActive = false
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i]
                if (line.length > 0) {
                    var jsonData = JSON.parse(line)
                    var finalText = jsonData["text"]
                    msgId = jsonData["id"]
                    if (finalText === undefined) {
                        continue
                    }
                    box.innerHTML = formatText(finalText)
                    app.scrollTop = app.scrollHeight
                    finalTextV.push(finalText)
                }
            }

            return reader.read().then(processResult)
        }).finally(function () {
            setCookies("msgId", msgId)
            data_time = new Date().getTime() / 1000
            messageBox.setAttribute("data-time", data_time)
            var code = getHighlitableCodeFromText(finalTextV[finalTextV.length - 1])
            if (code == "" || code == undefined) {
                return
            }
            xhr = new XMLHttpRequest()
            xhr.open("GET", "/hilite?code=" + encodeURIComponent(code) + "&lexer=go&style=fruity")
            xhr.send()
            xhr.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    code = "```" + code + "```"
                    var finalText = finalTextV[finalTextV.length - 1]
                    finalText = finalText.replaceAll(code, `<div class="mt-2 mr-4 font-sans mb-2">` + this.responseText + "</div>")
                    box.innerHTML = finalText
                }
            }
        })
    })
}


function formatText(text) {
    if (text == undefined) {
        return ""
    }
    text = text.replaceAll("\n", "<br>")
    // replace all `(.*)` with <code>(.*)</code> but not if its ```(.*)```

    return text
}

function animatedDots(elem) {
    var randNum = Math.floor(Math.random() * 5)
    var dots = ""
    for (var i = 0; i < randNum; i++) {
        dots += "."
    }
    elem.innerHTML = dots
}

function getHighlitableCodeFromText(text) {
    var code = ""
    var lang = ""
    var regex = /```([\s\S]*)```/g
    var match = regex.exec(text)
    if (match != null) {
        code = match[1]
    }
    // if its like ```go or ```python then remove the language and return the code and language separately
    return code
}

function hilightCode(code) {
    url = "/api/hilite"
    var params = {
        "lexer": "go",
        "style": "fruity",
        "code": code
    }
    var urlParams = new URLSearchParams(params)
    url += "?" + urlParams.toString()
    fetch(url, {
        method: "GET",
    }).then(function (response) {
        response.text().then(function (text) {
            console.log(text)
            return text
        })
    })
}

function makeSSID() {
    var current_time = Math.floor(Date.now() / 1000)
    var ssid = current_time.toString(16)
    return "ssid_" + ssid + "" + Math.floor(Math.random() * 1000000)
}

function setCookies(name, value) {
    document.cookie = name + "=" + value + ";"
}

function getCookies(name) {
    var cookies = document.cookie.split(";")
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trimStart()
        var cookieName = cookie.split("=")[0]
        var cookieValue = cookie.split("=")[1]
        if (cookieName == name) {
            return cookieValue
        }
    }
    return ""
}

var b = document.getElementById("mode");
var bg = document.getElementById("dark-mode-toggle");

// Change the icons inside the button based on previous settings
if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    b.src = "https://img.icons8.com/material-rounded/96/7950F2/bright-moon.png";
    bg.classList.add('bg-gray-800');
    document.documentElement.classList.add('dark');
} else {
    b.src = "https://img.icons8.com/material-rounded/192/FAB005/sun--v1.png";
    bg.classList.remove('bg-gray-800');
    document.documentElement.classList.remove('dark');
}

function toggleUrl() {
    if (b.src == "https://img.icons8.com/material-rounded/96/7950F2/bright-moon.png") {
        b.src = "https://img.icons8.com/material-rounded/192/FAB005/sun--v1.png";
        bg.classList.remove('bg-gray-800');
    } else {
        b.src = "https://img.icons8.com/material-rounded/96/7950F2/bright-moon.png";
        bg.classList.add('bg-gray-800');
    }
}

b.addEventListener('click', function () {

    // toggle icons inside button
    toggleUrl();

    // if set via local storage previously
    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        }

        // if NOT set via local storage previously
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }
});

function appStart() {
    if (getCookies("quota") == "") {
        setCookies("quota", "1000")
        setCookies("expires", new Date().getTime() + 86400000)
    }

    updateTime()
}

appStart()