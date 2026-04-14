import { Checkbox, CheckboxGroup } from "@nebutra/ui/primitives";

export function CheckboxGroupDemo() {
  return (
    <CheckboxGroup label="Select features">
      <Checkbox>Analytics</Checkbox>
      <Checkbox>API Access</Checkbox>
      <Checkbox>SSO</Checkbox>
    </CheckboxGroup>
  );
}
