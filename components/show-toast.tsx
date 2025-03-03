"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function ShowToast({ message }: { message: string }) {
  useEffect(() => {
    toast(message);
  }, [message]);
  return null;
}
