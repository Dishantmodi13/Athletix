import { redirect } from "next/navigation";

/** Legacy guest route — guests now use the main football dashboard. */
export default function ExplorePage() {
  redirect("/dashboard");
}
