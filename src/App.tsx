/* Dos flujos separados:
 *
 *   Investigación  /sign-in, /projects, /executions, /participants. Con
                  armazón y sesión.
 *   Participación  /session. Una sola pantalla, sin navegación ni métricas.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { AuditScreen } from "./features/audit/AuditScreen";
import { LoginScreen } from "./features/access/LoginScreen";
import { ExecutionsScreen } from "./features/executions/ExecutionsScreen";
import { CompareScreen } from "./features/executions/CompareScreen";
import { ExecutionDetailScreen } from "./features/executions/ExecutionDetailScreen";
import { IngestScreen } from "./features/executions/IngestScreen";
import { ParticipantsScreen } from "./features/participants/ParticipantsScreen";
import { ProjectsScreen } from "./features/projects/ProjectsScreen";
import { AppShell } from "./shared/AppShell";
import { esParticipante, getToken } from "./shared/api";

function Protegida({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/sign-in" replace />;
  /* Quien entró con su código de participante se queda en su sesión. El
     servicio ya no le entrega nada de esto, pero la pantalla tampoco debe
     abrirse: ver la ficha de la ejecución que está resolviendo le enseñaría
     las respuestas. */
  if (esParticipante()) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
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
        <Route path="/projects" element={<ProjectsScreen />} />
        <Route path="/executions" element={<ExecutionsScreen />} />
        <Route path="/executions/new" element={<IngestScreen />} />
        <Route path="/executions/:id" element={<ExecutionDetailScreen />} />
        <Route path="/executions/:id/compare" element={<CompareScreen />} />
        <Route path="/participants" element={<ParticipantsScreen />} />
      </Route>

      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
}
