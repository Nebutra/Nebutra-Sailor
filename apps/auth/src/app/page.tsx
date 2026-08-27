import { redirect } from "next/navigation";

export default function AuthHomePage() {
  redirect("/sign-in");
}
