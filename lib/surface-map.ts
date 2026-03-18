import surfaceMap from "../config/surface-map.generated.json";

type Surface = (typeof surfaceMap)["surfaces"][number];

type CompiledPattern = {
  regex: RegExp;
  paramNames: string[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePathPattern(pattern: string): CompiledPattern {
  const paramNames: string[] = [];

  const regexSource = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }

      return escapeRegExp(segment);
    })
    .join("/");

  return {
    regex: new RegExp(`^${regexSource}$`),
    paramNames
  };
}

function matchPathPattern(pathname: string, compiled: CompiledPattern): {
  captures: string[];
  byName: Record<string, string>;
} | null {
  const match = compiled.regex.exec(pathname);
  if (!match) return null;

  const captures = match.slice(1);
  const byName: Record<string, string> = Object.fromEntries(
    compiled.paramNames.map((name, index) => [name, captures[index] ?? ""])
  );

  return { captures, byName };
}

function hydratePattern(
  pattern: string,
  paramsByName: Record<string, string>,
  captures: string[]
): string {
  let dynamicIndex = 0;

  return pattern
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) {
        return segment;
      }

      const key = segment.slice(1);
      const value = paramsByName[key] ?? captures[dynamicIndex] ?? "";
      dynamicIndex += 1;
      return value;
    })
    .join("/");
}

const compiledSurfaces = surfaceMap.surfaces.map((surface) => ({
  surface,
  compiled: compilePathPattern(surface.route)
}));

const fallbackSurfaceMetaByPathname = {
  "/townhall": {
    route: "/townhall",
    legacy_routes: [],
    surface_key: "townhall",
    ui_title: "townhall",
    ui_nouns: ["townhall", "drop"],
    lint_targets: ["nav", "h1", "cta", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/townhall/watch": {
    route: "/townhall/watch",
    legacy_routes: [],
    surface_key: "townhall_watch",
    ui_title: "townhall watch",
    ui_nouns: ["townhall", "watch", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/townhall/listen": {
    route: "/townhall/listen",
    legacy_routes: [],
    surface_key: "townhall_listen",
    ui_title: "townhall listen",
    ui_nouns: ["townhall", "listen", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/townhall/read": {
    route: "/townhall/read",
    legacy_routes: [],
    surface_key: "townhall_read",
    ui_title: "townhall read",
    ui_nouns: ["townhall", "read", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/townhall/photos": {
    route: "/townhall/photos",
    legacy_routes: ["/townhall/gallery"],
    surface_key: "townhall_photos",
    ui_title: "townhall photos",
    ui_nouns: ["townhall", "photos", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/townhall/live": {
    route: "/townhall/live",
    legacy_routes: [],
    surface_key: "townhall_live",
    ui_title: "townhall live",
    ui_nouns: ["townhall", "live", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/townhall/search": {
    route: "/townhall/search",
    legacy_routes: [],
    surface_key: "townhall_search",
    ui_title: "townhall search",
    ui_nouns: ["townhall", "drop", "world", "studio"],
    lint_targets: ["h1", "metadata_labels", "empty_state"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.search", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/showroom": {
    route: "/showroom",
    legacy_routes: [],
    surface_key: "showroom",
    ui_title: "showroom",
    ui_nouns: ["showroom", "drop"],
    lint_targets: ["nav", "h1", "cta", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/showroom/watch": {
    route: "/showroom/watch",
    legacy_routes: [],
    surface_key: "showroom_watch",
    ui_title: "showroom watch",
    ui_nouns: ["showroom", "watch", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/showroom/listen": {
    route: "/showroom/listen",
    legacy_routes: [],
    surface_key: "showroom_listen",
    ui_title: "showroom listen",
    ui_nouns: ["showroom", "listen", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/showroom/read": {
    route: "/showroom/read",
    legacy_routes: [],
    surface_key: "showroom_read",
    ui_title: "showroom read",
    ui_nouns: ["showroom", "read", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/showroom/photos": {
    route: "/showroom/photos",
    legacy_routes: [],
    surface_key: "showroom_photos",
    ui_title: "showroom photos",
    ui_nouns: ["showroom", "photos", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/showroom/live": {
    route: "/showroom/live",
    legacy_routes: [],
    surface_key: "showroom_live",
    ui_title: "showroom live",
    ui_nouns: ["showroom", "live", "drop"],
    lint_targets: ["nav", "h1", "metadata_labels"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.catalog", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  },
  "/showroom/search": {
    route: "/showroom/search",
    legacy_routes: [],
    surface_key: "showroom_search",
    ui_title: "showroom search",
    ui_nouns: ["showroom", "drop", "world", "studio"],
    lint_targets: ["h1", "metadata_labels", "empty_state"],
    roles: ["public", "collector", "creator"],
    public_safe: true,
    contract_deps: ["openapi_v1.search", "schema_v1.catalog", "canon_no_leaks_scan"],
    proof_ids: ["p_no_leaks_ci"],
    rules: []
  }
} satisfies Record<string, Surface>;

const compiledLegacyRedirects = Object.entries(surfaceMap.legacy_redirects ?? {}).map(
  ([legacyPattern, canonicalPattern]) => ({
    legacyPattern,
    canonicalPattern,
    compiledLegacy: compilePathPattern(legacyPattern)
  })
);

export function getLegacyRedirect(pathname: string): string | null {
  for (const redirectRule of compiledLegacyRedirects) {
    const match = matchPathPattern(pathname, redirectRule.compiledLegacy);
    if (!match) {
      continue;
    }

    const hydrated = hydratePattern(redirectRule.canonicalPattern, match.byName, match.captures);
    if (hydrated === pathname) {
      continue;
    }

    return hydrated;
  }

  return null;
}

export function getRouteMeta(pathname: string): Surface | null {
  const matched = compiledSurfaces.find(({ compiled }) => compiled.regex.test(pathname));
  if (matched?.surface) {
    return matched.surface;
  }

  return (fallbackSurfaceMetaByPathname as Record<string, (typeof fallbackSurfaceMetaByPathname)[keyof typeof fallbackSurfaceMetaByPathname]>)[pathname] ?? null;
}

export function isSessionRequiredRoute(pathname: string): boolean {
  const meta = getRouteMeta(pathname);
  return Boolean(meta?.proof_ids?.includes("p_session_required"));
}

export function isPublicSafeRoute(pathname: string): boolean {
  const meta = getRouteMeta(pathname);
  return Boolean(meta?.public_safe);
}

export { surfaceMap };
