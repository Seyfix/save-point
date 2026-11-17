/* =============================================
   auth.js — пользователи, регистрация, вход, выход,
   личный кабинет «Мои игры».
   Работает без сервера: всё хранится в localStorage.
   ============================================= */

// ---------- Ключи localStorage ----------
const KEY_USERS = 'savepoint.users';     // массив зарегистрированных пользователей
const KEY_SESSION = 'savepoint.session'; // email того, кто сейчас вошёл
const KEY_LIBRARY = 'savepoint.library'; // коллекции: { "email": { "id игры": "статус" } }


// ---------- Маленькая обёртка над localStorage ----------
const store = {
    read(key, fallback) {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    },
    write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
};


// ---------- Пользователи и сессия ----------

function getUsers() {
    return store.read(KEY_USERS, []);
}

function findUser(email) {
    return getUsers().find(user => user.email === email) || null;
}

// текущий пользователь (без пароля) или null
function currentUser() {
    const email = store.read(KEY_SESSION, null);
    if (!email) return null;

    const user = findUser(email);
    if (!user) return null;

    return { name: user.name, email: user.email, createdAt: user.createdAt };
}

function addUser(name, email, password) {
    const users = getUsers();

    users.push({
        name: name,
        email: email,
        password: password, // учебная имитация! в реальном проекте пароль хешируют на сервере
        createdAt: new Date().toISOString()
    });

    store.write(KEY_USERS, users);
}

function login(email, password) {
    const user = findUser(email);

    if (!user || user.password !== password) {
        return false;
    }

    store.write(KEY_SESSION, email);
    return true;
}

function logout() {
    localStorage.removeItem(KEY_SESSION);
    window.location.href = 'index.html';
}

function renameUser(email, newName) {
    const users = getUsers().map(user =>
        user.email === email ? { ...user, name: newName } : user
    );
    store.write(KEY_USERS, users);
}

// тестовый аккаунт, чтобы преподаватель мог сразу войти
function seedTestUser() {
    if (findUser('test@test.ru')) return;

    const users = getUsers();
    users.push({
        name: 'Игрок 1',
        email: 'test@test.ru',
        password: '123456',
        createdAt: '2026-11-03T09:30:00.000Z'
    });
    store.write(KEY_USERS, users);
}


// ---------- Коллекция «Мои игры» ----------

// возвращает объект { id: статус } для пользователя
function getLibrary(email) {
    const all = store.read(KEY_LIBRARY, {});
    return all[email] || {};
}

function saveLibrary(email, library) {
    const all = store.read(KEY_LIBRARY, {});
    all[email] = library;
    store.write(KEY_LIBRARY, all);
}


// ---------- Шапка: показываем гостя или пользователя ----------

function refreshHeader() {
    const user = currentUser();

    document.body.classList.toggle('is-auth', Boolean(user));

    const nameLink = document.getElementById('headerName');
    if (nameLink && user) {
        nameLink.textContent = '🎮 ' + user.name;
    }
}

function initLogoutButtons() {
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', logout);
    });
}


// ---------- Валидация форм ----------

const EMAIL_PATTERN = /^[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-zа-я]{2,}$/i;

// вывести или убрать ошибку под полем
function showFieldError(input, text) {
    const box = input.closest('.form-field');
    const message = box.querySelector('.form-field__error');

    box.classList.toggle('has-error', Boolean(text));
    message.textContent = text || '';
}

// проверяет поля по списку правил; true — ошибок нет
function validate(rules) {
    let ok = true;

    rules.forEach(rule => {
        const error = rule.check();
        showFieldError(rule.input, error);
        if (error) ok = false;
    });

    return ok;
}


// ---------- Страница auth.html ----------

function initAuthPage() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !registerForm) return;

    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');
    const notice = document.getElementById('authNotice');

    // переключение между входом и регистрацией
    function openPanel(name) {
        loginPanel.hidden = name !== 'login';
        registerPanel.hidden = name !== 'register';
        notice.hidden = true;
    }

    document.querySelectorAll('[data-open]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            openPanel(link.dataset.open);
        });
    });

    // auth.html#register — сразу открыть регистрацию
    if (location.hash === '#register') openPanel('register');

    // кнопки «показать пароль»
    document.querySelectorAll('.eye').forEach(eye => {
        eye.addEventListener('click', () => {
            const input = document.getElementById(eye.dataset.target);
            const hidden = input.type === 'password';
            input.type = hidden ? 'text' : 'password';
            eye.textContent = hidden ? '🙈' : '👁';
            eye.setAttribute('aria-label', hidden ? 'Скрыть пароль' : 'Показать пароль');
        });
    });

    // индикатор надёжности пароля
    const regPass = document.getElementById('regPass');
    const meter = document.getElementById('passMeter');

    regPass.addEventListener('input', () => {
        const value = regPass.value;
        let score = 0;

        if (value.length >= 6) score++;
        if (value.length >= 10) score++;
        if (/\d/.test(value) && /[a-zа-я]/i.test(value)) score++;

        const labels = ['Слабый пароль', 'Слабый пароль', 'Нормальный пароль', 'Надёжный пароль'];
        meter.dataset.score = value ? score : '';
        meter.textContent = value ? labels[score] : '';
    });

    // --- Регистрация ---
    registerForm.addEventListener('submit', event => {
        event.preventDefault();

        const name = document.getElementById('regName');
        const email = document.getElementById('regEmail');
        const pass = document.getElementById('regPass');
        const pass2 = document.getElementById('regPass2');
        const agree = document.getElementById('regAgree');

        const emailValue = email.value.trim().toLowerCase();

        const ok = validate([
            {
                input: name,
                check: () => {
                    if (!name.value.trim()) return 'Укажите имя или никнейм';
                    if (name.value.trim().length < 2) return 'Слишком короткое имя';
                    return '';
                }
            },
            {
                input: email,
                check: () => {
                    if (!emailValue) return 'Укажите email';
                    if (!EMAIL_PATTERN.test(emailValue)) return 'Похоже, в email ошибка (пример: name@mail.ru)';
                    if (findUser(emailValue)) return 'Этот email уже зарегистрирован';
                    return '';
                }
            },
            {
                input: pass,
                check: () => {
                    if (!pass.value) return 'Придумайте пароль';
                    if (pass.value.length < 6) return 'Минимум 6 символов';
                    return '';
                }
            },
            {
                input: pass2,
                check: () => {
                    if (!pass2.value) return 'Повторите пароль';
                    if (pass2.value !== pass.value) return 'Пароли не совпадают';
                    return '';
                }
            },
            {
                input: agree,
                check: () => agree.checked ? '' : 'Нужно согласиться с правилами сайта'
            }
        ]);

        if (!ok) return;

        addUser(name.value.trim(), emailValue, pass.value);
        registerForm.reset();
        meter.textContent = '';

        openPanel('login');
        document.getElementById('loginEmail').value = emailValue;
        document.getElementById('loginPass').focus();
        notice.textContent = '✅ Аккаунт создан! Введите пароль, чтобы войти.';
        notice.hidden = false;
    });

    // --- Вход ---
    loginForm.addEventListener('submit', event => {
        event.preventDefault();

        const email = document.getElementById('loginEmail');
        const pass = document.getElementById('loginPass');
        const emailValue = email.value.trim().toLowerCase();

        const ok = validate([
            {
                input: email,
                check: () => {
                    if (!emailValue) return 'Укажите email';
                    if (!EMAIL_PATTERN.test(emailValue)) return 'Похоже, в email ошибка (пример: name@mail.ru)';
                    return '';
                }
            },
            {
                input: pass,
                check: () => pass.value ? '' : 'Введите пароль'
            }
        ]);

        if (!ok) return;

        if (!login(emailValue, pass.value)) {
            showFieldError(pass, 'Неверный email или пароль');
            return;
        }

        window.location.href = 'cabinet.html';
    });
}


// ---------- Страница cabinet.html ----------

function initCabinetPage() {
    const cabinet = document.getElementById('cabinet');
    const locked = document.getElementById('locked');
    if (!cabinet || !locked) return;

    const user = currentUser();

    // защита страницы: без входа показываем только сообщение об отказе
    if (!user) {
        cabinet.hidden = true;
        locked.hidden = false;
        return;
    }

    locked.hidden = true;
    cabinet.hidden = false;

    fillProfile(user);
    drawLibrary(user.email);

    // смена имени
    const renameForm = document.getElementById('renameForm');
    const renameInput = document.getElementById('renameInput');

    renameForm.addEventListener('submit', event => {
        event.preventDefault();

        const ok = validate([{
            input: renameInput,
            check: () => renameInput.value.trim().length >= 2 ? '' : 'Имя — минимум 2 символа'
        }]);

        if (!ok) return;

        renameUser(user.email, renameInput.value.trim());
        renameForm.reset();

        fillProfile(currentUser());
        refreshHeader();
    });
}

function fillProfile(user) {
    const date = new Date(user.createdAt);

    document.getElementById('profileLetter').textContent = user.name[0].toUpperCase();
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileDate').textContent =
        date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// список игр пользователя со статусами и статистикой
function drawLibrary(email) {
    const box = document.getElementById('libraryList');
    const library = getLibrary(email);
    const games = GAMES.filter(game => library[game.id]);

    // счётчики по статусам
    document.getElementById('statTotal').textContent = games.length;
    document.getElementById('statPlaying').textContent = games.filter(g => library[g.id] === 'playing').length;
    document.getElementById('statDone').textContent = games.filter(g => library[g.id] === 'done').length;

    if (!games.length) {
        box.innerHTML = `
            <div class="library-empty">
                <span>💾</span>
                <p>Коллекция пока пустая. Нажмите «＋» на карточке игры в <a href="index.html#library">библиотеке</a>.</p>
            </div>`;
        return;
    }

    box.innerHTML = games.map(game => `
        <div class="library-row">
            <span class="library-row__cover">${game.cover}</span>
            <div class="library-row__info">
                <b>${game.title}</b>
                <small>${game.genre} · ${game.year} · ${game.hours}</small>
            </div>
            <label class="visually-hidden" for="status${game.id}">Статус игры ${game.title}</label>
            <select id="status${game.id}" class="library-row__status" data-status="${game.id}">
                ${Object.entries(STATUSES).map(([value, text]) =>
                    `<option value="${value}" ${library[game.id] === value ? 'selected' : ''}>${text}</option>`
                ).join('')}
            </select>
            <button type="button" class="button button--ghost button--small" data-remove="${game.id}">Убрать</button>
        </div>
    `).join('');

    // смена статуса
    box.querySelectorAll('[data-status]').forEach(select => {
        select.addEventListener('change', () => {
            const lib = getLibrary(email);
            lib[select.dataset.status] = select.value;
            saveLibrary(email, lib);
            drawLibrary(email);
        });
    });

    // удаление из коллекции
    box.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            const lib = getLibrary(email);
            delete lib[btn.dataset.remove];
            saveLibrary(email, lib);
            drawLibrary(email);
        });
    });
}


// ---------- Запуск ----------

seedTestUser();
refreshHeader();
initLogoutButtons();
initAuthPage();
initCabinetPage();
