from django.urls import path
from .views import VoteView, VoteCountView

urlpatterns = [
    path('<int:pk>/vote/', VoteView.as_view(), name='vote'),
    path('<int:pk>/votes/', VoteCountView.as_view(), name='vote_count'),
]