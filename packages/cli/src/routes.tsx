import { createMemoryRouter, type RouteObject } from "react-router";
import { ChatPane } from "./components/ChatPane";
import { SessionError } from "./components/SessionError";
import { Shell, ShellFallback } from "./components/Shell";
import {
  newSessionAction,
  newSessionLoader,
  rootLoader,
  sessionAction,
  sessionLoader,
} from "./session/handlers";

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
