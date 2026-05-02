import type { AssetUrls } from "./assets";
import { WA_BASE_URL } from "./assets";

export function generateConfirmationEmailHtml(
  assetUrls: AssetUrls,
  reverUrl: string
): string {
  const gpxRouteLink = assetUrls.gpxRoute
    ? `<a href="${assetUrls.gpxRoute}" target="_blank"><img src="${WA_BASE_URL}/resources/_EVENTS/Ride%20Outs/GPX_Route_Button.png" alt="GPX Route" title="" border="0" style="width: 164px; height: 65px;"></a>`
    : "";

  const gpxTrackLink = assetUrls.gpxTrack
    ? `<a href="${assetUrls.gpxTrack}" target="_blank"><img src="${WA_BASE_URL}/resources/_EVENTS/Ride%20Outs/GPX_track_button.png" alt="GPX Track" title="" border="0" style="width: 166px; height: 66px;"></a>`
    : "";

  const reverLink = reverUrl
    ? `<a href="${reverUrl}" target="_blank"><img src="${WA_BASE_URL}/resources/_EVENTS/Ride%20Outs/Rever_20Button.png" alt="Rever Route" title="" border="0" style="width: 169px; height: auto;"></a>`
    : "";

  const routeSheetLink = assetUrls.pdfRouteSheet
    ? `<a href="${assetUrls.pdfRouteSheet}" target="_blank"><img src="${WA_BASE_URL}/resources/_EVENTS/Ride%20Outs/Routesheet_button.png" alt="Route Sheet" title="" border="0" style="width: 167px; height: 67px;"></a>`
    : "";

  return `<p style="line-height: 22px;" align="right"><font style="font-size: 16px;"><img src="${WA_BASE_URL}/resources/Pictures/NorcalLogo_Large.jpg" alt="" title="" border="0" width="85" height="85"></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;">Dear {Registration_First_Name} {Registration_Last_Name},<br>Your event registration has been completed. Thank you for registering!</font></p>
<h2 style="line-height: 32px;"><font color="#333333" style="font-size: 26px;">{Event_Title}</font></h2>
<p style="line-height: 22px;"><font color="#333333" style="font-size: 16px;">When: {Event_Date} {Event_Time}, {Event_TimeZone}<br>Where: {Event_Location}<br></font></p>
<p style="line-height: 22px;"><font color="#333333"><font style="font-size: 14px;"><strong>EVENT DETAILS:</strong></font><br><font style="font-size: 16px;">{Event_Details}<br></font></font></p>
<p style="line-height: 22px;"><font color="#333333"><font style="font-size: 16px;"><font style="font-size: 14px;"><strong>ADDITIONAL INFORMATION:</strong></font><br><font style="font-size: 16px;">{Event_Extra_Info}</font><br></font></font></p>
<p style="line-height: 22px;"><font color="#333333"><font style="font-size: 16px;"><font style="font-size: 16px;"><font style="font-size: 14px;"><strong>YOUR REGISTRATION DETAILS:</strong></font><br><font style="font-size: 16px;">{EventField_All}</font><br></font></font></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#333333">To review your registration details, go to your</font> <a href="{Registration_Details_Page_Url}" target="_blank"><font color="#21ACEE">registration details page</font></a></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#333333">Best regards,</font><br><a href="{Organization_URL}" target="_blank"><font color="#21ACEE">{Organization_Name}</font></a></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#21ACEE"><br></font></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#21ACEE">${gpxRouteLink}${gpxTrackLink}${reverLink}${routeSheetLink}<br></font></font></p>
<p style="line-height: 22px;" align="center"><font style="font-size: 16px;"><font color="#21ACEE"><a href="/store" target="_blank"><img src="${WA_BASE_URL}/resources/Pictures/Buttons/clubstore.png" alt="" title="" border="0" width="128" height="66"></a><br></font></font></p>
<p style="line-height: 22px;" align="center"><font><font color="#21ACEE"><font size="3"><em>Remember to order whatever swag you need from the club store ahead of time if you want some of those goodies delivered before the event!</em></font></font></font></p>`;
}
