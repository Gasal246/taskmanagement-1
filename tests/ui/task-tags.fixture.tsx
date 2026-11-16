import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TaskTagsInput, useTaskTags } from "@/components/task/TaskTagsInput";
import { TaskTagChips } from "@/components/task/TaskTagChips";

function Fixture() {
  const input = useTaskTags();
  const [saved, setSaved] = useState<string[]>([]);
  return <main>
    <form onSubmit={event => { event.preventDefault(); setSaved(input.getTags()); }}>
      <TaskTagsInput input={input} />
      <button type="submit">Save</button>
      <button type="button" onClick={() => input.reset()}>Reset</button>
      <button type="button" onClick={() => input.reset(["Existing phrase"])}>Load task</button>
    </form>
    <output id="saved">{JSON.stringify(saved)}</output>
    <TaskTagChips tags={Array.from({ length: 40 }, (_, i) => `Long multiword tag ${i}`)} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
