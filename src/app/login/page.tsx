import { AuthSettings } from "@/app/settings/_components/auth-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
        <CardHeader>
          <CardTitle>DG Academy Factory Access</CardTitle>
          <CardDescription>
            Production identity uses Google sign-in through Supabase Auth and
            profile approval.
            When production auth is enabled, the form below signs in with
            Supabase and shows whether the user is pending or approved for app
            access.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          If `DG_REQUIRE_AUTH=true`, authenticated routes require a Supabase
          session cookie. Local access selection is only available while
          production auth is disabled.
        </CardContent>
      </Card>
      <AuthSettings />
    </div>
  );
}
