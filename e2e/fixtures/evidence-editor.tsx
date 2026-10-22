import { useState } from "react";
import { createRoot } from "react-dom/client";
import { EvidenceForm } from "../../src/components/admin/editor/evidence-form";
import { RichTextEditor } from "../../src/components/admin/rich-text-editor";

function Fixture() {
  const [count, setCount] = useState(0);
  const [saved, setSaved] = useState("");
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
        }}
      >
        <input name="title" defaultValue="Original title" aria-label="Title" />
        {["Background", "Findings"].map((name) => (
          <RichTextEditor key={name} name={name} label={name} initialContent={null} />
        ))}
        <button>Save draft</button>
      </form>
      <EvidenceForm
        action={async (data) => {
          if (data.get("url") === "invalid") return { error: "Invalid URL" };
          setCount((value) => value + 1);
          return {};
        }}
      >
        <input name="url" aria-label="Evidence URL" />
        <button>Add evidence</button>
      </EvidenceForm>
      <EvidenceForm
        action={async () => {
          setCount((value) => value - 1);
        }}
      >
        <button>Remove evidence</button>
      </EvidenceForm>
      <output aria-label="Evidence count">{count}</output>
      <output aria-label="Saved draft">{saved}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
