import type { Metadata } from "next";
import SuperAdminLoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Connexion Super Admin" };

export default function SuperAdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-xl mx-auto mb-4">
            SA
          </div>
          <h1 className="text-white text-2xl font-bold">Super Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Hajj Platform — Accès restreint</p>
        </div>
        <SuperAdminLoginForm />
      </div>
    </div>
  );
}
