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

}

function insertCommentFromWss(wsComment) {

}

function removeComents() {
    // удаляем комменты при новой загрузке приложения
}



// Рисование

function createCanvas() {

}

onFirstStart();  // приложение запускается в базовом варианте
