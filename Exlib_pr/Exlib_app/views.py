from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib import messages
import json

from .models import (
    MarqueeMessage, Book, Audiobook, ForumGroup, 
    ForumPost, ReadingChallenge, UserBookStatus,
    RecommendationQuiz, QuizOption, UserProfile
)

def index(request):
    """Главная страница"""
    # Получаем все данные для главной страницы
    context = {
        # Бегущая строка
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
        
        # Персональная подборка (первые 4 книги)
        'books': Book.objects.all().order_by('-created_at')[:4],
        
        # Аудиокниги (рекомендуемые)
        'audiobooks': Audiobook.objects.filter(is_featured=True).order_by('order')[:3],
        
        # Группы форума
        'forum_groups': ForumGroup.objects.all().order_by('order')[:4],
        
        # Активный марафон
        'reading_challenge': ReadingChallenge.objects.filter(is_active=True).first(),
        
        # Последние посты форума
        'forum_posts': ForumPost.objects.filter(is_pinned=True).order_by('-created_at')[:5],
    }
    
    # Если пользователь авторизован, добавляем его статусы книг
    if request.user.is_authenticated:
        user_book_statuses = UserBookStatus.objects.filter(user=request.user)
        context['user_book_statuses'] = {status.book_id: status.status for status in user_book_statuses}
    
    return render(request, 'Exlib_app/index.html', context)


def book_list(request):
    """Страница со всеми книгами"""
    books = Book.objects.all().order_by('-created_at')
    
    # Фильтрация по жанру
    genre = request.GET.get('genre')
    if genre:
        books = books.filter(genre=genre)
    
    context = {
        'books': books,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/book_list.html', context)


def book_detail(request, slug):
    """Детальная страница книги"""
    book = get_object_or_404(Book, slug=slug)
    
    context = {
        'book': book,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/book_detail.html', context)


def audiobook_list(request):
    """Страница со всеми аудиокнигами"""
    audiobooks = Audiobook.objects.all().order_by('order')
    
    context = {
        'audiobooks': audiobooks,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/audiobook_list.html', context)


def audiobook_detail(request, slug):
    """Детальная страница аудиокниги"""
    audiobook = get_object_or_404(Audiobook, slug=slug)
    
    context = {
        'audiobook': audiobook,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/audiobook_detail.html', context)


def forum(request):
    """Страница форума"""
    posts = ForumPost.objects.all().order_by('-created_at')[:20]
    groups = ForumGroup.objects.all().order_by('order')
    
    context = {
        'posts': posts,
        'groups': groups,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
        'reading_challenge': ReadingChallenge.objects.filter(is_active=True).first(),
    }
    return render(request, 'Exlib_app/forum.html', context)


def forum_post_detail(request, post_id):
    """Детальная страница поста форума"""
    post = get_object_or_404(ForumPost, id=post_id)
    
    # Увеличиваем счетчик просмотров
    post.views += 1
    post.save()
    
    context = {
        'post': post,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/forum_post_detail.html', context)


@login_required
def create_forum_post(request):
    """Создание нового поста на форуме"""
    if request.method == 'POST':
        title = request.POST.get('title')
        content = request.POST.get('content')
        category = request.POST.get('category')
        group_id = request.POST.get('forum_group')
        
        if group_id:
            forum_group = ForumGroup.objects.get(id=group_id)
        else:
            forum_group = None
        
        post = ForumPost.objects.create(
            title=title,
            content=content,
            author=request.user,
            category=category,
            forum_group=forum_group
        )
        
        messages.success(request, 'Пост успешно создан!')
        return redirect('forum_post_detail', post_id=post.id)
    
    groups = ForumGroup.objects.all()
    context = {
        'groups': groups,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/create_forum_post.html', context)


def recommendation_quiz(request):
    """Страница теста рекомендаций"""
    questions = RecommendationQuiz.objects.all().order_by('order')
    
    context = {
        'questions': questions,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/recommendation_quiz.html', context)


@require_POST
def submit_quiz(request):
    """Обработка результатов теста (AJAX)"""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Требуется авторизация'}, status=401)
    
    try:
        data = json.loads(request.body)
        answers = data.get('answers', [])
        
        # Здесь можно добавить логику расчета рекомендаций
        # Пока просто возвращаем случайные книги
        
        recommended_books = Book.objects.order_by('?')[:4]
        
        response_data = {
            'success': True,
            'recommended_books': [
                {
                    'id': book.id,
                    'title': book.title,
                    'author': book.author,
                    'cover_url': book.cover_image.url if book.cover_image else '',
                    'match_percentage': book.match_percentage,
                }
                for book in recommended_books
            ]
        }
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_POST
def update_book_status(request):
    """Обновление статуса книги (AJAX)"""
    try:
        book_id = request.POST.get('book_id')
        status = request.POST.get('status')
        
        if not book_id or not status:
            return JsonResponse({'success': False, 'error': 'Недостаточно данных'}, status=400)
        
        book = get_object_or_404(Book, id=book_id)
        
        # Обновляем или создаем статус
        UserBookStatus.objects.update_or_create(
            user=request.user,
            book=book,
            defaults={'status': status}
        )
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
def profile(request):
    """Страница профиля пользователя"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    user_books = UserBookStatus.objects.filter(user=request.user)
    
    context = {
        'user_profile': user_profile,
        'user_books': user_books,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
        'reading_challenge': ReadingChallenge.objects.filter(is_active=True).first(),
    }
    return render(request, 'Exlib_app/profile.html', context)


@login_required
def bookmarks(request):
    """Страница закладок пользователя"""
    bookmarked_books = UserBookStatus.objects.filter(
        user=request.user, 
        status__in=['reading', 'planned']
    )
    
    context = {
        'bookmarked_books': bookmarked_books,
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/bookmarks.html', context)


def about(request):
    """Страница "О проекте" """
    context = {
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
    }
    return render(request, 'Exlib_app/about.html', context)