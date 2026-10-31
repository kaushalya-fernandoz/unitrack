import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";

function EyeIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export default function AuthPage({ register = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(location.state?.message || "");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { authenticate } = useWorkspace();

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") || "");
    if (register && password !== String(values.get("confirm") || "")) {
      setError("Your passwords don’t match.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    let authenticated = false;
    try {
      await authenticate(register ? "register" : "login", register
        ? {
            fullName: String(values.get("name")),
            university: String(values.get("university")),
            degree: String(values.get("degree")),
            email: String(values.get("email")),
            password
          }
        : { email: String(values.get("email")), password });
      authenticated = true;
      setSuccess(register ? "Your account is ready." : "You’re signed in.");
      window.setTimeout(() => {
        const destination = location.state?.from?.pathname || "/overview";
        navigate(destination, { replace: true });
      }, 250);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!authenticated) setLoading(false);
    }
  }

  return (
    <div className={`auth-screen ${register ? "register" : "login"}`}>
      <div className={register ? "register" : "login"}>
      <header><Link className="brand" to="/"><img src="/assets/unitrack-logo-white.png" alt="" />unitrack</Link><Link className="back" to="/">Back to home ↗</Link></header>
      <main className="auth-main">
        <div className="shell">
        <section className="story">
          <div className="eyebrow">YOUR SEMESTER, CLEARLY.</div>
          <h1>A little structure.<br /><span>A lot of progress.</span></h1>
          <p className="intro">Your modules, grades, study sessions, and deadlines. One calm space to keep moving forward.</p>
          <div className="preview" aria-hidden="true">
            <div className="sample-label">SAMPLE WORKSPACE</div>
            <div className="previewhead"><span><i className="dot" />Your semester at a glance</span><span className="badge">On track</span></div>
            <div className="stats"><div className="stat accent"><small>YOUR CGPA</small><strong>3.61</strong></div><div className="stat"><small>STUDIED THIS WEEK</small><strong>4h 30m</strong></div></div>
            <div style={{ fontSize: 12 }}>Small sessions. Steady progress.</div><div className="progress"><i /></div>
            <div className="task"><span className="check" />Finish your web development project</div>
            <div className="task"><span className="check" />Make time for your next study session</div>
          </div>
          <p className="storyfoot">Plan your next step.<br />Make room for what matters.</p>
        </section>
        <section className="formside">
          <div className="formwrap">
            <div className="step">{register ? "START YOUR NEXT CHAPTER" : "YOUR WORKSPACE AWAITS"}</div>
            <h2>{register ? "Create your account" : "Welcome back."}</h2>
            <p className="sub">{register ? "Bring your semester together with UniTrack." : "A fresh start for your next study session."}</p>
            <form onSubmit={submit}>
              {register && <>
                <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" placeholder="Your full name" required maxLength="80" /></div>
                <div className="field"><label htmlFor="university">Your university</label><input id="university" name="university" autoComplete="organization" required maxLength="120" placeholder="e.g. University of Ruhuna" /></div>
                <div className="field"><label htmlFor="degree">Degree</label><input id="degree" name="degree" autoComplete="organization-title" placeholder="e.g. Bachelor of Information Technology" required maxLength="120" /></div>
              </>}
              <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
              <div className="field"><label htmlFor="password">Password</label><div className="password"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "Create a password" : "Enter your password"} required minLength="8" /><button className="toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}><EyeIcon /></button></div>{register && <p className="hint">Use at least 8 characters.</p>}</div>
              {register && <div className="field"><label htmlFor="confirm">Confirm password</label><div className="password"><input id="confirm" name="confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="Enter your password again" required minLength="8" /><button className="toggle" type="button" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}><EyeIcon /></button></div></div>}
              <p className="error" role="alert">{error}</p>
              {success && <p className="auth-success" role="status">{success}</p>}
              <button className="primary" type="submit" disabled={loading}>{loading ? "Please wait…" : register ? "Create account →" : "Log in →"}</button>
            </form>
            <p className="switch">{register ? "Already have an account?" : "New to UniTrack?"} <Link to={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link></p>
          </div>
        </section>
        </div>
      </main>
      <footer><span>UniTrack · Your semester, clearly.</span><span>A little time. A little progress.</span></footer>
      </div>
    </div>
  );
}
