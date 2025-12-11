from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.db.models import Q
import json

from .models import (
    MarqueeMessage, Book, Audiobook, ForumGroup, 
    ForumPost, ReadingChallenge, UserBookStatus,
    RecommendationQuiz, QuizOption, UserProfile,
    Genre, Author
)

def get_common_context():
    """Функция для получения общего контекста"""
    return {
        'marquee_messages': MarqueeMessage.objects.filter(is_active=True).order_by('order'),
        'genres': Genre.objects.all(),
        'authors': Author.objects.all(),
    }

def index(request):
    context = get_common_context()
    context.update({
        'books': Book.objects.all().order_by('-created_at')[:4],
        'audiobooks': Audiobook.objects.filter(is_featured=True)[:3],
        'forum_groups': ForumGroup.objects.all().order_by('order')[:4],
        'reading_challenge': ReadingChallenge.objects.filter(is_active=True).first(),
        'forum_posts': ForumPost.objects.filter(is_pinned=True).order_by('-created_at')[:5],
    })
    
    if request.user.is_authenticated:
        context['user_book_statuses'] = UserBookStatus.objects.filter(user=request.user)
    
    return render(request, 'Exlib_app/index.html', context)

def book_list(request):
    context = get_common_context()
    
    books = Book.objects.all()
    
    # Поиск
    search = request.GET.get('search', '')
    if search:
        books = books.filter(
            Q(title__icontains=search) |
            Q(author__name__icontains=search) |
            Q(description__icontains=search)
        )
    
    # Фильтрация по жанру
    genre_id = request.GET.get('genre')
    if genre_id:
        books = books.filter(genre_id=genre_id)
    
    # Фильтрация по автору
    author_id = request.GET.get('author')
    if author_id:
        books = books.filter(author_id=author_id)
    
    # Сортировка
    sort = request.GET.get('sort', '-created_at')
    if sort in ['title', '-title', 'created_at', '-created_at', 'match_percentage', '-match_percentage']:
        books = books.order_by(sort)
    
    context.update({
        'books': books,
        'search_query': search,
        'selected_genre': genre_id,
        'selected_author': author_id,
        'sort_by': sort,
    })
    
    return render(request, 'Exlib_app/book_list.html', context)

def book_detail(request, slug):
    book = get_object_or_404(Book, slug=slug)
    context = get_common_context()
    context.update({
        'book': book,
        'similar_books': Book.objects.filter(genre=book.genre).exclude(id=book.id)[:3],
    })
    
    if request.user.is_authenticated:
        try:
            context['user_status'] = UserBookStatus.objects.get(user=request.user, book=book)
        except UserBookStatus.DoesNotExist:
            pass
    
    return render(request, 'Exlib_app/book_detail.html', context)

def audiobook_list(request):
    context = get_common_context()
    context.update({
        'audiobooks': Audiobook.objects.all(),
    })
    return render(request, 'Exlib_app/audiobook_list.html', context)

def audiobook_detail(request, slug):
    audiobook = get_object_or_404(Audiobook, slug=slug)
    context = get_common_context()
    context.update({
        'audiobook': audiobook,
    })
    return render(request, 'Exlib_app/audiobook_detail.html', context)

def forum(request):
    context = get_common_context()
    context.update({
        'posts': ForumPost.objects.all().order_by('-created_at')[:20],
        'groups': ForumGroup.objects.all(),
        'reading_challenge': ReadingChallenge.objects.filter(is_active=True).first(),
    })
    return render(request, 'Exlib_app/forum.html', context)

def forum_post_detail(request, post_id):
    post = get_object_or_404(ForumPost, id=post_id)
    post.views += 1
    post.save()
    
    context = get_common_context()
    context.update({
        'post': post,
    })
    return render(request, 'Exlib_app/forum_post_detail.html', context)

@login_required
def create_forum_post(request):
    context = get_common_context()
    
    if request.method == 'POST':
        title = request.POST.get('title')
        content = request.POST.get('content')
        category = request.POST.get('category')
        
        post = ForumPost.objects.create(
            title=title,
            content=content,
            author=request.user,
            category=category,
        )
        messages.success(request, 'Пост успешно создан!')
        return redirect('forum_post_detail', post_id=post.id)
    
    context.update({
        'groups': ForumGroup.objects.all(),
    })
    return render(request, 'Exlib_app/create_forum_post.html', context)

def recommendation_quiz(request):
    """Страница теста рекомендаций"""
    context = get_common_context()
    
    questions = RecommendationQuiz.objects.all().order_by('order')
    
    context.update({
        'questions': questions,
    })
    return render(request, 'Exlib_app/recommendation_quiz.html', context)


@require_POST
def submit_quiz(request):
    """Обработка результатов теста"""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Требуется авторизация'})
    
    try:
        data = json.loads(request.body)
        answers = data.get('answers', [])
        
        # Собираем выбранные жанры
        selected_genres = []
        for answer in answers:
            try:
                option = QuizOption.objects.get(id=answer['option_id'])
                if option.genre:
                    selected_genres.append(option.genre.id)
            except:
                continue
        
        # Если выбраны жанры - фильтруем по ним, иначе случайные
        if selected_genres:
            books = Book.objects.filter(genre_id__in=selected_genres)
        else:
            books = Book.objects.all()
        
        # Берем 4 книги
        recommended_books = books.order_by('?')[:4]
        
        books_data = []
        for book in recommended_books:
            books_data.append({
                'id': book.id,
                'title': book.title,
                'author': book.author.name,
                'cover_url': book.cover_image.url if book.cover_image else '',
                'match_percentage': book.match_percentage,
                'slug': book.slug,
            })
        
        return JsonResponse({'success': True, 'books': books_data})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
@login_required
@require_POST
def update_book_status(request):
    try:
        book_id = request.POST.get('book_id')
        status = request.POST.get('status')
        
        if not book_id or not status:
            return JsonResponse({'success': False, 'error': 'Недостаточно данных'})
        
        book = get_object_or_404(Book, id=book_id)
        
        UserBookStatus.objects.update_or_create(
            user=request.user,
            book=book,
            defaults={'status': status}
        )
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def profile(request):
    context = get_common_context()
    user_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    user_books = UserBookStatus.objects.filter(user=request.user)
    
    context.update({
        'user_profile': user_profile,
        'user_books': user_books,
        'reading_challenge': ReadingChallenge.objects.filter(is_active=True).first(),
    })
    return render(request, 'Exlib_app/profile.html', context)

@login_required
def bookmarks(request):
    context = get_common_context()
    status_filter = request.GET.get('status', 'all')
    
    if status_filter == 'all':
        books = UserBookStatus.objects.filter(user=request.user)
    else:
        books = UserBookStatus.objects.filter(user=request.user, status=status_filter)
    
    context.update({
        'bookmarked_books': books,
        'status_filter': status_filter,
    })
    return render(request, 'Exlib_app/bookmarks.html', context)

def about(request):
    context = get_common_context()
    return render(request, 'Exlib_app/about.html', context)