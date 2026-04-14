"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";

import { loginUser, registerUser } from "@/lib/api";
import { getRoleLabel, translateErrorMessage } from "@/lib/display";
import { clearSession, readSession, SESSION_EVENT, writeSession } from "@/lib/session";
import { User, UserRole } from "@/types";

type SessionSnapshot = {
  token: string | null;
  user: User | null;
};

type Props = {
  role: UserRole;
  title: string;
  description: string;
  onSessionChange?: (session: SessionSnapshot) => void;
};

const initialRegister = { name: "", email: "", password: "" };
const initialLogin = { email: "", password: "" };

export function RoleSession({ role, title, description, onSessionChange }: Props) {
  const [session, setSession] = useState<SessionSnapshot>({ token: null, user: null });
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const syncSession = () => {
      const nextSession = readSession();
      setSession(nextSession);
      onSessionChange?.(nextSession);
    };

    syncSession();
    window.addEventListener(SESSION_EVENT, syncSession);
    return () => window.removeEventListener(SESSION_EVENT, syncSession);
  }, [onSessionChange]);

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await registerUser({ ...registerForm, role });
        writeSession(response.access_token, response.user);
        setRegisterForm(initialRegister);
        setMessage(`已登录，当前账号：${response.user.name}。`);
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "注册失败，请稍后重试。");
      }
    });
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await loginUser(loginForm);
        if (response.user.role !== role) {
          clearSession();
          setMessage(`当前账号角色是${getRoleLabel(response.user.role)}，不是${getRoleLabel(role)}。`);
          return;
        }

        writeSession(response.access_token, response.user);
        setLoginForm(initialLogin);
        setMessage(`欢迎回来，${response.user.name}。`);
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "登录失败，请稍后重试。");
      }
    });
  }

  function handleLogout() {
    clearSession();
    setMessage("已退出登录。");
  }

  return (
    <section className="authShell editorialAuthShell">
      <div className="authBrandBlock editorialAuthIntro">
        <span className="brandMark authMark" aria-hidden="true">
          <span />
        </span>
        <span className="eyebrow">{getRoleLabel(role)} Dispatch</span>
        <strong>{getRoleLabel(role)}入口</strong>
        <p>{description}</p>
      </div>
      <div className="sectionPanel authPanel stack editorialAuthPanel">
        <div className="authHeader">
          <h2 className="sectionTitle">{title}</h2>
          <p className="muted">登录您的账户以继续</p>
        </div>

        {session.user?.role === role ? (
          <div className="empty authLoggedIn editorialLoggedIn">
            <strong>{session.user.name}</strong>
            <p className="muted">
              当前登录：{session.user.email} · 角色：{getRoleLabel(session.user.role)}
            </p>
            <button type="button" className="button secondaryButton" onClick={handleLogout}>
              退出登录
            </button>
          </div>
        ) : (
          <div className="authGrid authGridStacked editorialAuthGrid">
            <form className="stack authFormCard editorialFormCard" onSubmit={handleLogin}>
              <div className="editorialFormHead">
                <span className="eyebrow">Sign In</span>
                <h3>登录</h3>
              </div>
              <label className="fieldLabel">邮箱</label>
              <input
                className="field"
                placeholder="请输入邮箱"
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <label className="fieldLabel">密码</label>
              <input
                className="field"
                placeholder="请输入密码"
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
              <button type="submit" disabled={isPending}>
                登录
              </button>
            </form>

            <form className="stack authFormCard secondaryForm editorialFormCard" onSubmit={handleRegister}>
              <div className="editorialFormHead">
                <span className="eyebrow">Register</span>
                <h3>注册{getRoleLabel(role)}账号</h3>
              </div>
              <label className="fieldLabel">姓名</label>
              <input
                className="field"
                placeholder="请输入姓名"
                value={registerForm.name}
                onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <label className="fieldLabel">邮箱</label>
              <input
                className="field"
                placeholder="请输入邮箱"
                type="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <label className="fieldLabel">密码</label>
              <input
                className="field"
                placeholder="请输入密码"
                type="password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
              <button type="submit" disabled={isPending}>
                注册
              </button>
            </form>
          </div>
        )}

        {message ? <p className="muted authMessage">{message}</p> : null}
      </div>
    </section>
  );
}
