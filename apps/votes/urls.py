from django.urls import path
from .views import VoteView, VoteCountView
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    ProfileView,
    UpdateLocationView,
    SaveFCMTokenView,
    ForgotPasswordView,
    VerifyOTPView,
    ResetPasswordView,
)

urlpatterns = [
    path('<int:pk>/vote/', VoteView.as_view(), name='vote'),
    path('<int:pk>/votes/', VoteCountView.as_view(), name='vote_count'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
]