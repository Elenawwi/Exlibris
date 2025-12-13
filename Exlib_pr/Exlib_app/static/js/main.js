// main.js - полная исправленная версия
$(document).ready(function() {
    console.log('Exlibris loaded - поиск и фильтрация активны');
    
    // Инициализация переменных
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    
    // 1. Обновление статуса книги
    $(document).on('click', '.book-status-btn', function(e) {
        e.preventDefault();
        
        if (!csrfToken) {
            showNotification('Требуется авторизация', 'error');
            window.location.href = '/admin/login/';
            return;
        }
        
        const button = $(this);
        const bookId = button.data('book-id');
        const status = button.data('status');
        
        button.html('<i class="fas fa-spinner fa-spin"></i>');
        button.prop('disabled', true);
        
        $.ajax({
            url: '/api/update-book-status/',
            method: 'POST',
            data: {
                'book_id': bookId,
                'status': status,
                'csrfmiddlewaretoken': csrfToken
            },
            success: function(response) {
                if (response.success) {
                    // Изменяем внешний вид кнопки
                    if (status === 'reading') {
                        button.removeClass('bg-white text-brut-black hover:bg-brut-black hover:text-white')
                              .addClass('bg-brut-black text-white hover:bg-soft-lime hover:text-brut-black')
                              .text('Читаю')
                              .data('status', 'reading');
                    } else if (status === 'planned') {
                        button.removeClass('bg-brut-black text-white hover:bg-soft-lime hover:text-brut-black')
                              .addClass('bg-white text-brut-black hover:bg-brut-black hover:text-white')
                              .text('В планы')
                              .data('status', 'planned');
                    }
                    showNotification('Статус обновлен!', 'success');
                }
            },
            error: function(xhr) {
                if (xhr.status === 403) {
                    showNotification('Требуется авторизация', 'error');
                    window.location.href = '/admin/login/';
                } else {
                    showNotification('Ошибка при обновлении статуса', 'error');
                }
            },
            complete: function() {
                button.prop('disabled', false);
                button.find('i').remove();
                button.text(button.data('status') === 'reading' ? 'Читаю' : 'В планы');
            }
        });
    });
    
    // 2. Поиск книг (главный поиск в шапке)
    $('#search-form').on('submit', function(e) {
        e.preventDefault();
        const query = $(this).find('input[name="q"]').val();
        
        if (query.trim().length > 0) {
            window.location.href = '/books/?search=' + encodeURIComponent(query.trim());
        } else {
            window.location.href = '/books/';
        }
    });
    
    // 3. Поиск на странице каталога
    $('form[method="get"]').on('submit', function(e) {
        const searchInput = $(this).find('input[name="search"]');
        if (searchInput.length) {
            e.preventDefault();
            const query = searchInput.val();
            const currentUrl = new URL(window.location.href);
            
            // Обновляем параметр поиска
            if (query.trim().length > 0) {
                currentUrl.searchParams.set('search', query.trim());
            } else {
                currentUrl.searchParams.delete('search');
            }
            
            // Сбрасываем страницу при новом поиске
            currentUrl.searchParams.delete('page');
            
            window.location.href = currentUrl.toString();
        }
    });
    
    // 4. Сортировка в каталоге
    $('.sort-select').on('change', function() {
        const sortValue = $(this).val();
        const url = new URL(window.location.href);
        
        if (sortValue) {
            url.searchParams.set('sort', sortValue);
        } else {
            url.searchParams.delete('sort');
        }
        
        // Сбрасываем страницу при сортировке
        url.searchParams.delete('page');
        
        window.location.href = url.toString();
    });
    
    // 5. Фильтрация в закладках
    $('.bookmark-filter').on('click', function(e) {
        e.preventDefault();
        const status = $(this).data('status');
        window.location.href = '/bookmarks/?status=' + status;
    });
    
    // 6. Отправка теста рекомендаций
    $('#quiz-form').on('submit', function(e) {
        e.preventDefault();
        
        if (!csrfToken) {
            showNotification('Требуется авторизация', 'error');
            window.location.href = '/admin/login/';
            return;
        }
        
        const form = $(this);
        const submitBtn = form.find('button[type="submit"]');
        const originalText = submitBtn.text();
        
        // Собираем ответы
        const answers = [];
        let allAnswered = true;
        
        $('.quiz-question').each(function() {
            const questionId = $(this).data('question-id');
            const selectedOption = $(this).find('input[type="radio"]:checked');
            
            if (selectedOption.length > 0) {
                answers.push({
                    question_id: questionId,
                    option_id: selectedOption.val()
                });
            } else {
                allAnswered = false;
                $(this).addClass('border-red-500');
            }
        });
        
        if (!allAnswered) {
            showNotification('Ответьте на все вопросы', 'error');
            return;
        }
        
        submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Обработка...');
        submitBtn.prop('disabled', true);
        
        $.ajax({
            url: '/api/submit-quiz/',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                'answers': answers,
                'csrfmiddlewaretoken': csrfToken
            }),
            success: function(response) {
                if (response.success) {
                    displayRecommendations(response.books);
                    // Прокручиваем к результатам
                    $('html, body').animate({
                        scrollTop: $('#recommendations-container').offset().top - 100
                    }, 500);
                } else {
                    showNotification(response.error || 'Ошибка при обработке теста', 'error');
                }
            },
            error: function(xhr) {
                if (xhr.status === 403) {
                    showNotification('Требуется авторизация', 'error');
                    window.location.href = '/admin/login/';
                } else {
                    showNotification('Ошибка сервера. Попробуйте позже.', 'error');
                }
            },
            complete: function() {
                submitBtn.text(originalText);
                submitBtn.prop('disabled', false);
            }
        });
    });
    
    // 7. Управление формой создания поста
    $('#forum-post-form').on('submit', function(e) {
        const title = $('#id_title').val();
        const content = $('#id_content').val();
        
        if (!title.trim() || !content.trim()) {
            e.preventDefault();
            showNotification('Заполните все поля', 'error');
        }
    });
    
    // 8. Лайки на форуме (симуляция)
    $(document).on('click', '.like-post', function() {
        if (!csrfToken) {
            showNotification('Требуется авторизация', 'error');
            window.location.href = '/admin/login/';
            return;
        }
        
        const button = $(this);
        const postId = button.data('post-id');
        
        button.toggleClass('text-red-500');
        const icon = button.find('i');
        
        if (icon.hasClass('fa-regular')) {
            icon.removeClass('fa-regular').addClass('fa-solid');
            showNotification('Лайк добавлен!', 'success');
        } else {
            icon.removeClass('fa-solid').addClass('fa-regular');
            showNotification('Лайк удален', 'info');
        }
    });
    
    // 9. Обновление прогресс-бара в марафоне
    function updateProgressBar() {
        const progressData = document.getElementById('progress-data');
        if (progressData) {
            const current = parseInt(progressData.dataset.current);
            const goal = parseInt(progressData.dataset.goal);
            
            if (goal > 0) {
                const percentage = Math.min(100, Math.round((current / goal) * 100));
                const progressBar = document.querySelector('.progress-bar');
                const progressText = document.getElementById('progress-text');
                
                if (progressBar) {
                    progressBar.style.width = percentage + '%';
                }
                if (progressText) {
                    progressText.textContent = percentage + '%';
                }
            }
        }
    }
    
    // 10. Анимация появления элементов
    function initScrollAnimations() {
        $('.scroll-animate').each(function() {
            const element = $(this);
            const position = element.offset().top;
            const windowHeight = $(window).height();
            const scrollTop = $(window).scrollTop();
            
            if (position < scrollTop + windowHeight - 100) {
                element.addClass('animate-fade-in');
            }
        });
        
        $(window).on('scroll', function() {
            $('.scroll-animate:not(.animate-fade-in)').each(function() {
                const element = $(this);
                const position = element.offset().top;
                const windowHeight = $(window).height();
                const scrollTop = $(window).scrollTop();
                
                if (position < scrollTop + windowHeight - 100) {
                    element.addClass('animate-fade-in');
                }
            });
        });
    }
    
    // 11. Функция показа уведомлений
    function showNotification(message, type = 'info') {
        const colors = {
            'success': 'bg-green-100 border-green-500 text-green-700',
            'error': 'bg-red-100 border-red-500 text-red-700',
            'info': 'bg-blue-100 border-blue-500 text-blue-700',
            'warning': 'bg-yellow-100 border-yellow-500 text-yellow-700'
        };
        
        // Удаляем старые уведомления
        $('.notification-alert').remove();
        
        const notification = $(`
            <div class="notification-alert fixed top-4 right-4 z-50 max-w-sm animate-slide-in">
                <div class="${colors[type] || colors.info} flex items-center justify-between p-4 border-2 rounded-lg shadow-lg">
                    <span>${message}</span>
                    <button class="ml-4 text-lg hover:opacity-70">&times;</button>
                </div>
            </div>
        `);
        
        $('body').append(notification);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(function() {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        }, 5000);
        
        // Закрытие по клику
        notification.find('button').on('click', function() {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        });
    }
    
    // 12. Функция отображения рекомендаций
    function displayRecommendations(books) {
        const container = $('#recommendations-container');
        container.empty();
        
        if (!books || books.length === 0) {
            container.html(`
                <div class="text-center py-8 scroll-animate">
                    <i class="fas fa-book-open text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Рекомендации не найдены. Попробуйте изменить ответы.</p>
                </div>
            `);
            return;
        }
        
        let html = `
            <div class="mt-8 p-6 bg-gray-50 border-2 border-brut-black rounded-xl scroll-animate">
                <h3 class="font-bold text-xl mb-6 text-center">🎯 Ваши рекомендации</h3>
                <p class="text-gray-600 text-center mb-8">На основе ваших ответов</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        `;
        
        books.forEach(function(book) {
            html += `
                <div class="bg-white border-2 border-brut-black rounded-lg p-3 hover:shadow-hard-hover transition-all">
                    <a href="/books/${book.slug}/">
                        <div class="aspect-[2/3] bg-gray-200 rounded mb-3 overflow-hidden">
                            ${book.cover_url ? 
                                `<img src="${book.cover_url}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt="${book.title}">` :
                                `<div class="w-full h-full flex items-center justify-center">
                                    <i class="fas fa-book text-3xl text-gray-400"></i>
                                </div>`
                            }
                        </div>
                    </a>
                    <h4 class="font-bold text-sm mb-1 truncate">${book.title}</h4>
                    <p class="text-xs text-gray-500 mb-2 truncate">${book.author}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold bg-gray-100 px-2 py-1 rounded">${book.match_percentage || 85}% совпадение</span>
                        <button class="book-status-btn text-xs bg-white text-brut-black px-3 py-1.5 rounded border-2 border-brut-black hover:bg-brut-black hover:text-white transition-colors"
                                data-book-id="${book.id}" data-status="planned">
                            В планы
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.html(html);
        
        // Инициализируем анимацию для новых элементов
        initScrollAnimations();
    }
    
    // 13. Быстрый поиск при нажатии Enter в любом поле поиска
    $('input[type="text"][name*="search"], input[type="text"][name="q"]').on('keyup', function(e) {
        if (e.key === 'Enter') {
            $(this).closest('form').submit();
        }
    });
    
    // 14. Обработка кликов по ссылкам фильтров (чтобы сохранять параметры)
    $(document).on('click', 'a[href*="?"]', function(e) {
        // Для ссылок фильтрации добавляем параметры сортировки если они есть
        const currentUrl = new URL(window.location.href);
        const sortParam = currentUrl.searchParams.get('sort');
        const href = $(this).attr('href');
        
        if (href.includes('?') && sortParam && !href.includes('sort=')) {
            $(this).attr('href', href + (href.includes('?&') ? '' : '&') + 'sort=' + sortParam);
        }
    });
    
    // 15. Кнопка "Очистить фильтры"
    $('.clear-filters').on('click', function(e) {
        e.preventDefault();
        window.location.href = $(this).attr('href');
    });
    
    // 16. Плавная прокрутка для якорных ссылок
    $('a[href^="#"]').on('click', function(e) {
        const href = $(this).attr('href');
        if (href === '#') return;
        
        if (href.startsWith('#') && href.length > 1) {
            e.preventDefault();
            const target = $(href);
            if (target.length) {
                $('html, body').animate({
                    scrollTop: target.offset().top - 80
                }, 500);
            }
        }
    });
    
    // 17. Обработка ошибок изображений
    $('img').on('error', function() {
        const $img = $(this);
        if (!$img.closest('.no-fallback').length) {
            $img.replaceWith(`
                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                    <i class="fas fa-book text-3xl text-gray-400"></i>
                </div>
            `);
        }
    });
    
    // 18. Инициализация аудиоплеера (если есть)
    $('.fa-circle-play').on('click', function() {
        const player = $(this);
        if (player.hasClass('playing')) {
            player.removeClass('playing fa-circle-pause').addClass('fa-circle-play');
            showNotification('Воспроизведение остановлено', 'info');
        } else {
            player.removeClass('fa-circle-play').addClass('playing fa-circle-pause');
            showNotification('Начато воспроизведение аудиокниги', 'success');
        }
    });
    
    // 19. Анимация загрузки для всех AJAX запросов
    $(document).ajaxStart(function() {
        $('body').append(`
            <div id="global-spinner" class="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
                <div class="bg-white border-2 border-brut-black p-8 rounded-xl shadow-hard">
                    <i class="fas fa-spinner fa-spin text-3xl text-brut-black"></i>
                </div>
            </div>
        `);
    });
    
    $(document).ajaxStop(function() {
        $('#global-spinner').fadeOut(300, function() {
            $(this).remove();
        });
    });
    
    // 20. Инициализация при загрузке
    updateProgressBar();
    initScrollAnimations();
    
    // Добавляем обработку изменений в радио-кнопках теста
    $(document).on('change', '.quiz-question input[type="radio"]', function() {
        $(this).closest('.quiz-question').removeClass('border-red-500');
    });
    
    console.log('Все функции JavaScript инициализированы');
});

// Глобальные функции (если нужны вне document.ready)
function refreshPageWithParams(params) {
    const url = new URL(window.location.href);
    
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    
    url.searchParams.delete('page'); // Сбрасываем страницу при изменении параметров
    window.location.href = url.toString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
$(document).ready(function() {
    // Улучшенный поиск на странице каталога
    $('input[name="search"]').on('keyup', function(e) {
        if (e.key === 'Enter') {
            // Сброс страницы при новом поиске
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('page');
            window.location.href = currentUrl.toString();
        }
    });
    
    // Быстрая фильтрация - кнопка сброса
    $('.clear-filters-btn').on('click', function() {
        window.location.href = '{% url "book_list" %}';
    });
    
    // Сохранение параметров при клике на ссылки фильтрации
    $('.filter-link').on('click', function(e) {
        const currentUrl = new URL(window.location.href);
        const sortParam = currentUrl.searchParams.get('sort');
        const searchParam = currentUrl.searchParams.get('search');
        
        let href = $(this).attr('href');
        if (sortParam && !href.includes('sort=')) {
            href += (href.includes('?') ? '&' : '?') + 'sort=' + sortParam;
        }
        if (searchParam && !href.includes('search=')) {
            href += (href.includes('?') ? '&' : '?') + 'search=' + encodeURIComponent(searchParam);
        }
        
        $(this).attr('href', href);
    });
});

$(document).ready(function() {
    // Поиск аудиокниг
    $('input[name="search"]').on('keyup', function(e) {
        if (e.key === 'Enter') {
            $(this).closest('form').submit();
        }
    });
    
    // Воспроизведение аудио (заглушка)
    $('.play-audio-btn').on('click', function(e) {
        e.preventDefault();
        const audiobookTitle = $(this).data('title');
        alert('Воспроизведение аудиокниги: ' + audiobookTitle + '\n\n(В реальном приложении здесь будет запущен плеер)');
    });
    
    // Фильтрация по жанрам
    $('.genre-filter').on('click', function(e) {
        e.preventDefault();
        const genreId = $(this).data('genre-id');
        window.location.href = '?genre=' + genreId;
    });
});

$(document).ready(function() {
    // Поиск на форуме
    $('input[name="q"]').on('keyup', function(e) {
        if (e.key === 'Enter') {
            // Сбрасываем страницу при новом поиске
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('page');
            window.location.href = currentUrl.toString();
        }
    });
    
    // Лайки постов
    $('.like-post').on('click', function() {
        const button = $(this);
        const postId = button.data('post-id');
        const icon = button.find('i');
        let likesCount = parseInt(button.text().trim()) || 0;
        
        if (!'{{ user.is_authenticated }}') {
            showNotification('Войдите, чтобы ставить лайки', 'error');
            window.location.href = '/admin/login/';
            return;
        }
        
        if (icon.hasClass('fa-regular')) {
            icon.removeClass('fa-regular').addClass('fa-solid text-red-500');
            likesCount += 1;
            showNotification('Лайк добавлен!', 'success');
        } else {
            icon.removeClass('fa-solid text-red-500').addClass('fa-regular');
            likesCount -= 1;
            showNotification('Лайк удален', 'info');
        }
        
        button.html(`<i class="${icon.attr('class')} mr-1"></i>${likesCount}`);
    });
    
    // Фильтрация по категориям
    $('a[href*="category="]').on('click', function(e) {
        const href = $(this).attr('href');
        const currentUrl = new URL(window.location.href);
        const searchParams = new URLSearchParams(href.split('?')[1]);
        
        // Обновляем категорию
        const category = searchParams.get('category');
        if (category) {
            currentUrl.searchParams.set('category', category);
        }
        
        // Сбрасываем страницу при смене категории
        currentUrl.searchParams.delete('page');
        
        window.location.href = currentUrl.toString();
    });
});
$(document).ready(function() {
    // Лайк поста
    $('.like-post').on('click', function() {
        const button = $(this);
        const postId = button.data('post-id');
        const icon = button.find('i');
        let likesCount = parseInt(button.find('span').text()) || 0;
        
        if (!'{{ user.is_authenticated }}') {
            showNotification('Войдите, чтобы ставить лайки', 'error');
            window.location.href = '/admin/login/';
            return;
        }
        
        if (icon.hasClass('fa-regular')) {
            icon.removeClass('fa-regular').addClass('fa-solid');
            likesCount += 1;
            button.addClass('text-red-600');
            showNotification('Лайк добавлен!', 'success');
        } else {
            icon.removeClass('fa-solid').addClass('fa-regular');
            likesCount -= 1;
            button.removeClass('text-red-600');
            showNotification('Лайк удален', 'info');
        }
        
        button.find('span').text(likesCount);
    });
    
    // Отправка комментария
    $('form').on('submit', function(e) {
        e.preventDefault();
        const textarea = $(this).find('textarea');
        const comment = textarea.val().trim();
        
        if (!'{{ user.is_authenticated }}') {
            showNotification('Войдите, чтобы оставлять комментарии', 'error');
            window.location.href = '/admin/login/';
            return;
        }
        
        if (comment.length === 0) {
            showNotification('Введите текст комментария', 'error');
            return;
        }
        
        if (comment.length < 10) {
            showNotification('Комментарий слишком короткий', 'error');
            return;
        }
        
        // Симуляция отправки
        showNotification('Комментарий отправлен!', 'success');
        textarea.val('');
    });
});

$(document).ready(function() {
    // Изменение статуса книги в закладках
    $('.book-status-select').on('change', function() {
        const select = $(this);
        const bookId = select.data('book-id');
        const newStatus = select.val();
        const currentStatus = select.data('current-status');
        
        if (newStatus === currentStatus) {
            return; // Статус не изменился
        }
        
        select.prop('disabled', true);
        
        $.ajax({
            url: '/api/update-book-status/',
            method: 'POST',
            data: {
                'book_id': bookId,
                'status': newStatus,
                'csrfmiddlewaretoken': csrfToken
            },
            success: function(response) {
                if (response.success) {
                    // Обновляем текущий статус в data-атрибуте
                    select.data('current-status', newStatus);
                    
                    // Меняем цвет метки статуса
                    const statusBadge = select.closest('.bg-white').find('.cover-container .absolute.top-2.left-2 span');
                    
                    let newClasses = '';
                    let newText = '';
                    
                    switch(newStatus) {
                        case 'reading':
                            newClasses = 'bg-brut-black text-white border-brut-black';
                            newText = 'Читаю';
                            break;
                        case 'planned':
                            newClasses = 'bg-blue-100 text-blue-800 border-blue-300';
                            newText = 'В планах';
                            break;
                        case 'read':
                            newClasses = 'bg-purple-100 text-purple-800 border-purple-300';
                            newText = 'Прочитано';
                            break;
                        case 'abandoned':
                            newClasses = 'bg-red-100 text-red-800 border-red-300';
                            newText = 'Брошено';
                            break;
                    }
                    
                    if (statusBadge.length) {
                        statusBadge.removeClass().addClass('px-2 py-1 text-xs font-bold rounded border ' + newClasses);
                        statusBadge.text(newText);
                    }
                    
                    showNotification('Статус книги обновлен!', 'success');
                    
                    // Если фильтр включен и статус изменился, обновляем страницу
                    if ('{{ status_filter }}' && '{{ status_filter }}' !== 'all' && newStatus !== '{{ status_filter }}') {
                        setTimeout(function() {
                            window.location.reload();
                        }, 1000);
                    }
                }
            },
            error: function(xhr) {
                // Возвращаем предыдущее значение
                select.val(currentStatus);
                showNotification('Ошибка при обновлении статуса', 'error');
            },
            complete: function() {
                select.prop('disabled', false);
            }
        });
    });
    
    // Удаление из закладок
    $('.remove-bookmark').on('click', function() {
        const button = $(this);
        const bookmarkId = button.data('bookmark-id');
        
        if (!confirm('Удалить книгу из закладок?')) {
            return;
        }
        
        button.html('<i class="fas fa-spinner fa-spin"></i>');
        button.prop('disabled', true);
        
        $.ajax({
            url: '/api/remove-bookmark/',
            method: 'POST',
            data: {
                'bookmark_id': bookmarkId,
                'csrfmiddlewaretoken': csrfToken
            },
            success: function(response) {
                if (response.success) {
                    showNotification('Книга удалена из закладок', 'success');
                    // Плавно скрываем карточку
                    button.closest('.bg-white').fadeOut(300, function() {
                        $(this).remove();
                        
                        // Если карточек не осталось, обновляем страницу
                        if ($('.bg-white.border-2').length === 0) {
                            setTimeout(function() {
                                window.location.reload();
                            }, 500);
                        }
                    });
                }
            },
            error: function() {
                showNotification('Ошибка при удалении', 'error');
                button.html('<i class="fa-solid fa-trash"></i>');
                button.prop('disabled', false);
            }
        });
    });
    
    // Фильтрация по статусу
    $('.bookmark-filter').on('click', function(e) {
        e.preventDefault();
        const status = $(this).data('status');
        window.location.href = '?status=' + status;
    });
});