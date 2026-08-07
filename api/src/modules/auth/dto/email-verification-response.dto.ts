export class RegisterPendingVerificationDto {
  email: string;
  message: string;
  requiresEmailVerification: true;
}

export class EmailVerificationSuccessDto {
  message: string;
}
