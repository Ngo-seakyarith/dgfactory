import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasAppAccess } from "@/lib/auth";
import { getAuthenticatedCookieUser } from "@/lib/auth-production";

export default async function LoginPage() {
  const user = await getAuthenticatedCookieUser((await cookies()).toString());

  if (user) {
    redirect(hasAppAccess(user.role) ? "/dashboard" : "/unauthorized");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <CardTitle>DG Academy Factory Access</CardTitle>
          <CardDescription>
            Sign in with Google. Access is available after your DG Academy
            profile is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Signed-in accounts without approval remain pending and cannot use the
          internal app.
        </CardContent>
      </Card>
    </div>
  );
}
