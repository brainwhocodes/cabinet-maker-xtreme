'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useProjectStore } from '@/state/project-store';
import { Badge } from '../atoms/Badge';
import { SolarIcon } from '../atoms/SolarIcon';

const PRESETS = [
  {
    id: 'small_apt',
    title: '10x10 Small Apartment L-Shape',
    dims: '120" x 120" (10ft x 10ft)',
    shape: 'l_shape' as const,
    width: 120,
    length: 120,
    description: 'Ideal compact kitchen configuration with corner base and sink run.',
  },
  {
    id: 'suburban_galley',
    title: '12x14 Suburban Galley Kitchen',
    dims: '144" x 168" (12ft x 14ft)',
    shape: 'galley' as const,
    width: 144,
    length: 168,
    description: 'High-efficiency dual parallel runs with generous countertop prep space.',
  },
  {
    id: 'laundry_utility',
    title: '8x8 Laundry & Utility Room',
    dims: '96" x 96" (8ft x 8ft)',
    shape: 'single_wall' as const,
    width: 96,
    length: 96,
    description: 'Single-wall upper & lower storage with washer/dryer surround.',
  },
];

export function LauncherTemplate() {
  const { project, setRoomDimensionsCommand } = useProjectStore();

  return (
    <div
      className="launcher-layout is-flex is-flex-direction-column"
      style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Top Navigation */}
      <header
        className="site-toolbar navbar px-6 is-flex is-align-items-center is-justify-content-between"
        style={{
          borderBottom: '1px solid var(--color-line)',
          backgroundColor: 'var(--color-surface)',
          minHeight: 64,
        }}
      >
        <div className="site-toolbar-brand is-flex is-align-items-center">
          <span
            className="is-flex is-align-items-center is-justify-content-center has-background-primary has-text-white"
            style={{ width: 36, height: 36, borderRadius: 8, fontWeight: 'bold' }}
          >
            <SolarIcon name="solar:box-minimalistic-linear" size={20} />
          </span>
          <span className="has-text-weight-bold is-size-5" style={{ letterSpacing: '-0.02em' }}>
            CabCraft 3D
          </span>
        </div>

        <div className="site-toolbar-actions is-flex is-align-items-center">
          <Badge variant="primary" icon="solar:shield-check-linear" size="sm">
            WebMCP Standard Enabled
          </Badge>
          <Link prefetch={false} href="/about/" className="button is-small is-ghost">
            About & WebMCP Docs
          </Link>
          <Link prefetch={false} href="/planner/" className="button is-small is-primary">
            Open Studio
          </Link>
        </div>
      </header>

      {/* Hero & Quick Start */}
      <main className="section px-6 py-6 is-flex-grow-1">
        <div className="container" style={{ maxWidth: 1100 }}>
          <div className="launcher-hero columns is-vcentered mb-6">
            <div className="column is-7">
              <span className="tag is-primary is-light is-rounded has-text-weight-semibold mb-2">
                OpenAI WebMCP Challenge Submission
              </span>
              <h1 className="title is-2 mb-3" style={{ lineHeight: 1.15 }}>
                Agent-Native 3D Cabinet Studio & Retailer BOM Generator
              </h1>
              <p className="subtitle is-5 has-text-grey mb-4" style={{ lineHeight: 1.5 }}>
                Design standard modular cabinetry in real-time 3D, run deterministic NKBA clearance
                checks, auto-fit wall layouts, and export itemized Home Depot procurement orders
                with step-by-step assembly guides.
              </p>

              <div className="buttons">
                <Link prefetch={false} href="/planner/" className="button is-primary is-medium">
                  <SolarIcon name="solar:widget-3-linear" size={20} className="mr-2" />
                  <span>Launch 3D Design Studio</span>
                </Link>
                <Link prefetch={false} href="/bom/" className="button is-secondary is-medium">
                  <SolarIcon name="solar:bill-list-linear" size={20} className="mr-2" />
                  <span>View Sample BOM</span>
                </Link>
              </div>
            </div>

            <div className="column is-5">
              <figure
                className="box p-2 has-background-white"
                style={{ borderRadius: 12, border: '1px solid var(--color-line)' }}
              >
                <Image
                  src="/images/planner-workspace.png"
                  width={1280}
                  height={800}
                  priority
                  className="is-block"
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: 8,
                    border: '1px solid var(--color-line)',
                  }}
                  alt="CabCraft planner showing the cabinet catalog, exact Three.js room layout, and cabinet property inspector"
                />
                <figcaption className="p-2">
                  <h4 className="is-size-6 has-text-weight-bold mb-1">
                    The live planning workspace
                  </h4>
                  <p className="is-size-7 has-text-grey mb-0">
                    Human edits and WebMCP agent actions use the same exact cabinet and validation
                    state.
                  </p>
                </figcaption>
              </figure>
            </div>
          </div>

          {/* Quick Room Presets */}
          <div className="mb-6">
            <h3 className="title is-5 mb-3">Choose a Room Layout Preset</h3>
            <div className="columns is-variable is-3">
              {PRESETS.map((p) => (
                <div key={p.id} className="column is-4">
                  <div
                    className="box p-4 has-background-white"
                    style={{
                      height: '100%',
                      borderRadius: 8,
                      border: '1px solid var(--color-line)',
                    }}
                  >
                    <span className="tag is-light is-size-7 mb-2">{p.dims}</span>
                    <h4 className="is-size-6 has-text-weight-bold mb-1">{p.title}</h4>
                    <p className="is-size-7 has-text-grey mb-3">{p.description}</p>
                    <Link
                      prefetch={false}
                      href="/planner/"
                      className="button is-small is-fullwidth is-primary is-outlined"
                      onClick={() =>
                        setRoomDimensionsCommand(
                          p.width,
                          p.length,
                          96,
                          p.shape,
                          'new_project',
                          project.revision,
                        )
                      }
                    >
                      Start with this Preset
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="columns is-variable is-3">
            <div className="column is-4">
              <div
                className="box p-4 has-background-white"
                style={{ height: '100%', borderRadius: 8 }}
              >
                <SolarIcon name="solar:ruler-linear" size={24} className="has-text-primary mb-2" />
                <h5 className="is-size-6 has-text-weight-bold mb-1">
                  1/16&quot; Integer Precision
                </h5>
                <p className="is-size-7 has-text-grey mb-0">
                  Zero floating-point inaccuracies. Standard base and wall modular dimensions snap
                  seamlessly with corner filler allowances.
                </p>
              </div>
            </div>
            <div className="column is-4">
              <div
                className="box p-4 has-background-white"
                style={{ height: '100%', borderRadius: 8 }}
              >
                <SolarIcon
                  name="solar:shield-check-linear"
                  size={24}
                  className="has-text-primary mb-2"
                />
                <h5 className="is-size-6 has-text-weight-bold mb-1">NKBA Architectural Rules</h5>
                <p className="is-size-7 has-text-grey mb-0">
                  Real-time clearance checks for walkway widths, plumbing centers, door swings, and
                  ceiling collisions.
                </p>
              </div>
            </div>
            <div className="column is-4">
              <div
                className="box p-4 has-background-white"
                style={{ height: '100%', borderRadius: 8 }}
              >
                <SolarIcon
                  name="solar:clipboard-check-linear"
                  size={24}
                  className="has-text-primary mb-2"
                />
                <h5 className="is-size-6 has-text-weight-bold mb-1">Exploded Assembly Guides</h5>
                <p className="is-size-7 has-text-grey mb-0">
                  Step-by-step orthographic diagrams rebuilt directly from the exact cabinet
                  parameters in your design.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
