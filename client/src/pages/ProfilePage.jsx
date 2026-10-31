import { useEffect, useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";

export default function ProfilePage() {
  const { workspace, updateProfile } = useWorkspace();
  const [draft, setDraft] = useState(workspace.profile);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(workspace.profile), [workspace.profile]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await updateProfile({ ...draft, year: draft.year === "" ? "" : Number(draft.year) });
      setFeedback({ type: "success", message: "Profile saved" });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Profile could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(change) {
    setFeedback(null);
    setDraft((current) => ({ ...current, ...change }));
  }

  return (
    <>
      <div className="pagehead"><div><div className="eyebrow">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div><h1>Your space. Your details.</h1><p>A few details to make your workspace feel like yours.</p></div></div>
      <section className="panel profileform">
        <div className="profileavatar">{draft.name[0] || "S"}</div>
        <form onSubmit={saveProfile}>
          <div className="field"><label htmlFor="profile-name">Full name</label><input id="profile-name" required maxLength="80" value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} /></div>
          <div className="field"><label htmlFor="profile-university">University</label><input id="profile-university" required value={draft.university} onChange={(event) => updateDraft({ university: event.target.value })} /></div>
          <div className="field"><label htmlFor="profile-degree">Degree</label><input id="profile-degree" required value={draft.degree} onChange={(event) => updateDraft({ degree: event.target.value })} /></div>
          <div className="row"><div className="field"><label htmlFor="profile-email">Email address</label><input id="profile-email" type="email" autoComplete="email" required value={draft.email || ""} onChange={(event) => updateDraft({ email: event.target.value })} /></div><div className="field"><label htmlFor="profile-year">Academic year (optional)</label><input id="profile-year" type="number" min="1" max="8" value={draft.year ?? ""} onChange={(event) => updateDraft({ year: event.target.value })} /></div></div>
          <div className="profilebuttons"><button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button><button className="secondary" type="button" onClick={() => { setDraft(workspace.profile); setFeedback(null); }} disabled={saving}>Cancel</button></div>
        </form>
        {feedback && <p className={`profile-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.type === "success" && <span aria-hidden="true">✓ </span>}{feedback.message}</p>}
        <p className="notice">Your profile details are saved to your UniTrack account.</p>
      </section>
    </>
  );
}
