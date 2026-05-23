from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/user/', include('apps.users.urls')),
    path('api/posts/', include('apps.posts.urls')),
    path('api/posts/', include('apps.votes.urls')),
]

# serve media files in development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)