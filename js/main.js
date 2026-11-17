/* =============================================
   main.js — библиотека игр (карточки, фильтр, поиск,
   сортировка, коллекция, окно «Подробнее»), слайдер,
   бургер-меню, FAQ, анимации появления, Canvas, рассылка
   ============================================= */

// текущее состояние каталога
const catalog = {
    genre: 'Все',
    query: '',
    sort: 'title'
};


// ========== Коллекция пользователя ==========

function isInLibrary(id) {
    const user = currentUser();
    return user ? Boolean(getLibrary(user.email)[id]) : false;
}

function toggleLibrary(id) {
    const user = currentUser();

    // коллекция доступна только после входа
    if (!user) {
        toast('Войдите, чтобы собирать свою коллекцию игр');
        return;
    }

    const library = getLibrary(user.email);

    if (library[id]) {
        delete library[id];
        toast('Игра убрана из «Моих игр»');
    } else {
        library[id] = 'want';
        toast('Игра добавлена в «Мои игры» 💾');
    }

    saveLibrary(user.email, library);
    renderGames();
}


// ========== Кнопки жанров ==========

function renderGenres() {
    const box = document.getElementById('genreChips');
    if (!box) return;

    // уникальные жанры из массива
    const genres = ['Все', ...new Set(GAMES.map(game => game.genre))];

    box.innerHTML = genres.map(genre => `
        <button type="button" class="chip ${genre === catalog.genre ? 'is-active' : ''}" data-genre="${genre}">
            ${genre}
        </button>
    `).join('');

    box.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            catalog.genre = chip.dataset.genre;
            renderGenres();
            renderGames();
        });
    });
}


// ========== Отбор и сортировка ==========

function getVisibleGames() {
    const query = catalog.query.toLowerCase();

    const list = GAMES
        .filter(game => catalog.genre === 'Все' || game.genre === catalog.genre)
        .filter(game =>
            game.title.toLowerCase().includes(query) ||
            game.studio.toLowerCase().includes(query)
        );

    if (catalog.sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    if (catalog.sort === 'new') list.sort((a, b) => b.year - a.year);
    if (catalog.sort === 'old') list.sort((a, b) => a.year - b.year);

    return list;
}


// ========== Рендер карточек из массива GAMES ==========

function renderGames() {
    const grid = document.getElementById('gameGrid');
    if (!grid) return;

    const list = getVisibleGames();

    document.getElementById('catalogCount').textContent =
        list.length ? `Найдено игр: ${list.length}` : 'Ничего не найдено — попробуйте другой жанр или запрос.';

    grid.innerHTML = list.map(game => {
        const saved = isInLibrary(game.id);

        return `
            <article class="game-card">
                <div class="game-card__cover">
                    <span>${game.cover}</span>
                    <span class="game-card__year">${game.year}</span>
                </div>
                <button type="button"
                        class="game-card__save ${saved ? 'is-saved' : ''}"
                        data-save="${game.id}"
                        aria-label="${saved ? 'Убрать из моих игр' : 'Добавить в мои игры'}">${saved ? '✓' : '＋'}</button>
                <div class="game-card__body">
                    <span class="game-card__genre">${game.genre}</span>
                    <h3 class="game-card__title">${game.title}</h3>
                    <p class="game-card__text">${game.short}</p>
                    <ul class="game-card__meta">
                        <li>🏢 ${game.studio}</li>
                        <li>⏳ ${game.hours}</li>
                    </ul>
                    <button type="button" class="button button--small" data-more="${game.id}">Подробнее →</button>
                </div>
            </article>
        `;
    }).join('');

    grid.querySelectorAll('[data-save]').forEach(btn =>
        btn.addEventListener('click', () => toggleLibrary(Number(btn.dataset.save)))
    );

    grid.querySelectorAll('[data-more]').forEach(btn =>
        btn.addEventListener('click', () => openGame(Number(btn.dataset.more)))
    );
}

function initCatalogControls() {
    const search = document.getElementById('searchField');
    const sort = document.getElementById('sortSelect');
    if (!search || !sort) return;

    search.addEventListener('input', () => {
        catalog.query = search.value.trim();
        renderGames();
    });

    sort.addEventListener('change', () => {
        catalog.sort = sort.value;
        renderGames();
    });
}


// ========== Модальное окно «Подробнее» ==========

function openGame(id) {
    const game = GAMES.find(item => item.id === id);
    const modal = document.getElementById('gameModal');
    const saved = isInLibrary(id);

    document.getElementById('dialogBody').innerHTML = `
        <div class="dialog__cover">${game.cover}</div>
        <span class="game-card__genre">${game.genre}</span>
        <h2 class="dialog__title" id="dialogTitle">${game.title}</h2>
        <dl class="dialog__facts">
            <div><dt>Год</dt><dd>${game.year}</dd></div>
            <div><dt>Студия</dt><dd>${game.studio}</dd></div>
            <div><dt>Режим</dt><dd>${game.mode}</dd></div>
            <div><dt>Прохождение</dt><dd>${game.hours}</dd></div>
        </dl>
        <p class="dialog__text">${game.about}</p>
        <button type="button" class="button" id="dialogSave">
            ${saved ? 'Убрать из «Моих игр»' : '＋ Добавить в «Мои игры»'}
        </button>
    `;

    document.getElementById('dialogSave').addEventListener('click', () => {
        toggleLibrary(id);
        closeModal();
    });

    modal.hidden = false;
    document.body.classList.add('is-locked');
}

function closeModal() {
    document.getElementById('gameModal').hidden = true;
    document.body.classList.remove('is-locked');
}

function initModal() {
    const modal = document.getElementById('gameModal');
    if (!modal) return;

    // закрытие: крестик, клик по фону, клавиша Esc
    modal.addEventListener('click', event => {
        if (event.target === modal || event.target.hasAttribute('data-close')) closeModal();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) closeModal();
    });
}


// ========== Слайдер (лента сдвигается через transform) ==========

function initCarousel() {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;

    const track = document.getElementById('carouselTrack');
    const slides = track.children;
    const dotsBox = document.getElementById('carouselDots');
    const total = slides.length;

    let index = 0;
    let timerId = null;

    // точки по количеству слайдов
    dotsBox.innerHTML = Array.from(slides).map((_, i) =>
        `<button type="button" class="carousel__dot" aria-label="Слайд ${i + 1}"></button>`
    ).join('');
    const dots = dotsBox.querySelectorAll('.carousel__dot');

    function goTo(newIndex) {
        index = (newIndex + total) % total; // зацикливаем в обе стороны
        track.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    }

    function play() {
        stop();
        timerId = setInterval(() => goTo(index + 1), 5000);
    }

    function stop() {
        clearInterval(timerId);
    }

    document.getElementById('carouselNext').addEventListener('click', () => goTo(index + 1));
    document.getElementById('carouselPrev').addEventListener('click', () => goTo(index - 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    // пауза, пока мышь над слайдером
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', play);

    // свайп пальцем на телефоне
    let startX = 0;
    carousel.addEventListener('touchstart', event => {
        startX = event.touches[0].clientX;
        stop();
    }, { passive: true });

    carousel.addEventListener('touchend', event => {
        const diff = event.changedTouches[0].clientX - startX;
        if (Math.abs(diff) > 50) goTo(diff < 0 ? index + 1 : index - 1);
        play();
    });

    goTo(0);
    play();
}


// ========== Бургер-меню ==========

function initBurger() {
    const burger = document.getElementById('burger');
    const menu = document.getElementById('menu');
    if (!burger || !menu) return;

    function setOpen(open) {
        menu.classList.toggle('is-open', open);
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open);
    }

    burger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));

    // клик по пункту меню закрывает его
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
}


// ========== FAQ-аккордеон ==========

function initAccordion() {
    document.querySelectorAll('.accordion__head').forEach(head => {
        head.addEventListener('click', () => {
            const item = head.parentElement;
            const wasOpen = item.classList.contains('is-open');

            // открыт может быть только один пункт
            document.querySelectorAll('.accordion__item').forEach(i => i.classList.remove('is-open'));
            if (!wasOpen) item.classList.add('is-open');
        });
    });
}


// ========== Плавное появление блоков (IntersectionObserver) ==========

function initReveal() {
    const items = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
        items.forEach(item => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    items.forEach(item => observer.observe(item));
}


// ========== Canvas: «пиксельные звёзды» в hero ==========

function initStars() {
    const canvas = document.getElementById('starsCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = ['#8b6cff', '#22d3ee', '#ff4d8d', '#ffffff'];
    let stars = [];

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // количество звёзд зависит от ширины экрана
        stars = Array.from({ length: Math.round(canvas.width / 18) }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() < 0.8 ? 2 : 4,
            speed: 0.2 + Math.random() * 0.6,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = -star.size;
                star.x = Math.random() * canvas.width;
            }

            ctx.globalAlpha = 0.7;
            ctx.fillStyle = star.color;
            ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size); // квадратные «пиксели»
        });

        requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
}


// ========== Подписка в подвале ==========

function initNewsletter() {
    const form = document.getElementById('newsletter');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();

        const input = document.getElementById('newsletterEmail');
        const msg = document.getElementById('newsletterMsg');
        const email = input.value.trim();

        if (!EMAIL_PATTERN.test(email)) {
            msg.textContent = 'Проверьте email';
            msg.className = 'newsletter__msg is-error';
            return;
        }

        msg.textContent = 'Подписка оформлена: ' + email;
        msg.className = 'newsletter__msg is-ok';
        form.reset();
    });
}


// ========== Всплывающее уведомление ==========

function toast(text) {
    let box = document.querySelector('.toast');

    if (!box) {
        box = document.createElement('div');
        box.className = 'toast';
        box.setAttribute('role', 'status');
        document.body.appendChild(box);
    }

    box.textContent = text;
    box.classList.add('is-shown');

    clearTimeout(box.hideTimer);
    box.hideTimer = setTimeout(() => box.classList.remove('is-shown'), 2600);
}


// ========== Запуск ==========

initBurger();
renderGenres();
renderGames();
initCatalogControls();
initModal();
initCarousel();
initAccordion();
initReveal();
initStars();
initNewsletter();
