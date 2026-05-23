from django.urls import path
from .views import CreatePostView, FeedView, PostDetailView, DeletePostView

urlpatterns = [
    path('create/', CreatePostView.as_view(), name='create_post'),
    path('feed/', FeedView.as_view(), name='feed'),
    path('<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    path('<int:pk>/delete/', DeletePostView.as_view(), name='delete_post'),
]