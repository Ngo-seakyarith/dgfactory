import { AuthSettings } from "@/components/auth-settings";
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
            organization memberships. The role selector below is a local
            internal fallback and should be disabled in production unless
            explicitly allowed with `DG_DEV_ROLE_SESSION=true`.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          If `DG_REQUIRE_AUTH=true`, authenticated routes require a Supabase
          session cookie or an explicitly enabled dev role session.
        </CardContent>
      </Card>
      <AuthSettings />
    </div>
  );
}
