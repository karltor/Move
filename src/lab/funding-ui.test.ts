import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FundingPanel from "./FundingPanel";
import FundingModal from "./FundingModal";
import Records from "./Records";
import { fresh } from "./game";
import { fundingPreview } from "./economy";

const noChange = () => {};
describe("RP allocation screens", () => {
  it("shows an exact talent conversion and an honest count of affordable choices", () => {
    const game = fresh();
    game.science = 100;
    const quote = fundingPreview(game, "talent");
    const html = renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange }));
    expect(html).toContain(`${quote.availableNodes} talent choices affordable after funding`);
    expect(html).toContain("This is a count of options, not purchases.");
    expect(html).toContain(`for ${quote.cost} RP`);
    expect(html).toContain("Convert RP · open talents");
    expect(html).toContain("Convert RP · open workshop");
    expect(html).toContain("Compare projects");
    expect(html).not.toMatch(/Endurance|Impulse|Torque/);
  });
  it("keeps the workshop accessible with vouchers even when no RP remains", () => {
    const game = fresh();
    game.vouchers = 3;
    const html = renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange }));
    expect(html).toContain("Open workshop");
    expect(html).not.toContain('disabled="">Open workshop');
  });
  it("reveals development projects by era instead of spoiling the entire end game", () => {
    const game = fresh();
    const render = () => renderToStaticMarkup(createElement(FundingPanel, { game, setGame: noChange, onNavigate: noChange, development: true }));
    const early = render();
    expect(early).toContain("Build the training clinic");
    expect(early).not.toContain("Commission the metric laboratory");
    expect(early).not.toContain("Build the inertial test chamber");
    game.development.athletics = 1;
    expect(render()).toContain("Open the biomechanics workshop");
    expect(render()).toContain("Expand the data network");
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
