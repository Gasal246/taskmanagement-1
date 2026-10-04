import React, { useState } from "react";
import { useOrganizationOverview } from "@/hooks/use-organization-overview";
import OrganizationSectionControls from "@/components/admin/OrganizationSectionControls";

export default function OrganizationOverviewsFixture() {
  const [id, setId] = useState("00000000000000000000000a");
  const [choices, setChoices] = useState(false);
  const overview = useOrganizationOverview("region", id, ["heads", "staffs", "available_staffs"]);
  const state = (window as any).listChecks;
  return <main>
    <h1>Organization overview fixture</h1>
    <button id="org-a" onClick={() => setId("00000000000000000000000a")}>Organization A</button>
    <button id="org-b" onClick={() => setId("00000000000000000000000b")}>Organization B</button>
    <button id="org-choices" onClick={() => setChoices(previous => !previous)}>Staff choices</button>
    <button id="org-refresh" onClick={() => { void overview.refresh(); }}>Refresh</button>
    <button id="org-error" onClick={() => { state.orgFailNext = true; void overview.refresh(); }}>Simulate network error</button>
    <button id="org-remove" onClick={() => { state.orgTotal = 25; void overview.refresh(); }}>Remove last pages</button>
    <OrganizationSectionControls key={`${overview.scope}:heads`} overview={overview} name="heads" />
    <div id="org-results" aria-busy={overview.section("heads").busy}>
      {overview.section("heads").items.map(row => <article key={row._id} data-org-row={row._id}>{row.user.name}</article>)}
    </div>
    {choices && <section id="org-selector">
      <OrganizationSectionControls key={`${overview.scope}:available_staffs`} overview={overview} name="available_staffs" label="staff choices" />
      {overview.section("available_staffs").items.map(row => <p key={row._id} data-org-choice={row._id}>{row.user_id.name}</p>)}
    </section>}
  </main>;
}
