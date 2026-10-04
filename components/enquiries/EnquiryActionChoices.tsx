"use client";

import { ENQUIRY_ACTIONS } from "@/lib/enquiries/action-types.mjs";
import { Button } from "@/components/ui/button";

// Keep the text field for existing custom actions while offering standard actions.
export default function EnquiryActionChoices({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  return <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Enquiry action">
    {ENQUIRY_ACTIONS.map(action => <Button key={action} type="button" size="sm" variant={value === action ? "default" : "outline"} aria-pressed={value === action} onClick={() => onChange(action)}>{action}</Button>)}
  </div>;
}
