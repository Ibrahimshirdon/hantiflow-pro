import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { ROLE_ACCOUNT_SETTINGS_ROUTE } from "@/types/auth.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!profile) return null;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <>
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

        <DropdownMenuContent align="end" className="w-64">
          {/* Profile header — clicking avatar opens full photo */}
          <div className="flex flex-col items-center gap-3 px-3 py-4">
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              title={t("userMenu.viewPhoto")}
            >
              <Avatar className="size-20">
                <AvatarImage src={profile.photoURL} />
                <AvatarFallback className="text-2xl">{initials(profile.displayName)}</AvatarFallback>
              </Avatar>
              {/* hover overlay */}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <User className="size-6 text-white" />
              </span>
            </button>
            <div className="text-center">
              <p className="font-semibold">{profile.displayName}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
              <Badge variant="secondary" className="mt-2 capitalize">
                {t(`roles.${profile.role}`)}
              </Badge>
            </div>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(ROLE_ACCOUNT_SETTINGS_ROUTE[profile.role])}>
            <User /> {t("userMenu.accountSettings")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut /> {t("userMenu.logOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Full-size photo dialog */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="flex flex-col items-center gap-5 p-8 sm:max-w-xs">
          <DialogTitle className="sr-only">{profile.displayName}</DialogTitle>
          <Avatar className="size-48 ring-4 ring-border ring-offset-4 ring-offset-background">
            <AvatarImage src={profile.photoURL} className="object-cover" />
            <AvatarFallback className="text-6xl font-semibold">
              {initials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-xl font-bold">{profile.displayName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{profile.email}</p>
            <Badge variant="secondary" className="mt-3 capitalize">
              {t(`roles.${profile.role}`)}
            </Badge>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
