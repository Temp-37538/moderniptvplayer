"use client"

import type { AuthView } from "@better-auth-ui/core"
import { useAuth } from "@better-auth-ui/react"
import { type ComponentType, useEffect } from "react"
 
import type { SocialLayout } from "./provider-buttons" 
import { SignIn } from "./sign-in"
import { SignOut } from "./sign-out"
import { SignUp } from "./sign-up" 

export type AuthProps = {
  className?: string
  path?: string
  socialLayout?: SocialLayout
  socialPosition?: "top" | "bottom"
  /** @remarks `AuthView` */
  view?: AuthView
}
const PASSWORD_ONLY_VIEWS = ["signUp", "forgotPassword", "resetPassword"]

const AUTH_VIEWS: Partial<Record<AuthView, ComponentType<AuthProps>>> = {
  signIn: SignIn,
  signOut: SignOut,
  signUp: SignUp,
}
export function Auth({
  className,
  path,
  socialLayout,
  socialPosition,
  view
}: AuthProps) {
  const { basePaths, emailAndPassword, plugins, viewPaths, navigate } =
    useAuth()

  if (!view && !path) {
    throw new Error("[Better Auth UI] Either `view` or `path` must be provided")
  }

  const authView =
    view ||
    (Object.keys(viewPaths.auth) as AuthView[]).find(
      (key) => viewPaths.auth[key] === path
    )

  const shouldRedirectToSignIn =
    !emailAndPassword?.enabled &&
    authView &&
    PASSWORD_ONLY_VIEWS.includes(authView)

  useEffect(() => {
    if (shouldRedirectToSignIn) {
      navigate({
        to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
        replace: true
      })
    }
  }, [shouldRedirectToSignIn, navigate, basePaths.auth, viewPaths.auth.signIn])

  if (shouldRedirectToSignIn) {
    return null
  }

  for (const plugin of plugins) {
    const pluginAuthPaths = plugin.viewPaths?.auth

    const pluginView =
      view ??
      authView ??
      (pluginAuthPaths &&
        Object.keys(pluginAuthPaths).find(
          (key) => pluginAuthPaths[key] === path
        ))
    if (!pluginView) continue

    const PluginView = plugin.views?.auth?.[pluginView]
    if (!PluginView) continue

    return (
      <PluginView
        className={className}
        socialLayout={socialLayout}
        socialPosition={socialPosition}
      />
    )
  }

  if (authView === "signIn" && !emailAndPassword?.enabled) {
    const Fallback = plugins.find(
      (plugin) => plugin.fallbackViews?.auth?.signIn
    )?.fallbackViews?.auth?.signIn

    if (Fallback) {
      return (
        <Fallback
          className={className}
          socialLayout={socialLayout}
          socialPosition={socialPosition}
        />
      )
    }
  }

  const AuthView = authView ? AUTH_VIEWS[authView] : undefined

  if (!AuthView) {
    throw new Error(
      `[Better Auth UI] Unknown view "${authView}". Valid views are: ${Object.keys(AUTH_VIEWS).join(", ")}`
    )
  }

  return (
    <AuthView
      className={className}
      socialLayout={socialLayout}
      socialPosition={socialPosition}
    />
  )
}
