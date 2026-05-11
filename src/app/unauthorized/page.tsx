export default function UnauthorizedPage() {
  return (
    <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-6">
      <h1 className="text-2xl font-semibold text-white">Unauthorized</h1>
      <p className="mt-3 text-sm leading-6 text-amber-50">
        Your account does not have permission for this DG Academy Factory area.
        Ask an Admin to review your organization role.
      </p>
    </div>
  );
}
