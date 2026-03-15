import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { ToolCallDisplay } from "../ToolCallDisplay";

test("shows 'Creating' label for str_replace_editor create command", () => {
  render(
    <ToolCallDisplay
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/components/Button.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor str_replace command", () => {
  render(
    <ToolCallDisplay
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/App.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor insert command", () => {
  render(
    <ToolCallDisplay
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/src/App.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

test("shows 'Reading' label for str_replace_editor view command", () => {
  render(
    <ToolCallDisplay
      toolName="str_replace_editor"
      args={{ command: "view", path: "/src/utils.ts" }}
      state="call"
    />
  );
  expect(screen.getByText("Reading utils.ts")).toBeDefined();
});

test("shows 'Renaming' label for file_manager rename command", () => {
  render(
    <ToolCallDisplay
      toolName="file_manager"
      args={{ command: "rename", path: "/src/Old.tsx", new_path: "/src/New.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming Old.tsx to New.tsx")).toBeDefined();
});

test("shows 'Deleting' label for file_manager delete command", () => {
  render(
    <ToolCallDisplay
      toolName="file_manager"
      args={{ command: "delete", path: "/src/Unused.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting Unused.tsx")).toBeDefined();
});

test("falls back to tool name for unknown tool", () => {
  render(
    <ToolCallDisplay
      toolName="some_unknown_tool"
      args={{}}
      state="call"
    />
  );
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

test("shows spinner when state is not result", () => {
  const { container } = render(
    <ToolCallDisplay
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.tsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot when state is result", () => {
  const { container } = render(
    <ToolCallDisplay
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.tsx" }}
      state="result"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
