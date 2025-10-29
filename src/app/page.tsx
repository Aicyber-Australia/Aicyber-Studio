import { redirect } from "next/navigation";

/**
 * Root page redirects to the dashboard
 */
export default async function Home() {
  redirect("/dashboard");
}
