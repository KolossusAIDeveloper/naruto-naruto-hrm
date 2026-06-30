from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Announcement
from .serializers import AnnouncementSerializer
from activity_logs.utils import log_activity


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            return qs.filter(is_archived=True)
        elif archived == 'false' or not archived:
            return qs.filter(is_archived=False)
        return qs

    def perform_create(self, serializer):
        ann = serializer.save(created_by=self.request.user)
        log_activity('announcement_created', f"Announcement '{ann.title}' created",
                     user=self.request.user)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        ann = self.get_object()
        ann.is_archived = not ann.is_archived
        ann.save()
        return Response(AnnouncementSerializer(ann).data)
