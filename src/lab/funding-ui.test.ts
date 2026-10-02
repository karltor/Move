import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FundingPanel from "./FundingPanel";
import FundingModal from "./FundingModal";
import Records from "./Records";
import { fresh, research } from "./game";
import { fundingPreview } from "./economy";
import { craftGear } from "./workshop";

const noChange = () => {};
describe("RP allocation screens", () => {
  it("shows an exact talent conversion and an honest count of affordable choices", () => {
    const game = fresh();
    game.science = 100;
    const quote = fundingPreview(game, "talent");
    const html = renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange }));
    expect(html).toContain(`${quote.availableNodes} talent choices affordable`);
    expect(html).toContain(`for ${quote.cost} RP`);
    expect(html).toContain(`Buy ${quote.quantity} points · ${quote.cost} RP → Talents`);
    expect(html).toContain("Workshop locked");
    expect(html).toContain("Learn 4 basic talents");
    expect(html).toContain('disabled="">Locked · 180 RP');
    expect(html).not.toContain("Compare projects");
    expect(html).not.toContain("Laboratory projects");
    expect(html).not.toContain("Equipment vouchers");
    expect(html).not.toMatch(/Endurance|Impulse|Torque/);
  });
  it("keeps the workshop accessible with vouchers even when no RP remains", () => {
    const game = fresh();
    game.vouchers = 3;
    const html = renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange }));
    expect(html).toContain("Build shoes →");
    expect(html).not.toContain('disabled="">Build shoes');
  });
  it("shows a concrete shoe goal and keeps equipment accessible when its next purchase is unaffordable", () => {
    let game = { ...fresh(), science: 40 };
    game.progress.runner.trials = 2;
    const render = () => renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange }));
    expect(render()).toContain("Build running shoes");
    expect(render()).toContain("71 RP buys the 2 missing vouchers");
    expect(render()).toContain('disabled="">Save 31 more RP');
    expect(render()).toContain("Open equipment without buying");
    game = { ...game, science: 71 };
    expect(render()).toContain("Buy 2 vouchers · 71 RP → Build shoes");
    game = craftGear({ ...game, vouchers: 2, science: 0 }, "runner", "footwear");
    expect(render()).toContain("Choose a fit for running shoes");
    expect(render()).toContain("Open equipment without buying");
  });
  it("replaces the talent purchase quote with an honest finished state after the six basics", () => {
    let game = { ...fresh(), science: 180, talentPoints: 6 };
    for (const id of ["runner-0-0", "runner-0-1", "runner-1-0", "runner-1-1", "runner-2-0", "runner-2-1"]) game = research(game, id);
    const html = renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange }));
    expect(html).toContain("Basics learned ✓");
    expect(html).toContain("Build the clinic to open further training");
    expect(html).toContain("View learned talents");
    expect(html).not.toContain("for 0 RP");
    expect(html).not.toContain("0 talent choices affordable");
  });
  it("reveals development projects by era instead of spoiling the entire end game", () => {
    const game = fresh();
    const render = () => renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange, development: true }));
    const early = render();
    expect(early).toContain("Training clinic");
    expect(early).not.toContain("Commission the metric laboratory");
    expect(early).not.toContain("Build the inertial test chamber");
    game.development.athletics = 1;
    expect(render()).toContain("Biomechanics workshop");
    expect(render()).toContain("Expand the data network");
  });
  it("keeps a wealthy beginner's clinic locked until the displayed goals are completed", () => {
    let game = { ...fresh(), science: 10000, talentPoints: 4 };
    const render = () => renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange }));
    expect(render()).toContain('disabled="">Locked · 180 RP');
    game.progress.runner.trials = 3; game.progress.runner.bestDistance = 120;
    for (const id of ["runner-0-0", "runner-1-0", "runner-2-0", "runner-0-1"]) game = research(game, id);
    expect(render()).toContain("Build · 180 RP → Talents");
    expect(render()).not.toContain('disabled="">Build · 180 RP');
    expect(render()).toContain("clinic.webp");
  });
  it("shows RP earned and offers keeping the bank intact at debrief", () => {
    const game = fresh();
    game.history = [{ id: 1, program: "runner", science: 19, funds: 0, xp: 4, speed: 2.4, distance: 84, duration: 70 }];
    const html = renderToStaticMarkup(createElement(FundingModal, { game, setGame: noChange, onNavigate: noChange, onDismiss: noChange }));
    expect(html).toContain("+19 RP earned");
    expect(html).toContain("Keep RP · return to experiment");
    expect(html).toContain("Unspent RP stays available");
  });
  it("offers a logarithmic cheat through ten million RP without removing save controls", () => {
    const html = renderToStaticMarkup(createElement(Records, { game: fresh(), setGame: noChange, guide: true, onField: noChange, onReset: noChange }));
    expect(html).toContain('aria-label="RP cheat amount"');
    expect(html).toContain('min="1" max="7" step="1"');
    expect(html).toContain("10m");
    expect(html).toContain("Grant 1,000 RP");
    expect(html).toContain("Export save");
    expect(html).toContain("Import save");
    expect(html).toContain("Reset all progress");
  });
});
