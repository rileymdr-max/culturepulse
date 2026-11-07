import { redirect } from "next/navigation";

export default function TrackedPage() {
  redirect("/dashboard/monitors");
}
