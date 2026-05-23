from rest_framework import serializers
from .models import Post
from apps.users.serializers import UserProfileSerializer


class PostSerializer(serializers.ModelSerializer):
    author = UserProfileSerializer(read_only=True)
    real_count = serializers.SerializerMethodField()
    fake_count = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'post_type', 'content', 'image',
            'severity', 'latitude', 'longitude',
            'city', 'district', 'state',
            'is_disputed', 'expires_at', 'created_at',
            'real_count', 'fake_count', 'is_expired'
        ]
        read_only_fields = ['id', 'author', 'is_disputed', 'expires_at', 'created_at']

    def get_real_count(self, obj):
        return obj.votes.filter(vote_type='real').count()

    def get_fake_count(self, obj):
        return obj.votes.filter(vote_type='fake').count()

    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.expires_at < timezone.now()


class CreatePostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = [
            'post_type', 'content', 'image',
            'severity', 'latitude', 'longitude',
            'city', 'district', 'state'
        ]

    def validate(self, data):
        post_type = data.get('post_type')
        content = data.get('content', '')
        image = data.get('image')

        if post_type == 'text' and not content:
            raise serializers.ValidationError('Content is required for text posts')
        if post_type == 'photo' and not image:
            raise serializers.ValidationError('Image is required for photo posts')
        if post_type == 'both' and not content and not image:
            raise serializers.ValidationError('Content and image required for both type')
        return data