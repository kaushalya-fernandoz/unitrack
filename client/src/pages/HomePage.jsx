import { Link } from "react-router-dom";

const capabilities = [
  ["01", "GPA calculator", "Record your grades and follow your semester and cumulative GPA. Non-GPA modules stay separate."],
  ["02", "Study timer", "Track a focused session against a module, or add study time manually."],
  ["03", "Weekly insights", "See your study minutes through the week and review your session history."],
  ["04", "Module tracker", "Keep module codes, credits, and grading types organized by semester."],
  ["05", "Tasks and deadlines", "Manage assignments, projects, quizzes, and exams with priorities and due dates."],
  ["06", "GPA simulator", "Try possible grades and see how they could affect your GPA."]
];

export default function HomePage() {
  function scrollToFeatures() {
    const features = document.getElementById("features");
    if (!features) return;
    const headerHeight = document.querySelector(".home-header")?.getBoundingClientRect().height || 0;
    const top = features.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
    window.scrollTo({
      top,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div className="home">
      <header className="home-header">
        <Link className="home-brand" to="/" aria-label="UniTrack home"><img src="/assets/unitrack-logo-white.png" alt="" />unitrack</Link>
        <nav className="home-nav" aria-label="Main navigation"><Link className="cta" to="/login">Login <span aria-hidden="true">→</span></Link></nav>
      </header>
      <main className="home-main">
        <section className="home-hero">
          <div className="hero-copy">
            <div className="kicker">A LITTLE CLARITY FOR UNIVERSITY LIFE</div>
            <h1>Your semester.<br /><em>All together.</em></h1>
            <p>Modules, deadlines, grades, and study time. One clear space to see where you are and what comes next.</p>
            <div className="hero-actions"><Link className="cta" to="/login">Get started <span aria-hidden="true">→</span></Link><button className="explore" type="button" onClick={scrollToFeatures}>Explore <span aria-hidden="true">↓</span></button></div>
          </div>
          <div className="hero-board restored-board" aria-label="Illustrative UniTrack workspace with sample data">
            <div className="board-top"><strong>unitrack</strong><span className="sample-label">SAMPLE WORKSPACE</span></div>
            <div className="board-title">Your semester at a glance.</div>
            <div className="board-sub">Grades, study time, and your next deadline.</div>
            <div className="board-stats">
              <div className="board-stat orange"><small>CUMULATIVE GPA</small><b>3.61</b><span>out of 4.00</span></div>
              <div className="board-stat"><small>STUDIED THIS WEEK</small><b>5h 40m</b><span>One session at a time.</span></div>
            </div>
            <div className="board-label">UPCOMING TASK · SAMPLE DATA</div>
            <div className="landing-sample-task"><div><strong>Complete the web development project</strong><span>EE4207 · Web Development</span><small>Project</small></div><span className="landing-priority">High</span></div>
          </div>
        </section>
        <section className="home-section" id="features">
          <div className="section-heading"><div><div className="kicker">ONE CONNECTED WORKSPACE</div><h2>Everything has a place.<br />Including your next step.</h2></div><p>Keep the moving parts of your semester together, so you can spend a little less time figuring out where to start.</p></div>
          <div className="feature-cards">
            <article className="feature-card"><span className="feature-num">01 / ACADEMICS</span><h3>Your subjects.<br />In good order.</h3><p>Organize semesters and modules, then keep each assignment and deadline connected to its subject.</p><div className="feature-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 12v6c3 2 7 2 10 0v-6M21 9v8" /></svg></div></article>
            <article className="feature-card"><span className="feature-num">02 / STUDY</span><h3>Make a little time.<br />Make it count.</h3><p>Start a study timer, log a session, and build a clearer picture of where your study time goes.</p><div className="feature-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></svg></div></article>
            <article className="feature-card"><span className="feature-num">03 / PROGRESS</span><h3>See where you stand.<br />Plan from there.</h3><p>Record your grades, follow your GPA, and explore how future results could shape your progress.</p><div className="feature-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10m8 10V4m8 16v-7M2 22h20" /></svg></div></article>
          </div>
        </section>
        <section className="home-focus">
          <div><div className="kicker">PROGRESS, WITHOUT THE PRESSURE</div><h2>A big semester.<br /><span>One small step at a time.</span></h2><p>Set a daily study goal, record your sessions, and see how much time you’ve studied. A few focused sessions can add up.</p></div>
          <div className="focus-sheet realistic-goal" aria-label="Example of the daily study goal card in Study"><div className="sample-label">STUDY TAB · SAMPLE DATA</div><h3>Your daily study goal</h3><div className="real-goal-row"><strong>75 <span>/ 120 min</span></strong><span className="sample-edit">Edit goal</span></div><div className="timer-track" role="progressbar" aria-label="Daily study goal" aria-valuemin="0" aria-valuemax="120" aria-valuenow="75"><i style={{ width: "62.5%" }} /></div><p className="goal-preview-note">45 minutes to go. Small sessions add up.</p></div>
        </section>
        <section className="home-capabilities" id="how">
          <div className="capability-intro"><div className="kicker">THE TOOLS YOU NEED</div><h2>Built for the whole semester.</h2><p>From your first module to your final result.</p></div>
          <div className="capability-list">{capabilities.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
        </section>
        <section className="home-ending"><div><h2>Keep your semester in view.</h2><p>Your modules, study time, tasks, and grades. Together in UniTrack.</p></div><Link className="cta" to="/login">Get started <span aria-hidden="true">→</span></Link></section>
      </main>
      <footer className="home-footer"><Link className="home-brand" to="/"><img src="/assets/unitrack-logo-white.png" alt="" />unitrack</Link><div className="home-footer-copy"><span>Your semester, clearly.</span><span>Illustrative sample data · Sign in to your account</span></div></footer>
    </div>
  );
}
