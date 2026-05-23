from django.db import models
from apps.users.models import User
from apps.posts.models import Post


class Vote(models.Model):

    VOTE_CHOICES = [
        ('real', 'Real'),
        ('fake', 'Fake'),
    ]

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes')
    vote_type = models.CharField(max_length=10, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')  # one vote per user per post

    def __str__(self):
        return f"{self.user.username} — {self.vote_type} — Post {self.post.id}"