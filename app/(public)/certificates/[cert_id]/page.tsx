import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { getOptionalSession } from "@/lib/server/session";
import Link from "next/link";
import { notFound } from "next/navigation";

type CertificatePageProps = {
  params: Promise<{ cert_id: string }>;
};

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { cert_id: certificateId } = await params;

  const [session, certificate] = await Promise.all([
    getOptionalSession(),
    gateway.getCertificateById(certificateId)
  ]);

  if (!certificate) {
    notFound();
  }

  const [drop, wallets] = await Promise.all([
    gateway.getDropById(certificate.dropId),
    gateway.getCertificateWallets(certificateId)
  ]);
  if (!drop) {
    notFound();
  }

  return (
    <AppShell
      title="certificate"
      subtitle="public certificate verification for a drop"
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <p className="slice-label">step 9 of 9 · certificate</p>
        <p className="slice-label">verification status</p>
        <h2 className="slice-title">{certificate.status}</h2>
        <p className="slice-copy">
          this certificate confirms ownership history for the linked drop.
        </p>

        <dl className="slice-list">
          <div>
            <dt>certificate id</dt>
            <dd>{certificate.id}</dd>
          </div>
          <div>
            <dt>drop</dt>
            <dd>{certificate.dropTitle}</dd>
          </div>
          <div>
            <dt>owner</dt>
            <dd>@{certificate.ownerHandle}</dd>
          </div>
          <div>
            <dt>receipt</dt>
            <dd>{certificate.receiptId}</dd>
          </div>
          <div>
            <dt>issued</dt>
            <dd>{certificate.issuedAt}</dd>
          </div>
        </dl>

        {wallets.length > 0 && (
          <>
            <p className="slice-label" style={{ marginTop: 20 }}>on-chain wallets</p>
            <dl className="slice-list">
              {wallets.map((w) => (
                <div key={w.address}>
                  <dt>{w.chain}{w.label ? ` · ${w.label}` : ""}</dt>
                  <dd style={{ fontFamily: "monospace", fontSize: "0.85em", wordBreak: "break-all" }}>
                    {w.address}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <div className="slice-button-row">
          <Link href={routes.drop(drop.id)} className="slice-button ghost">
            open drop
          </Link>
          <Link href={routes.myCollection()} className="slice-button ghost">
            my collection
          </Link>
          <Link href={routes.studio(drop.studioHandle)} className="slice-button alt">
            open studio
          </Link>
          <Link href={routes.dropWatch(drop.id)} className="slice-button alt">
            watch
          </Link>
          <Link href={routes.dropListen(drop.id)} className="slice-button alt">
            listen
          </Link>
          <Link href={routes.dropRead(drop.id)} className="slice-button alt">
            read
          </Link>
          <Link href={routes.dropPhotos(drop.id)} className="slice-button alt">
            photos
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
