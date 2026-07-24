'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { buttonClassNames } from './button-styles';
import type { ButtonVariant, ButtonSize } from './button-styles';

export type { ButtonVariant, ButtonSize };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', className, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonClassNames(variant, size, className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
