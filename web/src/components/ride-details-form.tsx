"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RideFormData } from "@/lib/types";

interface RideDetailsFormProps {
  formData: RideFormData;
  onChange: (updates: Partial<RideFormData>) => void;
}

export function RideDetailsForm({ formData, onChange }: RideDetailsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ride Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="breakfastName">Breakfast Location Name</Label>
            <Input
              id="breakfastName"
              placeholder="e.g. Huckleberry's"
              value={formData.breakfastName}
              onChange={(e) => onChange({ breakfastName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="breakfastAddress">Breakfast Address</Label>
            <Input
              id="breakfastAddress"
              placeholder="e.g. 2071 Camden Ave, San Jose, CA 95124"
              value={formData.breakfastAddress}
              onChange={(e) => onChange({ breakfastAddress: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="breakfastMapsUrl">Breakfast Google Maps URL</Label>
          <Input
            id="breakfastMapsUrl"
            type="url"
            placeholder="https://www.google.com/maps/place/..."
            value={formData.breakfastMapsUrl}
            onChange={(e) => onChange({ breakfastMapsUrl: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="breakfastTime">Breakfast Time</Label>
            <Input
              id="breakfastTime"
              placeholder="8:00 AM"
              value={formData.breakfastTime}
              onChange={(e) => onChange({ breakfastTime: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="kickstandsTime">Kickstands Up Time</Label>
            <Input
              id="kickstandsTime"
              placeholder="9:00 AM"
              value={formData.kickstandsTime}
              onChange={(e) => onChange({ kickstandsTime: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="rideHighlights">Ride Highlights</Label>
          <Textarea
            id="rideHighlights"
            rows={5}
            placeholder="Key points about the ride — interesting roads, stops, scenery, lunch spots. The AI will expand on these."
            value={formData.rideHighlights}
            onChange={(e) => onChange({ rideHighlights: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="reverUrl">Rever Route URL</Label>
          <Input
            id="reverUrl"
            type="url"
            placeholder="https://app.rfrn.co/..."
            value={formData.reverUrl}
            onChange={(e) => onChange({ reverUrl: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalDistance">Total Distance</Label>
            <Input
              id="totalDistance"
              placeholder="~185 miles"
              value={formData.totalDistance}
              onChange={(e) => onChange({ totalDistance: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="estimatedDuration">Estimated Duration</Label>
            <Input
              id="estimatedDuration"
              placeholder="6 hours with breaks"
              value={formData.estimatedDuration}
              onChange={(e) => onChange({ estimatedDuration: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
