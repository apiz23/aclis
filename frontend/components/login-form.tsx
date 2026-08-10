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
import { Button } from "@/components/ui/button"
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
      router.push("/papan-pemuka")
    } catch {
      // handled by toast.promise
    }
  }

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>

      <div className="mb-2">
        <h2 className="font-heading text-[28px] font-bold leading-none tracking-[0.02em] text-navy">Log Masuk</h2>
        <p className="text-[13px] text-muted-foreground mt-2">Masukkan maklumat log masuk anda untuk meneruskan.</p>
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
                  <Button
                    type="button"
                    tabIndex={-1}
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 h-full text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Field className="pt-1">
            <LoadingButton
              type="submit"
              className="font-heading h-11 w-full text-sm font-bold uppercase tracking-[0.08em]"
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
