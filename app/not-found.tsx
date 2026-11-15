import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="error-page">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>This road doesn’t lead anywhere.</h1>
      <p>
        The page or vehicle you’re looking for could not be found. Explore the
        collection to find your next drive.
      </p>
      <Link className="button button-dark" href="/cars">
        Explore Cars
      </Link>
    </main>
  );
}
