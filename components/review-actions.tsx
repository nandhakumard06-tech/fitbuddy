"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { postJson, ApiRequestError } from "@/lib/http";
import { Button, ErrorNotice } from "@/components/ui";

export function ReviewActions({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(accept: boolean) {
    setAction(accept ? "accept" : "reject");
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/plans/review", {
        planId,
        accept,
      });
      router.push("/plans");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setAction(null);
      if (err instanceof ApiRequestError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => decide(true)} loading={loading && action === "accept"}>
          <Check className="h-4 w-4" /> Accept plan
        </Button>
        <Button
          variant="danger"
          onClick={() => decide(false)}
          loading={loading && action === "reject"}
        >
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
      {error ? <ErrorNotice message={error} /> : null}
    </div>
  );
}