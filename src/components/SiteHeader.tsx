// src/components/SiteHeader.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DoorOpen,
  Clock,
  Search,
  Grid3x3,
  BadgeInfo,
  LogIn,
  UserRound,
  LogOut,
  Settings2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { KeyboardKeys, AriaAnnouncer } from "@/lib/accessibility";
import { qurovaFont } from "@/lib/fonts";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// --- Navigation Items ---
const navItems = [
  { name: "Available Now", href: "/available-now", icon: DoorOpen },
  { name: "Available Soon", href: "/available-soon", icon: Clock },
  { name: "Check Availability", href: "/check", icon: Search },
  { name: "Graph", href: "/graph", icon: Grid3x3 },
  { name: "Custom Graph", href: "/custom-graph", icon: Settings2 },
  { name: "Room Details", href: "/rooms", icon: BadgeInfo },
];
type NavItemType = (typeof navItems)[0];

// --- NavLink Component ---
const NavLink = React.forwardRef<
  React.ElementRef<"li">,
  Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "children"> & {
    item: NavItemType;
    isMobile?: boolean;
    isDesktop?: boolean;
    currentPath: string;
    isHovered: boolean;
    onHoverStart: () => void;
    onHoverEnd: () => void;
    onClick?: () => void;
  }
>(
  (
    {
      className,
      item,
      isMobile,
      isDesktop,
      currentPath,
      isHovered,
      onHoverStart,
      onHoverEnd,
      onClick,
    },
    ref,
  ) => {
    const isActuallyActive = item.href === currentPath;
    const labelTransition = { duration: 0.2, ease: "easeInOut" };

    if (isMobile) {
      return (
        <li ref={ref}>
          <Link
            href={item.href}
            className={
              "flex items-center gap-3 w-full p-3 rounded-md transition-colors duration-200 ease-in-out " +
              (isActuallyActive
                ? "text-purple-500 font-semibold bg-white/5"
                : "text-white/80 hover:text-white hover:bg-white/10 ") +
              (className ?? "")
            }
            onClick={onClick}
            aria-current={isActuallyActive ? "page" : undefined}
          >
            {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
            <span className="flex-grow text-base">{item.name}</span>
          </Link>
        </li>
      );
    }

    if (isDesktop) {
      const showActiveState = isHovered || isActuallyActive;
      const textColorClass = isHovered
        ? "text-white"
        : isActuallyActive
          ? "text-white/90"
          : "text-white/70";

      return (
        <motion.li
          ref={ref}
          onHoverStart={onHoverStart}
          onHoverEnd={onHoverEnd}
          className="flex"
        >
          <Link
            href={item.href}
            aria-current={isActuallyActive ? "page" : undefined}
            className={
              `relative flex items-center justify-center rounded-full transition-colors duration-200 ease-in-out overflow-hidden ` +
              (showActiveState
                ? `bg-white/10 px-3 py-1.5 `
                : `p-2 hover:hover:bg-white/10 `) +
              textColorClass +
              (className ?? "")
            }
          >
            {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
            <AnimatePresence>
              {showActiveState && (
                <motion.span
                  key="label"
                  initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                  animate={{
                    width: "auto",
                    opacity: 1,
                    marginLeft: "0.375rem",
                  }}
                  exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                  transition={labelTransition}
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ lineHeight: "normal" }}
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.li>
      );
    }
    return <li ref={ref}></li>;
  },
);
NavLink.displayName = "NavLink";

// --- Header Component Props Interface ---
interface SiteHeaderProps {
  maintenanceMode?: boolean;
}

// --- Header Component ---
export default function SiteHeader({
  maintenanceMode = false,
}: SiteHeaderProps) {
  // --- State Variables ---
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [isAuthHovered, setIsAuthHovered] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  // --- Supabase Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const supabase = getSupabaseBrowserClient();

  // --- Effects ---
  useEffect(() => {
    setIsMounted(true);
    let isSubscribed = true;
    const fetchUserAndListen = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isSubscribed) {
          setUser(user ?? null);
          setLoadingAuth(false);
        }
      } catch (error) {
        console.error("Error fetching initial user:", error);
        if (isSubscribed) setLoadingAuth(false);
      }
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          if (isSubscribed) {
            console.log("Auth state changed:", _event);
            setUser(session?.user ?? null);
            setLoadingAuth(false);
            if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
              setIsMenuOpen(false);
            }
          }
        },
      );
      return () => {
        authListener?.subscription.unsubscribe();
      };
    };

    let unsubscribeListener: (() => void) | undefined;
    fetchUserAndListen()
      .then((cleanup) => {
        unsubscribeListener = cleanup;
      })
      .catch((error) => {
        console.error("Error setting up auth listener:", error);
        if (isSubscribed) setLoadingAuth(false);
      });

    return () => {
      isSubscribed = false;
      unsubscribeListener?.();
    };
  }, [supabase]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [currentPath]);

  // --- Handlers ---
  const handleSignOut = async () => {
    setIsMenuOpen(false);
    setLoadingAuth(true);
    try {
      // Sign out from Supabase (removes auth cookies and clears session)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        setLoadingAuth(false);
        return;
      }

      console.log("Signed out successfully");

      // Clear all local storage and session storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn("Could not clear storage:", storageError);
      }

      // Clear all cookies manually as a safeguard
      try {
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.split("=")[0].trim();
          // Clear the cookie by setting it to expire in the past
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        });
      } catch (cookieError) {
        console.warn("Could not clear cookies:", cookieError);
      }

      // Force a hard redirect to clear all cached state and trigger middleware check
      window.location.href = "/";
    } catch (error) {
      console.error("Exception during sign out:", error);
      setLoadingAuth(false);
    }
  };

  // --- Constants ---
  const menuToggleTransition = { duration: 0.2 };
  const mobilePanelTransition = { duration: 0.2, ease: "easeOut" };
  const mobileBackdropTransition = { duration: 0.2, ease: "linear" };
  const authLabelTransition = { duration: 0.2, ease: "easeInOut" };
  const userDisplayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // --- Component Return ---
  return (
    <>
      {/* --- Header Element --- */}
      <header
        className={
          "fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-4 sm:px-6 md:px-8 bg-black/5 backdrop-blur-lg border-b border-white/10"
        }
        role="banner"
        aria-label="Main navigation"
      >
        {/* Left side: Brand (Always Visible) */}
        <div className="flex-shrink-0 z-10 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-semibold transition-opacity hover:opacity-80"
            onClick={(e) => {
              if (maintenanceMode && currentPath !== "/maintenance") {
                e.preventDefault();
                router.push("/maintenance");
              }
            }}
          >
            <DoorOpen className="h-6 w-6 text-purple-500" />
            <span className={`sm:inline text-xl mt-1 ${qurovaFont.className}`}>
              vacansee-au
            </span>
          </Link>
        </div>

        {/* Right side: Conditional rendering based on maintenanceMode */}
        {!maintenanceMode && isMounted && (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex"
              role="navigation"
              aria-label="Main navigation"
            >
              <ul className="flex items-center gap-x-1" role="menubar">
                {navItems.map((navItem) => (
                  <NavLink
                    key={navItem.href}
                    item={navItem}
                    isDesktop={true}
                    currentPath={currentPath}
                    isHovered={hoveredHref === navItem.href}
                    onHoverStart={() => setHoveredHref(navItem.href)}
                    onHoverEnd={() => setHoveredHref(null)}
                  />
                ))}
              </ul>
            </nav>

            {/* Auth Status - DESKTOP */}
            <div className="hidden md:flex items-center ml-2 h-10">
              <AnimatePresence mode="wait" initial={false}>
                {loadingAuth ? (
                  <motion.div
                    key="auth-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-8 h-8 flex items-center justify-center"
                  >
                    <LoadingSpinner size="small" />
                  </motion.div>
                ) : user ? (
                  <motion.div
                    key="profile-container-desktop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center"
                    onHoverStart={() => setIsAuthHovered(true)}
                    onHoverEnd={() => setIsAuthHovered(false)}
                  >
                    <Link
                      href="/profile"
                      className={
                        `relative flex items-center justify-center rounded-full transition-colors duration-200 ease-in-out overflow-hidden ` +
                        (isAuthHovered || currentPath === "/profile"
                          ? `bg-white/10 px-3 py-1.5 `
                          : `p-2 hover:hover:bg-white/10 `) +
                        (isAuthHovered || currentPath === "/profile"
                          ? "text-white"
                          : "text-white/80")
                      }
                      aria-label="Profile"
                    >
                      <span className="flex items-center justify-center">
                        {user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture ? (
                          <Image
                            src={
                              user.user_metadata?.avatar_url ||
                              user.user_metadata?.picture
                            }
                            alt="Profile"
                            width={20}
                            height={20}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <UserRound className="h-5 w-5 flex-shrink-0" />
                        )}
                        <AnimatePresence>
                          {(isAuthHovered || currentPath === "/profile") && (
                            <motion.span
                              key="profile-label"
                              initial={{
                                width: 0,
                                opacity: 0,
                                marginLeft: 0,
                              }}
                              animate={{
                                width: "auto",
                                opacity: 1,
                                marginLeft: "0.375rem",
                              }}
                              exit={{
                                width: 0,
                                opacity: 0,
                                marginLeft: 0,
                              }}
                              transition={authLabelTransition}
                              className="text-sm font-medium whitespace-nowrap"
                              style={{ lineHeight: "normal" }}
                            >
                              Profile
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signin-button-desktop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onHoverStart={() => setIsAuthHovered(true)}
                    onHoverEnd={() => setIsAuthHovered(false)}
                    className="flex"
                  >
                    <Link
                      href="/auth/login"
                      className={
                        `relative flex items-center justify-center rounded-full transition-colors duration-200 ease-in-out overflow-hidden ` +
                        (isAuthHovered
                          ? `bg-white/10 px-3 py-1.5 `
                          : `p-2 hover:hover:bg-white/10 `) +
                        (isAuthHovered ? "text-white" : "text-white/70")
                      }
                    >
                      <LogIn className="h-5 w-5 flex-shrink-0" />
                      <AnimatePresence>
                        {isAuthHovered && (
                          <motion.span
                            key="auth-label"
                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                            animate={{
                              width: "auto",
                              opacity: 1,
                              marginLeft: "0.375rem",
                            }}
                            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                            transition={authLabelTransition}
                            className="text-sm font-medium whitespace-nowrap"
                            style={{ lineHeight: "normal" }}
                          >
                            Sign In
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Trigger */}
            <div className="flex md:hidden ml-1">
              <motion.button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                onKeyDown={(e) => {
                  if (
                    e.key === KeyboardKeys.ENTER ||
                    e.key === KeyboardKeys.SPACE
                  ) {
                    e.preventDefault();
                    setIsMenuOpen(!isMenuOpen);
                    AriaAnnouncer.getInstance().announce(
                      isMenuOpen ? "Menu closed" : "Menu opened",
                    );
                  }
                }}
                className="relative z-[65] flex flex-col justify-center items-center gap-[7px] p-2 rounded-full transition-colors"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  className="w-5 h-px bg-white block rounded-full"
                  animate={
                    isMenuOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }
                  }
                  transition={menuToggleTransition}
                />
                <motion.span
                  className="w-5 h-px bg-white block rounded-full"
                  animate={
                    isMenuOpen ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }
                  }
                  transition={menuToggleTransition}
                />
              </motion.button>
            </div>
          </div>
        )}
        {/* Placeholder if not mounted AND not in maintenance mode */}
        {!maintenanceMode && !isMounted && (
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:block w-48 h-8 bg-white/5 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse md:hidden"></div>
          </div>
        )}
      </header>

      {/* --- MODIFIED: Conditionally render mobile menu panel and backdrop --- */}
      {!maintenanceMode && (
        <>
          <AnimatePresence>
            {isMounted && isMenuOpen && (
              <motion.div
                key="mobile-backdrop"
                className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={mobileBackdropTransition}
                onClick={() => setIsMenuOpen(false)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isMounted && isMenuOpen && (
              <motion.div
                key="mobile-menu-panel"
                id="mobile-menu"
                role="menu"
                aria-label="Mobile navigation menu"
                className={
                  "fixed inset-x-4 top-20 z-50 md:hidden bg-gradient-to-br from-black/80 to-black/90 backdrop-blur-xl border border-white/15 shadow-xl rounded-lg overflow-hidden"
                }
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={mobilePanelTransition}
              >
                <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-4 flex flex-col">
                  <nav>
                    <ul className="flex flex-col gap-2">
                      {navItems.map((navItem) => (
                        <NavLink
                          key={navItem.href}
                          item={navItem}
                          isMobile={true}
                          currentPath={currentPath}
                          isHovered={false} // Not applicable for mobile list items
                          onHoverStart={() => {}} // Not applicable
                          onHoverEnd={() => {}} // Not applicable
                          onClick={() => setIsMenuOpen(false)}
                        />
                      ))}
                    </ul>
                  </nav>
                  <Separator className="bg-white/20 my-3" />
                  <div className="mt-auto">
                    {loadingAuth ? (
                      <div className="flex justify-center items-center p-3 h-[76px]">
                        <LoadingSpinner size="small" />
                      </div>
                    ) : user ? (
                      <div>
                        <Link
                          href="/profile"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 w-full p-3 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 ease-in-out mb-2"
                        >
                          {user.user_metadata?.avatar_url ||
                          user.user_metadata?.picture ? (
                            <Image
                              src={
                                user.user_metadata?.avatar_url ||
                                user.user_metadata?.picture
                              }
                              alt={userDisplayName}
                              width={32}
                              height={32}
                              className="rounded-full flex-shrink-0 object-cover"
                            />
                          ) : (
                            <UserRound className="h-8 w-8 flex-shrink-0" />
                          )}
                          <span className="flex-grow text-base font-medium">
                            Profile
                          </span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 w-full p-3 rounded-md text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors duration-200 ease-in-out"
                        >
                          <LogOut className="h-5 w-5 flex-shrink-0" />
                          <span className="flex-grow text-base text-left">
                            Sign Out
                          </span>
                        </button>
                      </div>
                    ) : (
                      <Link
                        href="/auth/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 w-full p-3 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 ease-in-out"
                      >
                        <LogIn className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-grow text-base">Sign In</span>
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}
