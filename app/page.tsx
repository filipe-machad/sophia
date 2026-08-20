"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, CalendarCheck, HeartHandshake, LockKeyhole, Sparkles } from "lucide-react";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export default function WelcomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      professionalName: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    try {
      const response = await fetch(`${API_URL}/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? payload : { email: payload.email, password: payload.password }),
      });
      if (!response.ok) {
        const errors: Record<number, string> = { 400: "Revise os dados informados.", 401: "E-mail ou senha incorretos.", 409: "Este e-mail já possui uma conta.", 429: "Muitas tentativas. Aguarde um minuto." };
        setMessage(errors[response.status] ?? "Não foi possível continuar agora.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setMessage("A API local não está disponível. Confirme se o servidor está ativo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.story}>
        <Link className={styles.brand} href="/"><span>S</span> Sophia</Link>
        <div className={styles.storyContent}>
          <p className={styles.eyebrow}>SEU CONSULTÓRIO, COM MAIS LEVEZA</p>
          <h1>Cuide da rotina.<br />Preserve o encontro.</h1>
          <p className={styles.lead}>Organize sessões, presenças e pagamentos em um espaço pensado para a prática clínica.</p>
          <div className={styles.benefits}>
            <div><CalendarCheck size={20} strokeWidth={1.8} /><span><b>Clareza no dia a dia</b><small>Agenda e acompanhamentos em um só lugar.</small></span></div>
            <div><HeartHandshake size={20} strokeWidth={1.8} /><span><b>Feito para o vínculo</b><small>Menos operação, mais atenção às pessoas.</small></span></div>
            <div><LockKeyhole size={20} strokeWidth={1.8} /><span><b>Privacidade desde o início</b><small>Dados administrativos separados do espaço clínico.</small></span></div>
          </div>
        </div>
        <p className={styles.signature}>Uma rotina organizada também é uma forma de cuidado.</p>
      </section>

      <section className={styles.account}>
        <div className={styles.accountCard}>
          <span className={styles.welcomeIcon}><Sparkles size={21} strokeWidth={1.7} /></span>
          <p className={styles.step}>{mode === "register" ? "PRIMEIRO ACESSO" : "BOAS-VINDAS DE VOLTA"}</p>
          <h2>{mode === "register" ? "Crie seu espaço na Sophia" : "Entre na sua conta"}</h2>
          <p className={styles.description}>{mode === "register" ? "Você poderá ajustar seu perfil e as preferências do consultório depois." : "Sua rotina e seus dados permanecem no seu espaço."}</p>
          <form className={styles.form} onSubmit={submit}>
            {mode === "register" ? <label>Nome profissional<input autoComplete="name" name="name" placeholder="Como prefere ser chamado(a)?" required minLength={2} /></label> : null}
            <label>E-mail<input autoComplete="email" name="email" placeholder="voce@consultorio.com.br" required type="email" /></label>
            <label>Senha<input autoComplete={mode === "register" ? "new-password" : "current-password"} name="password" placeholder={mode === "register" ? "Mínimo de 8 caracteres" : "Sua senha"} required minLength={8} type="password" /></label>
            {mode === "register" ? <label className={styles.consent}><input required type="checkbox" /> <span>Li e concordo com os termos de uso e a política de privacidade.</span></label> : null}
            {message ? <p role="alert" style={{color:"#a45045",fontSize:11,margin:0}}>{message}</p> : null}
            <button disabled={loading} type="submit">{loading ? "Aguarde…" : mode === "register" ? "Criar minha conta" : "Entrar"} <ArrowRight size={17} /></button>
          </form>
          <div className={styles.divider}><span>ou explore antes</span></div>
          <Link className={styles.demo} href="/dashboard?demo=1">Ver ambiente de demonstração <ArrowRight size={15} /></Link>
          <p className={styles.login}>{mode === "register" ? "Já possui uma conta?" : "Ainda não possui uma conta?"} <button onClick={() => { setMode(mode === "register" ? "login" : "register"); setMessage(null); }} style={{border:0,padding:0,background:"none",color:"#315d4e",fontWeight:800,cursor:"pointer"}} type="button">{mode === "register" ? "Entrar" : "Criar conta"}</button></p>
        </div>
      </section>
    </main>
  );
}
