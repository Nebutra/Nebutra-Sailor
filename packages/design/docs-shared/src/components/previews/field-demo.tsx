import { Field, Input } from "@nebutra/ui/primitives";

export function FieldDemo() {
  return (
    <div className="space-y-4 w-80 py-8 px-4">
      <Field label="Email address" description="We'll never share your email." htmlFor="email">
        <Input id="email" type="email" placeholder="you@example.com" />
      </Field>

      <Field label="Username" error="Username is already taken." htmlFor="username">
        <Input id="username" placeholder="johndoe" />
      </Field>
    </div>
  );
}
