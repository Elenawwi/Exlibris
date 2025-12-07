from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    # Главная страница
    path('', views.index, name='index'),
    
    # Книги
    path('books/', views.book_list, name='book_list'),
    path('books/<slug:slug>/', views.book_detail, name='book_detail'),
    
    # Аудиокниги
    path('audiobooks/', views.audiobook_list, name='audiobook_list'),
    path('audiobooks/<slug:slug>/', views.audiobook_detail, name='audiobook_detail'),
    
    # Форум
    path('forum/', views.forum, name='forum'),
    path('forum/post/<int:post_id>/', views.forum_post_detail, name='forum_post_detail'),
    path('forum/create/', views.create_forum_post, name='create_forum_post'),
    
    # Тест рекомендаций
    path('quiz/', views.recommendation_quiz, name='recommendation_quiz'),
    path('api/submit-quiz/', views.submit_quiz, name='submit_quiz'),
    
    # AJAX-эндпоинты
    path('api/update-book-status/', views.update_book_status, name='update_book_status'),
    
    # Профиль и закладки
    path('profile/', views.profile, name='profile'),
    path('bookmarks/', views.bookmarks, name='bookmarks'),
    
    # О проекте
    path('about/', views.about, name='about'),
]

# Для обслуживания медиа-файлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)