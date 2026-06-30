from rest_framework.routers import DefaultRouter
from .views import LeaveViewSet, LeaveBalanceViewSet

router = DefaultRouter()
router.register('leaves', LeaveViewSet)
router.register('leave-balances', LeaveBalanceViewSet)
urlpatterns = router.urls
