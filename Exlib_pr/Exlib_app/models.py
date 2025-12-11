from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify

class Genre(models.Model):
    """Модель жанра"""
    name = models.CharField(max_length=100, verbose_name="Название жанра")
    slug = models.SlugField(unique=True, blank=True)
    
    class Meta:
        verbose_name = "Жанр"
        verbose_name_plural = "Жанры"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name

class Author(models.Model):
    """Модель автора"""
    name = models.CharField(max_length=200, verbose_name="Имя автора")
    bio = models.TextField(blank=True, verbose_name="Биография")
    slug = models.SlugField(unique=True, blank=True)
    
    class Meta:
        verbose_name = "Автор"
        verbose_name_plural = "Авторы"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name

class MarqueeMessage(models.Model):
    """Модель для бегущей строки"""
    text = models.CharField(max_length=200, verbose_name="Текст сообщения")
    is_active = models.BooleanField(default=True, verbose_name="Активно")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Сообщение бегущей строки"
        verbose_name_plural = "Сообщения бегущей строки"
        ordering = ['order']
    
    def __str__(self):
        return self.text[:50]

class Book(models.Model):
    """Модель книги"""
    # Сначала оставим старое поле как резервное
    old_genre = models.CharField(max_length=50, blank=True, null=True, verbose_name="Старый жанр (временное)")
    
    title = models.CharField(max_length=200, verbose_name="Название")
    author = models.ForeignKey(Author, on_delete=models.CASCADE, verbose_name="Автор")
    description = models.TextField(verbose_name="Описание")
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Жанр")
    cover_image = models.ImageField(
        upload_to='book_covers/', 
        verbose_name="Обложка",
        help_text="Рекомендуемый размер: 600x900px"
    )
    match_percentage = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        verbose_name="Процент совпадения"
    )
    is_new = models.BooleanField(default=False, verbose_name="Новая")
    slug = models.SlugField(unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Книга"
        verbose_name_plural = "Книги"
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.title} - {self.author.name}"

class Audiobook(models.Model):
    """Модель аудиокниги"""
    title = models.CharField(max_length=200, verbose_name="Название")
    author = models.ForeignKey(Author, on_delete=models.CASCADE, verbose_name="Автор")
    duration = models.DurationField(verbose_name="Длительность")
    cover_image = models.ImageField(upload_to='audiobook_covers/', verbose_name="Обложка")
    is_featured = models.BooleanField(default=False, verbose_name="Рекомендуемая")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")  # Добавьте это поле
    slug = models.SlugField(unique=True, blank=True)
    
    class Meta:
        verbose_name = "Аудиокнига"
        verbose_name_plural = "Аудиокниги"
        ordering = ['order']  # И добавьте ordering если нужно
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
    
    def duration_display(self):
        if self.duration:
            total_seconds = int(self.duration.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return "00:00:00"
    
    def __str__(self):
        return self.title

class ForumGroup(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название группы")
    description = models.TextField(verbose_name="Описание")
    members_count = models.PositiveIntegerField(default=0, verbose_name="Количество участников")
    icon_class = models.CharField(max_length=50, verbose_name="Класс иконки")
    color_class = models.CharField(max_length=50, default="bg-white", verbose_name="Класс цвета")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    
    class Meta:
        verbose_name = "Группа форума"
        verbose_name_plural = "Группы форума"
        ordering = ['order']
    
    def __str__(self):
        return self.name

class ForumPost(models.Model):
    CATEGORY_CHOICES = [
        ('review', 'Рецензия'),
        ('discussion', 'Обсуждение'),
        ('question', 'Вопрос'),
        ('news', 'Новость'),
    ]
    
    title = models.CharField(max_length=200, verbose_name="Заголовок")
    content = models.TextField(verbose_name="Содержание")
    author = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Автор")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name="Категория")
    forum_group = models.ForeignKey(ForumGroup, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Группа")
    likes = models.PositiveIntegerField(default=0, verbose_name="Лайки")
    views = models.PositiveIntegerField(default=0, verbose_name="Просмотры")
    is_pinned = models.BooleanField(default=False, verbose_name="Закреплено")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Пост форума"
        verbose_name_plural = "Посты форума"
        ordering = ['-is_pinned', '-created_at']
    
    def __str__(self):
        return self.title

class ReadingChallenge(models.Model):
    year = models.PositiveIntegerField(verbose_name="Год")
    goal = models.PositiveIntegerField(verbose_name="Цель (книг)")
    current = models.PositiveIntegerField(default=0, verbose_name="Текущий прогресс")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    
    class Meta:
        verbose_name = "Книжный марафон"
        verbose_name_plural = "Книжные марафоны"
    
    def __str__(self):
        return f"Марафон {self.year}"
    
    def progress_percentage(self):
        if self.goal == 0:
            return 0
        return int((self.current / self.goal) * 100)

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    reading_challenge = models.ForeignKey(ReadingChallenge, on_delete=models.SET_NULL, null=True, blank=True)
    karma = models.IntegerField(default=0)
    
    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"
    
    def __str__(self):
        return self.user.username

class UserBookStatus(models.Model):
    STATUS_CHOICES = [
        ('reading', 'Читаю'),
        ('planned', 'В планах'),
        ('read', 'Прочитано'),
        ('abandoned', 'Брошено'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'book']
        verbose_name = "Статус книги пользователя"
        verbose_name_plural = "Статусы книг пользователей"
    
    def __str__(self):
        return f"{self.user.username} - {self.book.title} ({self.status})"

class RecommendationQuiz(models.Model):
    question = models.TextField(verbose_name="Вопрос")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    
    class Meta:
        verbose_name = "Вопрос теста"
        verbose_name_plural = "Вопросы теста"
        ordering = ['order']
    
    def __str__(self):
        return self.question[:50]

class QuizOption(models.Model):
    quiz = models.ForeignKey(RecommendationQuiz, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=200, verbose_name="Текст ответа")
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = "Вариант ответа"
        verbose_name_plural = "Варианты ответов"
    
    def __str__(self):
        return f"{self.quiz.question[:30]} - {self.text}"