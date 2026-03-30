import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { requireSessionRoles } from "@/lib/server/session";
import Link from "next/link";
import { notFound } from "next/navigation";

type WorldSchedulePageProps = {
  params: Promise<{ world_id: string }>;
};

export default async function WorldSchedulePage({ params }: WorldSchedulePageProps) {
  const { world_id } = await params;
  const session = await requireSessionRoles(
    routes.workshopWorldSchedule(world_id),
    ["creator"]
  );

  const world = await gateway.getWorldById(world_id);
  if (!world) {
    notFound();
  }

  const [releaseQueue, drops] = await Promise.all([
    gateway.listWorkshopWorldReleaseQueue(session.accountId, world_id),
    gateway.listDropsByWorldId(world_id, session.accountId)
  ]);

  const scheduledItems = releaseQueue.filter((item) => item.status === "scheduled");
  const publishedItems = releaseQueue.filter((item) => item.status === "published");
  const canceledItems = releaseQueue.filter((item) => item.status === "canceled");

  return (
    <AppShell title="workshop" subtitle={`${world.title} · release schedule`} session={session}>
      <section className="slice-panel" data-testid="world-schedule-panel">
        <p className="slice-label">release schedule</p>
        <p className="slice-copy">
          manage the release cadence for drops in {world.title}. schedule new drops for
          automatic or manual release.
        </p>

        <dl className="slice-dl">
          <dt>world</dt>
          <dd>{world.title}</dd>
          <dt>total drops</dt>
          <dd>{drops.length}</dd>
          <dt>queued releases</dt>
          <dd>{scheduledItems.length}</dd>
          <dt>published</dt>
          <dd>{publishedItems.length}</dd>
          <dt>canceled</dt>
          <dd>{canceledItems.length}</dd>
        </dl>
      </section>

      {scheduledItems.length > 0 && (
        <section className="slice-panel" data-testid="world-schedule-upcoming">
          <p className="slice-label">upcoming releases</p>
          <table className="slice-table">
            <thead>
              <tr>
                <th>drop</th>
                <th>scheduled for</th>
                <th>pacing</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {scheduledItems.map((item) => {
                const drop = drops.find((d) => d.id === item.dropId);
                return (
                  <tr key={item.id}>
                    <td>{drop?.title ?? item.dropId}</td>
                    <td>{new Date(item.scheduledFor).toLocaleDateString()}</td>
                    <td>{item.pacingMode}</td>
                    <td>{item.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {publishedItems.length > 0 && (
        <section className="slice-panel" data-testid="world-schedule-history">
          <p className="slice-label">release history</p>
          <table className="slice-table">
            <thead>
              <tr>
                <th>drop</th>
                <th>published</th>
                <th>pacing</th>
              </tr>
            </thead>
            <tbody>
              {publishedItems.map((item) => {
                const drop = drops.find((d) => d.id === item.dropId);
                return (
                  <tr key={item.id}>
                    <td>{drop?.title ?? item.dropId}</td>
                    <td>
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>{item.pacingMode}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <div className="slice-button-row" style={{ marginTop: "var(--space-md)" }}>
        <Link href={routes.workshop()} className="slice-button ghost">
          back to workshop
        </Link>
        <Link href={routes.world(world_id)} className="slice-button ghost">
          view world
        </Link>
      </div>
    </AppShell>
  );
}
