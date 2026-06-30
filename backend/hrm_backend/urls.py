from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from employees.views import CustomTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('employees.urls')),
    path('api/', include('departments.urls')),
    path('api/', include('leaves.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('payroll.urls')),
    path('api/', include('announcements.urls')),
    path('api/', include('activity_logs.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
