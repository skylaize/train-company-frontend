import { Navigate } from "react-router-dom";

export default function RequireToken({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}
