"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { EventLoader } from "@/components/event-loader";
import { EventDetailsForm } from "@/components/event-details-form";
import { RegistrationTypesForm } from "@/components/registration-types-form";
import { RideDetailsForm } from "@/components/ride-details-form";
import { AssetsForm } from "@/components/assets-form";
import { DescriptionEditor } from "@/components/description-editor";
import { ConfirmationEmailPreview } from "@/components/confirmation-email-preview";
import { deriveAssetUrls, sundayWeeksBefore } from "@/lib/assets";
import type { RideFormData, WaEvent } from "@/lib/types";

const EMPTY_FORM: RideFormData = {
  eventId: 0,
  name: "",
  startDate: "",
  endDate: "",
  location: "",
  registrationsLimit: 0,
  accessLevel: "Public",
  tags: ["campout"],
  breakfastName: "",
  breakfastAddress: "",
  breakfastMapsUrl: "",
  breakfastTime: "8:00 AM",
  kickstandsTime: "9:00 AM",
  rideHighlights: "",
  reverUrl: "",
  totalDistance: "",
  estimatedDuration: "",
  featuredImageFilename: "",
  gpxRouteFilename: "",
  gpxTrackFilename: "",
  pdfRouteSheetFilename: "",
  memberTicketsAvailableFrom: "",
  memberTicketsPrice: 0,
  initiateAvailableFrom: "",
  initiatePrice: 15,
  descriptionHtml: "",
};

function parseWaDateTime(waDate: string): string {
  return waDate.slice(0, 16);
}

export default function Home() {
  const [formData, setFormData] = useState<RideFormData>(EMPTY_FORM);
  const [rawEvent, setRawEvent] = useState<WaEvent | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleFormChange = useCallback(
    (updates: Partial<RideFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const assetUrls = useMemo(() => {
    if (!formData.startDate || !formData.name) return null;
    return deriveAssetUrls(formData.startDate, formData.name, {
      featuredImage: formData.featuredImageFilename || undefined,
      gpxRoute: formData.gpxRouteFilename || undefined,
      gpxTrack: formData.gpxTrackFilename || undefined,
      pdfRouteSheet: formData.pdfRouteSheetFilename || undefined,
    });
  }, [
    formData.startDate,
    formData.name,
    formData.featuredImageFilename,
    formData.gpxRouteFilename,
    formData.gpxTrackFilename,
    formData.pdfRouteSheetFilename,
  ]);

  function handleEventLoaded(event: Record<string, unknown>) {
    const waEvent = event as unknown as WaEvent;
    setRawEvent(waEvent);

    const regTypes = waEvent.Details?.RegistrationTypes || [];
    const memberType = regTypes.find((rt) =>
      rt.Name.toLowerCase().includes("member ticket")
    );
    const initiateType = regTypes.find((rt) =>
      rt.Name.toLowerCase().includes("initiate")
    );

    const startDate = parseWaDateTime(waEvent.StartDate);
    const memberOpens =
      memberType?.AvailableFrom?.split("T")[0] ||
      sundayWeeksBefore(waEvent.StartDate, 6);
    const initiateOpens =
      initiateType?.AvailableFrom?.split("T")[0] ||
      sundayWeeksBefore(waEvent.StartDate, 5);

    setFormData({
      ...EMPTY_FORM,
      eventId: waEvent.Id,
      name: waEvent.Name,
      startDate,
      endDate: parseWaDateTime(waEvent.EndDate),
      location: waEvent.Location || "",
      registrationsLimit: waEvent.RegistrationsLimit || 0,
      accessLevel: waEvent.AccessLevel || "Public",
      tags: waEvent.Tags || ["campout"],
      memberTicketsAvailableFrom: memberOpens,
      memberTicketsPrice: memberType?.BasePrice ?? 0,
      initiateAvailableFrom: initiateOpens,
      initiatePrice: initiateType?.BasePrice ?? 15,
      descriptionHtml: waEvent.Details?.DescriptionHtml || "",
    });
  }

  async function handleUpdateEvent() {
    if (!formData.eventId) return;
    setUpdating(true);
    setUpdateResult(null);

    try {
      const payload: Record<string, unknown> = {
        Name: formData.name,
        StartDate: formData.startDate,
        EndDate: formData.endDate,
        Location: formData.location,
        RegistrationsLimit: formData.registrationsLimit,
        AccessLevel: formData.accessLevel,
        Tags: formData.tags,
      };

      if (formData.descriptionHtml) {
        payload.DescriptionHtml = formData.descriptionHtml;
      }

      if (rawEvent?.Details?.RegistrationTypes) {
        const updatedRegTypes = rawEvent.Details.RegistrationTypes.map((rt) => {
          if (rt.Name.toLowerCase().includes("member ticket")) {
            return {
              ...rt,
              AvailableFrom: formData.memberTicketsAvailableFrom + "T00:00:00+00:00",
              BasePrice: formData.memberTicketsPrice,
            };
          }
          if (rt.Name.toLowerCase().includes("initiate")) {
            return {
              ...rt,
              AvailableFrom: formData.initiateAvailableFrom + "T00:00:00+00:00",
              BasePrice: formData.initiatePrice,
            };
          }
          return rt;
        });
        payload.Details = {
          ...rawEvent.Details,
          RegistrationTypes: updatedRegTypes,
          DescriptionHtml: formData.descriptionHtml || rawEvent.Details.DescriptionHtml,
        };
      }

      const response = await fetch(`/api/event/${formData.eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update event");
      }

      setUpdateResult({
        success: true,
        message: `Event "${formData.name}" updated successfully!`,
      });
    } catch (err) {
      setUpdateResult({
        success: false,
        message: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">BMW NorCal Ride Planner</h1>
      <p className="text-gray-600">
        Configure monthly ride events for Wild Apricot
      </p>

      <EventLoader onEventLoaded={handleEventLoaded} />

      {formData.eventId > 0 && (
        <>
          <EventDetailsForm formData={formData} onChange={handleFormChange} />
          <RegistrationTypesForm
            formData={formData}
            onChange={handleFormChange}
          />
          <RideDetailsForm formData={formData} onChange={handleFormChange} />
          <AssetsForm
            formData={formData}
            assetUrls={assetUrls}
            onChange={handleFormChange}
          />
          <DescriptionEditor
            formData={formData}
            descriptionHtml={formData.descriptionHtml}
            onDescriptionChange={(html) =>
              handleFormChange({ descriptionHtml: html })
            }
          />

          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={handleUpdateEvent}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Upload className="mr-2 h-5 w-5" />
              )}
              Update Event on Wild Apricot
            </Button>
            {updateResult && (
              <p
                className={`text-sm ${
                  updateResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {updateResult.message}
              </p>
            )}
          </div>

          <ConfirmationEmailPreview
            assetUrls={assetUrls}
            reverUrl={formData.reverUrl}
          />
        </>
      )}
    </main>
  );
}
