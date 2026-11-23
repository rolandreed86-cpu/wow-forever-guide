import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

/**
 * Tiny hash router. Routes are plain "#name" or "#name-param" hashes (no slashes), which work everywhere
 * the app is hosted, including inside a Claude artifact where only a plain #name passes through.
 *   #guidance, #dungeons, #dungeon-sm-armory, #gear, #quests, #talents, #professions, #collections, #about
 *   #talents-hunter-<build code> opens the talent planner with a shared build.
 */
export interface Route {
  view: string;
  param: string | null;
}

const PARAM_VIEWS = ["dungeon", "talents"];

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "").trim();
  if (!h) return { view: "guidance", param: null };
  for (const v of PARAM_VIEWS) {
    if (h.startsWith(`${v}-`)) return { view: v, param: h.slice(v.length + 1) };
  }
  return { view: h, param: null };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(typeof location !== "undefined" ? location.hash : ""));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function href(view: string, param?: string) {
  return `#${param ? `${view}-${param}` : view}`;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children: ReactNode };
/** An in-app link: `to` is a view name such as "gear" or "dungeon-sm-armory". */
export function Link({ to, children, ...rest }: LinkProps) {
  return <a href={`#${to}`} {...rest}>{children}</a>;
}
