import { oAuthLogin } from "@/auth/actions";
import { Button } from "./ui/button";

export default function OAuthForm() {
  return (
    <div className="flex flex-col gap-4">
      <form
        action={async () => {
          "use server";
          await oAuthLogin("discord");
        }}
      >
        <Button variant="outline" className="w-full ">
          Login with Discord
        </Button>
      </form>
      <form
        action={async () => {
          "use server";
          await oAuthLogin("github");
        }}
      >
        <Button variant="outline" className="w-full ">
          Login with GitHub
        </Button>
      </form>
    </div>
  );
}
