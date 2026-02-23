export interface RegistrationType {
  Id: number;
  Name: string;
  IsEnabled: boolean;
  BasePrice: number;
  GuestPrice: number;
  AvailableFrom: string;
  CurrentRegistrantsCount: number;
  Description: string;
}

export interface WaEvent {
  Id: number;
  Name: string;
  StartDate: string;
  EndDate: string;
  Location: string;
  EventType: string;
  RegistrationEnabled: boolean;
  RegistrationsLimit: number;
  ConfirmedRegistrationsCount: number;
  Tags: string[];
  AccessLevel: string;
  StartTimeSpecified: boolean;
  EndTimeSpecified: boolean;
  Details: {
    DescriptionHtml: string;
    RegistrationTypes: RegistrationType[];
    TimeZone: {
      ZoneId: string;
      Name: string;
      UtcOffset: number;
    };
    [key: string]: unknown;
  };
}

export interface RideFormData {
  eventId: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  registrationsLimit: number;
  accessLevel: string;
  tags: string[];
  breakfastName: string;
  breakfastAddress: string;
  breakfastMapsUrl: string;
  breakfastTime: string;
  kickstandsTime: string;
  rideHighlights: string;
  reverUrl: string;
  totalDistance: string;
  estimatedDuration: string;
  elevation: string;
  routeWaypoints: string;
  featuredImageFilename: string;
  gpxRouteFilename: string;
  gpxTrackFilename: string;
  pdfRouteSheetFilename: string;
  memberTicketsAvailableFrom: string;
  memberTicketsPrice: number;
  initiateAvailableFrom: string;
  initiatePrice: number;
  descriptionHtml: string;
}
