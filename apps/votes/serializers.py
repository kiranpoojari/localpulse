from rest_framework import serializers
from .models import Vote


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['id', 'post', 'user', 'vote_type', 'created_at']
        read_only_fields = ['id', 'post', 'user', 'created_at']