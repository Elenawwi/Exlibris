$(document).ready(function() {
    console.log('Exlibris loaded');
    
    // Обновление статуса книги
    $('.book-status-btn').on('click', function(e) {
        e.preventDefault();
        
        const button = $(this);
        const bookId = button.data('book-id');
        const status = button.data('status');
        const csrfToken = csrftoken;
        
        // Показать состояние загрузки
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
                    // Изменить стиль кнопки
                    $('.book-status-btn[data-book-id="' + bookId + '"]').removeClass('bg-brut-black text-white');
                    $('.book-status-btn[data-book-id="' + bookId + '"]').addClass('bg-white text-brut-black');
                    
                    button.removeClass('bg-white text-brut-black');
                    button.addClass('bg-brut-black text-white');
                    
                    // Показать уведомление
                    showNotification('Статус книги обновлен!', 'success');
                }
            },
            error: function(xhr, status, error) {
                showNotification('Ошибка при обновлении статуса', 'error');
            },
            complete: function() {
                // Восстановить кнопку
                button.text(originalText);
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
        
        // Собрать ответы
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
            showNotification('Пожалуйста, ответьте на вопросы', 'error');
            return;
        }
        
        // Показать загрузку
        submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Загрузка...');
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
                    // Показать рекомендации
                    displayRecommendations(response.recommended_books);
                } else {
                    showNotification(response.error || 'Ошибка при обработке теста', 'error');
                }
            },
            error: function(xhr, status, error) {
                showNotification('Ошибка сервера', 'error');
            },
            complete: function() {
                submitBtn.text(originalText);
                submitBtn.prop('disabled', false);
            }
        });
    });
    
    // Воспроизведение аудиокниги
    $('.play-audiobook').on('click', function(e) {
        e.preventDefault();
        
        const audiobookId = $(this).data('audiobook-id');
        const player = $('#audiobook-player');
        
        // Здесь можно добавить логику воспроизведения
        // Пока просто показываем уведомление
        showNotification('Воспроизведение скоро будет доступно!', 'info');
    });
    
    // Поиск книг
    $('#search-form').on('submit', function(e) {
        e.preventDefault();
        
        const query = $(this).find('input[name="q"]').val();
        if (query.trim().length > 0) {
            window.location.href = '/books/?search=' + encodeURIComponent(query);
        }
    });
    
    // Показать/скрыть пароль
    $('.toggle-password').on('click', function() {
        const input = $(this).parent().find('input');
        const icon = $(this).find('i');
        
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            input.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });
    
    // Функция показа уведомлений
    function showNotification(message, type = 'info') {
        // Создать уведомление
        const notification = $(
            '<div class="fixed top-4 right-4 z-50 max-w-sm animate-slide-in">' +
            '<div class="alert alert-' + type + ' flex items-center justify-between p-4 border-2 border-brut-black shadow-hard">' +
            '<span>' + message + '</span>' +
            '<button class="ml-4 text-lg">&times;</button>' +
            '</div>' +
            '</div>'
        );
        
        // Добавить на страницу
        $('body').append(notification);
        
        // Удалить через 5 секунд
        setTimeout(function() {
            notification.remove();
        }, 5000);
        
        // Закрыть по клику
        notification.find('button').on('click', function() {
            notification.remove();
        });
    }
    
    // Функция отображения рекомендаций
    function displayRecommendations(books) {
        const container = $('#recommendations-container');
        container.empty();
        
        if (books.length === 0) {
            container.html('<div class="text-center py-8"><p>Нет рекомендаций</p></div>');
            return;
        }
        
        let html = '<h3 class="font-display font-bold text-2xl mb-6">Ваши рекомендации</h3>';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">';
        
        books.forEach(function(book) {
            html += `
                <div class="bg-white border-2 border-brut-black rounded-xl p-4 shadow-hard">
                    <div class="bg-gray-200 h-48 rounded-lg border-2 border-brut-black mb-4 overflow-hidden">
                        ${book.cover_url ? 
                            `<img src="${book.cover_url}" class="w-full h-full object-cover" alt="${book.title}">` :
                            `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-book text-4xl text-gray-400"></i></div>`
                        }
                    </div>
                    <h4 class="font-bold text-lg">${book.title}</h4>
                    <p class="text-sm text-gray-500 mb-2">${book.author}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold">${book.match_percentage}% match</span>
                        <button class="book-status-btn bg-brut-black text-white px-4 py-2 rounded text-sm border-2 border-brut-black hover:bg-soft-lime hover:text-brut-black transition-colors" data-book-id="${book.id}" data-status="planned">
                            В планы
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.html(html);
        
        // Перепривязать обработчики событий для новых кнопок
        $('.book-status-btn').on('click', function(e) {
            e.preventDefault();
            
            const button = $(this);
            const bookId = button.data('book-id');
            const status = button.data('status');
            
            // Здесь можно добавить логику AJAX
            showNotification('Книга добавлена в планы!', 'success');
            button.text('Добавлено');
            button.prop('disabled', true);
        });
    }
});

// Анимация появления элементов при скролле
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