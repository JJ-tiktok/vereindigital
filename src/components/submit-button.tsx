"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  formAction,
  formNoValidate,
  disabled,
  onClick,
  name,
  value,
  title,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className: string;
  formAction?: (formData: FormData) => void;
  formNoValidate?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  name?: string;
  value?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={disabled || pending}
      formAction={formAction}
      formNoValidate={formNoValidate}
      name={name}
      onClick={onClick}
      title={title}
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
