import { isRouteErrorResponse, useRouteError } from "react-router";

export function SessionError() {
  const error = useRouteError();
  const message =
    isRouteErrorResponse(error) && error.status === 404
      ? "Sesión no encontrada"
      : "No se pudo cargar la sesión";

  return (
    <scrollbox flexGrow={1} stickyScroll stickyStart="bottom">
      <box padding={1}>
        <text fg="#f7768e">{message}</text>
      </box>
    </scrollbox>
  );
}
