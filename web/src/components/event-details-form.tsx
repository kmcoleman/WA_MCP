"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { RideFormData } from "@/lib/types";

interface EventDetailsFormProps {
  formData: RideFormData;
  onChange: (updates: Partial<RideFormData>) => void;
}

export function EventDetailsForm({ formData, onChange }: EventDetailsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Event Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date/Time</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={formData.startDate ? formData.startDate.slice(0, 16) : ""}
              onChange={(e) => onChange({ startDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date/Time</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate ? formData.endDate.slice(0, 16) : ""}
              onChange={(e) => onChange({ endDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location (Destination)</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => onChange({ location: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="registrationsLimit">Registration Limit</Label>
            <Input
              id="registrationsLimit"
              type="number"
              value={formData.registrationsLimit || ""}
              onChange={(e) =>
                onChange({ registrationsLimit: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              id="accessLevel"
              checked={formData.accessLevel === "Public"}
              onCheckedChange={(checked) =>
                onChange({ accessLevel: checked ? "Public" : "AdminOnly" })
              }
            />
            <Label htmlFor="accessLevel">Public Event</Label>
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="mt-2 flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tag-campout"
                checked={formData.tags.includes("campout")}
                onCheckedChange={(checked) => {
                  const tags = checked
                    ? [...formData.tags, "campout"]
                    : formData.tags.filter((t) => t !== "campout");
                  onChange({ tags });
                }}
              />
              <Label htmlFor="tag-campout">campout</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="tag-ama"
                checked={formData.tags.includes("ama")}
                onCheckedChange={(checked) => {
                  const tags = checked
                    ? [...formData.tags, "ama"]
                    : formData.tags.filter((t) => t !== "ama");
                  onChange({ tags });
                }}
              />
              <Label htmlFor="tag-ama">ama</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
