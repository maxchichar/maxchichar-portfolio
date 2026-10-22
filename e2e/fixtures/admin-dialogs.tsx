import { useActionState, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfirmForm } from "../../src/components/admin/confirm-form";
import { UnsavedGuard } from "../../src/components/admin/editor/unsaved-guard";
import { RichTextEditor } from "../../src/components/admin/rich-text-editor";

function Fixture() {
  const [calls, setCalls] = useState(0);
  const [published, setPublished] = useState(0);
  const [fail, setFail] = useState(false);
  const [result, action] = useActionState(async (_previous: string, data: FormData) => {
    if (data.get("id") !== "test-message") throw new Error("Missing form data");
    setCalls((count) => count + 1);
    await new Promise<void>((resolve) =>
      window.addEventListener("finish-deletion", () => resolve(), { once: true }),
    );
    return fail ? "Unable to delete this message. Please try again." : "Message deleted.";
  }, "");
  return (
    <main style={{ padding: 32 }}>
      <h1>CMS inbox</h1>
      <label>
        <input
          type="checkbox"
          checked={fail}
          onChange={(event) => setFail(event.target.checked)}
        />{" "}
        Simulate failure
      </label>
      <ConfirmForm
        action={action}
        title="Delete message?"
        description="Permanently delete the message from Enyo-ojo Meyanga? This cannot be undone."
        label="Delete message"
      >
        <input type="hidden" name="id" value="test-message" />
      </ConfirmForm>
      <p role="status">{result}</p>
      <output aria-label="Delete calls">{calls}</output>
      <form id="draft-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Title
          <input name="title" />
        </label>
        <RichTextEditor name="body" label="Body" initialContent={null} />
      </form>
      <UnsavedGuard formId="draft-form" />
      <form
        data-needs-saved
        action={async (data) => {
          if (data.get("mode") === "publish") setPublished((value) => value + 1);
        }}
      >
        <button name="mode" value="publish">
          Publish
        </button>
      </form>
      <output aria-label="Publish calls">{published}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
