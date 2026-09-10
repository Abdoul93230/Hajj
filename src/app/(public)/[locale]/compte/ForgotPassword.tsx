"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, CheckCircle2,
} from "lucide-react";

type Step = "email" | "code" | "done";

export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const t = useTranslations("pilgrim");

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Décompte du cooldown "renvoyer le code"
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("forgotError"));
      } else {
        setStep("code");
        setCooldown(60);
      }
    } catch {
      setError(t("forgotError"));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd !== pwd2) {
      setError(t("passwordsDontMatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword: pwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("forgotError"));
      } else {
        setStep("done");
      }
    } catch {
      setError(t("forgotError"));
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="p-6">
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* ÉTAPE 1 — saisie de l'email */}
      {step === "email" && (
        <form onSubmit={requestCode} className="space-y-4">
          <button
            type="button" onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={14} /> {t("backToLogin")}
          </button>

          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock size={20} className="text-[#0f5132]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t("forgotTitle")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("forgotDesc")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0f5132] transition-colors disabled:opacity-50"
          >
            {loading ? t("sendingCode") : t("sendCode")}
          </button>
        </form>
      )}

      {/* ÉTAPE 2 — code OTP + nouveau mot de passe */}
      {step === "code" && (
        <form onSubmit={resetPassword} className="space-y-4">
          <button
            type="button"
            onClick={() => { setStep("email"); setError(""); setCode(""); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={14} /> {t("backToEmail")}
          </button>

          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={20} className="text-[#0f5132]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t("forgotTitle")}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("codeSentTo")} <span className="font-semibold text-gray-700">{email}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("otpCode")}</label>
            <input
              required type="text" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] text-lg font-semibold py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">{t("otpHint")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("newPassword")}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required type={showPwd ? "text" : "password"} value={pwd} minLength={6}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("confirmNewPassword")}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required type={showPwd ? "text" : "password"} value={pwd2} minLength={6}
                onChange={(e) => setPwd2(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading || code.length !== 6}
            className="w-full bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0f5132] transition-colors disabled:opacity-50"
          >
            {loading ? t("resetting") : t("resetPassword")}
          </button>

          <button
            type="button" disabled={cooldown > 0 || loading}
            onClick={requestCode}
            className="w-full text-center text-sm font-medium text-[#0f5132] hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendCode")}
          </button>
        </form>
      )}

      {/* ÉTAPE 3 — succès */}
      {step === "done" && (
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-[#0f5132]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{t("resetSuccess")}</h2>
          <p className="text-sm text-gray-500">{t("resetSuccessDesc")}</p>
          <button
            type="button" onClick={onBack}
            className="w-full bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0f5132] transition-colors"
          >
            {t("backToLogin")}
          </button>
        </div>
      )}
    </div>
  );
}
