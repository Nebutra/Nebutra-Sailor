"use server";

import { revalidatePath } from "next/cache";
import { cachedFleet } from "@/lib/console-data";
import { requireStaff } from "@/lib/staff";

/** "Probe now": bypass the 30 s cache and re-render the page. */
export async function probeNow(): Promise<void> {
  await requireStaff();
  await cachedFleet(true);
  revalidatePath("/fleet");
}
