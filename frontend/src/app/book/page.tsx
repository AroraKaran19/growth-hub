import { redirect } from "next/navigation";

type BookRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Older links pointed at /book; booking starts from a workspace, so send them
// to the listing with the requested type already filtered.
export default async function BookRedirect({ searchParams }: BookRedirectProps) {
  const { workspaceType, type } = await searchParams;
  const requested = [workspaceType, type].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  redirect(
    requested
      ? `/workspaces?type=${encodeURIComponent(requested)}`
      : "/workspaces",
  );
}
