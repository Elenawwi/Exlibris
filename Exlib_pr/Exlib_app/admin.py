from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MarqueeMessage, Book, Audiobook, ForumGroup, 
    ForumPost, ReadingChallenge, UserProfile, 
    UserBookStatus, RecommendationQuiz, QuizOption
)

@admin.register(MarqueeMessage)
class MarqueeMessageAdmin(admin.ModelAdmin):
    list_display = ['text', 'is_active', 'order', 'created_at']
    list_editable = ['is_active', 'order']
    list_filter = ['is_active']
    search_fields = ['text']

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'genre', 'match_percentage', 'is_new', 'created_at']
    list_filter = ['genre', 'is_new', 'created_at']
    search_fields = ['title', 'author']
    prepopulated_fields = {'slug': ('title',)}
    
    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html('<img src="{}" width="100" />', obj.cover_image.url)
        return "-"
    cover_preview.short_description = "Превью обложки"

@admin.register(Audiobook)
class AudiobookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'duration_display', 'is_featured', 'order']
    list_editable = ['is_featured', 'order']
    list_filter = ['is_featured']
    search_fields = ['title', 'author']
    prepopulated_fields = {'slug': ('title',)}
    
    def duration_display(self, obj):
        return obj.duration_display()
    duration_display.short_description = "Длительность"

@admin.register(ForumGroup)
class ForumGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'members_count', 'order', 'icon_class']
    list_editable = ['members_count', 'order']
    search_fields = ['name']

@admin.register(ForumPost)
class ForumPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'forum_group', 'likes', 'views', 'is_pinned', 'created_at']
    list_filter = ['category', 'is_pinned', 'created_at', 'forum_group']
    search_fields = ['title', 'content', 'author__username']
    list_editable = ['is_pinned']
    raw_id_fields = ['author']

@admin.register(ReadingChallenge)
class ReadingChallengeAdmin(admin.ModelAdmin):
    list_display = ['year', 'goal', 'current', 'progress_percentage', 'is_active']
    list_editable = ['goal', 'current', 'is_active']

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'karma', 'reading_challenge']
    search_fields = ['user__username']
    raw_id_fields = ['user']

@admin.register(UserBookStatus)
class UserBookStatusAdmin(admin.ModelAdmin):
    list_display = ['user', 'book', 'status', 'added_at']
    list_filter = ['status', 'added_at']
    search_fields = ['user__username', 'book__title']
    raw_id_fields = ['user', 'book']

class QuizOptionInline(admin.TabularInline):
    model = QuizOption
    extra = 1

@admin.register(RecommendationQuiz)
class RecommendationQuizAdmin(admin.ModelAdmin):
    list_display = ['question', 'order']
    list_editable = ['order']
    inlines = [QuizOptionInline]
    ordering = ['order']