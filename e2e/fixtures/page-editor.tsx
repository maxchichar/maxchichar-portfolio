import { createRoot } from "react-dom/client";
import { TextField } from "../../src/components/admin/editor/text-field";

createRoot(document.getElementById("root")!).render(
  <main style={{ padding: 32, width: 480 }}>
    <form>
      <TextField
        name="interests"
        label="Areas of interest"
        defaultValue="Agents"
        maxLength={50}
        hint='Start lines with "- " to show them as a list.'
        minRows={2}
      />
    </form>
  </main>,
);
