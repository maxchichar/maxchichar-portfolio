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
      <TextField
        name="heroPrimaryCtaHref"
        label="First button link"
        defaultValue="/work"
        maxLength={200}
        multiline={false}
        pattern={{
          regex: "(/(?!/)|https?://)\\S*",
          message: "Use a site path starting with / (like /work) or a full https:// URL.",
        }}
      />
    </form>
  </main>,
);
