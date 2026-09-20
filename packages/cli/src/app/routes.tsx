import { createMemoryRouter, type RouteObject } from "react-router";
import { ChatPane } from "../features/chat/pane/ChatPane";
import { SessionError } from "../features/chat/pane/SessionError";
import {
  newSessionAction,
  newSessionLoader,
  rootLoader,
  sessionAction,
  sessionLoader,
} from "../features/session/handlers";
import { Shell, ShellFallback } from "./Shell";

export const routes: RouteObject[] = [
  {
    path: "/",
    Component: Shell,
    HydrateFallback: ShellFallback,
    children: [
      {
        index: true,
        loader: rootLoader,
      },
      {
        path: "session/new",
        loader: newSessionLoader,
        action: newSessionAction,
        Component: ChatPane,
      },
      {
        id: "session",
        path: "session/:id",
        loader: sessionLoader,
        action: sessionAction,
        Component: ChatPane,
        errorElement: <SessionError />,
      },
    ],
  },
];

export function createAppRouter(initialEntries: string[] = ["/session/new"]) {
  return createMemoryRouter(routes, { initialEntries });
}

export const router = createAppRouter();
