import "server-only";
import { Table } from "@nebutra/ui/primitives";
import { FLEET } from "@/lib/admin-platform/fleet";

/**
 * Fleet — Phase 1 of the folded-in platform control plane.
 *
 * Renders CONFIGURATION state (what the ecosystem is supposed to be), not
 * observed state — see @/lib/admin-platform/fleet. Live health probing,
 * Supply, Inbox, and Staff panels are the rest of the old @nebutra/admin
 * surface and have not moved yet; this page is the first rendered domain,
 * ported so the standalone app can be undeployed. See
 * docs/architecture/2026-09-29-admin-into-web.md for the remaining scope.
 */
export default function PlatformFleetPage() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-neutral-12">Fleet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {FLEET.length} services, from <code>brand.domains</code> and the deploy-target resolver.
      </p>
      <div className="mt-4">
        <Table>
          <thead>
            <tr>
              <th className="text-left">Service</th>
              <th className="text-left">Runtime</th>
              <th className="text-left">Host</th>
              <th className="text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {FLEET.map((service) => (
              <tr key={service.id}>
                <td>{service.label}</td>
                <td>{service.runtime}</td>
                <td>{service.domainKey ?? service.baseUrl ?? "—"}</td>
                <td className="text-sm text-muted-foreground">{service.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
}
