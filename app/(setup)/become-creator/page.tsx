import { requireSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { setupCreatorStudioAction } from "./actions";

type BecomeCreatorPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function BecomeCreatorPage({ searchParams }: BecomeCreatorPageProps) {
  const session = await requireSession("/become-creator");

  if (session.roles.includes("creator")) {
    redirect("/workshop");
  }

  const resolvedParams = await searchParams;
  const error = Array.isArray(resolvedParams.error)
    ? resolvedParams.error[0]
    : resolvedParams.error;

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="creator studio setup">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">become a creator</h1>
          <p className="identity-copy">
            set up your studio to start publishing drops and building worlds,
            @{session.handle}. your studio is your creative home — where
            collectors discover your work.
          </p>
        </header>

        {error ? (
          <div className="slice-toast slice-toast-error" role="alert">
            {error === "invalid_title"
              ? "studio title is required (max 80 characters)."
              : error === "invalid_synopsis"
                ? "synopsis must be under 500 characters."
                : "something went wrong. please try again."}
          </div>
        ) : null}

        <form className="identity-form" action={setupCreatorStudioAction}>
          <label className="identity-field">
            <span className="identity-label">studio title</span>
            <input
              className="identity-input"
              type="text"
              name="studioTitle"
              placeholder="your studio name"
              maxLength={80}
              required
              autoFocus
            />
            <span className="identity-hint">
              this becomes your public studio identity. you can change it later.
            </span>
          </label>

          <label className="identity-field">
            <span className="identity-label">studio synopsis</span>
            <textarea
              className="identity-input identity-textarea"
              name="studioSynopsis"
              placeholder="describe your creative practice..."
              maxLength={500}
              rows={3}
            />
            <span className="identity-hint">
              tell collectors what kind of work you publish.
            </span>
          </label>

          <button type="submit" className="identity-cta">
            create my studio
          </button>
        </form>

        <footer className="identity-foot">
          <p className="identity-copy">
            once your studio is live, you can create worlds (thematic
            collections) and publish drops (individual works) from the workshop.
          </p>
        </footer>
      </section>
    </main>
  );
}
