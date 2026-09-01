/**
 * Domain module providing rich, structured guidance directly to AI agents interacting via WebMCP.
 */

export interface AgentGuidancePayload {
  title: string;
  version: string;
  protocol: 'WebMCP (W3C Draft Standard)';
  recommendedWorkflowSequence: Array<{
    step: number;
    goal: string;
    primaryTool: string;
    description: string;
    expectedArguments?: Record<string, unknown>;
  }>;
  nkbaArchitecturalRules: Array<{
    ruleId: string;
    title: string;
    formula: string;
    rationale: string;
    resolutionStrategy: string;
  }>;
  dimensionalStandards: {
    baseCabinets: { height: string; depth: string; standardWidthsInches: number[] };
    wallCabinets: {
      standardHeights: string;
      depth: string;
      standardWidthsInches: number[];
      standardElevation: string;
    };
    fillers: { standardWidths: string; purpose: string };
  };
  selfCorrectionStrategies: Record<string, string>;
}

export function getStructuredAgentGuidance(): AgentGuidancePayload {
  return {
    title: 'CabCraft 3D WebMCP Agent Playbook & Architectural Guide',
    version: '2.0.0',
    protocol: 'WebMCP (W3C Draft Standard)',
    recommendedWorkflowSequence: [
      {
        step: 1,
        goal: 'Inspect Initial Context & Walls',
        primaryTool: 'get_project_summary',
        description: 'Read revision, room bounds, walls, scene entities, and selection.',
      },
      {
        step: 2,
        goal: 'Configure Room Bounds & Content Behavior',
        primaryTool: 'set_room_dimensions',
        description: 'Choose new_project or resize_current and provide the current revision.',
        expectedArguments: {
          width_inches: 144,
          length_inches: 144,
          height_inches: 96,
          layout_shape: 'l_shape',
          content_behavior: 'new_project',
          expected_revision: 1,
        },
      },
      {
        step: 3,
        goal: 'Analyze a Wall Run',
        primaryTool: 'analyze_wall_fit',
        description: 'Read deterministic proposal IDs without changing the project.',
        expectedArguments: {
          wall_id: 'wall-1',
          target_run: 'base',
          include_sink_base: true,
        },
      },
      {
        step: 4,
        goal: 'Stage the Chosen Proposal by Identity',
        primaryTool: 'preview_auto_fit_proposal',
        description: 'Stage the exact proposal ID at the analyzed revision.',
        expectedArguments: { proposal_id: 'proposal-balanced_symmetry-HASH', expected_revision: 1 },
      },
      {
        step: 5,
        goal: 'Commit the Approved Preview',
        primaryTool: 'commit_scene_preview',
        description: 'Commit the returned token once using its expected revision.',
        expectedArguments: { token: 'preview-layout-HASH', expected_revision: 1 },
      },
      {
        step: 6,
        goal: 'Complete Cabinet Runs',
        primaryTool: 'complete_built_in_runs',
        description: 'Stage countertops, ends, toe kicks, crown, and light rail for review.',
        expectedArguments: { wall_id: 'wall-1', expected_revision: 2 },
      },
      {
        step: 7,
        goal: 'Audit Architectural Compliance',
        primaryTool: 'validate_design',
        description: 'Resolve every reported wall, obstacle, collision, and attachment error.',
      },
      {
        step: 8,
        goal: 'Generate Honest Procurement Data',
        primaryTool: 'generate_project_bom',
        description: 'Separate known totals from unpriced stock and material-estimate rows.',
      },
      {
        step: 9,
        goal: 'Guide Exact Placed-Cabinet Assembly',
        primaryTool: 'get_assembly_overview',
        description:
          'Use a placed cabinet ID so configured dimensions, shelves, and hardware match.',
        expectedArguments: { cabinet_id: 'cab-seed-1' },
      },
    ],
    nkbaArchitecturalRules: [
      {
        ruleId: 'nkba_corner_filler',
        title: 'Corner & Wall Scribe Filler Rule',
        formula: 'Corner Offset >= 2.0" to 3.0" (Use F334 / F330)',
        rationale:
          'Prevents doors and pull hardware from colliding with adjacent perpendicular walls or trim.',
        resolutionStrategy:
          'Place a 3" filler strip between the wall corner and the first cabinet.',
      },
      {
        ruleId: 'nkba_walkway_clearance',
        title: 'Work Aisle Walkway Clearance',
        formula: 'Walkway Width >= 36" (Recommended 42" for single cook, 48" for two cooks)',
        rationale:
          'Ensures safe transit and allows opposing cabinet and appliance doors to open fully.',
        resolutionStrategy: 'Increase room dimensions or reduce opposing cabinet depth.',
      },
      {
        ruleId: 'nkba_plumbing_alignment',
        title: 'Sink Base to Plumbing Center Drift',
        formula: '|SinkCenter - PlumbingCenter| <= 3.0"',
        rationale: 'Avoids complex and costly drain pipe re-routing inside the cabinet cavity.',
        resolutionStrategy:
          'Center the SB36 or SB30 cabinet directly over the plumbing anchor offset.',
      },
    ],
    dimensionalStandards: {
      baseCabinets: {
        height: '34.5" (36.0" with 1.5" standard countertop)',
        depth: '24.0"',
        standardWidthsInches: [12, 15, 18, 21, 24, 27, 30, 33, 36, 42],
      },
      wallCabinets: {
        standardHeights: '30", 36", 42"',
        depth: '12.0" (Over-fridge units: 24.0")',
        standardWidthsInches: [12, 15, 18, 21, 24, 30, 36],
        standardElevation: '54.0" from finished floor (provides 18.0" backsplash space)',
      },
      fillers: {
        standardWidths: '3.0", 6.0"',
        purpose: 'Cut-to-fit scribe strips for wall variations and door swing clearances.',
      },
    },
    selfCorrectionStrategies: {
      wall_boundaries:
        'The cabinet width exceeds the wall length. Call list_catalog_options to pick a smaller width, or call analyze_wall_fit to auto-calculate exact fit.',
      physical_overlap:
        'Two cabinets occupy the same 3D coordinates. Adjust offset_x_inches of the second cabinet to equal (previousCabinet.offsetX + previousCabinet.width).',
      ceiling_clearance:
        'Tall cabinet exceeds room ceiling. Lower elevation or use a shorter cabinet height (e.g. W3030 instead of W3036).',
    },
  };
}
