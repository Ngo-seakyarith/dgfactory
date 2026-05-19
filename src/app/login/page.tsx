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
            Production identity is designed for Supabase Auth and
            organization memberships. When production auth is enabled, the
            form below signs in with Supabase and derives the app role from
            `organization_memberships`.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          If `DG_REQUIRE_AUTH=true`, authenticated routes require a Supabase
          session cookie. Local role selection is only available while
          production auth is disabled.
        </CardContent>
      </Card>
      <AuthSettings />
    </div>
  );
}
