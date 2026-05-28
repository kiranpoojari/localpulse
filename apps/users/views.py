from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import User, OTP
from .serializers import RegisterSerializer, UserProfileSerializer
from .utils import generate_otp, send_otp_email


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Registration successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                },
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=email, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'Logged out successfully'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.latitude = request.data.get('latitude', user.latitude)
        user.longitude = request.data.get('longitude', user.longitude)
        user.city = request.data.get('city', user.city)
        user.district = request.data.get('district', user.district)
        user.state = request.data.get('state', user.state)
        user.save()
        return Response({'message': 'Location updated successfully'})


class SaveFCMTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('fcm_token')
        if not token:
            return Response(
                {'error': 'FCM token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        request.user.fcm_token = token
        request.user.save()
        return Response({'message': 'FCM token saved successfully'})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'No account found with this email'},
                status=status.HTTP_404_NOT_FOUND
            )

        otp_code = generate_otp()
        OTP.objects.create(
            user=user,
            otp_code=otp_code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        send_otp_email(email, otp_code)
        return Response({'message': 'OTP sent to your email'}, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp_code')

        if not email or not otp_code:
            return Response(
                {'error': 'Email and OTP are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'No account found with this email'},
                status=status.HTTP_404_NOT_FOUND
            )

        otp = OTP.objects.filter(
            user=user, otp_code=otp_code, is_used=False
        ).last()

        if not otp:
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp.is_valid():
            return Response(
                {'error': 'OTP has expired. Please request a new one'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp.is_used = True
        otp.save()

        refresh = RefreshToken.for_user(user)
        temp_token = str(refresh.access_token)

        return Response({'message': 'OTP verified successfully', 'temp_token': temp_token})


class ResetPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_password = request.data.get('new_password')

        if not new_password:
            return Response(
                {'error': 'New password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password reset successfully'})


class PincodeLookupView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pincode):
        import urllib.request
        import json as json_lib
        import ssl

        try:
            url = f'https://api.postalpincode.in/pincode/{pincode}'
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
                data = json_lib.loads(resp.read().decode('utf-8'))

            if not data or data[0]['Status'] != 'Success':
                return Response({'error': 'Pincode not found'}, status=status.HTTP_404_NOT_FOUND)

            po = data[0]['PostOffice'][0]
            taluk = po.get('Block') or po.get('Taluk') or po.get('Division') or po.get('District') or ''

            return Response({
                'village': po.get('Name', ''),
                'taluk': taluk,
                'district': po.get('District', ''),
                'state': po.get('State', ''),
                'pincode': pincode
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReverseGeocodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        import urllib.request
        import json as json_lib
        from django.conf import settings

        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')

        if not lat or not lng:
            return Response(
                {'error': 'lat and lng are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            api_key = settings.GOOGLE_MAPS_API_KEY

            # request all result types for best accuracy
            url = (
                f'https://maps.googleapis.com/maps/api/geocode/json'
                f'?latlng={lat},{lng}&key={api_key}&language=en'
            )

            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json_lib.loads(resp.read().decode('utf-8'))

            if data['status'] != 'OK':
                return Response(
                    {'error': 'Location not found', 'google_status': data['status'], 'message': data.get('error_message', '')},
                    status=status.HTTP_404_NOT_FOUND
                )

            # scan all results for best village and taluk
            village = ''
            taluk = ''
            district = ''
            state = ''

            for result in data['results']:
                for comp in result['address_components']:
                    types = comp['types']

                    # village level
                    if not village and any(t in types for t in [
                        'sublocality_level_1', 'sublocality',
                        'neighborhood', 'locality'
                    ]):
                        village = comp['long_name']

                    # taluk level — administrative_area_level_3 is taluk in India
                    if not taluk and 'administrative_area_level_3' in types:
                        taluk = comp['long_name']

                    # district level
                    if not district and 'administrative_area_level_2' in types:
                        district = comp['long_name']

                    # state level
                    if not state and 'administrative_area_level_1' in types:
                        state = comp['long_name']

                if village and taluk and district and state:
                    break

            # fallback: if no taluk found use district
            if not taluk:
                taluk = district

            return Response({
                'village': village,
                'taluk': taluk,
                'district': district,
                'state': state,
                'lat': lat,
                'lng': lng
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)