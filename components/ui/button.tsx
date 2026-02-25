import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "default" | "secondary" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({ className, variant = "default", loading = false, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn("ui-button", `ui-button--${variant}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner className="spinner--inline" /> : null}
      <span>{children}</span>
    </button>
  );
}
