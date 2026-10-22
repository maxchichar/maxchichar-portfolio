import { createRoot } from "react-dom/client";
import { ResearchEvidenceForm } from "../../src/app/admin/(protected)/research/[id]/research-evidence-form";
createRoot(document.getElementById("root")!).render(
  <ResearchEvidenceForm researchId="test-research" />,
);
