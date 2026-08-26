import { redirect } from "next/navigation";

// Root → redirect to login (middleware handles auth checks)
export default function Home() {
  redirect("/login");
}
