import { validate } from "./validate";

export default function isEmptyOrInvalid(structuredText: any): boolean {
  if (!structuredText) {
    return true;
  }

  const validation = validate(structuredText.value)
  if (!validation.valid) {
    console.error(validation.message);
    return true;
  }

  if (structuredText.value.document.children[0].children[0].value === '') {
    return true;
  }

  return false;
}
