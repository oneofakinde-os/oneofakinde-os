import { requireSession } from "@/lib/server/session";
import { normalizeReturnTo } from "@/lib/session";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { completeProfileSetupAction } from "./actions";

type ProfileSetupPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ProfileSetupPage({ searchParams }: ProfileSetupPageProps) {
  const resolvedParams = await searchParams;
  const returnTo = normalizeReturnTo(firstParam(resolvedParams.returnTo), "/townhall");
  const session = await requireSession(routes.profileSetup(returnTo));

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="identity setup">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">let&apos;s build your identity</h1>
          <p className="identity-copy">finalize your studio presence, @{session.handle}.</p>
        </header>

        <form className="identity-form" action={completeProfileSetupAction}>
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="identity-field">
            <span className="identity-label">choose your avatar image</span>
            <div className="identity-upload-row">
              <button type="button" className="identity-chip" disabled>
                upload image
              </button>
              <span className="identity-upload-note">png, jpg, or webp</span>
            </div>
          </label>

          <label className="identity-field">
            <span className="identity-label">choose your username</span>
            <input className="identity-input" type="text" name="username" placeholder="@oneofakinde" />
          </label>

          <label className="identity-field">
            <span className="identity-label">choose your name</span>
            <input className="identity-input" type="text" name="displayName" placeholder="your display name" />
          </label>

          <label className="identity-field">
            <span className="identity-label">say something about you and your work</span>
            <textarea
              className="identity-input identity-textarea"
              name="bio"
              placeholder="identity statement for your studio"
            />
          </label>

          <button type="submit" className="identity-cta">
            let&apos;s go
          </button>
        </form>

        <footer className="identity-foot">
          <Link href={routes.townhall()} className="identity-link">
            open townhall
          </Link>
          <span>·</span>
          <Link href={routes.myCollection()} className="identity-link">
            open my collection
          </Link>
        </footer>
      </section>
    </main>
  );
}
