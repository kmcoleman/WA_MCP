"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RideFormData } from "@/lib/types";

interface RegistrationTypesFormProps {
  formData: RideFormData;
  onChange: (updates: Partial<RideFormData>) => void;
}

export function RegistrationTypesForm({
  formData,
  onChange,
}: RegistrationTypesFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="memberOpens">Member Tickets — Opens</Label>
            <Input
              id="memberOpens"
              type="date"
              value={formData.memberTicketsAvailableFrom}
              onChange={(e) =>
                onChange({ memberTicketsAvailableFrom: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="memberPrice">Member Tickets — Price ($)</Label>
            <Input
              id="memberPrice"
              type="number"
              step="0.01"
              value={formData.memberTicketsPrice}
              onChange={(e) =>
                onChange({ memberTicketsPrice: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="initiateOpens">Initiate Members — Opens</Label>
            <Input
              id="initiateOpens"
              type="date"
              value={formData.initiateAvailableFrom}
              onChange={(e) =>
                onChange({ initiateAvailableFrom: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="initiatePrice">Initiate Members — Price ($)</Label>
            <Input
              id="initiatePrice"
              type="number"
              step="0.01"
              value={formData.initiatePrice}
              onChange={(e) =>
                onChange({ initiatePrice: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
