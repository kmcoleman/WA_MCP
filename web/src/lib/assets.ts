export const WA_BASE_URL = "https://bmwnorcal.wildapricot.org";

export interface AssetUrls {
  assetDir: string;
  featuredImage: string | null;
  gpxRoute: string | null;
  gpxTrack: string | null;
  pdfRouteSheet: string | null;
}

export function buildAssetDir(startDate: string, rideName: string): string {
  const date = new Date(startDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const encodedName = encodeURIComponent(rideName).replace(/%20/g, "%20");
  return `/resources/_EVENTS/Ride%20Outs/${year}/${year}%20${month}%20-%20${encodedName}`;
}

export function deriveAssetUrls(
  startDate: string,
  rideName: string,
  filenames: {
    featuredImage?: string;
    gpxRoute?: string;
    gpxTrack?: string;
    pdfRouteSheet?: string;
  }
): AssetUrls {
  const dir = buildAssetDir(startDate, rideName);
  const base = `${WA_BASE_URL}${dir}`;
  return {
    assetDir: dir,
    featuredImage: filenames.featuredImage
      ? `${base}/${encodeURIComponent(filenames.featuredImage)}`
      : null,
    gpxRoute: filenames.gpxRoute
      ? `${base}/${encodeURIComponent(filenames.gpxRoute)}`
      : null,
    gpxTrack: filenames.gpxTrack
      ? `${base}/${encodeURIComponent(filenames.gpxTrack)}`
      : null,
    pdfRouteSheet: filenames.pdfRouteSheet
      ? `${base}/${encodeURIComponent(filenames.pdfRouteSheet)}`
      : null,
  };
}

export function buildLocalPath(assetDir: string): string {
  return decodeURIComponent(assetDir).replace(
    /^\/resources\//,
    "/Volumes/resources-1/"
  );
}

export function sundayWeeksBefore(eventDate: string, weeks: number): string {
  const date = new Date(eventDate);
  date.setDate(date.getDate() - weeks * 7);
  const day = date.getDay();
  if (day !== 0) {
    date.setDate(date.getDate() - day);
  }
  return date.toISOString().split("T")[0];
}
