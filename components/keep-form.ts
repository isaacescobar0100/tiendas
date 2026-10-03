"use client";

import { startTransition } from "react";

/**
 * Envía un formulario a una acción (useActionState) SIN que React lo limpie
 * después. Con `<form action={…}>` React 19 vacía los campos al terminar, y
 * si el servidor responde con un error (sede sin elegir, tienda cerrada,
 * dato inválido…) la persona pierde todo lo que escribió.
 * Uso: <form onSubmit={keepFormSubmit(formAction)}>
 */
export function keepFormSubmit(action: (formData: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => action(data));
  };
}
