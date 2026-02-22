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
  return {
    assetDir: dir,
    featuredImage: filenames.featuredImage
      ? `${dir}/${encodeURIComponent(filenames.featuredImage)}`
      : null,
    gpxRoute: filenames.gpxRoute
      ? `${dir}/${encodeURIComponent(filenames.gpxRoute)}`
      : null,
    gpxTrack: filenames.gpxTrack
      ? `${dir}/${encodeURIComponent(filenames.gpxTrack)}`
      : null,
    pdfRouteSheet: filenames.pdfRouteSheet
      ? `${dir}/${encodeURIComponent(filenames.pdfRouteSheet)}`
      : null,
  };
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
