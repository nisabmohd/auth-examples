import { logout } from "@/auth/actions";
import { getSessionUser } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div>
      <pre>{JSON.stringify(user)}</pre>
      <form action={logout}>
        <Button>Logout</Button>
      </form>
    </div>
  );
}
