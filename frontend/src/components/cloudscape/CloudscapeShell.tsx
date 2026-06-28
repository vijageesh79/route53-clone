"use client";

import AppLayout from "@cloudscape-design/components/app-layout";
import Box from "@cloudscape-design/components/box";
import SideNavigation, { SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const NAV_ITEMS: SideNavigationProps.Item[] = [
  { type: "section", text: "Overview", items: [{ type: "link", text: "Dashboard", href: "/dashboard" }] },
  {
    type: "section",
    text: "DNS",
    items: [
      { type: "link", text: "Hosted zones", href: "/hosted-zones" },
      { type: "link", text: "Health checks", href: "/health-checks" },
      { type: "link", text: "Traffic policies", href: "/traffic-policies" },
      { type: "link", text: "Resolver", href: "/resolver" },
      { type: "link", text: "Profiles", href: "/profiles" },
    ],
  },
];

export function CloudscapeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (pathname === "/login") {
    return (
      <div className="login-page">
        <div className="login-page-inner">{children}</div>
      </div>
    );
  }

  const activeHref =
    NAV_ITEMS.flatMap((s) => ("items" in s && s.items ? s.items : []))
      .filter((i) => i.type === "link")
      .map((i) => (i as { href: string }).href)
      .sort((a, b) => b.length - a.length)
      .find((href) => pathname === href || pathname.startsWith(`${href}/`)) || pathname;

  return (
    <>
      <div id="aws-top-nav">
        <TopNavigation
          identity={{
            href: "/hosted-zones",
            title: "Route 53",
            logo: { src: "/aws-logo.svg", alt: "AWS" },
          }}
          i18nStrings={{
            searchIconAriaLabel: "Search",
            searchDismissIconAriaLabel: "Close search",
            overflowMenuTitleText: "More",
            overflowMenuBackIconAriaLabel: "Back",
          }}
          utilities={[
            {
              type: "button",
              text: theme === "dark" ? "Light mode" : "Dark mode",
              ariaLabel: "Toggle color mode",
              onClick: toggleTheme,
            },
            {
              type: "menu-dropdown",
              text: user?.display_name || "Account",
              description: user?.account_id,
              iconName: "user-profile",
              items: [
                { id: "account", text: `Account ${user?.account_id || ""}` },
                { id: "signout", text: "Sign out" },
              ],
              onItemClick: ({ detail }) => {
                if (detail.id === "signout") logout();
              },
            },
          ]}
        />
      </div>
      <AppLayout
        headerSelector="#aws-top-nav"
        navigationOpen={true}
        navigationWidth={260}
        navigation={
          <SideNavigation
            activeHref={activeHref}
            header={{ href: "/hosted-zones", text: "Route 53" }}
            items={NAV_ITEMS}
            onFollow={(e) => {
              if (!e.detail.external) {
                e.preventDefault();
                router.push(e.detail.href);
              }
            }}
          />
        }
        content={
          <Box padding={{ horizontal: "l", vertical: "l" }}>
            {children}
          </Box>
        }
        toolsHide
      />
    </>
  );
}
