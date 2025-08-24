import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";

export function UserSettingsForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setMessage("Erro ao atualizar e-mail: " + error.message);
    } else {
      setMessage("E-mail atualizado! Verifique sua caixa de entrada para confirmação.");
    }
    setLoading(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage("Erro ao atualizar senha: " + error.message);
    } else {
      setMessage("Senha atualizada com sucesso!");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8 max-w-md mx-auto">
      <form onSubmit={handleEmailChange} className="space-y-4">
        <h2 className="font-bold text-lg">Alterar E-mail</h2>
        <input
          type="email"
          placeholder="Novo e-mail"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          className="input input-bordered w-full"
          required
        />
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          Salvar novo e-mail
        </button>
      </form>
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <h2 className="font-bold text-lg">Alterar Senha</h2>
        <input
          type="password"
          placeholder="Nova senha"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="input input-bordered w-full"
          required
        />
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          Salvar nova senha
        </button>
      </form>
      {message && <div className="alert alert-info mt-4">{message}</div>}
    </div>
  );
}