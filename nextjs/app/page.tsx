import { logout } from "@/auth/actions";
import { getSessionUser } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, UserIcon } from "lucide-react";

export default async function Home() {
  const userData = await getSessionUser();
  if (!userData) redirect("/login");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex flex-col items-center gap-6 h-screen bg-muted justify-center px-2">
      <Card className="w-full max-w-md mx-auto shadow-md border">
        <CardContent className="px-5 py-1">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border">
              <AvatarFallback className="bg-muted-foreground text-xl font-semibold">
                {getInitials(userData.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{userData.fullName}</h2>
              <div className="flex items-center mt-1 text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" />
                <span className="text-sm">{userData.email}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-start space-x-2 text-sm ">
              <UserIcon className="h-5 w-5  mt-0.5" />
              <div>
                <span className="font-medium text-xs  block mb-1">USER ID</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {userData.id}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <form action={logout}>
        <Button>Logout</Button>
      </form>
    </div>
  );
}
