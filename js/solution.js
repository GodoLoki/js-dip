'use strict'

// Подключаем нужные нужности
const wrap = document.querySelector('.wrap'),
      currentImage = document.querySelector('.current-image'),
      menu = document.querySelector('.menu'),
      burger = document.querySelector('.burger'),
      comments = document.querySelector('.comments'),
      draw = document.querySelector('.draw'),
      share = document.querySelector('.share'),
      urlForShare = document.querySelector('.menu__url'),
      menuModeElements = document.querySelectorAll('.mode'),

      imageLoader = document.querySelector('.image-loader'),
      errorMessage = document.querySelector('.error__message'),
      errorNode = document.querySelector('.error'),

      commentsOnInput = document.querySelector('#comments-on'),
      commentsOffInput = document.querySelector('#comments-off');

//канвас для режиса рисовани
const canvas = document.createElement('canvas'),
      wrapCanvasComments = document.createElement('div');

let showComments = {},
    connection;

//  урл приложения и id картинки

const url = new URL(`${window.location.href}`),
      picId = url.searchParams.get('id');
let pictureID;

// Для перетаскивания менюшки
let movedPiece = null;
const minX = 0;
const minY = 0;
let maxX, maxY, shiftY, shiftX;

document.addEventListener('mousedown', moveStart);
document.addEventListener('mousemove', throttle(moveMenu));
document.addEventListener('mouseup', moveEnd);

function moveStart(event) {
    if (event.target.classList.contains('drag')) {
        movedPiece = menu;
        const bounds = movedPiece.getBoundingClientRect();
        shiftX = event.pageX - bounds.left - window.pageXOffset;
        shiftY = event.pageY - bounds.top - window.pageYOffset;
        maxX = minX + wrap.offsetWidth - movedPiece.offsetWidth;
        maxY = minY + wrap.offsetHeight - movedPiece.offsetHeight;
    };
};

function moveMenu(event) {
    if (movedPiece) {
        event.preventDefault();
        let x = event.pageX - shiftX;
        let y = event.pageY - shiftY;
        x = Math.min(x, maxX);
        y = Math.min(y, maxY);
        x = Math.max(x, minX);
        y = Math.max(y, minY);
        movedPiece.style.left = `${x}px`;
        movedPiece.style.top = `${y}px`;
    }
}

function moveEnd() {
    if (movedPiece) {
        movedPiece = null;
    };
}

function throttle(callback) {
    let isWaiting = false;
    return function () {
        if (!isWaiting) {
            callback.apply(this, arguments);
            isWaiting = true;
            requestAnimationFrame(() => {
                isWaiting = false;
        });
        }
    };
}

//  при изменении размера окна браузера и изменении высоты меню
function checkMenuHeight() {
    if (menu.offsetHeight > 66) {
        menu.style.left = '0px'
        menu.style.left = `${wrap.offsetWidth - menu.offsetWidth - 1}px`
    }
}

//  Переключение режимов меню
burger.addEventListener('click', () => {
    menu.dataset.state = 'default';
menuModeElements.forEach(elem => elem.dataset.state = '');
})

menuModeElements.forEach(elem => {
    if (!elem.classList.contains('new')) {
    elem.addEventListener('click', (event) => {
        menu.dataset.state = 'selected';
    event.currentTarget.dataset.state = 'selected'
})
}
})


//  Публикация - запуск приложения
function onFirstStart() {
    if (picId) {
        takeImageInfo(picId);
        pictureID = picId;
        return;
    };
    menu.style.top = '50px';
    menu.style.left = '50px';
    currentImage.src = ''; 
    menu.dataset.state = 'initial'; 
    burger.style.display = 'none'; 
    document.querySelectorAll('.comments__form').forEach(form => {
        form.style.display = 'none';
})

    menu.querySelector('.new').addEventListener('click', uploadFileFromInput);
    wrap.addEventListener('drop', onFilesDrop); 
    wrap.addEventListener('dragover', event => event.preventDefault());
    removeComents();
}

function uploadFileFromInput(event) {
    const fileInput = document.createElement('input');
    fileInput.setAttribute('id', 'fileInput');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/jpeg, image/png');
    fileInput.style.display = 'none';
    menu.appendChild(fileInput);
    document.querySelector('#fileInput').addEventListener('change', event => {
        const files = event.currentTarget.files;
    sendImage(files[0])
});
    fileInput.click();
    menu.removeChild(fileInput);
}

// загрузка файла перетаскиванием
function onFilesDrop(event) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (pictureID) {
        errorNode.style.display = '';
        menu.style.display = 'none';
        errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';
        setTimeout(function() {
            menu.style.display = '';
            errorNode.style.display = 'none';
        }, 3000);
        return;
    }

    //проверяем тип файла
    if ((files[0].type === 'image/jpeg') || (files[0].type === 'image/png')) {
        menu.style.display = ''
        errorNode.style.display = 'none';
        sendImage(files[0])
    } else {
        menu.style.display = 'none'
        errorNode.style.display = '';
    }
}

// отправка файла картинки на сервер
function sendImage(file) {
    const formData = new FormData();
    formData.append('title', file.name);
    formData.append('image', file);
    menu.style.display = 'none';
    imageLoader.style.display = '';

    fetch('https://neto-api.herokuapp.com/pic', {
        body: formData,
        credentials: 'same-origin',
        method: 'POST',
    })
        .then( res => {
        if (res.status >= 200 && res.status < 300) {
        return res;
    }
    throw new Error (res.statusText);
})
.then(res => res.json())
.then(res => {
        takeImageInfo(res.id);
        pictureID = res.id;
})
.catch(err => {
        console.log(err);
    imageLoader.style.display = 'none';
    errorNode.style.display = 'none';
    errorMessage.textContent = err;
});
}

// обрабатываем ответ сервера
function takeImageInfo(id) {
    fetch(`https://neto-api.herokuapp.com/pic/${id}`)
        .then( res => {
        if (res.status >= 200 && res.status < 300) {
        return res;
    }
    throw new Error (res.statusText);
})
.then(res => res.json())
.then(res => {
        changeStateShare(res);
        window.history.pushState("object or string", "Title",`${url.origin}?id=${res.id}`)
})
.catch(err => {
        menu.style.display = 'none';
    imageLoader.style.display = 'none';
    console.log(err);
});
}



//  РЕЖИМ ПОДЕЛИТЬСЯ 

function changeStateShare(res) {
    if (picId) {
        menu.dataset.state = 'selected';
        comments.dataset.state = 'selected';
    } else {
        menu.dataset.state = 'selected';
        share.dataset.state = 'selected';
    }
    burger.style.display = '';

    currentImage.addEventListener('load', () => {
        imageLoader.style.display = 'none';
    menu.style.display = '';
    createWrapCanvasComments()
    createCanvas();
    removeComents();

    updateComments(res.comments);

    wss();
});
    currentImage.src = res.url;
    urlForShare.value = `${url}?id=${res.id}`


}

// веб сокет
function wss() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${pictureID}`);
    connection.addEventListener('message', event => {
        const wsData = JSON.parse(event.data);
    if (wsData.event === 'pic'){
        if (wsData.pic.mask) {
            canvas.style.background = `url(${wsData.pic.mask})`;
        } else {
            canvas.style.background = ``;
        }
    }

    if (wsData.event === 'comment'){
        insertCommentFromWss(wsData.comment);
    }

    if (wsData.event === 'mask'){
        canvas.style.background = `url(${wsData.url})`;
    }
});
    connection.addEventListener('error', error => {
        console.log(`Ошибка вэбсокета: ${error.data}`);
});
}


// Комментарии. Добавление, скрытие

function createWrapCanvasComments() {
    const width = getComputedStyle(currentImage).width;
    const height = getComputedStyle(currentImage).height;
    wrapCanvasComments.style.top = '50%';
    wrapCanvasComments.style.left = '50%';
    wrapCanvasComments.style.width = width;
    wrapCanvasComments.style.height = height;
    wrapCanvasComments.style.position = 'absolute';
    wrapCanvasComments.style.transform = 'translate(-50%, -50%)';
    wrapCanvasComments.style.display = 'block';
    wrap.appendChild(wrapCanvasComments);
    wrapCanvasComments.addEventListener('click', event => {
        if (event.target.closest('.comments__form')) {
        const currentForm = event.target.closest('.comments__form');
        Array.from(wrapCanvasComments.querySelectorAll('.comments__form')).forEach(form => {
            form.style.zIndex = 2;
    });
        currentForm.style.zIndex = 3;

        deleteEmptyForms(currentForm);
        minAllComment(currentForm);
    }
});
}

function insertCommentFromWss(wsComment) {
    const wsCommentEdited = {};
    wsCommentEdited[wsComment.id] = {};
    wsCommentEdited[wsComment.id].left = wsComment.left;
    wsCommentEdited[wsComment.id].message = wsComment.message;
    wsCommentEdited[wsComment.id].timestamp = wsComment.timestamp;
    wsCommentEdited[wsComment.id].top = wsComment.top;
    updateComments(wsCommentEdited);
}

// скрыть показать
commentsOnInput.addEventListener('change', checkCommentsState);
commentsOffInput.addEventListener('change', checkCommentsState);

function checkCommentsState() {
    if (commentsOnInput.checked) {
        document.querySelectorAll('.comments__form').forEach(form => {
            form.style.display = '';
    })
    } else {
        document.querySelectorAll('.comments__form').forEach(form => {
            form.style.display = 'none';
    })
    }
}

// сворачиваем неактивные комменты
function  minAllComment(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form !== currentForm) {
        form.querySelector('.comments__marker-checkbox').checked = false;
    }
});
}

// убираем пустые
function deleteEmptyForms(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form.querySelectorAll('.comment').length < 2 && form !== currentForm) {
        form.remove();
    }
});
}

function removeComents() {
    // удаляем комменты при новой загрузке приложения
    const formComment = wrap.querySelectorAll('.comments__form');
    Array.from(formComment).forEach(item => {item.remove()})
}

// создать
canvas.addEventListener('click', (event) => {
    if (comments.dataset.state !== 'selected' || !commentsOnInput.checked) return;
deleteEmptyForms();
minAllComment();
const newComment = createNewForm();
newComment.querySelector('.comments__marker-checkbox').checked = true;
const coordX = event.offsetX - 22;
const coordY = event.offsetY - 14;
newComment.style.left = coordX + 'px';
newComment.style.top = coordY + 'px';
newComment.dataset.left = coordX;
newComment.dataset.top = coordY;
wrapCanvasComments.appendChild(newComment);
});


// форма для комментариев
function createNewForm() {
    const newForm = document.createElement('form');
    newForm.classList.add('comments__form');
    newForm.innerHTML = `
        <span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
        <div class="comments__body">
            <div class="comment">
                <div class="loader">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <textarea class="comments__input" type="text" placeholder="Напишите ответ..."></textarea>
            <input class="comments__close" type="button" value="Закрыть">
            <input class="comments__submit" type="submit" value="Отправить">
        </div>`;
    newForm.style.display = '';
    newForm.style.zIndex = 2;

    newForm.querySelector('.loader').parentElement.style.display = 'none';

    // закрыть
    newForm.querySelector('.comments__close').addEventListener('click', () => {
        if (newForm.querySelectorAll('.comment').length > 1) {
        newForm.querySelector('.comments__marker-checkbox').checked = false;
    } else {

        newForm.remove();
    }
});

    // отправляем
    newForm.addEventListener('submit', event => {
        event.preventDefault();
    const message = newForm.querySelector('.comments__input').value;
    const body = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(newForm.dataset.left)}&top=${encodeURIComponent(newForm.dataset.top)}`;
    newForm.querySelector('.loader').parentElement.style.display = '';

    fetch(`https://neto-api.herokuapp.com/pic/${pictureID}/comments`, {
        body: body,
        credentials: 'same-origin',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(res => {
        if (res.status >= 400) throw res.statusText;
    return res;
})
.then(res => res.json())
.then(res => {
        updateComments(res.comments);
    newForm.querySelector('.comments__input').value = '';
})
.catch(err => {
        console.log(err);
    newForm.querySelector('.loader').parentElement.style.display = 'none';
});
});

    return newForm;
}

// отрисовываем комментарии
function updateComments(newComments) {
    if (!newComments) return;
    Object.keys(newComments).forEach(id => {
        if (id in showComments) return;
    showComments[id] = newComments[id];
    let needCreateNewForm = true;
    document.querySelectorAll('.comments__form').forEach(form => {
        if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
        form.querySelector('.loader').parentElement.style.display = 'none';
        addComentIntoForm(newComments[id], form);
        needCreateNewForm = false;
    }
});
    if (needCreateNewForm) {
        const newForm = createNewForm();
        newForm.dataset.left = newComments[id].left;
        newForm.dataset.top = newComments[id].top;
        newForm.style.left = newComments[id].left + 'px';
        newForm.style.top = newComments[id].top + 'px';
        addComentIntoForm(newComments[id], newForm);
        wrapCanvasComments.appendChild(newForm);
        if (!commentsOnInput.checked) {
            newForm.style.display = 'none';
        }
    }
});
}

// добавляем новые сообщения в форму
function addComentIntoForm(newMsg, form) {
    function getDate(timestamp) {
        const options = {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        };
        const date = new Date(timestamp);
        const dateStr = date.toLocaleString(options);
        return dateStr.slice(0, 6) + dateStr.slice(8, 10) + dateStr.slice(11);
    }

    let timestamp = Number.MAX_VALUE;
    let theNearestLowerDiv = form.querySelector('.loader').parentElement;
    form.querySelectorAll('.user__comment').forEach(msgDiv => {
        const currMsgTimestamp = +msgDiv.dataset.timestamp;

    if (currMsgTimestamp < newMsg.timestamp) return;
    if (currMsgTimestamp < timestamp) {
        timestamp = currMsgTimestamp;
        theNearestLowerDiv = msgDiv;
    }
});
    const newMsgDiv = document.createElement('div');
    newMsgDiv.classList.add('comment');
    newMsgDiv.classList.add('user__comment');
    newMsgDiv.dataset.timestamp = newMsg.timestamp;
    const pCommentTime = document.createElement('p');
    pCommentTime.classList.add('comment__time');
    pCommentTime.textContent = getDate(newMsg.timestamp);
    newMsgDiv.appendChild(pCommentTime);
    const pCommentMessage = document.createElement('p');
    pCommentMessage.classList.add('comment__message');
    pCommentMessage.textContent = newMsg.message;
    newMsgDiv.appendChild(pCommentMessage);
    form.querySelector('.comments__body').insertBefore(newMsgDiv, theNearestLowerDiv);
}

function sendMaskState() {
    canvas.toBlob(blob => {
        if (!connection) return;
    connection.send(blob);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});
}

// Рисование 
const ctx = canvas.getContext('2d'),
      BRUSH_RADIUS = 4; 
let curves = [],
    drawing = false,
    needsRepaint = false,
    brushColor = 'green'; 

//цвета
document.querySelectorAll('.menu__color').forEach(colorInput => {
    colorInput.addEventListener('change', () => {
    if (!colorInput.checked) return;
brushColor = colorInput.value;
});
});

function createCanvas() {
    const width = getComputedStyle(currentImage).width.slice(0, -2);
    const height = getComputedStyle(currentImage).height.slice(0, -2);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';
    wrapCanvasComments.appendChild(canvas);
    curves = [];
    drawing = false;
    needsRepaint = false;
}

canvas.addEventListener("mousedown", (event) => {
    if (draw.dataset.state !== 'selected') return;
drawing = true;
const curve = []; 
curve.color = brushColor; 
curve.push(makePoint(event.offsetX, event.offsetY));
curves.push(curve);
needsRepaint = true;
});


canvas.addEventListener("mouseup", (event) => {
    drawing = false;
});

canvas.addEventListener("mouseleave", (event) => {
    drawing = false;
});

canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
        curves[curves.length - 1].push(makePoint(event.offsetX, event.offsetY));
        needsRepaint = true;
    }
});

// точка
function circle(point) {
    ctx.beginPath();
    ctx.arc(...point, BRUSH_RADIUS / 2, 0, 2 * Math.PI);
    ctx.fill();
}

// линия между двумя точками
function smoothCurveBetween (p1, p2) {
    const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
    ctx.quadraticCurveTo(...p1, ...cp);
}

function smoothCurve(points) {
    ctx.beginPath();
    ctx.lineWidth = BRUSH_RADIUS;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.moveTo(...points[0]);

    for(let i = 1; i < points.length - 1; i++) {
        smoothCurveBetween(points[i], points[i + 1]);
    }

    ctx.stroke();
}

// координаты курсора
function makePoint(x, y) {
    return [x, y];
}

// перерисовка canvas
function repaint () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curves.forEach((curve) => {
        ctx.strokeStyle = curve.color;
    ctx.fillStyle = curve.color;

    circle(curve[0]);
    smoothCurve(curve);
});
}

function tick () {
    checkMenuHeight();
    if(needsRepaint) {
        repaint();
        needsRepaint = false;
        debounceSendMask()
    }
    window.requestAnimationFrame(tick);
}


const debounceSendMask = debounce(sendMaskState, 2000);

// отправляем данные не чаще 1 раза в несколько секунд
function throttle(callback, delay) {
    let isWaiting = false;
    return function (...rest) {
        if (!isWaiting) {
            callback.apply(this, rest);
            isWaiting = true;
            setTimeout(() => {
                isWaiting = false;
        }, delay);
        }
    };
}

function debounce(callback, delay) {
    let timeout;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
        callback();
    }, delay);
    };
}

// отправка канвас на сервер
function sendMaskState() {
    canvas.toBlob(blob => {
        if (!connection) return;
    connection.send(blob);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});
}






onFirstStart();  // приложение запускается в базовом варианте
tick();
window.addEventListener('beforeunload', () => {
    connection.close(1000);
});





// копировать ссылку
document.querySelector('.menu_copy').addEventListener('click', (event) => {
    urlForShare.select();
document.execCommand('copy');
})