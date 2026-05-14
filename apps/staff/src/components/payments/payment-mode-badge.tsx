import { Badge } from "@grwfit/ui";
import { Smartphone, Banknote, CreditCard, Building2, Zap } from "lucide-react";

type PaymentMode = "upi" | "cash" | "card" | "bank_transfer" | "razorpay";

const MODE_CONFIG: Record<PaymentMode, { label: string; icon: typeof Smartphone; variant: "default" | "secondary" | "success" | "outline" }> = {
  upi:          { label: "UPI",          icon: Smartphone,  variant: "default"   },
  cash:         { label: "Cash",         icon: Banknote,    variant: "success"   },
  card:         { label: "Card",         icon: CreditCard,  variant: "secondary" },
  bank_transfer:{ label: "Bank",         icon: Building2,   variant: "outline"   },
  razorpay:     { label: "Razorpay",     icon: Zap,         variant: "default"   },
};

export function PaymentModeBadge({ mode }: { mode: PaymentMode }) {
  const config = MODE_CONFIG[mode] ?? { label: mode, icon: Banknote, variant: "outline" as const };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
