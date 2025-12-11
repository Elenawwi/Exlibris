$(document).ready(function() {
    console.log('Exlibris loaded');
    
    // Инициализация переменных
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    
    // Обновление статуса книги
    $(document).on('click', '.book-status-btn', function(e) {
        e.preventDefault();
        
        if (!csrfToken) {
            showNotification('Требуется авторизация', 'error');
            return;
        }
        
        const button = $(this);
        const bookId = button.data('book-id');
        const status = button.data('status');
        const originalText = button.text();
        
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
                        button.removeClass('bg-white text-brut-black')
                              .addClass('bg-brut-black text-white')
                              .text('Читаю')
                              .data('status', 'reading');
                    } else {
                        button.removeClass('bg-brut-black text-white')
                              .addClass('bg-white text-brut-black')
                              .text('В планы')
                              .data('status', 'planned');
                    }
                    showNotification('Статус обновлен!', 'success');
                }
            },
            error: function() {
                showNotification('Ошибка при обновлении статуса', 'error');
            },
            complete: function() {
                button.prop('disabled', false);
            }
        });
    });
    
    // Отправка теста рекомендаций
    $('#quiz-form').on('submit', function(e) {
        e.preventDefault();
        
        const form = $(this);
        const submitBtn = form.find('button[type="submit"]');
        const originalText = submitBtn.text();
        
        const answers = [];
        $('.quiz-question').each(function() {
            const questionId = $(this).data('question-id');
            const selectedOption = $(this).find('input[type="radio"]:checked');
            
            if (selectedOption.length > 0) {
                answers.push({
                    question_id: questionId,
                    option_id: selectedOption.val()
                });
            }
        });
        
        if (answers.length === 0) {
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
                } else {
                    showNotification(response.error, 'error');
                }
            },
            error: function() {
                showNotification('Ошибка сервера', 'error');
            },
            complete: function() {
                submitBtn.text(originalText);
                submitBtn.prop('disabled', false);
            }
        });
    });
    
    // Поиск книг
    $('#search-form').on('submit', function(e) {
        e.preventDefault();
        const query = $(this).find('input[name="q"]').val();
        if (query.trim().length > 0) {
            window.location.href = '/books/?search=' + encodeURIComponent(query);
        }
    });
    
    // Фильтрация в закладках
    $('.bookmark-filter').on('click', function(e) {
        e.preventDefault();
        const status = $(this).data('status');
        window.location.href = '/bookmarks/?status=' + status;
    });
    
    // Сортировка в каталоге
    $('.sort-select').on('change', function() {
        const url = new URL(window.location.href);
        url.searchParams.set('sort', $(this).val());
        window.location.href = url.toString();
    });
    
    // Управление формой создания поста
    $('#forum-post-form').on('submit', function(e) {
        const title = $('#id_title').val();
        const content = $('#id_content').val();
        
        if (!title.trim() || !content.trim()) {
            e.preventDefault();
            showNotification('Заполните все поля', 'error');
        }
    });
    
    // Лайки на форуме
    $('.like-post').on('click', function() {
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
    
    // Прогресс бар в марафоне
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
    
    // Анимация появления элементов
    function initScrollAnimations() {
        $(window).on('scroll', function() {
            $('.scroll-animate').each(function() {
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
    
    // Функция показа уведомлений
    function showNotification(message, type = 'info') {
        const colors = {
            'success': 'bg-green-100 border-green-500 text-green-700',
            'error': 'bg-red-100 border-red-500 text-red-700',
            'info': 'bg-blue-100 border-blue-500 text-blue-700',
            'warning': 'bg-yellow-100 border-yellow-500 text-yellow-700'
        };
        
        const notification = $(`
            <div class="fixed top-4 right-4 z-50 max-w-sm animate-slide-in">
                <div class="alert ${colors[type] || colors.info} flex items-center justify-between p-4 border-2 rounded-lg shadow-lg">
                    <span>${message}</span>
                    <button class="ml-4 text-lg hover:opacity-70">&times;</button>
                </div>
            </div>
        `);
        
        $('body').append(notification);
        
        setTimeout(function() {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        }, 5000);
        
        notification.find('button').on('click', function() {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        });
    }
    
    // Функция отображения рекомендаций
    function displayRecommendations(books) {
        const container = $('#recommendations-container');
        container.empty();
        
        if (!books || books.length === 0) {
            container.html(`
                <div class="text-center py-8">
                    <i class="fas fa-book-open text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Рекомендации не найдены</p>
                </div>
            `);
            return;
        }
        
        let html = `
            <div class="bg-soft-purple/20 border-2 border-brut-black rounded-xl p-6 mb-6">
                <h3 class="font-display font-bold text-2xl mb-4">Ваши рекомендации</h3>
                <p class="text-gray-600 mb-6">На основе ваших ответов</p>
        `;
        
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">';
        
        books.forEach(function(book) {
            html += `
                <div class="bg-white border-2 border-brut-black rounded-xl p-4 shadow-hard">
                    <div class="aspect-[2/3] bg-gray-200 rounded-lg border-2 border-brut-black mb-4 overflow-hidden">
                        ${book.cover_url ? 
                            `<img src="${book.cover_url}" class="w-full h-full object-cover" alt="${book.title}">` :
                            `<div class="w-full h-full flex items-center justify-center">
                                <i class="fas fa-book text-4xl text-gray-400"></i>
                            </div>`
                        }
                    </div>
                    <h4 class="font-bold text-lg mb-1">${book.title}</h4>
                    <p class="text-sm text-gray-500 mb-2">${book.author}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold text-green-600">${book.match_percentage}%</span>
                        <button class="book-status-btn bg-white text-brut-black px-4 py-2 rounded text-sm border-2 border-brut-black hover:bg-brut-black hover:text-white transition-colors" 
                                data-book-id="${book.id}" data-status="planned">
                            В планы
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.html(html);
    }
    
    // Инициализация при загрузке
    updateProgressBar();
    initScrollAnimations();
    
    // Добавление анимации для всех изображений книг
    $('.book-cover, .audiobook-cover').each(function() {
        $(this).on('error', function() {
            $(this).replaceWith(`
                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                    <i class="fas fa-book text-3xl text-gray-400"></i>
                </div>
            `);
        });
    });
    // 2. Отправка теста рекомендаций
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
    
    submitBtn.html('<i class="fas fa-spinner fa-spin"></i>');
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
            } else {
                showNotification(response.error, 'error');
            }
        },
        error: function() {
            showNotification('Ошибка сервера', 'error');
        },
        complete: function() {
            submitBtn.text(originalText);
            submitBtn.prop('disabled', false);
        }
    });
});

// Убираем красную рамку при выборе ответа
$(document).on('change', '.quiz-question input[type="radio"]', function() {
    $(this).closest('.quiz-question').removeClass('border-red-500');
});

// Функция отображения рекомендаций
function displayRecommendations(books) {
    const container = $('#recommendations-container');
    container.empty();
    
    if (!books || books.length === 0) {
        container.html(`
            <div class="text-center py-8">
                <i class="fas fa-book-open text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">Рекомендации не найдены</p>
            </div>
        `);
        return;
    }
    
    let html = `
        <div class="mt-8 p-6 bg-gray-50 border-2 border-brut-black rounded-xl">
            <h3 class="font-bold text-xl mb-6 text-center">Ваши рекомендации</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    `;
    
    books.forEach(function(book) {
        html += `
            <div class="bg-white border-2 border-brut-black rounded-lg p-3">
                <a href="/books/${book.slug}/">
                    <div class="aspect-[2/3] bg-gray-200 rounded mb-3 overflow-hidden">
                        ${book.cover_url ? 
                            `<img src="${book.cover_url}" class="w-full h-full object-cover" alt="${book.title}">` :
                            `<div class="w-full h-full flex items-center justify-center">
                                <i class="fas fa-book text-3xl text-gray-400"></i>
                            </div>`
                        }
                    </div>
                </a>
                <h4 class="font-bold text-sm mb-1">${book.title}</h4>
                <p class="text-xs text-gray-500 mb-2">${book.author}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold">${book.match_percentage || 85}%</span>
                    <button class="book-status-btn text-xs bg-white text-brut-black px-2 py-1 rounded border border-brut-black hover:bg-brut-black hover:text-white"
                            data-book-id="${book.id}" data-status="planned">
                        В планы
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    container.html(html);
}
    // Плавная прокрутка для якорных ссылок
    $('a[href^="#"]').on('click', function(e) {
        if ($(this).attr('href') === '#') return;
        
        e.preventDefault();
        const target = $($(this).attr('href'));
        if (target.length) {
            $('html, body').animate({
                scrollTop: target.offset().top - 80
            }, 500);
        }
    });
});