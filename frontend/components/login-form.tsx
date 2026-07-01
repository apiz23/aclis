"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { LoadingButton } from "@/components/ui/loading-button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Eye, EyeOff } from "lucide-react"

const loginSchema = z.object({
  email:    z.string().min(1, "Sila masukkan e-mel.").email("E-mel tidak sah."),
  password: z.string().min(1, "Sila masukkan kata laluan."),
})
type LoginValues = z.infer<typeof loginSchema>

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [showPw, setShowPw] = useState(false)
  const router = useRouter()

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    const promise = (async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error) throw error
    })()

    toast.promise(promise, {
      loading: "Mengesahkan...",
      success: "Log masuk berjaya!",
      error: (err: Error) => err?.message ?? "Log masuk gagal.",
    })

    try {
      await promise
      router.push("/dashboard")
    } catch {
      // handled by toast.promise
    }
  }

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>

      <div className="mb-2">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Log Masuk</h2>
        <p className="text-sm text-muted-foreground mt-1">Masukkan kelayakan anda untuk meneruskan.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>E-mel</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  autoComplete="email"
                  placeholder="admin@pontian.gov.my"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Kata Laluan</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={fieldState.invalid}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPw ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Field className="pt-1">
            <LoadingButton
              type="submit"
              className="w-full"
              loading={isSubmitting}
              loadingText="Memasuk…"
            >
              Log Masuk
            </LoadingButton>
          </Field>

        </FieldGroup>
      </form>

      <p className="text-center text-[11px] text-muted-foreground/50">
        Sistem dalaman — akses terhad kepada kakitangan yang diberi kuasa sahaja.
      </p>
    </div>
  )
}
