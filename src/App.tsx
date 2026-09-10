/* Dos flujos separados:
 *
 *   Investigación  /sign-in, /executions, /participants. Con armazón y sesión.
 *   Participación  /session. Una sola pantalla, sin navegación ni métricas.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { AuditScreen } from "./features/audit/AuditScreen";
import { LoginScreen } from "./features/access/LoginScreen";
import { ExecutionsScreen } from "./features/executions/ExecutionsScreen";
import { ExecutionDetailScreen } from "./features/executions/ExecutionDetailScreen";
import { IngestScreen } from "./features/executions/IngestScreen";
import { ParticipantsScreen } from "./features/participants/ParticipantsScreen";
import { AppShell } from "./shared/AppShell";
import { getToken } from "./shared/api";

function Protegida({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/sign-in" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<LoginScreen />} />

      {/* Flujo del participante: sin armazón. */}
      <Route path="/session" element={<AuditScreen />} />
      <Route path="/review" element={<AuditScreen />} />

      {/* Flujo de investigación. */}
      <Route
        element={
          <Protegida>
            <AppShell />
          </Protegida>
        }
      >
        <Route path="/executions" element={<ExecutionsScreen />} />
        <Route path="/executions/new" element={<IngestScreen />} />
        <Route path="/executions/:id" element={<ExecutionDetailScreen />} />
        <Route path="/participants" element={<ParticipantsScreen />} />
      </Route>

      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
}
