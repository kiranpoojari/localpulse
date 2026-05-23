from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Vote
from apps.posts.models import Post


class VoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        # get the post
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # user cannot vote on their own post
        if post.author == request.user:
            return Response(
                {'error': 'You cannot vote on your own post'},
                status=status.HTTP_400_BAD_REQUEST
            )

        vote_type = request.data.get('vote_type')
        if vote_type not in ['real', 'fake']:
            return Response(
                {'error': 'vote_type must be real or fake'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # check if user already voted
        existing_vote = Vote.objects.filter(post=post, user=request.user).first()

        if existing_vote:
            # if same vote type — remove the vote (toggle off)
            if existing_vote.vote_type == vote_type:
                existing_vote.delete()
                self.check_disputed(post)
                return Response({'message': 'Vote removed'})
            else:
                # change vote type
                existing_vote.vote_type = vote_type
                existing_vote.save()
                self.check_disputed(post)
                return Response({'message': f'Vote changed to {vote_type}'})
        else:
            # create new vote
            Vote.objects.create(post=post, user=request.user, vote_type=vote_type)
            self.check_disputed(post)
            return Response(
                {'message': f'Voted {vote_type} successfully'},
                status=status.HTTP_201_CREATED
            )

    def check_disputed(self, post):
        real_count = post.votes.filter(vote_type='real').count()
        fake_count = post.votes.filter(vote_type='fake').count()

        if fake_count >= 3 and fake_count > real_count:
            post.is_disputed = True
        else:
            post.is_disputed = False
        post.save()


class VoteCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        real_count = post.votes.filter(vote_type='real').count()
        fake_count = post.votes.filter(vote_type='fake').count()

        # check if current user already voted
        user_vote = post.votes.filter(user=request.user).first()

        return Response({
            'post_id': pk,
            'real_count': real_count,
            'fake_count': fake_count,
            'is_disputed': post.is_disputed,
            'your_vote': user_vote.vote_type if user_vote else None
        })