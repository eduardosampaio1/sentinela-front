import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptComposer } from "./PromptComposer";

const callbacks = {
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  onFocus: vi.fn(),
};

describe("PromptComposer", () => {
  it("grows with multiline content and caps its height before scrolling", () => {
    const view = render(<PromptComposer value="Short" {...callbacks} />);
    const textarea = screen.getByLabelText("Ask Sentinela anything") as HTMLTextAreaElement;

    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 104 });
    view.rerender(<PromptComposer value={"A longer prompt\nwith more lines"} {...callbacks} />);

    expect(textarea.style.height).toBe("104px");
    expect(textarea.style.overflowY).toBe("hidden");

    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 260 });
    view.rerender(<PromptComposer value={"A much longer prompt\nwith enough lines\nto exceed the visual limit"} {...callbacks} />);

    expect(textarea.style.height).toBe("176px");
    expect(textarea.style.overflowY).toBe("auto");
  });
});
