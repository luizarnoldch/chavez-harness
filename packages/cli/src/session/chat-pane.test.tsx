import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { RouterProvider, createMemoryRouter } from "react-router";
import { ChatPane } from "../components/ChatPane";
import { MessageList } from "../components/MessageList";
import { newSessionLoader } from "./handlers";

function Fallback() {
  return <MessageList turns={[]} />;
}

describe("chat pane", () => {
  test("en /session/new muestra el chat vacío", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/session/new",
          loader: newSessionLoader,
          Component: ChatPane,
          HydrateFallback: Fallback,
        },
      ],
      { initialEntries: ["/session/new"] },
    );

    const setup = await testRender(
      <box width="100%" height="100%">
        <RouterProvider router={router} />
      </box>,
      { width: 40, height: 8 },
    );

    try {
      await setup.renderOnce();
      expect(setup.captureCharFrame()).toContain("Sin mensajes aún");
    } finally {
      setup.renderer.destroy();
    }
  });
});
