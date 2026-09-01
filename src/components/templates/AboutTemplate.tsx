'use client';

import Link from 'next/link';
import { SolarIcon } from '../atoms/SolarIcon';

export function AboutTemplate() {
  return (
    <div
      className="about-layout is-flex is-flex-direction-column"
      style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header */}
      <header
        className="navbar px-6 is-flex is-align-items-center is-justify-content-between"
        style={{
          borderBottom: '1px solid var(--color-line)',
          backgroundColor: 'var(--color-surface)',
          minHeight: 64,
        }}
      >
        <div className="is-flex is-align-items-center" style={{ gap: 10 }}>
          <Link
            prefetch={false}
            href="/"
            className="is-flex is-align-items-center has-text-dark"
            style={{ gap: 8 }}
          >
            <span
              className="is-flex is-align-items-center is-justify-content-center has-background-primary has-text-white"
              style={{ width: 32, height: 32, borderRadius: 8, fontWeight: 'bold' }}
            >
              <SolarIcon name="solar:box-minimalistic-linear" size={18} />
            </span>
            <span className="has-text-weight-bold is-size-6" style={{ letterSpacing: '-0.02em' }}>
              CabCraft 3D
            </span>
          </Link>
          <span className="has-text-grey-light">/</span>
          <span className="has-text-weight-bold is-size-6">About & Technical Architecture</span>
        </div>

        <Link prefetch={false} href="/planner/" className="button is-small is-primary">
          Open 3D Studio
        </Link>
      </header>

      {/* Main Documentation Body */}
      <main className="section px-6 py-5 is-flex-grow-1">
        <div className="container" style={{ maxWidth: 900 }}>
          <div
            className="box p-5 mb-5 has-background-white"
            style={{ borderRadius: 10, border: '1px solid var(--color-line)' }}
          >
            <h1 className="title is-3 mb-2">WebMCP Technical Architecture & Submission Guide</h1>
            <p className="subtitle is-6 has-text-grey mb-4">
              CabCraft 3D is a submission for <strong>The OpenAI WebMCP Challenge</strong>{' '}
              (September 2026).
            </p>

            <div className="content">
              <h2 className="title is-5 mb-2">1. WebMCP Tool Suite Integration</h2>
              <p>
                CabCraft 3D registers 22 revision-aware tools on <code>document.modelContext</code>{' '}
                so agents can inspect, preview, configure, and commit the same project commands used
                by the interface:
              </p>
              <ul>
                <li>
                  <code>set_room_dimensions</code>: Creates a new room or resizes current content
                  with an explicit revision.
                </li>
                <li>
                  <code>preview_catalog_placement</code> and <code>commit_scene_preview</code>:
                  Stage exact cabinet or built-in geometry before one transactional commit.
                </li>
                <li>
                  <code>analyze_wall_fit</code> and <code>preview_auto_fit_proposal</code>: Return
                  deterministic wall proposals and stage one by content identity.
                </li>
                <li>
                  <code>configure_cabinet</code> and <code>configure_built_in_element</code>:
                  Validate construction, dimensions, finishes, shelving, and hardware.
                </li>
                <li>
                  <code>generate_project_bom</code>: Returns honest retailer rows and unpriced
                  material-estimate rows.
                </li>
                <li>
                  <code>get_assembly_overview</code>: Returns the resolved placed cabinet parts and
                  assembly steps.
                </li>
              </ul>

              <h2 className="title is-5 mt-5 mb-2">2. Alignment with Devpost Judging Criteria</h2>
              <div className="columns is-multiline">
                <div className="column is-6">
                  <div className="box p-3 has-background-light" style={{ height: '100%' }}>
                    <strong>WebMCP Leverage (25%)</strong>
                    <p className="is-size-7 has-text-grey mt-1">
                      Deep contract-defined tool registrations with typed JSON schemas, cancellation
                      signals, revision checks, and real-time state synchronization.
                    </p>
                  </div>
                </div>
                <div className="column is-6">
                  <div className="box p-3 has-background-light" style={{ height: '100%' }}>
                    <strong>Execution (25%)</strong>
                    <p className="is-size-7 has-text-grey mt-1">
                      60FPS Three.js WebGL viewport with demand frameloop, Bulma modular SCSS
                      tokens, and full accessible non-canvas keyboard equivalence.
                    </p>
                  </div>
                </div>
                <div className="column is-6">
                  <div className="box p-3 has-background-light" style={{ height: '100%' }}>
                    <strong>Potential Impact (25%)</strong>
                    <p className="is-size-7 has-text-grey mt-1">
                      Solves a major multi-billion dollar friction point in home remodel and DIY
                      cabinetry, eliminating costly ordering mistakes.
                    </p>
                  </div>
                </div>
                <div className="column is-6">
                  <div className="box p-3 has-background-light" style={{ height: '100%' }}>
                    <strong>Creativity & Ambition (25%)</strong>
                    <p className="is-size-7 has-text-grey mt-1">
                      Bridges generative spatial reasoning with parametric CAD and retail commerce,
                      going far beyond typical text chatbots.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="title is-5 mt-5 mb-2">3. Vercel Free Tier & Privacy Architecture</h2>
              <p>
                CabCraft 3D is designed for 100% client-side execution on Vercel&apos;s Hobby plan:
              </p>
              <ul>
                <li>
                  <strong>Zero Server Costs:</strong> All 3D rendering, auto-fit algorithms, and BOM
                  math run entirely in the browser.
                </li>
                <li>
                  <strong>Local-First Privacy:</strong> Project data is stored locally on device
                  with zero database tracking.
                </li>
                <li>
                  <strong>Direct Search Links:</strong> Retailer links use plain search URLs without
                  scrapers or affiliate tracking.
                </li>
              </ul>

              <h2 className="title is-5 mt-5 mb-2">4. Open Source Licenses & Attribution</h2>
              <p className="is-size-7 has-text-grey">
                This project is open-source software licensed under the MIT License. Icons are from
                the <strong>Solar Icon Set</strong> by 480 Design, licensed under{' '}
                <strong>Creative Commons Attribution 4.0 (CC BY 4.0)</strong>. Typography uses{' '}
                <strong>Geologica</strong> and <strong>Atkinson Hyperlegible Next</strong> via
                Google Fonts under SIL Open Font License.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
