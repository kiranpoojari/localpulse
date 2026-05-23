import random
from django.core.mail import send_mail
from django.conf import settings


def generate_otp():
    # generates a random 6 digit number
    return str(random.randint(100000, 999999))


def send_otp_email(email, otp_code):
    subject = 'LocalPulse — Your OTP for Password Reset'
    message = f'''
Hi,

Your OTP for resetting your LocalPulse password is:

{otp_code}

This OTP is valid for 10 minutes only.
Do not share this with anyone.

— LocalPulse Team
'''
    send_mail(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        [email],
        fail_silently=False,
    )