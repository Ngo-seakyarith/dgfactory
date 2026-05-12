import { ClientPortalLogin } from "@/app/client-portal/_components/client-portal-components";

export default function ClientPortalLoginPage() {
  return (
    <div className="py-12">
      <div className="mb-8 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          DG Academy
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Secure Client Portal</h1>
      </div>
      <ClientPortalLogin />
    </div>
  );
}
