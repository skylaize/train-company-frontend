import { Navigate } from "react-router-dom";
import { getToken } from "../authToken";

export default function RequireToken({ children }: { children: JSX.Element }) {
  const token = getToken();
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}
