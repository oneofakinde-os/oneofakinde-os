import type { Route } from "next";

function asRoute(path: string): Route {
  return path as Route;
}

export const routes = {
  home: (): Route => asRoute("/"),
  explore: (): Route => asRoute("/explore"),
  collect: (): Route => asRoute("/collect"),
  invest: (): Route => asRoute("/invest"),
  auctions: (): Route => asRoute("/auctions"),
  create: (): Route => asRoute("/create"),

  townhall: (): Route => asRoute("/townhall"),
  townhallSearch: (query?: string): Route =>
    query
      ? asRoute(`/townhall/search?q=${encodeURIComponent(query)}`)
      : asRoute("/townhall/search"),
  townhallWatch: (): Route => asRoute("/townhall/watch"),
  townhallListen: (): Route => asRoute("/townhall/listen"),
  townhallRead: (): Route => asRoute("/townhall/read"),
  townhallPhotos: (): Route => asRoute("/townhall/photos"),
  townhallGallery: (): Route => asRoute("/townhall/photos"),
  townhallLive: (): Route => asRoute("/townhall/live"),

  watchHub: (): Route => asRoute("/watch"),
  listenHub: (): Route => asRoute("/listen"),
  readHub: (): Route => asRoute("/read"),
  photosHub: (): Route => asRoute("/photos"),
  galleryHub: (): Route => asRoute("/photos"),
  liveHub: (): Route => asRoute("/live"),
  liveNow: (): Route => asRoute("/live"),

  worlds: (): Route => asRoute("/worlds"),
  world: (worldId: string): Route => asRoute(`/worlds/${worldId}`),
  worldDrops: (worldId: string): Route => asRoute(`/worlds/${worldId}/drops`),

  studio: (handle: string): Route => asRoute(`/studio/${handle}`),
  drop: (dropId: string): Route => asRoute(`/drops/${dropId}`),
  dropDetails: (dropId: string): Route => asRoute(`/drops/${dropId}/details`),
  dropProperties: (dropId: string): Route => asRoute(`/drops/${dropId}/properties`),
  dropOffers: (dropId: string): Route => asRoute(`/drops/${dropId}/offers`),
  dropActivity: (dropId: string): Route => asRoute(`/drops/${dropId}/activity`),
  dropPreview: (dropId: string): Route => asRoute(`/drops/${dropId}/preview`),
  dropPreviewPhotos: (dropId: string): Route => asRoute(`/drops/${dropId}/preview/photos`),
  dropPreviewGallery: (dropId: string): Route => asRoute(`/drops/${dropId}/preview/photos`),
  dropWatch: (dropId: string): Route => asRoute(`/drops/${dropId}/watch`),
  dropListen: (dropId: string): Route => asRoute(`/drops/${dropId}/listen`),
  dropRead: (dropId: string): Route => asRoute(`/drops/${dropId}/read`),
  dropPhotos: (dropId: string): Route => asRoute(`/drops/${dropId}/photos`),
  dropGallery: (dropId: string): Route => asRoute(`/drops/${dropId}/photos`),

  collectDrop: (dropId: string): Route => asRoute(`/pay/buy/${dropId}`),
  buyDrop: (dropId: string): Route => asRoute(`/pay/buy/${dropId}`),
  myCollection: (): Route => asRoute("/my-collection"),
  favorites: (): Route => asRoute("/favorites"),
  library: (): Route => asRoute("/library"),

  profileSetup: (returnTo?: string): Route =>
    returnTo
      ? asRoute(`/onboarding/profile-setup?returnTo=${encodeURIComponent(returnTo)}`)
      : asRoute("/onboarding/profile-setup"),
  spaceSetup: (): Route => asRoute("/onboarding/profile-setup"),

  signIn: (returnTo?: string): Route =>
    returnTo
      ? asRoute(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
      : asRoute("/auth/sign-in"),
  signUp: (returnTo?: string): Route =>
    returnTo
      ? asRoute(`/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}`)
      : asRoute("/auth/sign-up"),
  walletConnect: (returnTo?: string): Route =>
    returnTo
      ? asRoute(`/auth/wallet-connect?returnTo=${encodeURIComponent(returnTo)}`)
      : asRoute("/auth/wallet-connect"),
  walletLink: (returnTo?: string): Route =>
    returnTo
      ? asRoute(`/auth/wallet-link?returnTo=${encodeURIComponent(returnTo)}`)
      : asRoute("/auth/wallet-link"),
  logout: (): Route => asRoute("/logout"),

  workshop: (): Route => asRoute("/workshop"),
  dashboard: (): Route => asRoute("/dashboard"),
  myCampaigns: (): Route => asRoute("/my-campaigns"),
  payouts: (): Route => asRoute("/payouts"),

  settingsAccount: (): Route => asRoute("/settings/account"),
  settingsSecurity: (): Route => asRoute("/settings/security"),
  settingsApps: (): Route => asRoute("/settings/apps"),
  settingsNotifications: (): Route => asRoute("/settings/notifications"),
  following: (): Route => asRoute("/following"),

  certificate: (certificateId: string): Route => asRoute(`/certificates/${certificateId}`)
};

export type AppRouteHelpers = typeof routes;
