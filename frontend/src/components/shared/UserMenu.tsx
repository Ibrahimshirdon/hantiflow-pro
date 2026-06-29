import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { ROLE_ACCOUNT_SETTINGS_ROUTE } from "@/types/auth.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({ className, children }: { className?: string; children?: ReactNode }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  if (!profile) return null;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg text-start transition-colors hover:bg-muted",
          children ? "p-2" : "p-1.5",
          className,
        )}
      >
        <Avatar className="size-9 shrink-0">
          <AvatarImage src={profile.photoURL} />
          <AvatarFallback>{initials(profile.displayName)}</AvatarFallback>
        </Avatar>
        {children}
        {children && <ChevronsUpDown className="ms-auto size-4 shrink-0 opacity-50" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-medium">{profile.displayName}</span>
          <span className="text-xs text-muted-foreground">{profile.email}</span>
          <Badge variant="secondary" className="mt-1 w-fit capitalize">
            {t(`roles.${profile.role}`)}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(ROLE_ACCOUNT_SETTINGS_ROUTE[profile.role])}>
          <User /> {t("userMenu.accountSettings")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut /> {t("userMenu.logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
